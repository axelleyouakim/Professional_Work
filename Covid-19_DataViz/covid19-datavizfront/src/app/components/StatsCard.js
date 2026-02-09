'use client';

import React from 'react';
import './Dashboard.css';

const StatsCard = ({ 
  label, 
  type = 'cases',
  value = null,        // ✅ NOUVEAU : Recevoir la valeur directement
  selectedCountry = null,
  globalStats = null,  // ✅ Données du slider
  colorClass = 'red-text',
  isLoading = false,   // ✅ NOUVEAU : État de chargement
  error = null         // ✅ NOUVEAU : Erreur éventuelle
}) => {
  // ✅ Déterminer quelle valeur afficher
  const displayValue = (() => {
    // 1. Priorité : globalStats (données du slider)
    if (globalStats) {
      const key = type === 'deaths' ? 'total_deaths' : type === 'recovered' ? 'total_recovered' : 'total_cases';
      return globalStats[key];
    }
    
    // 2. Sinon : valeur passée en props
    if (value != null) {
      return value;
    }
    
    // 3. Par défaut : 0
    return 0;
  })();

  // ✅ LOADING STATE
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

  // ✅ ERROR STATE
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

  // ✅ RENDER VALUE
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