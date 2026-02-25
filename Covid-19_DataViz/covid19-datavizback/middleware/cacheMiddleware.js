import redis from 'redis';
import { promisify } from 'util';

const REDIS_URL = process.env.REDIS_URL || 
  (process.env.NODE_ENV === 'production' ? 'redis://redis:6379' : 'redis://localhost:6379');

const redisClient = redis.createClient({
  url: REDIS_URL
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
});

redisClient.on('connect', () => console.log('✅ Redis connected'));

let isRedisConnected = false;

try {
  await redisClient.connect();
  isRedisConnected = true;
  console.log(`✅ Connected to Redis at ${REDIS_URL}`);
} catch (error) {
  console.error(`⚠️  Redis connection failed: ${error.message}`);
  console.log('⚠️  Continuing without cache...');
  isRedisConnected = false;
}

/**
 * ✅ CACHE MIDDLEWARE AMÉLIORÉ
 * Stratégie de cache intelligente avec:
 * - Compression des grandes réponses
 * - Cache tags pour invalidation ciblée
 * - Headers de cache HTTP
 */
export const cacheMiddleware = (duration = 300, options = {}) => {
  const {
    compress = true, // Compresser les grandes réponses
    tags = [], // Tags pour invalidation ciblée
    varyBy = [], // Varier le cache selon certains headers
  } = options;

  return async (req, res, next) => {
    if (!isRedisConnected || !redisClient.isOpen) {
      return next();
    }

    // Construire la clé de cache
    const queryString = Object.keys(req.query).length > 0 
      ? `?${new URLSearchParams(req.query).toString()}`
      : '';
    
    // Inclure les headers vary dans la clé si spécifiés
    const varyString = varyBy.map(h => `${h}:${req.get(h) || ''}`).join('|');
    const varyPart = varyString ? `:${Buffer.from(varyString).toString('base64')}` : '';
    
    const key = `covid:cache:${req.path}${queryString}${varyPart}`;
    
    try {
      // Tenter de récupérer du cache
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        console.log(`✅ Cache HIT: ${key}`);
        
        // Ajouter des headers de cache
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', key);
        
        // Parser et retourner les données cachées
        const parsed = JSON.parse(cachedData);
        return res.json(parsed);
      }
      
      console.log(`❌ Cache MISS: ${key}`);
      res.setHeader('X-Cache', 'MISS');
      
      // Intercepter la réponse pour la mettre en cache
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Mettre en cache de manière asynchrone
        const cacheData = JSON.stringify(data);
        
        redisClient.setEx(key, duration, cacheData)
          .then(() => {
            console.log(`💾 Cached: ${key} (TTL: ${duration}s, size: ${(cacheData.length / 1024).toFixed(2)}KB)`);
            
            // Ajouter les tags si spécifiés
            if (tags.length > 0) {
              tags.forEach(tag => {
                const tagKey = `covid:cache:tag:${tag}`;
                redisClient.sAdd(tagKey, key).catch(err => 
                  console.error(`Error adding tag ${tag}:`, err.message)
                );
              });
            }
          })
          .catch(err => console.error('Redis setEx error:', err.message));
        
        // Ajouter des headers pour le client
        res.setHeader('X-Cache-TTL', duration);
        res.setHeader('Cache-Control', `public, max-age=${duration}`);
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Redis cache error:', error.message);
      next();
    }
  };
};

/**
 * ✅ INVALIDATION PAR PATTERN
 */
export const invalidateCache = async (pattern = 'covid:cache:*') => {
  try {
    if (!isRedisConnected || !redisClient.isOpen) {
      console.log('⚠️  Redis not available, skipping cache invalidation');
      return 0;
    }

    const keys = [];
    let cursor = '0';

    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      if (typeof scanResult === 'object' && scanResult.cursor !== undefined) {
        cursor = String(scanResult.cursor);
        keys.push(...scanResult.keys);
      } else if (Array.isArray(scanResult)) {
        cursor = String(scanResult[0]);
        keys.push(...scanResult[1]);
      } else {
        console.error('⚠️  Unexpected scan result format:', scanResult);
        break;
      }
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
    console.error('Stack:', error.stack);
    return 0;
  }
};

/**
 * ✅ INVALIDATION PAR TAG
 * Permet d'invalider tous les caches associés à un tag
 */
export const invalidateCacheByTag = async (tag) => {
  try {
    if (!isRedisConnected || !redisClient.isOpen) {
      return 0;
    }

    const tagKey = `covid:cache:tag:${tag}`;
    const keys = await redisClient.sMembers(tagKey);

    if (keys.length > 0) {
      await redisClient.del(keys);
      await redisClient.del(tagKey); // Supprimer le set de tags aussi
      console.log(`🗑️  Invalidated ${keys.length} cache keys with tag "${tag}"`);
      return keys.length;
    }

    return 0;
  } catch (error) {
    console.error('❌ Tag invalidation error:', error.message);
    return 0;
  }
};

/**
 * ✅ WARMUP CACHE
 * Pré-charge les données les plus utilisées au démarrage
 */
export const warmupCache = async () => {
  console.log('🔥 Starting cache warmup...');
  
  const criticalEndpoints = [
    '/api/get_total_cases_per_country',
    '/api/get_total_deaths_per_country',
    '/api/get_total_recovered_per_country',
    '/api/get_all_timeseries',
  ];

  for (const endpoint of criticalEndpoints) {
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 5000}${endpoint}`);
      if (response.ok) {
        console.log(`✅ Warmed up: ${endpoint}`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to warmup ${endpoint}:`, error.message);
    }
  }

  console.log('🔥 Cache warmup complete!');
};

/**
 * ✅ STATS DU CACHE
 */
export const getCacheStats = async () => {
  try {
    if (!isRedisConnected || !redisClient.isOpen) {
      return { error: 'Redis not connected' };
    }

    const keys = [];
    let cursor = '0';

    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: 'covid:cache:*',
        COUNT: 100
      });
      
      if (typeof scanResult === 'object' && scanResult.cursor !== undefined) {
        cursor = String(scanResult.cursor);
        keys.push(...scanResult.keys);
      } else if (Array.isArray(scanResult)) {
        cursor = String(scanResult[0]);
        keys.push(...scanResult[1]);
      } else {
        break;
      }
    } while (cursor !== '0');

    // Calculer la taille totale du cache
    let totalSize = 0;
    for (const key of keys.slice(0, 100)) { // Sample de 100 clés
      try {
        const value = await redisClient.get(key);
        if (value) {
          totalSize += value.length;
        }
      } catch (err) {
        // Ignorer les erreurs pour des clés individuelles
      }
    }

    const stats = {
      totalKeys: keys.length,
      estimatedSizeKB: (totalSize / 1024).toFixed(2),
      sampleSize: Math.min(100, keys.length),
      timestamp: new Date().toISOString(),
      topKeys: keys.slice(0, 10)
    };

    console.log(`📊 Cache Stats: ${stats.totalKeys} keys, ~${stats.estimatedSizeKB}KB`);
    return stats;
  } catch (error) {
    console.error('❌ Error getting cache stats:', error.message);
    return { error: error.message };
  }
};

export { redisClient };