'use client';

import React, { useMemo } from 'react';
import './Dashboard.css';

const CountryList = ({ 
  title, 
  type = 'cases',
  countriesData = [],  // ✅ NOUVEAU : Recevoir les données en props
  searchTerm = '',
  selectedCountry, 
  onCountryClick,
  labelSuffix = '',
  colorClass = 'red-text',
  isLoading = false,   // ✅ NOUVEAU : État de chargement
  error = null         // ✅ NOUVEAU : Erreur éventuelle
}) => {
  const dataKey = type === 'deaths' 
    ? 'total_deaths' 
    : type === 'recovered' 
    ? 'total_recovered' 
    : 'total_cases';

  const filteredCountries = useMemo(() => {
    if (!countriesData || countriesData.length === 0) return [];
    
    if (!searchTerm) return countriesData;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return countriesData.filter((c) =>
      c.country.toLowerCase().includes(searchLower)
    );
  }, [countriesData, searchTerm]);

  // ✅ LOADING STATE
  if (isLoading) {
    return (
      <div className="country-list-container">
        {title && <h4 className="country-list-title">{title}</h4>}
        <div className="country-list">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            gap: '10px'
          }}>
            <div className="spinner" style={{ width: '30px', height: '30px' }}></div>
            <p style={{ color: '#999', fontSize: '12px' }}>Loading countries...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div className="country-list-container">
        {title && <h4 className="country-list-title">{title}</h4>}
        <div className="country-list">
          <p style={{ color: '#ff4444', padding: '10px', fontSize: '12px' }}>
            ⚠️ Failed to load countries
          </p>
        </div>
      </div>
    );
  }

  // ✅ EMPTY STATE
  if (filteredCountries.length === 0) {
    return (
      <div className="country-list-container">
        {title && <h4 className="country-list-title">{title}</h4>}
        <div className="country-list">
          <p style={{ color: '#999', padding: '10px', fontSize: '12px' }}>
            {searchTerm ? 'No countries match your search' : 'No countries found'}
          </p>
        </div>
      </div>
    );
  }

  // ✅ RENDER LIST
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
              {countryData[dataKey]?.toLocaleString() || "0"}
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
};

export default CountryList;