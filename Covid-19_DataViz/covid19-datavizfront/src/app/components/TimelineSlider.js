'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useThrottledCallback } from '@tanstack/react-pacer';
import './TimelineSlider.css';

const TimelineSlider = ({ onPeriodChange }) => {
  const allDates = useMemo(() => {
    const dates = [];
    const startDate     = new Date(2019, 10, 1);
    const endDate       = new Date(2023,  2, 9);
    const firstDataDate = new Date(2020,  0, 22);
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const month   = currentDate.getMonth() + 1;
      const day     = currentDate.getDate();
      const year    = currentDate.getFullYear() % 100;
      const hasData = currentDate >= firstDataDate;
      dates.push({
        dateString:  `${month}/${day}/${year}`,
        dateObj:     new Date(currentDate),
        displayDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        hasData,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, []);

  const [sliderIndex, setSliderIndex] = useState(allDates.length - 1);
  const latestIndexRef = useRef(allDates.length - 1);

  // ─── Throttle à 50ms, leading:true ───────────────────────────────────────
  // leading:true  → fire immédiatement au premier mouvement (pas de délai perçu)
  // interval:50ms → max 20 updates/sec pendant le drag (fluide sans surcharge)
  // trailing:true → garantit que la dernière position est toujours envoyée
  const throttledPeriodChange = useThrottledCallback(
    (periodData) => {
      if (onPeriodChange) onPeriodChange(periodData);
    },
    { interval: 50, leading: true, trailing: true }
  );

  const handleSliderChange = useCallback((e) => {
    const newIndex = parseInt(e.target.value, 10);
    latestIndexRef.current = newIndex;

    // UI : immédiat, jamais throttlé
    setSliderIndex(newIndex);

    const date = allDates[newIndex];
    throttledPeriodChange({
      dateString:  date.dateString,
      dateObj:     date.dateObj,
      displayDate: date.displayDate,
      dayIndex:    newIndex,
      totalDays:   allDates.length,
      hasData:     date.hasData,
    });
  }, [allDates, throttledPeriodChange]);

  // Flush à mouseup/touchend : garantit que la valeur finale est toujours envoyée
  const handleSliderEnd = useCallback(() => {
    const idx  = latestIndexRef.current;
    const date = allDates[idx];
    if (onPeriodChange) onPeriodChange({
      dateString:  date.dateString,
      dateObj:     date.dateObj,
      displayDate: date.displayDate,
      dayIndex:    idx,
      totalDays:   allDates.length,
      hasData:     date.hasData,
    });
  }, [allDates, onPeriodChange]);

  const fireDirect = useCallback((idx) => {
    setSliderIndex(idx);
    latestIndexRef.current = idx;
    const date = allDates[idx];
    if (onPeriodChange) onPeriodChange({
      dateString:  date.dateString,
      dateObj:     date.dateObj,
      displayDate: date.displayDate,
      dayIndex:    idx,
      totalDays:   allDates.length,
      hasData:     date.hasData,
    });
  }, [allDates, onPeriodChange]);

  const goToStart    = useCallback(() => fireDirect(0), [fireDirect]);
  const goToEnd      = useCallback(() => fireDirect(allDates.length - 1), [fireDirect, allDates.length]);
  const stepBackward = useCallback(() => fireDirect(Math.max(0, latestIndexRef.current - 7)), [fireDirect]);
  const stepForward  = useCallback(() => fireDirect(Math.min(allDates.length - 1, latestIndexRef.current + 7)), [fireDirect, allDates.length]);

  const selectedDate = allDates[sliderIndex];

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
        <button className="timeline-btn" onClick={goToStart}    title="Go to start">⏮ Start</button>
        <button className="timeline-btn" onClick={stepBackward} title="Go back 7 days">⏪ -7d</button>
        <button className="timeline-btn" onClick={stepForward}  title="Go forward 7 days">+7d ⏩</button>
        <button className="timeline-btn" onClick={goToEnd}      title="Go to end">End ⏭</button>
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
          onMouseUp={handleSliderEnd}
          onTouchEnd={handleSliderEnd}
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