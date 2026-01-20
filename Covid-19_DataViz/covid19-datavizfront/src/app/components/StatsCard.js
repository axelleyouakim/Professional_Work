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

/**
 * ════════════════════════════════════════════════════════════
 * STATS CARD - Affiche stats globales OU stats d'un pays
 * ════════════════════════════════════════════════════════════
 */
const StatsCard = ({ 
  label, 
  type = 'cases',
  period = null,
  selectedCountry = null,
  selectedCountryData = null,
  colorClass = 'red-text' 
}) => {
  // ✅ Appels TanStack Query (global)
  const casesQuery = useGlobalTotalCases(period);
  const deathsQuery = useGlobalTotalDeaths(period);
  const recoveredQuery = useGlobalTotalRecovered(period);

  // ✅ Appels TanStack Query (par pays) - pour fallback
  const casesPerCountryQuery = useTotalCasesPerCountry(period);
  const deathsPerCountryQuery = useTotalDeathsPerCountry(period);
  const recoveredPerCountryQuery = useTotalRecoveredPerCountry(period);

  // Sélectionner la query
  const globalQuery = type === 'deaths' ? deathsQuery : type === 'recovered' ? recoveredQuery : casesQuery;
  const perCountryQuery = type === 'deaths' ? deathsPerCountryQuery : type === 'recovered' ? recoveredPerCountryQuery : casesPerCountryQuery;

  // ✅ Calculer la valeur à afficher
  const displayValue = useMemo(() => {
    // Si pays sélectionné
    if (selectedCountry) {
      // Utilise selectedCountryData si fourni
      if (selectedCountryData) {
        const key = type === 'deaths' ? 'total_deaths' : type === 'recovered' ? 'total_recovered' : 'total_cases';
        return selectedCountryData[key];
      }
      
      // Sinon, cherche dans les données per country
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
    
    // Valeur globale par défaut
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