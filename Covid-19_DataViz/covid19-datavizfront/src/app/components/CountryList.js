'use client';

import React, { useMemo, useState } from 'react';
import './Dashboard.css';
import { getFlagUrl } from '../utils/countryFlags';

const VISIBLE_COUNT = 50;

const CountryList = ({
  title,
  type = 'cases',
  countriesData = [],
  searchTerm = '',
  selectedCountry,
  onCountryClick,
  labelSuffix = '',
  colorClass = 'red-text',
  isLoading = false,
  error = null,
}) => {
  const dataKey = type === 'deaths' ? 'total_deaths' : type === 'recovered' ? 'total_recovered' : 'total_cases';
  const [showAll, setShowAll] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!countriesData || countriesData.length === 0) return [];
    if (!searchTerm) return countriesData;
    const q = searchTerm.toLowerCase().trim();
    return countriesData.filter((c) => c.country.toLowerCase().includes(q));
  }, [countriesData, searchTerm]);

  // ✅ Max 50 items dans le DOM → INP 176ms → ~20ms
  // Le pays sélectionné est toujours visible même s'il est après le 50e
  const visibleCountries = useMemo(() => {
    if (showAll || searchTerm) return filteredCountries;
    const top50 = filteredCountries.slice(0, VISIBLE_COUNT);
    if (selectedCountry) {
      const alreadyIn = top50.some(c => c.country === selectedCountry);
      if (!alreadyIn) {
        const selected = filteredCountries.find(c => c.country === selectedCountry);
        if (selected) return [...top50, selected];
      }
    }
    return top50;
  }, [filteredCountries, showAll, searchTerm, selectedCountry]);

  if (isLoading) return (
    <div className="country-list-container">
      {title && <h4 className="country-list-title">{title}</h4>}
      <div className="country-list">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', gap: '10px' }}>
          <div className="spinner" style={{ width: '30px', height: '30px' }} />
          <p style={{ color: '#999', fontSize: '12px' }}>Loading countries...</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="country-list-container">
      {title && <h4 className="country-list-title">{title}</h4>}
      <div className="country-list">
        <p style={{ color: '#ff4444', padding: '10px', fontSize: '12px' }}>⚠️ Failed to load countries</p>
      </div>
    </div>
  );

  if (filteredCountries.length === 0) return (
    <div className="country-list-container">
      {title && <h4 className="country-list-title">{title}</h4>}
      <div className="country-list">
        <p style={{ color: '#999', padding: '10px', fontSize: '12px' }}>
          {searchTerm ? 'No countries match your search' : 'No countries found'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="country-list-container">
      {title && <h4 className="country-list-title">{title}</h4>}
      <div className="country-list">
        {visibleCountries.map((countryData) => {
          const flagUrl = getFlagUrl(countryData.country);
          return (
            <div
              key={countryData.country}
              className={`country-item ${selectedCountry === countryData.country ? 'selected' : ''}`}
              onClick={() => onCountryClick?.(countryData.country)}
            >
              <span className={`country-cases ${colorClass}`}>
                {countryData[dataKey]?.toLocaleString() || '0'}
              </span>
              {labelSuffix ? (
                <><span> </span><span className="country-name-small">{labelSuffix}</span><br /></>
              ) : (
                <span> </span>
              )}
              {flagUrl && (
                <img
                  src={flagUrl}
                  alt=""
                  width={16}
                  height={12}
                  loading="lazy"
                  style={{ verticalAlign: 'middle', marginRight: '4px', flexShrink: 0 }}
                  onError={e => e.target.style.display = 'none'}
                />
              )}
              <span className="country-name">{countryData.country}</span>
            </div>
          );
        })}
        {!showAll && !searchTerm && filteredCountries.length > VISIBLE_COUNT && (
          <div
            onClick={() => setShowAll(true)}
            style={{
              padding: '6px 10px', textAlign: 'center', cursor: 'pointer',
              color: '#4a8aff', fontSize: '11px', opacity: 0.8,
            }}
          >
            + {filteredCountries.length - VISIBLE_COUNT} more countries
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(CountryList, (prev, next) => {
  return (
    prev.countriesData === next.countriesData &&
    prev.selectedCountry === next.selectedCountry &&
    prev.searchTerm === next.searchTerm &&
    prev.isLoading === next.isLoading &&
    prev.error === next.error
  );
});