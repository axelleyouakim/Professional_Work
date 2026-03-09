import redis from 'redis';

const REDIS_URL = process.env.REDIS_URL || 
  (process.env.NODE_ENV === 'production' ? 'redis://redis:6379' : 'redis://localhost:6379');

const redisClient = redis.createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('❌ Redis Error:', err.message));
redisClient.on('connect', () => console.log('✅ Redis connected'));

let isRedisConnected = false;

try {
  await redisClient.connect();
  isRedisConnected = true;
  console.log(`✅ Connected to Redis at ${REDIS_URL}`);
} catch (error) {
  console.error(`⚠️  Redis connection failed: ${error.message}`);
  isRedisConnected = false;
}

// ─── TTL par route ────────────────────────────────────────────────────────────
// get_all_timeseries : données immenses (~50MB) + ne changent jamais → 24h
// autres routes      : 1h par défaut
const ROUTE_TTL = {
  '/get_all_timeseries':              86400, // 24h
  '/get_total_cases_per_country':      3600, // 1h
  '/get_total_deaths_per_country':     3600,
  '/get_total_recovered_per_country':  3600,
  '/get_cases_time_series':            3600,
  '/get_total_cases':                  3600,
  '/get_total_deaths':                 3600,
  '/get_total_recovered':              3600,
  '/get_28_day_cases':                 3600,
  '/get_28_day_deaths':                3600,
  '/get_28_day_cases_per_country':     3600,
  '/get_28_day_deaths_per_country':    3600,
  '/get_total_vaccine_doses':          3600,
  '/get_28_day_vaccine_doses':         3600,
  '/get_28_day_vaccine_doses_per_country': 3600,
  '/get_data_at_date':                  300, // 5min (paramétré par date)
  '/get_global_totals_at_date':         300,
};

export const cacheMiddleware = (duration = 3600, options = {}) => {
  const { tags = [], varyBy = [] } = options;

  return async (req, res, next) => {
    if (!isRedisConnected || !redisClient.isOpen) return next();

    // TTL : priorité à la valeur par route, sinon `duration` passé en argument
    const ttl = ROUTE_TTL[req.path] ?? duration;

    const queryString = Object.keys(req.query).length > 0
      ? `?${new URLSearchParams(req.query).toString()}`
      : '';
    const varyString = varyBy.map(h => `${h}:${req.get(h) || ''}`).join('|');
    const varyPart   = varyString ? `:${Buffer.from(varyString).toString('base64')}` : '';
    const key        = `covid:cache:${req.path}${queryString}${varyPart}`;

    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        console.log(`✅ Cache HIT: ${key}`);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', key);
        return res.json(JSON.parse(cachedData));
      }

      console.log(`❌ Cache MISS: ${key}`);
      res.setHeader('X-Cache', 'MISS');

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        const cacheData = JSON.stringify(data);
        redisClient.setEx(key, ttl, cacheData)
          .then(() => {
            console.log(`💾 Cached: ${key} (TTL: ${ttl}s, size: ${(cacheData.length / 1024).toFixed(2)}KB)`);
            if (tags.length > 0) {
              tags.forEach(tag => {
                redisClient.sAdd(`covid:cache:tag:${tag}`, key)
                  .catch(err => console.error(`Error adding tag ${tag}:`, err.message));
              });
            }
          })
          .catch(err => console.error('Redis setEx error:', err.message));

        res.setHeader('X-Cache-TTL', ttl);
        res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Redis cache error:', error.message);
      next();
    }
  };
};

// ─── Invalidation par pattern ─────────────────────────────────────────────────
export const invalidateCache = async (pattern = 'covid:cache:*') => {
  try {
    if (!isRedisConnected || !redisClient.isOpen) return 0;

    const keys = [];
    let cursor = '0';
    do {
      const scanResult = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      if (typeof scanResult === 'object' && scanResult.cursor !== undefined) {
        cursor = String(scanResult.cursor);
        keys.push(...scanResult.keys);
      } else if (Array.isArray(scanResult)) {
        cursor = String(scanResult[0]);
        keys.push(...scanResult[1]);
      } else { break; }
    } while (cursor !== '0');

    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`🗑️  Invalidated ${keys.length} cache keys matching "${pattern}"`);
    } else {
      console.log(`ℹ️  No cache keys found matching "${pattern}"`);
    }
    return keys.length;
  } catch (error) {
    console.error('❌ Cache invalidation error:', error.message);
    return 0;
  }
};

// ─── Invalidation par tag ─────────────────────────────────────────────────────
export const invalidateCacheByTag = async (tag) => {
  try {
    if (!isRedisConnected || !redisClient.isOpen) return 0;
    const tagKey = `covid:cache:tag:${tag}`;
    const keys   = await redisClient.sMembers(tagKey);
    if (keys.length > 0) {
      await redisClient.del(keys);
      await redisClient.del(tagKey);
      console.log(`🗑️  Invalidated ${keys.length} cache keys with tag "${tag}"`);
      return keys.length;
    }
    return 0;
  } catch (error) {
    console.error('❌ Tag invalidation error:', error.message);
    return 0;
  }
};

// ─── Warmup cache ─────────────────────────────────────────────────────────────
// ✅ Utilise le nom du service Docker "backend" (pas localhost) pour éviter
//    les erreurs de connexion à l'intérieur du réseau Docker
export const warmupCache = async () => {
  console.log('🔥 Starting cache warmup...');

  // Résolution d'hôte : dans Docker, le service s'appelle "backend" sur le
  // réseau interne. En dev local, on utilise localhost.
  const host   = process.env.NODE_ENV === 'production' ? 'backend' : 'localhost';
  const port   = process.env.PORT || 5000;
  const base   = `http://${host}:${port}/api`;

  const criticalEndpoints = [
    '/get_total_cases_per_country',
    '/get_total_deaths_per_country',
    '/get_total_recovered_per_country',
    '/get_all_timeseries',
  ];

  for (const endpoint of criticalEndpoints) {
    try {
      // Petit délai pour laisser le serveur finir de démarrer
      await new Promise(r => setTimeout(r, 500));
      const response = await fetch(`${base}${endpoint}`);
      if (response.ok) {
        console.log(`✅ Warmed up: ${endpoint}`);
      } else {
        console.warn(`⚠️  Warmup non-OK ${endpoint}: ${response.status}`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to warmup ${endpoint}:`, error.message);
    }
  }

  console.log('🔥 Cache warmup complete!');
};

// ─── Stats du cache ───────────────────────────────────────────────────────────
export const getCacheStats = async () => {
  try {
    if (!isRedisConnected || !redisClient.isOpen) return { error: 'Redis not connected' };

    const keys = [];
    let cursor = '0';
    do {
      const scanResult = await redisClient.scan(cursor, { MATCH: 'covid:cache:*', COUNT: 100 });
      if (typeof scanResult === 'object' && scanResult.cursor !== undefined) {
        cursor = String(scanResult.cursor);
        keys.push(...scanResult.keys);
      } else if (Array.isArray(scanResult)) {
        cursor = String(scanResult[0]);
        keys.push(...scanResult[1]);
      } else { break; }
    } while (cursor !== '0');

    let totalSize = 0;
    for (const key of keys.slice(0, 100)) {
      try {
        const value = await redisClient.get(key);
        if (value) totalSize += value.length;
      } catch (_) {}
    }

    const stats = {
      totalKeys:        keys.length,
      estimatedSizeKB:  (totalSize / 1024).toFixed(2),
      sampleSize:       Math.min(100, keys.length),
      timestamp:        new Date().toISOString(),
      topKeys:          keys.slice(0, 10),
    };

    console.log(`📊 Cache Stats: ${stats.totalKeys} keys, ~${stats.estimatedSizeKB}KB`);
    return stats;
  } catch (error) {
    console.error('❌ Error getting cache stats:', error.message);
    return { error: error.message };
  }
};

export { redisClient };