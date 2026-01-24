'use client';

import React, { useState, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import './globals.css';

export default function HomePage() {
  const [selectedPeriod, setSelectedPeriod] = useState({
    label: "All Time",
    days: null,
    dateString: null, // ✅ NOUVEAU
    dateObj: null,    // ✅ NOUVEAU
    displayDate: null // ✅ NOUVEAU
  });

  const handlePeriodChange = useCallback((newPeriod) => {
    console.log('📅 [PAGE] Period changed to:', newPeriod);
    setSelectedPeriod(newPeriod);
  }, []);

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