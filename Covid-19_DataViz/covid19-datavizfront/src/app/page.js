'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import './globals.css';

export default function HomePage() {
  const [selectedPeriod, setSelectedPeriod] = useState({
    dateString: '3/9/23',
    dateObj: new Date(2023, 2, 9),
    displayDate: 'Mar 9, 2023',
    dayIndex: 1224,
    totalDays: 1225,
    hasData: true
  });

  const handlePeriodChange = useCallback((newPeriod) => {
    console.log('📅 [PAGE] Period changed:', newPeriod);
    setSelectedPeriod(newPeriod);
  }, []);

  useEffect(() => {
    console.log('🔍 [PAGE] Current selectedPeriod:', selectedPeriod);
  }, [selectedPeriod]);

  return (
    <div className="app-container">
      <Header />
      <Dashboard 
        selectedPeriod={selectedPeriod} 
        onPeriodChange={handlePeriodChange} 
      />
    </div>
  );
}