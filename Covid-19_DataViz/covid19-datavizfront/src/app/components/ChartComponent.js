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

const ChartComponent = ({ period = null, selectedCountry = null, timelineData = null }) => {
  console.log('📊 [ChartComponent] Received props:', { 
    period, 
    selectedCountry, 
    timelineDataLength: timelineData?.length 
  });

  // ✅ Si timelineData est fourni (mode slider), utiliser ÇA et rien d'autre
  const shouldUseTimeline = timelineData !== null && timelineData !== undefined;
  
  // ✅ Charger via API SEULEMENT si pas de timelineData
  const apiQuery = useCasesTimeSeries(period, selectedCountry);

  const formatYAxis = useCallback((value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value;
  }, []);

  const formatChartData = useCallback((rawData) => {
    if (!rawData || rawData.length === 0) {
      console.log('📊 [ChartComponent] No raw data');
      return [];
    }
    
    console.log('📊 [ChartComponent] Formatting data:', rawData.length, 'points');
    console.log('📊 [ChartComponent] First:', rawData[0]);
    console.log('📊 [ChartComponent] Last:', rawData[rawData.length - 1]);
    
    const data = rawData.map(item => {
      const parts = item.date.split("/");
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        
        const dateObj = new Date(year, month - 1, day);
        const monthName = dateObj.toLocaleDateString("en-US", { month: "short" });
        const fullYear = dateObj.getFullYear();
        
        return {
          date: `${monthName} ${fullYear}`,
          cases: item.cases,
          fullDate: `${monthName} ${day}, ${fullYear}`
        };
      }
      return item;
    });
    
    console.log('📊 [ChartComponent] Formatted:', data.length, 'points');
    return data;
  }, []);

  // ✅ DÉCIDER QUELLE DONNÉE UTILISER
  const rawData = useMemo(() => {
    if (shouldUseTimeline) {
      console.log('✅ [ChartComponent] Using TIMELINE data:', timelineData.length, 'points');
      return timelineData;
    }
    
    if (apiQuery.data) {
      console.log('⚠️ [ChartComponent] Using API data:', apiQuery.data.length, 'points');
      return apiQuery.data;
    }
    
    console.log('❌ [ChartComponent] No data available');
    return [];
  }, [shouldUseTimeline, timelineData, apiQuery.data]);

  const isLoading = shouldUseTimeline ? false : apiQuery.isLoading;
  const error = shouldUseTimeline ? null : apiQuery.error;

  if (isLoading) {
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
            Loading chart...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-content">
        <div className="chart-container">
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            height: 200,
            color: "#f44336" 
          }}>
            Failed to load chart data
          </div>
        </div>
      </div>
    );
  }

  const formattedData = formatChartData(rawData);

  if (formattedData.length === 0) {
    return (
      <div className="chart-content">
        <div className="chart-container">
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            justifyContent: "center", 
            alignItems: "center", 
            height: 200,
            color: "#999",
            gap: "10px"
          }}>
            <div>📊 No data yet</div>
            {shouldUseTimeline && (
              <div style={{ fontSize: "12px", opacity: 0.7 }}>
                Move the slider to the right to see data
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-content">
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
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#999"
              tickFormatter={formatYAxis}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
              labelStyle={{ color: "#fff" }}
              formatter={(value) => [value.toLocaleString(), 'Cases']}
              labelFormatter={(label, payload) => {
                return payload && payload[0] ? payload[0].payload.fullDate : label;
              }}
            />
            <Line
              type="monotone"
              dataKey="cases"
              stroke={selectedCountry ? "#5a8aff" : "#ff9800"} 
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
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
};

export default ChartComponent;