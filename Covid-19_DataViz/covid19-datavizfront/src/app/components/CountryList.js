import React from 'react';
import './Dashboard.css';

const CountryList = ({ 
  title, 
  countries, 
  selectedCountry, 
  onCountryClick,
  dataKey = 'total_cases',
  labelSuffix = '',
  colorClass = 'red-text'
}) => {
  if (!countries || countries.length === 0) {
    return (
      <div className="country-list-container">
        {title && <h4 className="country-list-title">{title}</h4>}
        <div className="country-list">
          <p style={{ color: '#999', padding: '10px' }}>No countries found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="country-list-container">
      {title && <h4 className="country-list-title">{title}</h4>}
      <div className="country-list">
        {countries.map((countryData) => (
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
};

export default CountryList;