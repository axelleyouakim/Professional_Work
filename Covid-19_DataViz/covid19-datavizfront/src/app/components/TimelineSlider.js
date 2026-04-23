'use client';

import React, { useState, useCallback, useMemo, useRef, useTransition, useEffect } from 'react';
import { useThrottledCallback } from '@tanstack/react-pacer';
import './TimelineSlider.css';

const TimelineSlider = ({ onPeriodChange, externalIndex }) => {
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
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (externalIndex != null && externalIndex !== sliderIndex) {
      setSliderIndex(externalIndex);
      latestIndexRef.current = externalIndex;
    }
  }, [externalIndex, sliderIndex]);

  const throttledPeriodChange = useThrottledCallback(
    (periodData) => {
      if (onPeriodChange) {
        startTransition(() => { onPeriodChange(periodData); });
      }
    },
    { wait: 150, leading: true, trailing: true }
  );

  const handleSliderChange = useCallback((e) => {
    const newIndex = parseInt(e.target.value, 10);
    latestIndexRef.current = newIndex;
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

  const handleSliderEnd = useCallback(() => {
    const idx  = latestIndexRef.current;
    const date = allDates[idx];
    if (onPeriodChange) {
      startTransition(() => {
        onPeriodChange({
          dateString:  date.dateString,
          dateObj:     date.dateObj,
          displayDate: date.displayDate,
          dayIndex:    idx,
          totalDays:   allDates.length,
          hasData:     date.hasData,
        });
      });
    }
  }, [allDates, onPeriodChange, startTransition]);

  const fireDirect = useCallback((idx) => {
    setSliderIndex(idx);
    latestIndexRef.current = idx;
    const date = allDates[idx];
    if (onPeriodChange) {
      startTransition(() => {
        onPeriodChange({
          dateString:  date.dateString,
          dateObj:     date.dateObj,
          displayDate: date.displayDate,
          dayIndex:    idx,
          totalDays:   allDates.length,
          hasData:     date.hasData,
        });
      });
    }
  }, [allDates, onPeriodChange, startTransition]);

  const goToStart    = useCallback(() => fireDirect(0), [fireDirect]);
  const goToEnd      = useCallback(() => fireDirect(allDates.length - 1), [fireDirect, allDates.length]);
  const stepBackward = useCallback(() => fireDirect(Math.max(0, latestIndexRef.current - 7)), [fireDirect]);
  const stepForward  = useCallback(() => fireDirect(Math.min(allDates.length - 1, latestIndexRef.current + 7)), [fireDirect, allDates.length]);

  const selectedDate = allDates[sliderIndex];

  const pct = (sliderIndex / (allDates.length - 1)) * 100;
  const sliderStyle = {
    background: `linear-gradient(to right, #ff4444 0%, #cc0000 ${pct}%, rgba(255,255,255,0.15) ${pct}%, rgba(255,255,255,0.15) 100%)`,
  };

  return (
    <div className="timeline-slider-container">
      <div className="timeline-header">
        <div className="timeline-date-display">
          <span className="timeline-label">Selected Date:</span>
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
          style={sliderStyle}
        />
      </div>

      <div className="timeline-info">
        {!selectedDate?.hasData && 'Before COVID-19 — No cases recorded'}
        {selectedDate?.hasData && sliderIndex <= 100 && `Early pandemic — Data starting ${selectedDate?.displayDate}`}
        {selectedDate?.hasData && sliderIndex > 100 && sliderIndex < allDates.length - 1 && `Cumulative data up to ${selectedDate?.displayDate}`}
        {sliderIndex === allDates.length - 1 && 'Most recent data available'}
      </div>
    </div>
  );
};

export default TimelineSlider;