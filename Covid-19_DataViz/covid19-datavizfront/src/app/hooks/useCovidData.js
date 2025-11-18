import { useQuery } from '@tanstack/react-query';
import * as api from '../../services/api';

export const covidKeys = {
  all: ['covid'],
  globalStats: () => [...covidKeys.all, 'global'],
  totalCases: () => [...covidKeys.globalStats(), 'total-cases'],
  totalDeaths: () => [...covidKeys.globalStats(), 'total-deaths'],
  totalRecovered: () => [...covidKeys.globalStats(), 'total-recovered'],
  
  perCountry: () => [...covidKeys.all, 'per-country'],
  casesPerCountry: () => [...covidKeys.perCountry(), 'cases'],
  deathsPerCountry: () => [...covidKeys.perCountry(), 'deaths'],
  recoveredPerCountry: () => [...covidKeys.perCountry(), 'recovered'],
  
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

export const useGlobalTotalCases = () => {
  return useQuery({
    queryKey: covidKeys.totalCases(),
    queryFn: async () => {
      const data = await api.getGlobalTotalCases();
      return data.total_cases;
    },
  });
};

export const useGlobalTotalDeaths = () => {
  return useQuery({
    queryKey: covidKeys.totalDeaths(),
    queryFn: async () => {
      const data = await api.getGlobalTotalDeaths();
      return data.total_deaths;
    },
  });
};

export const useGlobalTotalRecovered = () => {
  return useQuery({
    queryKey: covidKeys.totalRecovered(),
    queryFn: async () => {
      const data = await api.getGlobalTotalRecovered();
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

export const useTotalCasesPerCountry = () => {
  return useQuery({
    queryKey: covidKeys.casesPerCountry(),
    queryFn: async () => {
      const data = await api.getTotalCasesPerCountry();
      return data?.data || [];
    },
  });
};

export const useTotalDeathsPerCountry = () => {
  return useQuery({
    queryKey: covidKeys.deathsPerCountry(),
    queryFn: async () => {
      const data = await api.getTotalDeathsPerCountry();
      return data?.data || [];
    },
  });
};

export const useTotalRecoveredPerCountry = () => {
  return useQuery({
    queryKey: covidKeys.recoveredPerCountry(),
    queryFn: async () => {
      const data = await api.getTotalRecoveredPerCountry();
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

export const useCovidDashboardData = (period = null) => {
  const totalCases = useGlobalTotalCases();
  const totalDeaths = useGlobalTotalDeaths();
  const totalRecovered = useGlobalTotalRecovered();
  
  const cases28Day = use28DayCases();
  const deaths28Day = use28DayDeaths();
  
  const totalCasesPerCountry = useTotalCasesPerCountry();
  const totalDeathsPerCountry = useTotalDeathsPerCountry();
  const totalRecoveredPerCountry = useTotalRecoveredPerCountry();
  
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