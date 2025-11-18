import { covidService } from '../services/covidService.js';
import { AppError } from '../middleware/errorMiddleware.js';

export const covidController = {
  healthCheck: (req, res) => {
    res.json({ status: 'OK', message: 'COVID-19 API is running' });
  },

  getAllCovidData: async (req, res, next) => {
    try {
      const data = await covidService.getAllCovidData();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getCountries: async (req, res, next) => {
    try {
      const countries = await covidService.getCountries();
      res.json(countries);
    } catch (error) {
      next(error);
    }
  },

  getDeathByCountry: async (req, res, next) => {
    try {
      const { country } = req.query;
      const data = await covidService.getDeathByCountry(country);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getTotalCases: async (req, res, next) => {
    try {
      const data = await covidService.getTotalCases();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getTotalDeaths: async (req, res, next) => {
    try {
      const data = await covidService.getTotalDeaths();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getTotalRecovered: async (req, res, next) => {
    try {
      const data = await covidService.getTotalRecovered();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getAllCountryAndDeath: async (req, res, next) => {
    try {
      const data = await covidService.getAllCountryAndDeath();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getCountryDeathAndCases: async (req, res, next) => {
    try {
      const data = await covidService.getCountryDeathAndCases();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getTotalCasesPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.getTotalCasesPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getTotalDeathsPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.getTotalDeathsPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getTotalRecoveredPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.getTotalRecoveredPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getCasesTimeSeries: async (req, res, next) => {
    try {
      const { period } = req.query; // Récupérer period (optionnel)
      const data = await covidService.getCasesTimeSeries(period);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getMeanCases: async (req, res, next) => {
    try {
      const data = await covidService.getMeanCases();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getCasesEvolution: async (req, res, next) => {
    try {
      const data = await covidService.getCasesEvolution();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getKMeansClusters: async (req, res, next) => {
    try {
      const data = await covidService.getKMeansClusters();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  get28DayCases: async (req, res, next) => {
    try {
      const data = await covidService.get28DayCases();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  get28DayCasesPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.get28DayCasesPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  get28DayDeaths: async (req, res, next) => {
    try {
      const data = await covidService.get28DayDeaths();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  get28DayDeathsPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.get28DayDeathsPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getDeathCases28Days: async (req, res, next) => {
    try {
      const data = await covidService.getDeathCases28Days();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getTotalVaccineDoses: async (req, res, next) => {
    try {
      const data = await covidService.getTotalVaccineDoses();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  getVaccineDosesPerCountry: async (req, res, next) => {
    try {
      const { country } = req.query;
      const data = await covidService.getVaccineDosesPerCountry(country);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  get28DayVaccineDoses: async (req, res, next) => {
    try {
      const data = await covidService.get28DayVaccineDoses();
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  get28DayVaccineDosesPerCountry: async (req, res, next) => {
    try {
      const data = await covidService.get28DayVaccineDosesPerCountry();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
};