'use client';

import React, { useMemo } from 'react';
import { 
  useGlobalTotalCases, 
  useGlobalTotalDeaths, 
  useGlobalTotalRecovered,
  useTotalCasesPerCountry,
  useTotalDeathsPerCountry,
  useTotalRecoveredPerCountry,
  useGlobalTotalsAtDate
} from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

const StatsCard = ({ 
  label, 
  type = 'cases',
  period = null,
  selectedCountry = null,
  selectedCountryData = null,
  globalStats = null,
  colorClass = 'red-text' 
}) => {
  // ✅ TOUJOURS appeler TOUS les hooks (jamais conditionnellement)
  const globalCasesQuery = useGlobalTotalCases(period);
  const globalDeathsQuery = useGlobalTotalDeaths(period);
  const globalRecoveredQuery = useGlobalTotalRecovered(period);
  
  const globalCasesAtDateQuery = useGlobalTotalsAtDate(period);
  const globalDeathsAtDateQuery = useGlobalTotalsAtDate(period);
  
  const casesPerCountryQuery = useTotalCasesPerCountry(period);
  const deathsPerCountryQuery = useTotalDeathsPerCountry(period);
  const recoveredPerCountryQuery = useTotalRecoveredPerCountry(period);
  
  // ✅ PUIS décider quelle query utiliser
  const isDateMode = period && typeof period === 'string' && period.includes('/');
  
  const casesQuery = isDateMode ? globalCasesAtDateQuery : globalCasesQuery;
  const deathsQuery = isDateMode ? globalDeathsAtDateQuery : globalDeathsQuery;
  const recoveredQuery = globalRecoveredQuery;

  const globalQuery = type === 'deaths' ? deathsQuery : type === 'recovered' ? recoveredQuery : casesQuery;
  const perCountryQuery = type === 'deaths' ? deathsPerCountryQuery : type === 'recovered' ? recoveredPerCountryQuery : casesPerCountryQuery;

  const displayValue = useMemo(() => {
    // ✅ Si on a des globalStats (mode slider), utiliser ça
    if (globalStats) {
      const key = type === 'deaths' ? 'total_deaths' : type === 'recovered' ? 'total_recovered' : 'total_cases';
      return globalStats[key];
    }
    
    if (selectedCountry) {
      if (selectedCountryData) {
        const key = type === 'deaths' ? 'total_deaths' : type === 'recovered' ? 'total_recovered' : 'total_cases';
        return selectedCountryData[key];
      }
      
      if (perCountryQuery.data) {
        const countryData = perCountryQuery.data.find(
          c => c.country.toLowerCase() === selectedCountry.toLowerCase()
        );
        if (countryData) {
          const key = type === 'deaths' ? 'total_deaths' : type === 'recovered' ? 'total_recovered' : 'total_cases';
          return countryData[key];
        }
      }
    }
    
    if (isDateMode && globalQuery.data) {
      return type === 'deaths' ? globalQuery.data.total_deaths : globalQuery.data.total_cases;
    }
    
    return globalQuery.data;
  }, [globalStats, selectedCountry, selectedCountryData, perCountryQuery.data, globalQuery.data, type, isDateMode]);

  return (
    <QueryStateWrapper 
      query={globalQuery}
      loadingMessage={`Loading ${label.toLowerCase()}...`}
      errorMessage={`Failed to load ${label.toLowerCase()}`}
    >
      {() => (
        <div className="stat-box">
          <h3 className="stat-label">{label}</h3>
          <p className={`stat-value ${colorClass}`}>
            {displayValue != null ? displayValue.toLocaleString() : "0"}
          </p>
          {type === 'recovered' && displayValue === 0 && (
            <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
              ⚠️ Data collection ended Aug 2021
            </p>
          )}
          {selectedCountry && (
            <p className="stat-country-indicator" style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
              📍 Country View
            </p>
          )}
        </div>
      )}
    </QueryStateWrapper>
  );
};

export default StatsCard;