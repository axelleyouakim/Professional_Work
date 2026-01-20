'use client';

import React, { useCallback } from 'react';
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
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

const ChartComponent = ({ period = null, selectedCountry = null }) => {
  // ✅ Passe selectedCountry au hook
  const query = useCasesTimeSeries(period, selectedCountry);

  const formatYAxis = useCallback((value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value;
  }, []);

  const formatChartData = useCallback((rawData) => {
    if (!rawData || rawData.length === 0) return [];
    
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
  }, []);

  return (
    <QueryStateWrapper 
      query={query}
      loadingMessage={selectedCountry ? `Loading ${selectedCountry} chart...` : "Loading chart data..."}
      errorMessage={selectedCountry ? `Failed to load ${selectedCountry} data` : "Failed to load chart data"}
    >
      {(rawData) => {
        const formattedData = formatChartData(rawData);

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
                  {selectedCountry 
                    ? `No data available for ${selectedCountry}` 
                    : "No chart data available"}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="chart-content">
            {/* ✅ Titre dynamique */}
            {selectedCountry && (
              <div style={{ 
                padding: '10px 20px', 
                color: '#999', 
                fontSize: '14px',
                borderBottom: '1px solid #333'
              }}>
                📊 {selectedCountry} - Confirmed Cases Timeline
              </div>
            )}
            
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
                    stroke={selectedCountry ? "#5a8aff" : "#ff9800"} 
                    strokeWidth={2}
                    dot={{ fill: selectedCountry ? "#5a8aff" : "#ff9800", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="chart-tabs">
                <button className="chart-tab active">
                  {selectedCountry ? `${selectedCountry} - Confirmed` : 'Confirmed'}
                </button>
                <button className="chart-tab">Logarithmic</button>
                <button className="chart-tab">Daily Increase</button>
              </div>
            </div>
          </div>
        );
      }}
    </QueryStateWrapper>
  );
};

export default ChartComponent;