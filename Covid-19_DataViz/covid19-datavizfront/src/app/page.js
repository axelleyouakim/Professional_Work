"use client";
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import { useCovidDashboardData } from './hooks/useCovidData';

const Page = () => {
  const [selectedPeriod, setSelectedPeriod] = useState({ 
    id: 'all', 
    days: null 
  });

  const covidData = useCovidDashboardData(selectedPeriod.days);

  const handlePeriodChange = useCallback((period) => {
    setSelectedPeriod(period);
    console.log('📅 [PAGE] Period changed:', period.label, 'days:', period.days);
  }, []);

  return (
    <div>
      <Header />
      <Dashboard
        data={covidData}
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
      />
    </div>
  );
};

export default Page;