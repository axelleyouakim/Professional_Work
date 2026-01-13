'use client';

import React, { useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useCasesTimeSeries } from '../hooks/useCovidData';
import './Dashboard.css';

/**
 * ════════════════════════════════════════════════════════════
 * CHART COMPONENT - Pattern 3 États DIRECT
 * ════════════════════════════════════════════════════════════
 * 
 * ✅ Fait son propre appel TanStack Query (useCasesTimeSeries)
 * ✅ Gère DIRECTEMENT les 3 états (Loading, Error, Success)
 * ✅ NE REÇOIT PLUS de data en props - fait l'appel lui-même
 */
const ChartComponent = ({ period = null }) => {
  // ─────────────────────────────────────────────────────────
  // 🔥 APPEL TANSTACK QUERY
  // ─────────────────────────────────────────────────────────
  const query = useCasesTimeSeries(period);

  // ─────────────────────────────────────────────────────────
  // FORMAT Y AXIS
  // ─────────────────────────────────────────────────────────
  const formatYAxis = useCallback((value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value;
  }, []);

  // ─────────────────────────────────────────────────────────
  // FORMAT CHART DATA
  // ─────────────────────────────────────────────────────────
  const formattedData = useMemo(() => {
    const rawData = query.data || [];
    if (rawData.length === 0) return [];
    
    return rawData.map(item => {
      const parts = item.date.split("/");
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        
        const dateObj = new Date(year, month - 1, day);
        const monthName = dateObj.toLocaleDateString("en-US", { month: "short" });
        
        return {
          date: monthName,
          cases: item.cases,
          fullDate: `${monthName} ${day}, ${year}`
        };
      }
      return item;
    });
  }, [query.data]);

  // ─────────────────────────────────────────────────────────
  // ✅ ÉTAT 1 : LOADING (pattern direct)
  // ─────────────────────────────────────────────────────────
  if (query.isLoading) {
    return (
      <div className="chart-content">
        <div className="chart-container">
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            justifyContent: "center", 
            alignItems: "center", 
            height: 200,
            gap: "10px"
          }}>
            <div className="spinner"></div>
            <p style={{ color: "#999" }}>Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // ✅ ÉTAT 2 : ERROR (pattern direct)
  // ─────────────────────────────────────────────────────────
  if (query.error) {
    return (
      <div className="chart-content">
        <div className="chart-container">
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            justifyContent: "center", 
            alignItems: "center", 
            height: 200,
            gap: "10px",
            color: "#ff4444"
          }}>
            <span style={{ fontSize: "24px" }}>⚠️</span>
            <p>Failed to load chart data</p>
            <p style={{ fontSize: "12px", color: "#999" }}>
              {query.error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // ✅ ÉTAT 3 : SUCCESS (pattern direct)
  // ─────────────────────────────────────────────────────────
  if (formattedData.length === 0) {
    return (
      <div className="chart-content">
        <div className="chart-container">
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            height: 200,
            color: "#999" 
          }}>
            No chart data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-content">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="date" 
              stroke="#999"
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#999"
              tickFormatter={formatYAxis}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
              labelStyle={{ color: "#fff" }}
              formatter={(value) => value.toLocaleString()}
              labelFormatter={(label, payload) => {
                return payload && payload[0] ? payload[0].payload.fullDate : label;
              }}
            />
            <Line
              type="monotone"
              dataKey="cases"
              stroke="#ff9800"
              strokeWidth={2}
              dot={{ fill: "#ff9800", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="chart-tabs">
          <button className="chart-tab active">Confirmed</button>
          <button className="chart-tab">Logarithmic</button>
          <button className="chart-tab">Daily Increase</button>
        </div>
      </div>
    </div>
  );
};

export default ChartComponent;