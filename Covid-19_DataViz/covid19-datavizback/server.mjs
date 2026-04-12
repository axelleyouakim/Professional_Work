import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import CovidData from './models/CovidData.js';
import covidRoutes from './routes/covidRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { warmupCache, invalidateCache } from './middleware/cacheMiddleware.js';
// ✅ FIX: import du rateLimitMiddleware + redisClient
import { routeRateLimits, redisClient } from './middleware/rateLimitMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    const count = await CovidData.countDocuments();
    if (count === 0) {
      console.log('No data in database. Run cleaning + import first:');
      console.log('   1. npm run clean');
      console.log('   2. node importCleanedData.mjs');
    } else {
      const countries = await CovidData.distinct('Country_Region');
      console.log(`Database has ${count} documents from ${countries.length} countries`);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// ✅ FIX: rate limiting branché sur toutes les routes /api
app.use('/api', routeRateLimits.standard);
app.use('/api', covidRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'COVID-19 DataViz API',
    version: '2.0',
    endpoints: '/api/*'
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const scheduleDailyMidnight = () => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = nextMidnight - now;

  setTimeout(async () => {
    try {
      console.log('Daily cache invalidation at midnight...');
      await invalidateCache('covid:cache:*');
      console.log('Cache cleared — will be refilled on next requests');
    } catch (err) {
      console.warn('Cache invalidation failed:', err.message);
    }
    scheduleDailyMidnight();
  }, msUntilMidnight);

  const h = Math.floor(msUntilMidnight / 3600000);
  const m = Math.floor((msUntilMidnight % 3600000) / 60000);
  console.log(`Next cache invalidation in ${h}h${m}m (at midnight)`);
};

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);

  setTimeout(async () => {
    try {
      await warmupCache();
    } catch (err) {
      console.warn('Cache warmup failed (non-fatal):', err.message);
    }
  }, 2000);

  scheduleDailyMidnight();
});

// ✅ FIX: fermeture propre de Redis au Ctrl+C / arrêt serveur
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  try {
    if (redisClient?.isOpen) {
      await redisClient.quit();
      console.log('Redis connection closed');
    }
  } catch (err) {
    console.warn('Redis cleanup error:', err.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    if (redisClient?.isOpen) await redisClient.quit();
  } catch (_) {}
  process.exit(0);
});