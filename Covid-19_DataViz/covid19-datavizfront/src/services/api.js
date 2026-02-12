const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

export const api = {
  getCountries: () => fetchAPI('/get_country'),
  getDeathByCountry: (country) => fetchAPI(`/get_death_by_country?country=${encodeURIComponent(country)}`),

  getTotalCases: (period) => {
    const url = period ? `/get_total_cases?period=${period}` : '/get_total_cases';
    return fetchAPI(url);
  },

  getTotalDeaths: (period) => {
    const url = period ? `/get_total_deaths?period=${period}` : '/get_total_deaths';
    return fetchAPI(url);
  },

  getTotalRecovered: (period) => {
    const url = period ? `/get_total_recovered?period=${period}` : '/get_total_recovered';
    return fetchAPI(url);
  },

  getAllCountryAndDeath: () => fetchAPI('/get_all_country_and_death'),
  getCountryDeathAndCases: () => fetchAPI('/get_country_death_and_cases'),

  getTotalCasesPerCountry: (period) => {
    const url = period ? `/get_total_cases_per_country?period=${period}` : '/get_total_cases_per_country';
    return fetchAPI(url);
  },

  getTotalDeathsPerCountry: (period) => {
    const url = period ? `/get_total_deaths_per_country?period=${period}` : '/get_total_deaths_per_country';
    return fetchAPI(url);
  },

  getTotalRecoveredPerCountry: (period) => {
    const url = period ? `/get_total_recovered_per_country?period=${period}` : '/get_total_recovered_per_country';
    return fetchAPI(url);
  },

  getCasesTimeSeries: (period) => {
    const url = period ? `/get_cases_time_series?period=${period}` : '/get_cases_time_series';
    return fetchAPI(url);
  },

  getCasesTimeSeriesByCountry: (country, period) => {
    const url = period 
      ? `/get_cases_time_series/${encodeURIComponent(country)}?period=${period}` 
      : `/get_cases_time_series/${encodeURIComponent(country)}`;
    return fetchAPI(url);
  },

  getDataAtSpecificDate: (date) => fetchAPI(`/get_data_at_date?date=${encodeURIComponent(date)}`),
  
  getGlobalTotalsAtDate: (date) => fetchAPI(`/get_global_totals_at_date?date=${encodeURIComponent(date)}`),

  getMeanCases: () => fetchAPI('/get_mean_cases'),
  getCasesEvolution: () => fetchAPI('/get_cases_evolution'),
  getKMeansClusters: () => fetchAPI('/get_kmeans_clusters'),

  get28DayCases: () => fetchAPI('/get_28_day_cases'),
  get28DayCasesPerCountry: () => fetchAPI('/get_28_day_cases_per_country'),
  get28DayDeaths: () => fetchAPI('/get_28_day_deaths'),
  get28DayDeathsPerCountry: () => fetchAPI('/get_28_day_deaths_per_country'),
  getDeathCases28Days: () => fetchAPI('/get_death_cases_28_days'),

  getTotalVaccineDoses: () => fetchAPI('/get_total_vaccine_doses'),
  getVaccineDosesPerCountry: (country) => fetchAPI(`/get_vaccine_doses_per_country?country=${encodeURIComponent(country)}`),
  get28DayVaccineDoses: () => fetchAPI('/get_28_day_vaccine_doses'),
  get28DayVaccineDosesPerCountry: () => fetchAPI('/get_28_day_vaccine_doses_per_country'),

  getCovidData: () => fetchAPI('/covid-data'),

  getAllTimeSeriesData: () => fetchAPI('/get_all_timeseries'),
};

export const getCountries = api.getCountries;
export const getTotalCases = api.getTotalCases;
export const getTotalDeaths = api.getTotalDeaths;
export const getTotalRecovered = api.getTotalRecovered;
export const getTotalCasesPerCountry = api.getTotalCasesPerCountry;
export const getTotalDeathsPerCountry = api.getTotalDeathsPerCountry;
export const getTotalRecoveredPerCountry = api.getTotalRecoveredPerCountry;
export const getCasesTimeSeries = api.getCasesTimeSeries;
export const get28DayCases = api.get28DayCases;
export const get28DayCasesPerCountry = api.get28DayCasesPerCountry;
export const get28DayDeaths = api.get28DayDeaths;
export const get28DayDeathsPerCountry = api.get28DayDeathsPerCountry;
export const getTotalVaccineDoses = api.getTotalVaccineDoses;
export const get28DayVaccineDoses = api.get28DayVaccineDoses;
export const get28DayVaccineDosesPerCountry = api.get28DayVaccineDosesPerCountry;

export const getGlobalTotalCases = api.getTotalCases;
export const getGlobalTotalDeaths = api.getTotalDeaths;
export const getGlobalTotalRecovered = api.getTotalRecovered;

export const getCasesTimeSeriesByCountry = api.getCasesTimeSeriesByCountry;

export const getDataAtSpecificDate = api.getDataAtSpecificDate;
export const getGlobalTotalsAtDate = api.getGlobalTotalsAtDate;

export const getAllTimeSeriesData = api.getAllTimeSeriesData;

// export const getAllCountryNames = () => fetchAPI('/get_all_country_names');

export default api;