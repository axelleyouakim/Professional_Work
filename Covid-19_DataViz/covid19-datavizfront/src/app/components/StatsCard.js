'use client';

import React from 'react';
import './Dashboard.css';

const StatsCard = ({ 
  label, 
  type = 'cases',
  value = null,
  selectedCountry = null,
  globalStats = null,
  colorClass = 'red-text',
  isLoading = false,
  error = null
}) => {
  const displayValue = (() => {
    if (globalStats) {
      const key = type === 'deaths' ? 'total_deaths' : type === 'recovered' ? 'total_recovered' : 'total_cases';
      return globalStats[key];
    }
    
    if (value != null) {
      return value;
    }
    
    return 0;
  })();

  if (isLoading) {
    return (
      <div className="stat-box">
        <h3 className="stat-label">{label}</h3>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          padding: '20px 0'
        }}>
          <div className="spinner" style={{ width: '30px', height: '30px' }}></div>
          <p style={{ color: '#999', fontSize: '11px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stat-box">
        <h3 className="stat-label">{label}</h3>
        <p className={`stat-value`} style={{ color: '#ff4444', fontSize: '16px' }}>
          ⚠️ Error
        </p>
        <p style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
          Failed to load data
        </p>
      </div>
    );
  }

  return (
    <div className="stat-box">
      <h3 className="stat-label">{label}</h3>
      <p className={`stat-value ${colorClass}`}>
        {displayValue != null ? displayValue.toLocaleString() : "0"}
      </p>
      {type === 'recovered' && displayValue === 0 && !isLoading && (
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
  );
};

export default StatsCard;