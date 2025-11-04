import { covidService } from '../services/covidService.js';
import { AppError } from '../middleware/errorMiddleware.js';

export const covidController = {
  // Health check
  healthCheck: (req, res) => {
    res.json({ status: 'OK', message: 'COVID-19 API is running' });
  },

  // GET all COVID data
  getAllCovidData: async (req, res, next) => {
    try {
      const data = await covidService.getAllCovidData();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET countries list
  getCountries: async (req, res, next) => {
    try {
      const countries = await covidService.getCountries();
      res.json(countries);
    } catch (error) {
      next(error);
    }
  },

  // GET death by country
  getDeathByCountry: async (req, res, next) => {
    try {
      const { country } = req.query;
      const data = await covidService.getDeathByCountry(country);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET total cases
  getTotalCases: async (req, res, next) => {
    try {
      const data = await covidService.getTotalCases();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET total deaths
  getTotalDeaths: async (req, res, next) => {
    try {
      const data = await covidService.getTotalDeaths();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET total recovered
  getTotalRecovered: async (req, res, next) => {
    try {
      const data = await covidService.getTotalRecovered();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET all country and death
  getAllCountryAndDeath: async (req, res, next) => {
    try {
      const data = await covidService.getAllCountryAndDeath();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET country death and cases
  getCountryDeathAndCases: async (req, res, next) => {
    try {
      const data = await covidService.getCountryDeathAndCases();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET total cases per country
  getTotalCasesPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.getTotalCasesPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET total deaths per country
  getTotalDeathsPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.getTotalDeathsPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET total recovered per country
  getTotalRecoveredPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.getTotalRecoveredPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET cases time series
  getCasesTimeSeries: async (req, res, next) => {
    try {
      const data = await covidService.getCasesTimeSeries();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET mean cases
  getMeanCases: async (req, res, next) => {
    try {
      const data = await covidService.getMeanCases();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET cases evolution
  getCasesEvolution: async (req, res, next) => {
    try {
      const data = await covidService.getCasesEvolution();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET k-means clusters
  getKMeansClusters: async (req, res, next) => {
    try {
      const data = await covidService.getKMeansClusters();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET 28 day cases
  get28DayCases: async (req, res, next) => {
    try {
      const data = await covidService.get28DayCases();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET 28 day cases per country
  get28DayCasesPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.get28DayCasesPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET 28 day deaths
  get28DayDeaths: async (req, res, next) => {
    try {
      const data = await covidService.get28DayDeaths();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET 28 day deaths per country
  get28DayDeathsPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.get28DayDeathsPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET death cases 28 days
  getDeathCases28Days: async (req, res, next) => {
    try {
      const data = await covidService.getDeathCases28Days();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET total vaccine doses
  getTotalVaccineDoses: async (req, res, next) => {
    try {
      const data = await covidService.getTotalVaccineDoses();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET vaccine doses per country
  getVaccineDosesPerCountry: async (req, res, next) => {
    try {
      const { country } = req.query;
      const data = await covidService.getVaccineDosesPerCountry(country);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET 28 day vaccine doses
  get28DayVaccineDoses: async (req, res, next) => {
    try {
      const data = await covidService.get28DayVaccineDoses();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  // GET 28 day vaccine doses per country
  get28DayVaccineDosesPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.get28DayVaccineDosesPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
};