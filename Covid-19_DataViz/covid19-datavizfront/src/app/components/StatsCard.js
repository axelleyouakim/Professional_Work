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
  error = null,
  currentDate = null  // ✅ NOUVEAU : Recevoir la date actuelle du slider
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

  // ✅ DÉTERMINER SI ON EST APRÈS AOÛT 2021
  const isAfterRecoveredCutoff = () => {
    if (!currentDate || type !== 'recovered') return false;
    
    // Date de fin de collecte recovered : 8/4/21 (4 août 2021)
    // (C'est la dernière date dans le CSV recovered)
    const parts = currentDate.split('/');
    if (parts.length !== 3) return false;
    
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    
    const currentDateObj = new Date(year, month - 1, day);
    const cutoffDate = new Date(2021, 7, 4); // 4 août 2021 (mois 7 = août car 0-indexed)
    
    return currentDateObj > cutoffDate;
  };

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
      
      {/* ✅ NOUVEAU : Afficher warning SEULEMENT après août 2021 */}
      {isAfterRecoveredCutoff() && (
        <p style={{ fontSize: '11px', color: '#ff9800', marginTop: '5px' }}>
          ⚠️ Data collection ended Aug 4, 2021
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