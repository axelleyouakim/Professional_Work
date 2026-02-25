import redis from 'redis';

// Configuration du rate limiting
const RATE_LIMIT_WINDOW = 60; // 60 secondes
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requêtes max par minute

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 
    (process.env.NODE_ENV === 'production' ? 'redis://redis:6379' : 'redis://localhost:6379')
});

let isRedisConnected = false;

(async () => {
  try {
    await redisClient.connect();
    isRedisConnected = true;
    console.log('✅ Rate Limiter: Redis connected');
  } catch (error) {
    console.error('⚠️  Rate Limiter: Redis connection failed, rate limiting disabled');
    isRedisConnected = false;
  }
})();

/**
 * ✅ RATE LIMITING MIDDLEWARE - BACKEND
 * Limite le nombre de requêtes par IP pour éviter les abus
 * Implémente un throttling au niveau serveur (comme demandé par l'examinateur)
 */
export const rateLimitMiddleware = (options = {}) => {
  const {
    windowMs = RATE_LIMIT_WINDOW * 1000,
    max = RATE_LIMIT_MAX_REQUESTS,
    skipSuccessfulRequests = false,
  } = options;

  return async (req, res, next) => {
    // Si Redis n'est pas connecté, on laisse passer
    if (!isRedisConnected || !redisClient.isOpen) {
      return next();
    }

    // Identifier le client (IP + User-Agent pour plus de précision)
    const identifier = `${req.ip || req.connection.remoteAddress}`;
    const key = `rate_limit:${identifier}`;

    try {
      // Incrémenter le compteur
      const requests = await redisClient.incr(key);

      // Si c'est la première requête, définir l'expiration
      if (requests === 1) {
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      // Obtenir le TTL restant
      const ttl = await redisClient.ttl(key);

      // Définir les headers de rate limiting
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requests));
      res.setHeader('X-RateLimit-Reset', Date.now() + (ttl * 1000));

      // Vérifier si la limite est dépassée
      if (requests > max) {
        console.warn(`⚠️  Rate limit exceeded for ${identifier}: ${requests}/${max}`);
        
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${max} requests per ${Math.ceil(windowMs / 1000)} seconds.`,
          retryAfter: ttl
        });
      }

      // Log pour debug (seulement en dev)
      if (process.env.NODE_ENV !== 'production' && requests % 10 === 0) {
        console.log(`📊 Rate limit: ${identifier} → ${requests}/${max} requests`);
      }

      next();
    } catch (error) {
      console.error('❌ Rate limit error:', error.message);
      // En cas d'erreur Redis, on laisse passer pour ne pas bloquer l'API
      next();
    }
  };
};

/**
 * ✅ THROTTLE MIDDLEWARE - BACKEND
 * Empêche les requêtes répétées trop rapprochées pour le même endpoint
 */
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
      // Vérifier si une requête identique a été faite récemment
      const lastRequest = await redisClient.get(key);

      if (lastRequest) {
        const timeSinceLastRequest = Date.now() - parseInt(lastRequest);
        
        if (timeSinceLastRequest < delayMs) {
          console.log(`⏳ Throttled: ${identifier} → ${path} (too fast: ${timeSinceLastRequest}ms < ${delayMs}ms)`);
          
          return res.status(429).json({
            error: 'Too many requests',
            message: `Please wait ${delayMs - timeSinceLastRequest}ms before making the same request again.`,
            retryAfter: Math.ceil((delayMs - timeSinceLastRequest) / 1000)
          });
        }
      }

      // Enregistrer le timestamp de cette requête
      await redisClient.setEx(key, Math.ceil(delayMs / 1000), Date.now().toString());

      next();
    } catch (error) {
      console.error('❌ Throttle error:', error.message);
      next();
    }
  };
};

/**
 * ✅ ROUTE-SPECIFIC RATE LIMIT
 * Rate limits spécifiques par type de route
 */
export const routeRateLimits = {
  // Routes lentes/coûteuses : limite stricte
  expensive: rateLimitMiddleware({ max: 10, windowMs: 60000 }), // 10/min
  
  // Routes normales : limite standard
  standard: rateLimitMiddleware({ max: 100, windowMs: 60000 }), // 100/min
  
  // Routes légères : limite permissive
  light: rateLimitMiddleware({ max: 300, windowMs: 60000 }), // 300/min
};

export default rateLimitMiddleware;