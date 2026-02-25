'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useThrottledCallback } from '@tanstack/react-pacer';
import './TimelineSlider.css';

const TimelineSlider = ({ onPeriodChange }) => {
  const allDates = useMemo(() => {
    const dates = [];
    const startDate = new Date(2019, 10, 1);
    const endDate = new Date(2023, 2, 9);
    const firstDataDate = new Date(2020, 0, 22);
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      const year = currentDate.getFullYear() % 100;
      
      const hasData = currentDate >= firstDataDate;
      
      dates.push({
        dateString: `${month}/${day}/${year}`,
        dateObj: new Date(currentDate),
        displayDate: currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        hasData: hasData
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }, []);

  const [sliderIndex, setSliderIndex] = useState(allDates.length - 1);

  // ✅ THROTTLED CALLBACK - Limite les appels API à 1 toutes les 300ms
  // Utilise le trailing edge pour être sûr d'avoir la dernière valeur
  const throttledPeriodChange = useThrottledCallback(
    (periodData) => {
      if (onPeriodChange) {
        console.log(`🚀 [Throttled] API call for: ${periodData.displayDate}`);
        onPeriodChange(periodData);
      }
    },
    {
      interval: 300, // 300ms entre chaque appel API
      leading: false, // Ne pas exécuter immédiatement
      trailing: true,  // Exécuter à la fin (dernière valeur)
    }
  );

  const selectedDate = allDates[sliderIndex];

  const handleSliderChange = useCallback((e) => {
    const newIndex = parseInt(e.target.value, 10);
    
    // ✅ Update UI immédiatement (pas de lag visuel)
    setSliderIndex(newIndex);
    
    const date = allDates[newIndex];
    
    console.log(`📅 [TimelineSlider] Slider moved to: ${date.displayDate} (index ${newIndex})`);
    
    // ✅ Throttle l'appel API
    throttledPeriodChange({
      dateString: date.dateString,
      dateObj: date.dateObj,
      displayDate: date.displayDate,
      dayIndex: newIndex,
      totalDays: allDates.length,
      hasData: date.hasData
    });
  }, [allDates, throttledPeriodChange]);

  const goToStart = useCallback(() => {
    const newIndex = 0;
    setSliderIndex(newIndex);
    const date = allDates[newIndex];
    
    // ✅ Pour les boutons, on appelle directement (pas de throttle)
    if (onPeriodChange) {
      onPeriodChange({
        dateString: date.dateString,
        dateObj: date.dateObj,
        displayDate: date.displayDate,
        dayIndex: newIndex,
        totalDays: allDates.length,
        hasData: date.hasData
      });
    }
  }, [allDates, onPeriodChange]);

  const goToEnd = useCallback(() => {
    const newIndex = allDates.length - 1;
    setSliderIndex(newIndex);
    const date = allDates[newIndex];
    
    if (onPeriodChange) {
      onPeriodChange({
        dateString: date.dateString,
        dateObj: date.dateObj,
        displayDate: date.displayDate,
        dayIndex: newIndex,
        totalDays: allDates.length,
        hasData: date.hasData
      });
    }
  }, [allDates, onPeriodChange]);

  const stepBackward = useCallback(() => {
    const newIndex = Math.max(0, sliderIndex - 7);
    setSliderIndex(newIndex);
    const date = allDates[newIndex];
    
    if (onPeriodChange) {
      onPeriodChange({
        dateString: date.dateString,
        dateObj: date.dateObj,
        displayDate: date.displayDate,
        dayIndex: newIndex,
        totalDays: allDates.length,
        hasData: date.hasData
      });
    }
  }, [sliderIndex, allDates, onPeriodChange]);

  const stepForward = useCallback(() => {
    const newIndex = Math.min(allDates.length - 1, sliderIndex + 7);
    setSliderIndex(newIndex);
    const date = allDates[newIndex];
    
    if (onPeriodChange) {
      onPeriodChange({
        dateString: date.dateString,
        dateObj: date.dateObj,
        displayDate: date.displayDate,
        dayIndex: newIndex,
        totalDays: allDates.length,
        hasData: date.hasData
      });
    }
  }, [sliderIndex, allDates, onPeriodChange]);

  return (
    <div className="timeline-slider-container">
      <div className="timeline-header">
        <div className="timeline-date-display">
          <span className="timeline-label">📅 Selected Date:</span>
          <span className="timeline-date">{selectedDate?.displayDate}</span>
        </div>
        <div className="timeline-progress">
          <span className="timeline-label">Day {sliderIndex + 1} / {allDates.length}</span>
        </div>
      </div>

      <div className="timeline-controls">
        <button 
          className="timeline-btn" 
          onClick={goToStart}
          title="Go to start (Jan 22, 2020)"
        >
          ⏮ Start
        </button>
        <button 
          className="timeline-btn" 
          onClick={stepBackward}
          title="Go back 7 days"
        >
          ⏪ -7d
        </button>
        <button 
          className="timeline-btn" 
          onClick={stepForward}
          title="Go forward 7 days"
        >
          +7d ⏩
        </button>
        <button 
          className="timeline-btn" 
          onClick={goToEnd}
          title="Go to end (Mar 9, 2023)"
        >
          End ⏭
        </button>
      </div>

      <div className="timeline-slider-wrapper">
        <div className="timeline-slider-labels">
          <span className="timeline-slider-label">Nov 1, 2019 (Start - No data yet)</span>
          <span className="timeline-slider-label">Mar 9, 2023 (End)</span>
        </div>
        <input
          type="range"
          min="0"
          max={allDates.length - 1}
          value={sliderIndex}
          onChange={handleSliderChange}
          className="timeline-slider"
        />
        <div 
          className="timeline-slider-progress"
          style={{ width: `${(sliderIndex / (allDates.length - 1)) * 100}%` }}
        />
      </div>

      <div className="timeline-info">
        {!selectedDate?.hasData && '⚪ Before COVID-19 - No cases recorded'}
        {selectedDate?.hasData && sliderIndex <= 100 && `📊 Early pandemic - Data starting ${selectedDate?.displayDate}`}
        {selectedDate?.hasData && sliderIndex > 100 && sliderIndex < allDates.length - 1 && `📊 Cumulative data up to ${selectedDate?.displayDate}`}
        {sliderIndex === allDates.length - 1 && '✅ Most recent data available'}
      </div>
    </div>
  );
};

export default TimelineSlider;