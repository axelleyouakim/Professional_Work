import { useQuery } from '@tanstack/react-query';
import * as api from '../../services/api';

// Query keys constants
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
  casesTimeSeries: () => [...covidKeys.timeSeries(), 'cases'],
};

// ============= GLOBAL STATS HOOKS =============

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

// ============= 28 DAYS GLOBAL HOOKS =============

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

// ============= PER COUNTRY HOOKS =============

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

// ============= 28 DAYS PER COUNTRY HOOKS =============

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

// ============= VACCINE HOOKS =============

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

// ============= TIME SERIES HOOKS =============

export const useCasesTimeSeries = () => {
  return useQuery({
    queryKey: covidKeys.casesTimeSeries(),
    queryFn: async () => {
      const data = await api.getCasesTimeSeries();
      
      // Format data for chart
      const formattedData = data.data
        .filter((_, index) => index % 7 === 0)
        .map((item) => {
          const parts = item.date.split("/");
          if (parts.length === 3) {
            const month = Number.parseInt(parts[0], 10);
            const day = Number.parseInt(parts[1], 10);
            const year = Number.parseInt(parts[2], 10) + 2000;
            const date = new Date(year, month - 1, day);
            return {
              date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              cases: item.cases,
            };
          }
          return {
            date: item.date,
            cases: item.cases,
          };
        });
      
      return formattedData;
    },
  });
};

// ============= COMBINED HOOK =============

export const useCovidDashboardData = () => {
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
  
  const chartData = useCasesTimeSeries();

  return {
    // Global stats
    totalCases,
    totalDeaths,
    totalRecovered,
    
    // 28 days global
    cases28Day,
    deaths28Day,
    
    // Per country
    totalCasesPerCountry,
    totalDeathsPerCountry,
    totalRecoveredPerCountry,
    
    // 28 days per country
    cases28DayPerCountry,
    deaths28DayPerCountry,
    
    // Vaccines
    totalVaccineDoses,
    vaccines28Day,
    vaccines28DayPerCountry,
    
    // Chart
    chartData,
  };
};