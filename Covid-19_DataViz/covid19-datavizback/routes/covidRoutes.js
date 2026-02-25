import express from 'express';
import { covidController } from '../controllers/covidController.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';
import { validateQueryParams } from '../middleware/validationMiddleware.js';
import { rateLimitMiddleware, throttleMiddleware, routeRateLimits } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// ✅ RATE LIMITING GLOBAL sur toutes les routes
router.use(rateLimitMiddleware({ max: 200, windowMs: 60000 })); // 200 requêtes/min max

// Health check (pas de throttle)
router.get('/', covidController.healthCheck);

// Cache management (rate limit strict)
router.post('/cache/invalidate', routeRateLimits.expensive, covidController.invalidateCache);
router.get('/cache/stats', routeRateLimits.standard, covidController.getCacheStats);

// Routes basiques
router.get('/covid-data', routeRateLimits.standard, covidController.getAllCovidData);
router.get('/get_country', routeRateLimits.light, cacheMiddleware(7200), covidController.getCountries);

// ✅ THROTTLING sur les routes avec query params
router.get(
  '/get_death_by_country', 
  throttleMiddleware(500), // Throttle 500ms
  validateQueryParams(['country']), 
  covidController.getDeathByCountry
);

// Stats globales (cache long + rate limit léger)
router.get('/get_total_cases', routeRateLimits.light, cacheMiddleware(3600), covidController.getTotalCases);
router.get('/get_total_deaths', routeRateLimits.light, cacheMiddleware(3600), covidController.getTotalDeaths);
router.get('/get_total_recovered', routeRateLimits.light, cacheMiddleware(3600), covidController.getTotalRecovered);

// Stats par pays
router.get('/get_all_country_and_death', routeRateLimits.standard, covidController.getAllCountryAndDeath);
router.get('/get_country_death_and_cases', routeRateLimits.standard, covidController.getCountryDeathAndCases);

// ✅ Routes per-country avec THROTTLING (souvent appelées avec le slider)
router.get(
  '/get_total_cases_per_country', 
  throttleMiddleware(300), // Throttle 300ms
  cacheMiddleware(3600), 
  covidController.getTotalCasesPerCountry
);

router.get(
  '/get_total_deaths_per_country', 
  throttleMiddleware(300),
  cacheMiddleware(3600), 
  covidController.getTotalDeathsPerCountry
);

router.get(
  '/get_total_recovered_per_country', 
  throttleMiddleware(300),
  cacheMiddleware(3600), 
  covidController.getTotalRecoveredPerCountry
);

// ✅ Time series par pays (THROTTLE + CACHE LONG)
router.get(
  '/get_cases_time_series/:country', 
  throttleMiddleware(500), // Throttle plus long pour les time series
  cacheMiddleware(7200), // Cache 2h
  covidController.getCasesTimeSeriesByCountry
);

router.get(
  '/get_cases_time_series', 
  throttleMiddleware(500),
  cacheMiddleware(7200), 
  covidController.getCasesTimeSeries
);

// Analytics (rate limit standard)
router.get('/get_mean_cases', routeRateLimits.standard, cacheMiddleware(1800), covidController.getMeanCases);
router.get('/get_cases_evolution', routeRateLimits.standard, cacheMiddleware(1800), covidController.getCasesEvolution);
router.get('/get_kmeans_clusters', routeRateLimits.expensive, cacheMiddleware(3600), covidController.getKMeansClusters);

// 28-day stats
router.get('/get_28_day_cases', routeRateLimits.light, cacheMiddleware(3600), covidController.get28DayCases);
router.get('/get_28_day_cases_per_country', routeRateLimits.standard, cacheMiddleware(3600), covidController.get28DayCasesPerCountry);
router.get('/get_28_day_deaths', routeRateLimits.light, cacheMiddleware(3600), covidController.get28DayDeaths);
router.get('/get_28_day_deaths_per_country', routeRateLimits.standard, cacheMiddleware(3600), covidController.get28DayDeathsPerCountry);
router.get('/get_death_cases_28_days', routeRateLimits.standard, covidController.getDeathCases28Days);

// Vaccine data
router.get('/get_total_vaccine_doses', routeRateLimits.light, cacheMiddleware(3600), covidController.getTotalVaccineDoses);
router.get(
  '/get_vaccine_doses_per_country', 
  throttleMiddleware(500),
  validateQueryParams(['country']), 
  covidController.getVaccineDosesPerCountry
);
router.get('/get_28_day_vaccine_doses', routeRateLimits.light, cacheMiddleware(3600), covidController.get28DayVaccineDoses);
router.get('/get_28_day_vaccine_doses_per_country', routeRateLimits.standard, cacheMiddleware(3600), covidController.get28DayVaccineDosesPerCountry);

// Date-specific queries
router.get('/get_available_date_range', routeRateLimits.light, cacheMiddleware(7200), covidController.getAvailableDateRange);

// ✅ QUERIES BY DATE (utilisées par le slider) - THROTTLE AGRESSIF
router.get(
  '/get_data_at_date', 
  throttleMiddleware(300), // Throttle 300ms pour le slider
  cacheMiddleware(7200), // Cache long car les dates historiques ne changent pas
  covidController.getDataAtSpecificDate
);

router.get(
  '/get_global_totals_at_date', 
  throttleMiddleware(300),
  cacheMiddleware(7200), 
  covidController.getGlobalTotalsAtDate
);

// ✅ ALL TIME SERIES - Cache très long (données statiques)
router.get(
  '/get_all_timeseries', 
  routeRateLimits.expensive, // Route coûteuse
  cacheMiddleware(86400), // Cache 24h (données historiques ne changent pas)
  covidController.getAllTimeSeriesData
);

// Log de toutes les requêtes (dev only)
if (process.env.NODE_ENV !== 'production') {
  router.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`📡 ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

export default router;