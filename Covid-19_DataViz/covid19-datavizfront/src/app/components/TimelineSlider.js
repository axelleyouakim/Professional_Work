import React, { useState } from 'react';
import './TimelineSlider.css';

const TimelineSlider = ({ onPeriodChange }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const periods = [
    { id: 'all', label: 'All Time', days: null },
    { id: '7days', label: 'Last 7 Days', days: 7 },
    { id: '14days', label: 'Last 14 Days', days: 14 },
    { id: '28days', label: 'Last 28 Days', days: 28 },
    { id: '3months', label: 'Last 3 Months', days: 90 },
    { id: '6months', label: 'Last 6 Months', days: 180 },
  ];

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period.id);
    onPeriodChange(period);
  };

  return (
    <div className="timeline-slider">
      <h4 className="timeline-title">Time Period</h4>
      <div className="timeline-buttons">
        {periods.map((period) => (
          <button
            key={period.id}
            className={`timeline-btn ${selectedPeriod === period.id ? 'active' : ''}`}
            onClick={() => handlePeriodChange(period)}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimelineSlider;