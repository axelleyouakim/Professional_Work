"use client";
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import { useCovidDashboardData } from './hooks/useCovidData';

/**
 * ════════════════════════════════════════════════════════════
 * PAGE PRINCIPALE - CORRIGÉE
 * ════════════════════════════════════════════════════════════
 * 
 * La période est maintenant correctement passée à useCovidDashboardData
 * Quand selectedPeriod change → useCovidDashboardData refetch TOUT
 */
const Page = () => {
  // ═══════════════════════════════════════════════════════════
  // ÉTAT - Période sélectionnée (DOIT être un NUMBER ou null)
  // ═══════════════════════════════════════════════════════════
  const [selectedPeriod, setSelectedPeriod] = useState({ 
    id: 'all', 
    days: null  // null = All Time
  });

  // ═══════════════════════════════════════════════════════════
  // APPELS API - Passe selectedPeriod.days au hook
  // CRITIQUE : Quand selectedPeriod.days change, TOUT refetch
  // ═══════════════════════════════════════════════════════════
  const covidData = useCovidDashboardData(selectedPeriod.days);

  // ═══════════════════════════════════════════════════════════
  // HANDLER - Met à jour selectedPeriod
  // ═══════════════════════════════════════════════════════════
  const handlePeriodChange = useCallback((period) => {
    console.log('📅 [PAGE] Period changed to:', period.label, 'days:', period.days);
    setSelectedPeriod(period);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // DEBUG - Affiche quand covidData change
  // ═══════════════════════════════════════════════════════════
  console.log('🔄 [PAGE] Current period:', selectedPeriod.days);
  console.log('📊 [PAGE] Total Cases:', covidData.totalCases.data);
  console.log('📊 [PAGE] Total Deaths:', covidData.totalDeaths.data);
  console.log('📊 [PAGE] Countries:', covidData.totalCasesPerCountry.data?.length);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
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