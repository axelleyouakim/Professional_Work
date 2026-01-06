'use client';

import React, { useMemo } from 'react';
import { 
  useTotalCasesPerCountry, 
  useTotalDeathsPerCountry, 
  useTotalRecoveredPerCountry 
} from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

/**
 * ════════════════════════════════════════════════════════════
 * COUNTRY LIST - Fait maintenant ses propres appels TanStack Query
 * ════════════════════════════════════════════════════════════
 * 
 * ✅ Plus besoin de recevoir `countries` en props
 * ✅ Fait l'appel API directement selon le `type`
 * ✅ Filtre par searchTerm en client-side
 */
const CountryList = ({ 
  title, 
  type = 'cases', // 'cases' | 'deaths' | 'recovered'
  period = null,
  searchTerm = '',
  selectedCountry, 
  onCountryClick,
  labelSuffix = '',
  colorClass = 'red-text'
}) => {
  // ─────────────────────────────────────────────────────────
  // 🔥 APPEL TANSTACK QUERY SELON LE TYPE
  // ─────────────────────────────────────────────────────────
  const casesQuery = useTotalCasesPerCountry(period);
  const deathsQuery = useTotalDeathsPerCountry(period);
  const recoveredQuery = useTotalRecoveredPerCountry(period);

  // Sélectionner la bonne query selon le type
  const query = type === 'deaths' 
    ? deathsQuery 
    : type === 'recovered' 
    ? recoveredQuery 
    : casesQuery;

  // Déterminer la clé de données
  const dataKey = type === 'deaths' 
    ? 'total_deaths' 
    : type === 'recovered' 
    ? 'total_recovered' 
    : 'total_cases';

  // ─────────────────────────────────────────────────────────
  // FILTRE PAR RECHERCHE (client-side)
  // ─────────────────────────────────────────────────────────
  const filteredCountries = useMemo(() => {
    const countries = query.data || [];
    if (!searchTerm) return countries;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return countries.filter((c) =>
      c.country.toLowerCase().includes(searchLower)
    );
  }, [query.data, searchTerm]);

  // ─────────────────────────────────────────────────────────
  // RENDER AVEC QUERYWRAPPER
  // ─────────────────────────────────────────────────────────
  return (
    <QueryStateWrapper 
      query={query}
      loadingMessage="Loading countries..."
    >
      {() => {
        if (filteredCountries.length === 0) {
          return (
            <div className="country-list-container">
              {title && <h4 className="country-list-title">{title}</h4>}
              <div className="country-list">
                <p style={{ color: '#999', padding: '10px' }}>
                  {searchTerm ? 'No countries match your search' : 'No countries found'}
                </p>
              </div>
            </div>
          );
        }

        return (
          <div className="country-list-container">
            {title && <h4 className="country-list-title">{title}</h4>}
            <div className="country-list">
              {filteredCountries.map((countryData) => (
                <div
                  key={countryData.country}
                  className={`country-item ${selectedCountry === countryData.country ? "selected" : ""}`}
                  onClick={() => onCountryClick && onCountryClick(countryData.country)}
                >
                  <span className={`country-cases ${colorClass}`}>
                    {countryData[dataKey]?.toLocaleString() || "N/A"}
                  </span>
                  {labelSuffix ? (
                    <>
                      {" "}
                      <span className="country-name-small">{labelSuffix}</span>
                      <br />
                    </>
                  ) : (
                    <span> </span>
                  )}
                  <span className="country-name">{countryData.country}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    </QueryStateWrapper>
  );
};

export default CountryList;