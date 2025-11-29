
import React from 'react';
import './Dashboard.css';

const StatsCard = ({ 
  label, 
  value, 
  colorClass = 'red-text' 
}) => {
  return (
    <div className="stat-box">
      <h3 className="stat-label">{label}</h3>
      <p className={`stat-value ${colorClass}`}>
        {value !== null && value !== undefined
          ? value.toLocaleString()
          : "No data available"}
      </p>
    </div>
  );
};

export default StatsCard;