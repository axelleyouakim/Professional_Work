'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import './TimelineSlider.css';

const TimelineSlider = ({ onPeriodChange }) => {
  const LAST_DATA_DATE = useMemo(() => new Date('2023-03-09'), []);

  const periods = useMemo(() => [
    { id: 0, label: 'All Time', days: null, shortLabel: 'All' },
    { id: 1, label: 'Last 7 Days', days: 7, shortLabel: '7d' },
    { id: 2, label: 'Last 14 Days', days: 14, shortLabel: '14d' },
    { id: 3, label: 'Last Month', days: 30, shortLabel: '1m' },
    { id: 4, label: 'Last 2 Months', days: 60, shortLabel: '2m' },
    { id: 5, label: 'Last 3 Months', days: 90, shortLabel: '3m' },
    { id: 6, label: 'Last 6 Months', days: 180, shortLabel: '6m' },
    { id: 7, label: 'Last Year', days: 365, shortLabel: '1y' },
  ], []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  const debouncedSliderValue = useDebounce(sliderValue, 500);

  useEffect(() => {
    const selectedPeriod = periods[debouncedSliderValue];
    console.log('🎯 [TimelineSlider] Period changed, updating ALL components:', selectedPeriod.label);
    onPeriodChange(selectedPeriod);
  }, [debouncedSliderValue, periods, onPeriodChange]);

  const handleSliderChange = useCallback((e) => {
    const newValue = parseInt(e.target.value, 10);
    setSliderValue(newValue);
    setIsSliding(true);
  }, []);

  const handleSliderMouseUp = useCallback(() => {
    setIsSliding(false);
  }, []);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const getCurrentPeriod = useMemo(() => {
    return periods[sliderValue];
  }, [sliderValue, periods]);

  const getDateRange = useMemo(() => {
    if (!getCurrentPeriod.days) {
      return 'Jan 22, 2020 → Mar 9, 2023';
    }
    
    const endDate = new Date(LAST_DATA_DATE);
    const startDate = new Date(LAST_DATA_DATE);
    startDate.setDate(endDate.getDate() - getCurrentPeriod.days);
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };
    
    return `${formatDate(startDate)} → ${formatDate(endDate)}`;
  }, [getCurrentPeriod, LAST_DATA_DATE]);

  return (
    <>
      <button 
        className="timeline-compact-btn"
        onClick={handleOpenModal}
        title="Change time period"
      >
        <span className="timeline-compact-icon">📅</span>
        <span className="timeline-compact-text">{getCurrentPeriod.label}</span>
        <span className="timeline-compact-arrow">▼</span>
      </button>

      {isModalOpen && (
        <div className="timeline-modal-overlay" onClick={handleCloseModal}>
          <div className="timeline-modal timeline-modal-slider" onClick={(e) => e.stopPropagation()}>
            <div className="timeline-modal-header">
              <h4 className="timeline-modal-title">Select Time Period</h4>
              <button 
                className="timeline-modal-close"
                onClick={handleCloseModal}
                title="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="timeline-modal-content timeline-modal-slider-content">
              <div className="timeline-slider-display">
                <div className="timeline-slider-label">{getCurrentPeriod.label}</div>
                <div className="timeline-slider-range">{getDateRange}</div>
              </div>

              <div className="timeline-slider-track-container">
                <input
                  type="range"
                  min="0"
                  max={periods.length - 1}
                  value={sliderValue}
                  onChange={handleSliderChange}
                  onMouseUp={handleSliderMouseUp}
                  onTouchEnd={handleSliderMouseUp}
                  className="timeline-slider-input"
                  aria-label="Select time period"
                />
                
                <div className="timeline-slider-labels">
                  {periods.map((period) => (
                    <span key={period.id} className="timeline-slider-label-mark">
                      {period.shortLabel}
                    </span>
                  ))}
                </div>
              </div>

              {isSliding && (
                <div className="timeline-slider-info">
                  ⏳ Updating all components... (stops when you release)
                </div>
              )}

              <button 
                className="timeline-modal-done-btn"
                onClick={handleCloseModal}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TimelineSlider;