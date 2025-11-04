"use client";
import React from 'react';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';

/**
 * Page principale du dashboard COVID-19
 * 
 * ARCHITECTURE TANSTACK QUERY :
 * - Cette page ne fait PLUS de fetch directement
 * - Tous les appels API sont gérés par TanStack Query dans les hooks
 * - Les composants reçoivent les données via les hooks
 * - Pas besoin de useState/useEffect ici pour les données API
 */
const Page = () => {
  return (
    <div>
      <Header />
      <Navbar />
      {/* Dashboard utilise useCovidDashboardData() qui gère tous les appels API */}
      <Dashboard />
    </div>
  );
};

export default Page;