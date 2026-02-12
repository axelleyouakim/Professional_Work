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

export const MultiQueryWrapper = ({ 
  queries, 
  loadingMessage = 'Loading...', 
  errorMessage = 'An error occurred',
  children 
}) => {
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

  const data = queries.map(query => query.data);
  
  return children(...data);
};

export default QueryStateWrapper;