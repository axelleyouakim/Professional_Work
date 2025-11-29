import React from 'react';

const QueryStateWrapper = ({ 
  query, 
  children, 
  loadingMessage = "Loading...",
  errorMessage = "Error loading data"
}) => {
  if (query.isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        padding: "20px",
        color: "#999" 
      }}>
        {loadingMessage}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        padding: "20px",
        color: "#ff6b6b" 
      }}>
        {errorMessage}: {query.error?.message || 'Unknown error'}
      </div>
    );
  }

  if (!query.data) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        padding: "20px",
        color: "#999" 
      }}>
        No data available
      </div>
    );
  }

  return children(query.data);
};

export const MultiQueryWrapper = ({ 
  queries, 
  children,
  loadingMessage = "Loading data..."
}) => {
  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  
  if (isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        padding: "20px",
        color: "#999" 
      }}>
        {loadingMessage}
      </div>
    );
  }

  if (isError) {
    const errors = queries.filter(q => q.isError).map(q => q.error?.message);
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        padding: "20px",
        color: "#ff6b6b" 
      }}>
        Error loading data: {errors.join(', ')}
      </div>
    );
  }

  return children;
};

export default QueryStateWrapper;