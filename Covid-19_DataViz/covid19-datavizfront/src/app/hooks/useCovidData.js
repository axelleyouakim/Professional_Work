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
};

// ════════════════════════════════════════════════════════════
// MODIFIÉ - Hooks avec support période
// ════════════════════════════════════════════════════════════
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

export const useTotalCasesPerCountry = (period = null) => {
  return useQuery({
    queryKey: covidKeys.casesPerCountry(period),
    queryFn: async () => {
      const data = await api.getTotalCasesPerCountry(period);
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

export const useCasesTimeSeries = (period = null) => {
  return useQuery({
    queryKey: covidKeys.casesTimeSeries(period),
    queryFn: async () => {
      const response = await api.getCasesTimeSeries(period);
      return response?.data || [];
    },
  });
};

// ════════════════════════════════════════════════════════════
// HOOK PRINCIPAL - Passe la période à TOUS les hooks
// ════════════════════════════════════════════════════════════
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