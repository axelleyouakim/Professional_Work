'use client';

import React from 'react';

/**
 * ════════════════════════════════════════════════════════════
 * QUERY STATE WRAPPER - Pattern recommandé par ton prof
 * ════════════════════════════════════════════════════════════
 */
const QueryStateWrapper = ({ 
  query, 
  loadingMessage = "Loading...",
  errorMessage = "Error loading data",
  children 
}) => {
  if (query.isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        color: '#fff'
      }}>
        <div>⏳ {loadingMessage}</div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        color: '#f44336'
      }}>
        <div>
          ❌ {errorMessage}
          <br />
          <small>{query.error?.message || 'Unknown error'}</small>
        </div>
      </div>
    );
  }

  if (query.isSuccess && query.data) {
    return children(query.data);
  }

  return null;
};

/**
 * ════════════════════════════════════════════════════════════
 * MULTI QUERY WRAPPER - Pour gérer plusieurs queries
 * ════════════════════════════════════════════════════════════
 */
export const MultiQueryWrapper = ({ 
  queries = [], 
  loadingMessage = "Loading...",
  errorMessage = "Error loading data",
  children 
}) => {
  // Vérifie si au moins une query est en loading
  const isLoading = queries.some(q => q.isLoading);
  
  // Vérifie si au moins une query a une erreur
  const hasError = queries.some(q => q.isError);
  const errorQuery = queries.find(q => q.isError);
  
  // Vérifie si toutes les queries ont réussi
  const allSuccess = queries.every(q => q.isSuccess && q.data);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        color: '#fff'
      }}>
        <div>⏳ {loadingMessage}</div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        color: '#f44336'
      }}>
        <div>
          ❌ {errorMessage}
          <br />
          <small>{errorQuery?.error?.message || 'Unknown error'}</small>
        </div>
      </div>
    );
  }

  if (allSuccess) {
    // Retourne les data de toutes les queries
    const allData = queries.map(q => q.data);
    return children(...allData);
  }

  return null;
};

export default QueryStateWrapper;