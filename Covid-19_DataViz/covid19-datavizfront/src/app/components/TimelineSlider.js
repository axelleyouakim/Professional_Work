'use client';

import React, { useState, useCallback, useMemo } from 'react';
import './TimelineSlider.css';

const TimelineSlider = ({ onPeriodChange }) => {
  // ✅ Générer toutes les dates entre 1 Nov 2019 et 9 Mars 2023
  const allDates = useMemo(() => {
    const dates = [];
    const startDate = new Date(2019, 10, 1); // 1er Novembre 2019 (AVANT le COVID)
    const endDate = new Date(2023, 2, 9);     // 9 Mars 2023
    const firstDataDate = new Date(2020, 0, 22); // 22 Jan 2020 (première vraie donnée)
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      const year = currentDate.getFullYear() % 100; // Format YY
      
      // ✅ Si on est AVANT le 22 jan 2020, marquer comme "no data"
      const hasData = currentDate >= firstDataDate;
      
      dates.push({
        dateString: `${month}/${day}/${year}`,
        dateObj: new Date(currentDate),
        displayDate: currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        hasData: hasData // ✅ NOUVEAU: indique si il y a des données à cette date
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }, []);

  // ✅ État : index du slider (0 = Jan 22 2020, max = Mars 9 2023)
  const [sliderIndex, setSliderIndex] = useState(allDates.length - 1); // Commence à la fin

  // ✅ Date sélectionnée
  const selectedDate = allDates[sliderIndex];

  // ✅ Handler pour bouger le slider
  const handleSliderChange = useCallback((e) => {
    const newIndex = parseInt(e.target.value, 10);
    setSliderIndex(newIndex);
    
    const date = allDates[newIndex];
    
    console.log(`📅 [TimelineSlider] Slider moved to: ${date.displayDate} (index ${newIndex})`);
    
    // ✅ Notifier le parent
    if (onPeriodChange) {
      onPeriodChange({
        dateString: date.dateString,      // "3/15/20" pour l'API
        dateObj: date.dateObj,             // Date object
        displayDate: date.displayDate,     // "Mar 15, 2020" pour affichage
        dayIndex: newIndex,                // Index du jour
        totalDays: allDates.length         // Total de jours
      });
    }
  }, [allDates, onPeriodChange]);

  // ✅ Boutons de contrôle
  const goToStart = useCallback(() => {
    setSliderIndex(0);
  }, []);

  const goToEnd = useCallback(() => {
    setSliderIndex(allDates.length - 1);
  }, [allDates.length]);

  const stepBackward = useCallback(() => {
    setSliderIndex(prev => Math.max(0, prev - 7)); // Recule de 7 jours
  }, []);

  const stepForward = useCallback(() => {
    setSliderIndex(prev => Math.min(allDates.length - 1, prev + 7)); // Avance de 7 jours
  }, [allDates.length]);

  return (
    <div className="timeline-slider-container">
      {/* Header avec date sélectionnée */}
      <div className="timeline-header">
        <div className="timeline-date-display">
          <span className="timeline-label">📅 Selected Date:</span>
          <span className="timeline-date">{selectedDate?.displayDate}</span>
        </div>
        <div className="timeline-progress">
          <span className="timeline-label">Day {sliderIndex + 1} / {allDates.length}</span>
        </div>
      </div>

      {/* Contrôles */}
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

      {/* Slider principal */}
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

      {/* Info */}
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