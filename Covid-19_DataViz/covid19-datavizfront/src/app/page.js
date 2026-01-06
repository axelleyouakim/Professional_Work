"use client";
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
// ✅ IMPORT TANSTACK QUERY HOOK
import { useCovidDashboardData } from './hooks/useCovidData';

const Page = () => {
  const [selectedPeriod, setSelectedPeriod] = useState({ 
    id: 'all', 
    days: null
  });

  // ✅ APPEL TANSTACK QUERY - VISIBLE DÈS LE DÉBUT
  const covidData = useCovidDashboardData(selectedPeriod.days);

  const handlePeriodChange = useCallback((period) => {
    console.log('📅 [PAGE] Period changed to:', period.label, 'days:', period.days);
    setSelectedPeriod(period);
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