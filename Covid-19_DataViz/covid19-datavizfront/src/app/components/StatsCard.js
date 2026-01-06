'use client';

import React from 'react';
import { useGlobalTotalCases, useGlobalTotalDeaths, useGlobalTotalRecovered } from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

const StatsCard = ({ 
  label, 
  type = 'cases',
  period = null,
  selectedCountryValue = null,
  colorClass = 'red-text' 
}) => {
  // ✅ FIX: TOUS les hooks appelés INCONDITIONNELLEMENT
  const casesQuery = useGlobalTotalCases(period);
  const deathsQuery = useGlobalTotalDeaths(period);
  const recoveredQuery = useGlobalTotalRecovered(period);

  // ✅ Sélection du query APRÈS tous les appels
  let query;
  if (type === 'cases') {
    query = casesQuery;
  } else if (type === 'deaths') {
    query = deathsQuery;
  } else if (type === 'recovered') {
    query = recoveredQuery;
  }

  return (
    <QueryStateWrapper 
      query={query}
      loadingMessage={`Loading ${label.toLowerCase()}...`}
      errorMessage={`Failed to load ${label.toLowerCase()}`}
    >
      {(globalValue) => (
        <div className="stat-box">
          <h3 className="stat-label">{label}</h3>
          <p className={`stat-value ${colorClass}`}>
            {(selectedCountryValue !== null && selectedCountryValue !== undefined
              ? selectedCountryValue
              : globalValue
            )?.toLocaleString() || "No data available"}
          </p>
        </div>
      )}
    </QueryStateWrapper>
  );
};

export default StatsCard;