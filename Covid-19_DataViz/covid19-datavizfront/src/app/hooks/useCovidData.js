import { useQuery } from '@tanstack/react-query';
import * as api from '../../services/api';

export const covidKeys = {
  all: ['covid'],
  globalStats: (period) => period ? [...covidKeys.all, 'global', period] : [...covidKeys.all, 'global'],
  totalCases: (period) => [...covidKeys.globalStats(period), 'total-cases'],
  totalDeaths: (period) => [...covidKeys.globalStats(period), 'total-deaths'],
  totalRecovered: (period) => [...covidKeys.globalStats(period), 'total-recovered'],
  
  perCountry: (period) => period ? [...covidKeys.all, 'per-country', period] : [...covidKeys.all, 'per-country'],
  casesPerCountry: (period) => [...covidKeys.perCountry(period), 'cases'],
  deathsPerCountry: (period) => [...covidKeys.perCountry(period), 'deaths'],
  recoveredPerCountry: (period) => [...covidKeys.perCountry(period), 'recovered'],
  
  timeSeriesCountry: (country, period) => country 
    ? [...covidKeys.all, 'time-series', country, period || 'all']
    : covidKeys.casesTimeSeries(period),
  
  period28Days: () => [...covidKeys.all, '28-days'],
  cases28Day: () => [...covidKeys.period28Days(), 'cases'],
  deaths28Day: () => [...covidKeys.period28Days(), 'deaths'],
  cases28DayPerCountry: () => [...covidKeys.period28Days(), 'cases-per-country'],
  deaths28DayPerCountry: () => [...covidKeys.period28Days(), 'deaths-per-country'],
  
  vaccines: () => [...covidKeys.all, 'vaccines'],
  totalVaccines: () => [...covidKeys.vaccines(), 'total'],
  vaccines28Day: () => [...covidKeys.vaccines(), '28-days'],
  vaccines28DayPerCountry: () => [...covidKeys.vaccines(), '28-days-per-country'],
  
  timeSeries: () => [...covidKeys.all, 'time-series'],
  casesTimeSeries: (period) => period ? [...covidKeys.timeSeries(), 'cases', period] : [...covidKeys.timeSeries(), 'cases'],
  
  worldAtlas: () => ['world-atlas'],
};

export const useWorldAtlas = () => {
  return useQuery({
    queryKey: covidKeys.worldAtlas(),
    queryFn: async () => {
      const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
      if (!response.ok) throw new Error('Failed to load world atlas');
      return response.json();
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });
};

export const useGlobalTotalCases = (period = null) => {
  return useQuery({
    queryKey: covidKeys.totalCases(period),
    queryFn: async () => {
      const data = await api.getGlobalTotalCases(period);
      return data.total_cases;
    },
  });
};

export const useGlobalTotalDeaths = (period = null) => {
  return useQuery({
    queryKey: covidKeys.totalDeaths(period),
    queryFn: async () => {
      const data = await api.getGlobalTotalDeaths(period);
      return data.total_deaths;
    },
  });
};

export const useGlobalTotalRecovered = (period = null) => {
  return useQuery({
    queryKey: covidKeys.totalRecovered(period),
    queryFn: async () => {
      const data = await api.getGlobalTotalRecovered(period);
      return data.total_recovered;
    },
  });
};

export const use28DayCases = () => {
  return useQuery({
    queryKey: covidKeys.cases28Day(),
    queryFn: async () => {
      const data = await api.get28DayCases();
      return data.total_28_day_cases;
    },
  });
};

export const use28DayDeaths = () => {
  return useQuery({
    queryKey: covidKeys.deaths28Day(),
    queryFn: async () => {
      const data = await api.get28DayDeaths();
      return data.total_28_day_deaths;
    },
  });
};

export const useTotalCasesPerCountry = (periodOrDate = null) => {
  return useQuery({
    queryKey: covidKeys.casesPerCountry(periodOrDate),
    queryFn: async () => {
      if (periodOrDate && typeof periodOrDate === 'string' && periodOrDate.includes('/')) {
        const response = await api.getDataAtSpecificDate(periodOrDate);
        return response?.data || [];
      }

      const data = await api.getTotalCasesPerCountry(periodOrDate);
      return data?.data || [];
    },
  });
};

export const useTotalDeathsPerCountry = (period = null) => {
  return useQuery({
    queryKey: covidKeys.deathsPerCountry(period),
    queryFn: async () => {
      const data = await api.getTotalDeathsPerCountry(period);
      return data?.data || [];
    },
  });
};

export const useTotalRecoveredPerCountry = (period = null) => {
  return useQuery({
    queryKey: covidKeys.recoveredPerCountry(period),
    queryFn: async () => {
      const data = await api.getTotalRecoveredPerCountry(period);
      return data?.data || [];
    },
  });
};

export const use28DayCasesPerCountry = () => {
  return useQuery({
    queryKey: covidKeys.cases28DayPerCountry(),
    queryFn: async () => {
      const data = await api.get28DayCasesPerCountry();
      return data.total_28_day_cases_per_country;
    },
  });
};

export const use28DayDeathsPerCountry = () => {
  return useQuery({
    queryKey: covidKeys.deaths28DayPerCountry(),
    queryFn: async () => {
      const data = await api.get28DayDeathsPerCountry();
      return data.total_28_day_deaths_per_country;
    },
  });
};

export const useTotalVaccineDoses = () => {
  return useQuery({
    queryKey: covidKeys.totalVaccines(),
    queryFn: async () => {
      const data = await api.getTotalVaccineDoses();
      return data.total_vaccine_doses;
    },
  });
};

export const use28DayVaccineDoses = () => {
  return useQuery({
    queryKey: covidKeys.vaccines28Day(),
    queryFn: async () => {
      const data = await api.get28DayVaccineDoses();
      return data.total_28_day_vaccine_doses;
    },
  });
};

export const use28DayVaccineDosesPerCountry = () => {
  return useQuery({
    queryKey: covidKeys.vaccines28DayPerCountry(),
    queryFn: async () => {
      const data = await api.get28DayVaccineDosesPerCountry();
      return data.total_28_day_vaccine_doses;
    },
  });
};

export const useCasesTimeSeries = (period = null, country = null, maxDate = null) => {
  return useQuery({
    queryKey: covidKeys.timeSeriesCountry(country, period),
    queryFn: async () => {
      if (country) {
        const response = await api.getCasesTimeSeriesByCountry(country, period);
        let data = response?.data || [];
        
        if (maxDate && data.length > 0) {
          data = data.filter(item => item.date <= maxDate);
          console.log(`📊 [useCasesTimeSeries] Filtered to ${maxDate}: ${data.length} points for ${country}`);
        }
        
        return data;
      }
      
      const response = await api.getCasesTimeSeries(period);
      let data = response?.data || [];
      
      if (maxDate && data.length > 0) {
        data = data.filter(item => item.date <= maxDate);
        console.log(`📊 [useCasesTimeSeries] Filtered to ${maxDate}: ${data.length} points (global)`);
      }
      
      return data;
    },
    enabled: true,
  });
};

export const useAllTimeSeriesData = () => {
  return useQuery({
    queryKey: ['allTimeSeriesData'],
    queryFn: async () => {
      return await api.getAllTimeSeriesData();
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });
};

export const useDataAtSpecificDate = (dateString) => {
  return useQuery({
    queryKey: ['dataAtDate', dateString],
    queryFn: async () => {
      if (!dateString) return null;
      const response = await api.getDataAtSpecificDate(dateString);
      return response?.data || [];
    },
    enabled: !!dateString,
  });
};

export const useGlobalTotalsAtDate = (dateString) => {
  return useQuery({
    queryKey: ['globalTotalsAtDate', dateString],
    queryFn: async () => {
      if (!dateString) return null;
      return await api.getGlobalTotalsAtDate(dateString);
    },
    enabled: !!dateString,
  });
};

export const useCovidDashboardData = (period = null) => {
  const totalCases = useGlobalTotalCases(period);
  const totalDeaths = useGlobalTotalDeaths(period);
  const totalRecovered = useGlobalTotalRecovered(period);
  
  const cases28Day = use28DayCases();
  const deaths28Day = use28DayDeaths();
  
  const totalCasesPerCountry = useTotalCasesPerCountry(period);
  const totalDeathsPerCountry = useTotalDeathsPerCountry(period);
  const totalRecoveredPerCountry = useTotalRecoveredPerCountry(period);
  
  const cases28DayPerCountry = use28DayCasesPerCountry();
  const deaths28DayPerCountry = use28DayDeathsPerCountry();
  
  const totalVaccineDoses = useTotalVaccineDoses();
  const vaccines28Day = use28DayVaccineDoses();
  const vaccines28DayPerCountry = use28DayVaccineDosesPerCountry();
  
  const chartData = useCasesTimeSeries(period);

  return {
    totalCases,
    totalDeaths,
    totalRecovered,
    cases28Day,
    deaths28Day,
    totalCasesPerCountry,
    totalDeathsPerCountry,
    totalRecoveredPerCountry,
    cases28DayPerCountry,
    deaths28DayPerCountry,
    totalVaccineDoses,
    vaccines28Day,
    vaccines28DayPerCountry,
    chartData,
  };
};