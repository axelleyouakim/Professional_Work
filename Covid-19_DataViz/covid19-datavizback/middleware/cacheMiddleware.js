import redis from 'redis';

// ✅ FIX: Détecte si on est dans Docker ou en local
const REDIS_URL = process.env.REDIS_URL || 
  (process.env.NODE_ENV === 'production' ? 'redis://redis:6379' : 'redis://localhost:6379');

const redisClient = redis.createClient({
  url: REDIS_URL
});

// ✅ FIX: Gère les erreurs sans crasher
redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
  // Ne pas crasher l'app si Redis est down
});

redisClient.on('connect', () => console.log('✅ Redis connected'));

// ✅ FIX: Connect avec try/catch
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

// ════════════════════════════════════════════════════════════
// CACHE MIDDLEWARE
// ════════════════════════════════════════════════════════════
export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // ✅ Skip si Redis pas connecté
    if (!isRedisConnected || !redisClient.isOpen) {
      return next();
    }

    const queryString = Object.keys(req.query).length > 0 
      ? `?${new URLSearchParams(req.query).toString()}`
      : '';
    
    const key = `covid:cache:${req.path}${queryString}`;
    
    try {
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.json(JSON.parse(cachedData));
      }
      
      console.log(`❌ Cache MISS: ${key}`);
      
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        redisClient.setEx(key, duration, JSON.stringify(data))
          .then(() => console.log(`💾 Cached: ${key} (TTL: ${duration}s)`))
          .catch(err => console.error('Redis setEx error:', err.message));
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Redis cache error:', error.message);
      next();
    }
  };
};

// ════════════════════════════════════════════════════════════
// CACHE INVALIDATION - ✅ FIXED
// ════════════════════════════════════════════════════════════
export const invalidateCache = async (pattern = 'covid:cache:*') => {
  try {
    if (!isRedisConnected || !redisClient.isOpen) {
      console.log('⚠️  Redis not available, skipping cache invalidation');
      return 0;
    }

    const keys = [];
    let cursor = '0'; // ✅ FIX: String au lieu de number

    do {
      // ✅ FIX: Utilise scanIterator pour éviter les problèmes de type
      const scanResult = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      // ✅ FIX: Gère les deux formats possibles de retour
      if (typeof scanResult === 'object' && scanResult.cursor !== undefined) {
        // Format: { cursor: '0', keys: [...] }
        cursor = String(scanResult.cursor);
        keys.push(...scanResult.keys);
      } else if (Array.isArray(scanResult)) {
        // Format: ['0', [...keys]]
        cursor = String(scanResult[0]);
        keys.push(...scanResult[1]);
      } else {
        console.error('⚠️  Unexpected scan result format:', scanResult);
        break;
      }
    } while (cursor !== '0');

    if (keys.length > 0) {
      // ✅ FIX: Delete en batch pour performance
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

// ════════════════════════════════════════════════════════════
// CACHE STATS
// ════════════════════════════════════════════════════════════
export const getCacheStats = async () => {
  try {
    if (!isRedisConnected || !redisClient.isOpen) {
      return { error: 'Redis not connected' };
    }

    const keys = [];
    let cursor = '0'; // ✅ FIX: String

    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: 'covid:cache:*',
        COUNT: 100
      });
      
      // ✅ FIX: Même logique que invalidateCache
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

    const stats = {
      totalKeys: keys.length,
      keys: keys,
      timestamp: new Date().toISOString()
    };

    console.log(`📊 Cache Stats: ${stats.totalKeys} keys`);
    return stats;
  } catch (error) {
    console.error('❌ Error getting cache stats:', error.message);
    return { error: error.message };
  }
};

export { redisClient };