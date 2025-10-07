"use client";
import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { getCasesTimeSeries } from '../../services/api';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import './charts.css';

const ChartsPage = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const data = await getCasesTimeSeries();
        
        const formattedData = data.data
          .filter((_, index) => index % 7 === 0)
          .map(item => {
            const parts = item.date.split('/');
            if (parts.length === 3) {
              const month = parseInt(parts[0], 10);
              const day = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10) + 2000;
              const date = new Date(year, month - 1, day);
              return {
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
                cases: item.cases
              };
            }
            return {
              date: item.date,
              cases: item.cases
            };
          });
        
        setChartData(formattedData);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  return (
    <div>
      <Header />
      <Navbar />
      <div className="charts-container">
        <h1 className="charts-title">COVID-19 Time Series Analysis</h1>
        
        {loading ? (
          <div className="loading">Loading chart data...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="chart-wrapper">
            <h2 className="chart-subtitle">Global Confirmed Cases Over Time</h2>
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  stroke="#999" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cases"
                  stroke="#ff9800"
                  strokeWidth={3}
                  dot={{ fill: "#ff9800", r: 4 }}
                  name="Confirmed Cases"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartsPage;