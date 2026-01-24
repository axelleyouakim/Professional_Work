'use client';

import React, { useMemo } from 'react';
import { 
  useGlobalTotalCases, 
  useGlobalTotalDeaths, 
  useGlobalTotalRecovered,
  useTotalCasesPerCountry,
  useTotalDeathsPerCountry,
  useTotalRecoveredPerCountry
} from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

const StatsCard = ({ 
  label, 
  type = 'cases',
  period = null,
  selectedCountry = null,
  selectedCountryData = null,
  colorClass = 'red-text' 
}) => {
  // ✅ TOUJOURS appeler TOUS les hooks (jamais conditionnellement)
  const globalCasesQuery = useGlobalTotalCases(period);
  const globalDeathsQuery = useGlobalTotalDeaths(period);
  const globalRecoveredQuery = useGlobalTotalRecovered(period);
  
  const casesPerCountryQuery = useTotalCasesPerCountry(period);
  const deathsPerCountryQuery = useTotalDeathsPerCountry(period);
  const recoveredPerCountryQuery = useTotalRecoveredPerCountry(period);

  // ✅ Sélectionner la query appropriée APRÈS les avoir toutes appelées
  const globalQuery = type === 'deaths' 
    ? globalDeathsQuery 
    : type === 'recovered' 
    ? globalRecoveredQuery 
    : globalCasesQuery;
    
  const perCountryQuery = type === 'deaths' 
    ? deathsPerCountryQuery 
    : type === 'recovered' 
    ? recoveredPerCountryQuery 
    : casesPerCountryQuery;

  // ✅ Calculer la valeur à afficher
  const displayValue = useMemo(() => {
    // Si pays sélectionné
    if (selectedCountry) {
      if (selectedCountryData) {
        const key = type === 'deaths' 
          ? 'total_deaths' 
          : type === 'recovered' 
          ? 'total_recovered' 
          : 'total_cases';
        return selectedCountryData[key];
      }
      
      if (perCountryQuery.data) {
        const countryData = perCountryQuery.data.find(
          c => c.country.toLowerCase() === selectedCountry.toLowerCase()
        );
        if (countryData) {
          const key = type === 'deaths' 
            ? 'total_deaths' 
            : type === 'recovered' 
            ? 'total_recovered' 
            : 'total_cases';
          return countryData[key];
        }
      }
    }
    
    // Valeur globale
    return globalQuery.data;
  }, [selectedCountry, selectedCountryData, perCountryQuery.data, globalQuery.data, type]);

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
            {displayValue?.toLocaleString() || "No data available"}
          </p>
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