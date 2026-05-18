'use client';

import React, { useMemo } from 'react';
import { usePreCalculatedData } from '../../hooks/usePreCalculatedData';
import ChartComponent from '../ChartComponent';

const ChartWidget = ({ country = null, dateString = null, theme = 'light' }) => {
  const { preCalculatedIndex } = usePreCalculatedData();

  const timelineData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return null;
    const { globalChartFull, dateToGlobalChartIdx, countryChartFull } = preCalculatedIndex;
    const endIdx = dateString
      ? (dateToGlobalChartIdx[dateString] ?? globalChartFull.length - 1) + 1
      : globalChartFull.length;
    if (country && countryChartFull[country])
      return countryChartFull[country].slice(0, endIdx);
    return globalChartFull.slice(0, endIdx);
  }, [preCalculatedIndex, dateString, country]);

  const isDark   = theme === 'dark';
  const titleCol = isDark ? '#94a3b8' : '#333';
  const labelCol = isDark ? '#6c5ce7' : '#6c5ce7'; // pareil dans les deux cas

  return (
    <div style={{ height: '100%', minHeight: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 12px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: titleCol }}>
          📈 {country ? `${country} — Cases Timeline` : 'Global Cases Over Time'}
        </span>
        <span style={{ fontSize: 9, color: labelCol, fontWeight: 600 }}>JHU CSSE</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChartComponent
          period={null}
          selectedCountry={country}
          timelineData={timelineData}
          theme={theme}
        />
      </div>
    </div>
  );
};

export default ChartWidget;