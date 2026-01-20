'use client';

import React, { useMemo } from 'react';
import { 
  useTotalCasesPerCountry, 
  useTotalDeathsPerCountry, 
  useTotalRecoveredPerCountry 
} from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

const CountryList = ({ 
  title, 
  type = 'cases',
  period = null,
  searchTerm = '',
  selectedCountry, 
  onCountryClick,
  labelSuffix = '',
  colorClass = 'red-text'
}) => {
  const casesQuery = useTotalCasesPerCountry(period);
  const deathsQuery = useTotalDeathsPerCountry(period);
  const recoveredQuery = useTotalRecoveredPerCountry(period);

  const query = type === 'deaths' 
    ? deathsQuery 
    : type === 'recovered' 
    ? recoveredQuery 
    : casesQuery;

  const dataKey = type === 'deaths' 
    ? 'total_deaths' 
    : type === 'recovered' 
    ? 'total_recovered' 
    : 'total_cases';

  const filteredCountries = useMemo(() => {
    const countries = query.data || [];
    if (!searchTerm) return countries;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return countries.filter((c) =>
      c.country.toLowerCase().includes(searchLower)
    );
  }, [query.data, searchTerm]);

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