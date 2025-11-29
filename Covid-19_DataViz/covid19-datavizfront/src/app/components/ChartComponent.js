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
import './Dashboard.css';

const ChartComponent = ({ data }) => {
  const formatYAxis = useCallback((value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value;
  }, []);

  if (!data || data.length === 0) {
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
          <LineChart data={data}>
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