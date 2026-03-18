import redis from 'redis';

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX_REQUESTS = 100;

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 
    (process.env.NODE_ENV === 'production' ? 'redis://redis:6379' : 'redis://localhost:6379')
});

let isRedisConnected = false;

(async () => {
  try {
    await redisClient.connect();
    isRedisConnected = true;
    console.log('Rate Limiter: Redis connected');
  } catch (error) {
    console.error('Rate Limiter: Redis connection failed, rate limiting disabled');
    isRedisConnected = false;
  }
})();


export const rateLimitMiddleware = (options = {}) => {
  const {
    windowMs = RATE_LIMIT_WINDOW * 1000,
    max = RATE_LIMIT_MAX_REQUESTS,
    skipSuccessfulRequests = false,
  } = options;

  return async (req, res, next) => {
    if (!isRedisConnected || !redisClient.isOpen) {
      return next();
    }

    const identifier = `${req.ip || req.connection.remoteAddress}`;
    const key = `rate_limit:${identifier}`;

    try {
      const requests = await redisClient.incr(key);

      if (requests === 1) {
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      const ttl = await redisClient.ttl(key);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requests));
      res.setHeader('X-RateLimit-Reset', Date.now() + (ttl * 1000));

      if (requests > max) {
        console.warn(`Rate limit exceeded for ${identifier}: ${requests}/${max}`);
        
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${max} requests per ${Math.ceil(windowMs / 1000)} seconds.`,
          retryAfter: ttl
        });
      }

      if (process.env.NODE_ENV !== 'production' && requests % 10 === 0) {
        console.log(`Rate limit: ${identifier} → ${requests}/${max} requests`);
      }

      next();
    } catch (error) {
      console.error('Rate limit error:', error.message);
      next();
    }
  };
};


export const throttleMiddleware = (delayMs = 300) => {
  return async (req, res, next) => {
    if (!isRedisConnected || !redisClient.isOpen) {
      return next();
    }

    const identifier = `${req.ip || req.connection.remoteAddress}`;
    const path = req.path;
    const queryString = new URLSearchParams(req.query).toString();
    const key = `throttle:${identifier}:${path}:${queryString}`;

    try {
      const lastRequest = await redisClient.get(key);

      if (lastRequest) {
        const timeSinceLastRequest = Date.now() - parseInt(lastRequest);
        
        if (timeSinceLastRequest < delayMs) {
          console.log(`Throttled: ${identifier} → ${path} (too fast: ${timeSinceLastRequest}ms < ${delayMs}ms)`);
          
          return res.status(429).json({
            error: 'Too many requests',
            message: `Please wait ${delayMs - timeSinceLastRequest}ms before making the same request again.`,
            retryAfter: Math.ceil((delayMs - timeSinceLastRequest) / 1000)
          });
        }
      }

      await redisClient.setEx(key, Math.ceil(delayMs / 1000), Date.now().toString());

      next();
    } catch (error) {
      console.error('Throttle error:', error.message);
      next();
    }
  };
};


export const routeRateLimits = {
  expensive: rateLimitMiddleware({ max: 10, windowMs: 60000 }),
  
  standard: rateLimitMiddleware({ max: 100, windowMs: 60000 }),
  
  light: rateLimitMiddleware({ max: 300, windowMs: 60000 }),
};

export default rateLimitMiddleware;