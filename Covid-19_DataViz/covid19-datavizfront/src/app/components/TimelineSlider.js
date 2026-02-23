'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
        displayDate: currentDate.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
        hasData,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, []);

  const [sliderIndex, setSliderIndex] = useState(allDates.length - 1);
  const selectedDate = allDates[sliderIndex];

  // ─── Fix "tout à 0" : appel initial au montage ───────────────────────────
  // Sans ça, Dashboard reçoit selectedPeriod=null au démarrage et
  // isSliderMode=false → les données API sont utilisées → ça marche.
  // Mais si le slider est monté sans jamais être bougé, les données
  // du slider ne sont jamais envoyées. On envoie la date initiale dès
  // le montage pour synchroniser le Dashboard.
  useEffect(() => {
    if (onPeriodChange && allDates.length > 0) {
      const initialDate = allDates[allDates.length - 1];
      onPeriodChange({
        dateString:  initialDate.dateString,
        dateObj:     initialDate.dateObj,
        displayDate: initialDate.displayDate,
        dayIndex:    allDates.length - 1,
        totalDays:   allDates.length,
        hasData:     initialDate.hasData,
      });
    }
    // On veut que ça tourne UNE SEULE FOIS au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSliderChange = useCallback((e) => {
    const newIndex = parseInt(e.target.value, 10);
    setSliderIndex(newIndex);

    const date = allDates[newIndex];
    console.log(`📅 [TimelineSlider] Slider moved to: ${date.displayDate} (index ${newIndex})`);

    if (onPeriodChange) {
      onPeriodChange({
        dateString:  date.dateString,
        dateObj:     date.dateObj,
        displayDate: date.displayDate,
        dayIndex:    newIndex,
        totalDays:   allDates.length,
        hasData:     date.hasData,
      });
    }
  }, [allDates, onPeriodChange]);

  const goToStart = useCallback(() => {
    const idx  = 0;
    const date = allDates[idx];
    setSliderIndex(idx);
    if (onPeriodChange) onPeriodChange({
      dateString: date.dateString, dateObj: date.dateObj,
      displayDate: date.displayDate, dayIndex: idx,
      totalDays: allDates.length, hasData: date.hasData,
    });
  }, [allDates, onPeriodChange]);

  const goToEnd = useCallback(() => {
    const idx  = allDates.length - 1;
    const date = allDates[idx];
    setSliderIndex(idx);
    if (onPeriodChange) onPeriodChange({
      dateString: date.dateString, dateObj: date.dateObj,
      displayDate: date.displayDate, dayIndex: idx,
      totalDays: allDates.length, hasData: date.hasData,
    });
  }, [allDates, onPeriodChange]);

  const stepBackward = useCallback(() => {
    setSliderIndex((prev) => {
      const idx  = Math.max(0, prev - 7);
      const date = allDates[idx];
      if (onPeriodChange) onPeriodChange({
        dateString: date.dateString, dateObj: date.dateObj,
        displayDate: date.displayDate, dayIndex: idx,
        totalDays: allDates.length, hasData: date.hasData,
      });
      return idx;
    });
  }, [allDates, onPeriodChange]);

  const stepForward = useCallback(() => {
    setSliderIndex((prev) => {
      const idx  = Math.min(allDates.length - 1, prev + 7);
      const date = allDates[idx];
      if (onPeriodChange) onPeriodChange({
        dateString: date.dateString, dateObj: date.dateObj,
        displayDate: date.displayDate, dayIndex: idx,
        totalDays: allDates.length, hasData: date.hasData,
      });
      return idx;
    });
  }, [allDates, onPeriodChange]);

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
          className="timeline-slider"
        />
        <div
          className="timeline-slider-progress"
          style={{ width: `${(sliderIndex / (allDates.length - 1)) * 100}%` }}
        />
      </div>

      <div className="timeline-info">
        {!selectedDate?.hasData && '⚪ Before COVID-19 - No cases recorded'}
        {selectedDate?.hasData && sliderIndex <= 100 &&
          `📊 Early pandemic - Data starting ${selectedDate?.displayDate}`}
        {selectedDate?.hasData && sliderIndex > 100 && sliderIndex < allDates.length - 1 &&
          `📊 Cumulative data up to ${selectedDate?.displayDate}`}
        {sliderIndex === allDates.length - 1 && '✅ Most recent data available'}
      </div>
    </div>
  );
};

export default TimelineSlider;