import express from 'express';
import { covidController } from '../controllers/covidController.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';
import { validateQueryParams } from '../middleware/validationMiddleware.js';
import { rateLimitMiddleware, throttleMiddleware, routeRateLimits } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.use(rateLimitMiddleware({ max: 200, windowMs: 60000 }));

router.get('/', covidController.healthCheck);

router.post('/cache/invalidate', routeRateLimits.expensive, covidController.invalidateCache);
router.get('/cache/stats', routeRateLimits.standard, covidController.getCacheStats);

router.get('/covid-data', routeRateLimits.standard, covidController.getAllCovidData);
router.get('/get_country', routeRateLimits.light, cacheMiddleware(7200), covidController.getCountries);

router.get(
  '/get_death_by_country', 
  throttleMiddleware(500),
  validateQueryParams(['country']), 
  covidController.getDeathByCountry
);

router.get('/get_total_cases', routeRateLimits.light, cacheMiddleware(3600), covidController.getTotalCases);
router.get('/get_total_deaths', routeRateLimits.light, cacheMiddleware(3600), covidController.getTotalDeaths);
router.get('/get_total_recovered', routeRateLimits.light, cacheMiddleware(3600), covidController.getTotalRecovered);

router.get('/get_all_country_and_death', routeRateLimits.standard, covidController.getAllCountryAndDeath);
router.get('/get_country_death_and_cases', routeRateLimits.standard, covidController.getCountryDeathAndCases);

router.get(
  '/get_total_cases_per_country', 
  throttleMiddleware(300),
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

router.get(
  '/get_cases_time_series/:country', 
  throttleMiddleware(500),
  cacheMiddleware(7200),
  covidController.getCasesTimeSeriesByCountry
);

router.get(
  '/get_cases_time_series', 
  throttleMiddleware(500),
  cacheMiddleware(7200), 
  covidController.getCasesTimeSeries
);

router.get('/get_mean_cases', routeRateLimits.standard, cacheMiddleware(1800), covidController.getMeanCases);
router.get('/get_cases_evolution', routeRateLimits.standard, cacheMiddleware(1800), covidController.getCasesEvolution);
router.get('/get_kmeans_clusters', routeRateLimits.expensive, cacheMiddleware(3600), covidController.getKMeansClusters);

router.get('/get_28_day_cases', routeRateLimits.light, cacheMiddleware(3600), covidController.get28DayCases);
router.get('/get_28_day_cases_per_country', routeRateLimits.standard, cacheMiddleware(3600), covidController.get28DayCasesPerCountry);
router.get('/get_28_day_deaths', routeRateLimits.light, cacheMiddleware(3600), covidController.get28DayDeaths);
router.get('/get_28_day_deaths_per_country', routeRateLimits.standard, cacheMiddleware(3600), covidController.get28DayDeathsPerCountry);
router.get('/get_death_cases_28_days', routeRateLimits.standard, covidController.getDeathCases28Days);

router.get('/get_total_vaccine_doses', routeRateLimits.light, cacheMiddleware(3600), covidController.getTotalVaccineDoses);
router.get(
  '/get_vaccine_doses_per_country', 
  throttleMiddleware(500),
  validateQueryParams(['country']), 
  covidController.getVaccineDosesPerCountry
);
router.get('/get_28_day_vaccine_doses', routeRateLimits.light, cacheMiddleware(3600), covidController.get28DayVaccineDoses);
router.get('/get_28_day_vaccine_doses_per_country', routeRateLimits.standard, cacheMiddleware(3600), covidController.get28DayVaccineDosesPerCountry);

router.get('/get_available_date_range', routeRateLimits.light, cacheMiddleware(7200), covidController.getAvailableDateRange);

router.get(
  '/get_data_at_date', 
  throttleMiddleware(300),
  cacheMiddleware(7200),
  covidController.getDataAtSpecificDate
);

router.get(
  '/get_global_totals_at_date', 
  throttleMiddleware(300),
  cacheMiddleware(7200), 
  covidController.getGlobalTotalsAtDate
);

router.get(
  '/get_all_timeseries', 
  routeRateLimits.expensive,
  cacheMiddleware(86400),
  covidController.getAllTimeSeriesData
);

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