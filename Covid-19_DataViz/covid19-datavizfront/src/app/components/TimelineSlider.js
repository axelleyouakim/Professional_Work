import React, { useState } from 'react';
import './TimelineSlider.css';

const TimelineSlider = ({ onPeriodChange }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setIsModalOpen(false); // Fermer le modal après sélection
  };

  const getCurrentPeriodLabel = () => {
    return periods.find(p => p.id === selectedPeriod)?.label || 'All Time';
  };

  return (
    <>
      {/* Bouton compact qui ouvre le modal */}
      <button 
        className="timeline-compact-btn"
        onClick={() => setIsModalOpen(true)}
        title="Change time period"
      >
        <span className="timeline-compact-icon">📅</span>
        <span className="timeline-compact-text">{getCurrentPeriodLabel()}</span>
        <span className="timeline-compact-arrow">▼</span>
      </button>

      {/* Modal de sélection */}
      {isModalOpen && (
        <div className="timeline-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="timeline-modal" onClick={(e) => e.stopPropagation()}>
            <div className="timeline-modal-header">
              <h4 className="timeline-modal-title">Select Time Period</h4>
              <button 
                className="timeline-modal-close"
                onClick={() => setIsModalOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="timeline-modal-content">
              {periods.map((period) => (
                <button
                  key={period.id}
                  className={`timeline-modal-btn ${selectedPeriod === period.id ? 'active' : ''}`}
                  onClick={() => handlePeriodChange(period)}
                >
                  <span className="timeline-modal-btn-label">{period.label}</span>
                  {selectedPeriod === period.id && (
                    <span className="timeline-modal-btn-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TimelineSlider;