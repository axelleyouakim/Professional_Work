import express from 'express';
import { covidController } from '../controllers/covidController.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';
import { validateQueryParams } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.get('/', covidController.healthCheck);

// ════════════════════════════════════════════════════════════
// NOUVEAU - Cache Management
// ════════════════════════════════════════════════════════════
router.post('/cache/invalidate', covidController.invalidateCache);
router.get('/cache/stats', covidController.getCacheStats);

router.get('/covid-data', covidController.getAllCovidData);

router.get('/get_country', covidController.getCountries);
router.get('/get_death_by_country', validateQueryParams(['country']), covidController.getDeathByCountry);

// ✅ Cache adapté selon la fraîcheur des données
router.get('/get_total_cases', cacheMiddleware(3600), covidController.getTotalCases); // 1h cache (données statiques)
router.get('/get_total_deaths', cacheMiddleware(3600), covidController.getTotalDeaths);
router.get('/get_total_recovered', cacheMiddleware(3600), covidController.getTotalRecovered);

router.get('/get_all_country_and_death', covidController.getAllCountryAndDeath);
router.get('/get_country_death_and_cases', covidController.getCountryDeathAndCases);

router.get('/get_total_cases_per_country', cacheMiddleware(3600), covidController.getTotalCasesPerCountry);
router.get('/get_total_deaths_per_country', cacheMiddleware(3600), covidController.getTotalDeathsPerCountry);
router.get('/get_total_recovered_per_country', cacheMiddleware(3600), covidController.getTotalRecoveredPerCountry);

router.get('/get_cases_time_series', cacheMiddleware(3600), covidController.getCasesTimeSeries);

router.get('/get_mean_cases', cacheMiddleware(1800), covidController.getMeanCases);
router.get('/get_cases_evolution', cacheMiddleware(1800), covidController.getCasesEvolution);
router.get('/get_kmeans_clusters', cacheMiddleware(3600), covidController.getKMeansClusters);

router.get('/get_28_day_cases', cacheMiddleware(3600), covidController.get28DayCases);
router.get('/get_28_day_cases_per_country', cacheMiddleware(3600), covidController.get28DayCasesPerCountry);
router.get('/get_28_day_deaths', cacheMiddleware(3600), covidController.get28DayDeaths);
router.get('/get_28_day_deaths_per_country', cacheMiddleware(3600), covidController.get28DayDeathsPerCountry);
router.get('/get_death_cases_28_days', covidController.getDeathCases28Days);

router.get('/get_total_vaccine_doses', cacheMiddleware(3600), covidController.getTotalVaccineDoses);
router.get('/get_vaccine_doses_per_country', validateQueryParams(['country']), covidController.getVaccineDosesPerCountry);
router.get('/get_28_day_vaccine_doses', cacheMiddleware(3600), covidController.get28DayVaccineDoses);
router.get('/get_28_day_vaccine_doses_per_country', cacheMiddleware(3600), covidController.get28DayVaccineDosesPerCountry);

export default router;