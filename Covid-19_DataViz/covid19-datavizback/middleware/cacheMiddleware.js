import redis from 'redis';

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log('Redis connected'));

await redisClient.connect();

export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (!redisClient.isOpen) {
      console.log('⚠️ Redis not available, skipping cache');
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
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
          .catch(err => console.error('Redis setEx error:', err));
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Redis cache error:', error);
      next();
    }
  };
};

export { redisClient };