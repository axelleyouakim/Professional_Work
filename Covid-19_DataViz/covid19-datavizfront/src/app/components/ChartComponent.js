'use client';

import React, { useMemo } from 'react';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Label
} from 'recharts';
import { useCasesTimeSeries } from '../hooks/useCovidData';
import './Dashboard.css';

const formatDateStr = (dateStr) => {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return { date: dateStr, fullDate: dateStr };
  const month = parseInt(parts[0], 10);
  const day   = parseInt(parts[1], 10);
  let year    = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day);
  const monthName = d.toLocaleDateString('en-US', { month: 'short' });
  return { date: `${monthName} ${year}`, fullDate: `${monthName} ${day}, ${year}` };
};

const formatYAxis = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v;
};

// ✅ theme="dark" par défaut → page principale inchangée
// theme="light" → utilisé uniquement depuis dashboard/page.js
const ChartComponent = ({ period = null, selectedCountry = null, timelineData = null, theme = 'dark' }) => {
  const shouldUseTimeline = timelineData != null;

  // ✅ Couleurs selon le theme
  const gridColor     = theme === 'light' ? '#f0f0f0' : '#333';
  const axisColor     = theme === 'light' ? '#aaa'    : '#999';
  const tooltipBg     = theme === 'light' ? '#fff'    : '#1a1a1a';
  const tooltipBorder = theme === 'light' ? '#f0f0f0' : '#333';
  const tooltipText   = theme === 'light' ? '#333'    : '#fff';
  const peakBg        = theme === 'light' ? '#fff5f2' : 'rgba(255,100,100,0.1)';
  const peakBorder    = theme === 'light' ? '#ffd5c8' : 'rgba(255,100,100,0.3)';
  const peakColor     = theme === 'light' ? '#e17055' : '#ff6464';

  const apiQuery = useCasesTimeSeries(
    shouldUseTimeline ? null : period,
    shouldUseTimeline ? null : selectedCountry,
    null,
    !shouldUseTimeline
  );

  const rawData = useMemo(() => {
    if (shouldUseTimeline) return timelineData;
    return apiQuery.data || [];
  }, [shouldUseTimeline, timelineData, apiQuery.data]);

  const formattedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    const sampled = rawData.filter((_, i) => i % 7 === 0 || i === rawData.length - 1);
    return sampled.map(item => {
      const { date, fullDate } = formatDateStr(item.date);
      return { date, cases: item.cases, fullDate, dateKey: item.date };
    });
  }, [rawData]);

  const peakInfo = useMemo(() => {
    if (!formattedData || formattedData.length === 0) return null;
    let maxCases = 0, peakIndex = 0;
    formattedData.forEach((item, i) => {
      if (item.cases > maxCases) { maxCases = item.cases; peakIndex = i; }
    });
    if (maxCases === 0) return null;
    return { cases: maxCases, date: formattedData[peakIndex].date, index: peakIndex };
  }, [formattedData]);

  const isLoading = shouldUseTimeline ? false : apiQuery.isLoading;
  const error     = shouldUseTimeline ? null  : apiQuery.error;

  if (isLoading) return (
    <div className="chart-content">
      <div className="chart-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: '#999' }}>
        Loading chart...
      </div>
    </div>
  );

  if (error) return (
    <div className="chart-content">
      <div className="chart-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: '#f44336' }}>
        Failed to load chart data
      </div>
    </div>
  );

  if (formattedData.length === 0) return (
    <div className="chart-content">
      <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 200, color: '#999', gap: '10px' }}>
        <div>No data yet</div>
        {shouldUseTimeline && <div style={{ fontSize: '12px', opacity: 0.7 }}>Move the slider to the right to see data</div>}
      </div>
    </div>
  );

  return (
    <div className="chart-content">
      {selectedCountry && (
        <div style={{ padding: '10px 20px', color: axisColor, fontSize: '14px', borderBottom: `1px solid ${gridColor}` }}>
          {selectedCountry} - Confirmed Cases Timeline
        </div>
      )}

      {peakInfo && (
        <div style={{ padding: '8px 20px', background: peakBg, borderBottom: `1px solid ${peakBorder}`, color: peakColor, fontSize: '12px', fontWeight: 600 }}>
          🔺 PEAK: {peakInfo.cases.toLocaleString()} cases on {peakInfo.date}
        </div>
      )}

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formattedData}>
            {/* ✅ Couleurs dynamiques selon theme */}
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              stroke={axisColor}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fill: axisColor, fontSize: 11 }}
            />
            <YAxis
              stroke={axisColor}
              tickFormatter={formatYAxis}
              tick={{ fill: axisColor, fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
              labelStyle={{ color: tooltipText }}
              formatter={(value) => [value.toLocaleString(), 'Cases']}
              labelFormatter={(label, payload) => payload?.[0]?.payload.fullDate || label}
            />
            {peakInfo && (
              <ReferenceLine x={formattedData[peakInfo.index]?.date} stroke="#ff4444" strokeWidth={2} strokeDasharray="5 5">
                <Label value="PEAK" position="top" fill="#ff4444" fontSize={10} fontWeight="bold" />
              </ReferenceLine>
            )}
            <Line
              type="monotone"
              dataKey="cases"
              stroke={selectedCountry ? '#5a8aff' : '#ff9800'}
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="chart-tabs">
          <button className="chart-tab active">{selectedCountry ? `${selectedCountry} - Confirmed` : 'Confirmed'}</button>
          <button className="chart-tab">Logarithmic</button>
          <button className="chart-tab">Daily Increase</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChartComponent, (prev, next) =>
  prev.timelineData === next.timelineData &&
  prev.selectedCountry === next.selectedCountry &&
  prev.period === next.period &&
  prev.theme === next.theme
);