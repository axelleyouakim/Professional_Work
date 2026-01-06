'use client';

import React, { useState, useCallback } from 'react';
import { useTotalCasesPerCountry, useCasesTimeSeries } from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import StatsCard from './StatsCard';
import CountryList from './CountryList';
import MapComponent from './MapComponent';
import ChartComponent from './ChartComponent';
import TimelineSlider from './TimelineSlider';
import CountrySearch from './CountrySearch';
import AdminLevelSelector from './AdminLevelSelector';
import LastUpdatedDisplay from './LastUpdatedDisplay';
import "./Dashboard.css";

/**
 * ════════════════════════════════════════════════════════════
 * DASHBOARD - SIMPLIFIÉ - Chaque composant fait ses propres appels
 * ════════════════════════════════════════════════════════════
 * 
 * ✅ Dashboard fait seulement 2 appels TanStack Query (pour données partagées) :
 *    - useTotalCasesPerCountry (pour Map + recherche)
 *    - useCasesTimeSeries (pour Chart)
 * 
 * ✅ TOUS les autres composants font leurs propres appels :
 *    - StatsCard : useGlobalTotalCases/Deaths/Recovered
 *    - CountryList : useTotalCasesPerCountry/Deaths/Recovered
 */
const Dashboard = ({ 
  selectedPeriod,
  onPeriodChange
}) => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel] = useState("admin0");
  const [searchTerm, setSearchTerm] = useState('');

  // ─────────────────────────────────────────────────────────
  // 🔥 APPELS TANSTACK QUERY (uniquement pour données partagées)
  // ─────────────────────────────────────────────────────────
  const totalCasesPerCountry = useTotalCasesPerCountry(selectedPeriod?.days);
  const chartData = useCasesTimeSeries(selectedPeriod?.days);

  // ─────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────
  const handleCountryClick = useCallback((countryName) => {
    setSelectedCountry(countryName);
  }, []);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleAdminLevelChange = useCallback((level) => {
    setAdminLevel(level);
  }, []);

  // ─────────────────────────────────────────────────────────
  // FORMAT CHART DATA
  // ─────────────────────────────────────────────────────────
  const formatChartData = useCallback((rawChartData) => {
    if (!rawChartData || rawChartData.length === 0) return [];
    
    return rawChartData.map(item => {
      const parts = item.date.split("/");
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        
        const dateObj = new Date(year, month - 1, day);
        const monthName = dateObj.toLocaleDateString("en-US", { month: "short" });
        
        return {
          date: monthName,
          cases: item.cases,
          fullDate: `${monthName} ${day}, ${year}`
        };
      }
      return item;
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="dashboard-grid">
      {/* LEFT PANEL */}
      <div className="left-panel">
        <CountrySearch 
          onSearchChange={handleSearchChange} 
          resultsCount={0}
        />

        {/* 🔥 StatsCard fait maintenant son propre appel TanStack Query */}
        <StatsCard 
          label="Total Confirmed"
          type="cases"
          period={selectedPeriod?.days}
          selectedCountry={selectedCountry}
          colorClass="red-text"
        />

        <AdminLevelSelector 
          selectedLevel={adminLevel}
          onLevelChange={handleAdminLevelChange}
        />

        {/* 🔥 CountryList fait maintenant son propre appel TanStack Query */}
        <CountryList
          title="Confirmed Cases by Country/Region/Sovereignty"
          type="cases"
          period={selectedPeriod?.days}
          searchTerm={searchTerm}
          selectedCountry={selectedCountry}
          onCountryClick={handleCountryClick}
          colorClass="red-text"
        />

        <LastUpdatedDisplay timestamp="4/2/2020 9:02:01 AM" />
      </div>

      {/* CENTER PANEL - Map */}
      <QueryStateWrapper 
        query={totalCasesPerCountry}
        loadingMessage="Loading map data..."
      >
        {(casesData) => (
          <MapComponent 
            casesData={casesData.filter(c => 
              !searchTerm || c.country.toLowerCase().includes(searchTerm.toLowerCase())
            )} 
          />
        )}
      </QueryStateWrapper>

      {/* RIGHT PANEL */}
      <div className="right-panels-container-narrow">
        <div className="right-stats-column">
          {/* Deaths Panel - 🔥 Composants font leurs propres appels */}
          <div className="right-stat-panel">
            <StatsCard 
              label="Total Deaths"
              type="deaths"
              period={selectedPeriod?.days}
              selectedCountry={selectedCountry}
              colorClass="white-text"
            />

            <CountryList
              type="deaths"
              period={selectedPeriod?.days}
              searchTerm={searchTerm}
              labelSuffix="deaths"
              colorClass="white-text"
            />
          </div>

          {/* Recovered Panel - 🔥 Composants font leurs propres appels */}
          <div className="right-stat-panel">
            <StatsCard 
              label="Total Recovered"
              type="recovered"
              period={selectedPeriod?.days}
              colorClass="green-text"
            />

            <CountryList
              type="recovered"
              period={selectedPeriod?.days}
              searchTerm={searchTerm}
              labelSuffix="recovered"
              colorClass="green-text"
            />
          </div>
        </div>

        {/* Chart Panel avec Timeline */}
        <div className="chart-panel-with-timeline">
          <div className="timeline-above-chart">
            <TimelineSlider onPeriodChange={onPeriodChange} />
          </div>

          <div className="chart-scrollable-container">
            <QueryStateWrapper 
              query={chartData}
              loadingMessage="Loading chart data..."
            >
              {(rawChartData) => (
                <ChartComponent data={formatChartData(rawChartData)} />
              )}
            </QueryStateWrapper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;