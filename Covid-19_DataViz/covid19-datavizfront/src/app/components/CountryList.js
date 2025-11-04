import React from 'react';
import './Dashboard.css';

const CountryList = ({ 
  title, 
  countries, 
  isLoading, 
  isError, 
  selectedCountry, 
  onCountryClick,
  dataKey,
  labelSuffix = '',
  colorClass = 'red-text'
}) => {
  return (
    <div className="country-list-container">
      <h4 className="country-list-title">{title}</h4>
      <div className="country-list">
        {isLoading ? (
          <p>Loading...</p>
        ) : isError ? (
          <p>Error loading data</p>
        ) : countries && countries.length > 0 ? (
          countries.map((countryData) => (
            <div
              key={countryData.country}
              className={`country-item ${selectedCountry === countryData.country ? "selected" : ""}`}
              onClick={() => onCountryClick && onCountryClick(countryData.country)}
            >
              <span className={`country-cases ${colorClass}`}>
                {countryData[dataKey]?.toLocaleString() || "N/A"}
              </span>
              {labelSuffix && (
                <>
                  {" "}
                  <span className="country-name-small">{labelSuffix}</span>
                  <br />
                </>
              )}
              {!labelSuffix && <span> </span>}
              <span className="country-name">{countryData.country}</span>
            </div>
          ))
        ) : (
          <p>No data available</p>
        )}
      </div>
    </div>
  );
};

export default CountryList;