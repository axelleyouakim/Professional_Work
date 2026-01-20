'use client';

import React from 'react';
import './Dashboard.css';

const QueryStateWrapper = ({ 
  query, 
  loadingMessage = 'Loading...', 
  errorMessage = 'An error occurred',
  children 
}) => {
  if (query.isLoading) {
    return (
      <div className="query-state-container">
        <div className="query-loading">
          <div className="spinner"></div>
          <p>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="query-state-container">
        <div className="query-error">
          <span className="error-icon">⚠️</span>
          <p>{errorMessage}</p>
          <p className="error-details">{query.error.message}</p>
        </div>
      </div>
    );
  }

  return children(query.data);
};

// Nouveau composant pour gérer plusieurs queries
export const MultiQueryWrapper = ({ 
  queries, 
  loadingMessage = 'Loading...', 
  errorMessage = 'An error occurred',
  children 
}) => {
  // Vérifier si au moins une query est en chargement
  const isLoading = queries.some(query => query.isLoading);
  
  if (isLoading) {
    return (
      <div className="query-state-container">
        <div className="query-loading">
          <div className="spinner"></div>
          <p>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // Vérifier si au moins une query a une erreur
  const errorQuery = queries.find(query => query.error);
  
  if (errorQuery) {
    return (
      <div className="query-state-container">
        <div className="query-error">
          <span className="error-icon">⚠️</span>
          <p>{errorMessage}</p>
          <p className="error-details">{errorQuery.error.message}</p>
        </div>
      </div>
    );
  }

  // Toutes les queries sont chargées avec succès
  // Extraire les données de chaque query
  const data = queries.map(query => query.data);
  
  // Passer toutes les données comme arguments séparés
  return children(...data);
};

export default QueryStateWrapper;