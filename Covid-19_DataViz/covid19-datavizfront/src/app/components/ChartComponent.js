import React from 'react';
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

const ChartComponent = ({ data, isLoading, isError }) => {
  return (
    <div className="chart-panel">
      <div className="chart-container">
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
            <p style={{ color: "#999" }}>Loading chart data...</p>
          </div>
        ) : isError ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
            <p style={{ color: "#ff6b6b" }}>Error loading chart</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                labelStyle={{ color: "#fff" }}
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
        )}
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