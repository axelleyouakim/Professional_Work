'use client';

import React from 'react';
import './Dashboard.css';

/**
 * ════════════════════════════════════════════════════════════
 * QUERY STATE WRAPPER - Pattern 3 États (Loading, Error, Success)
 * ════════════════════════════════════════════════════════════
 * 
 * ✅ Wrapper réutilisable pour gérer les 3 états de TanStack Query
 * ✅ Prend un objet query (résultat de useQuery)
 * ✅ Affiche Loading, Error, ou Success automatiquement
 * 
 * USAGE:
 * <QueryStateWrapper query={myQuery}>
 *   {(data) => <div>{data}</div>}
 * </QueryStateWrapper>
 */
const QueryStateWrapper = ({ 
  query, 
  loadingMessage = 'Loading...', 
  errorMessage = 'An error occurred',
  children 
}) => {
  // ✅ ÉTAT 1 : LOADING
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

  // ✅ ÉTAT 2 : ERROR
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

  // ✅ ÉTAT 3 : SUCCESS
  return children(query.data);
};

export default QueryStateWrapper;