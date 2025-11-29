'use client';

import React, { useState, useCallback } from 'react';
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

const Dashboard = ({ 
  data,               // Toutes les données COVID (de page.js)
  selectedPeriod,     // Période sélectionnée (de page.js)
  onPeriodChange      // Handler pour changer période (remonte à page.js)
}) => {

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel] = useState("admin0");
  const [searchTerm, setSearchTerm] = useState('');

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
  // COMPUTED VALUES - Filtrage client-side
  // ─────────────────────────────────────────────────────────
  const filterCountriesBySearch = useCallback((countries, term) => {
    if (!term || !countries) return countries;
    const searchLower = term.toLowerCase().trim();
    return countries.filter((c) =>
      c.country.toLowerCase().includes(searchLower)
    );
  }, []);

  const filteredCasesCountries = filterCountriesBySearch(
    data.totalCasesPerCountry.data || [], 
    searchTerm
  );
  const filteredDeathsCountries = filterCountriesBySearch(
    data.totalDeathsPerCountry.data || [], 
    searchTerm
  );
  const filteredRecoveredCountries = filterCountriesBySearch(
    data.totalRecoveredPerCountry.data || [], 
    searchTerm
  );

  // ─────────────────────────────────────────────────────────
  // HELPER - Format chart data (transformation client-side)
  // ─────────────────────────────────────────────────────────
  const formatChartData = useCallback((chartData) => {
    if (!chartData || chartData.length === 0) return [];
    
    return chartData.map(item => {
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

  const formattedChartData = formatChartData(data.chartData.data || []);

  // ─────────────────────────────────────────────────────────
  // RENDER - Composition de composants atomiques
  // Chaque composant est indépendant et atomique
  // ─────────────────────────────────────────────────────────
  return (
    <div className="dashboard-grid">
      {/* ═══════════════════════════════════════════════════ */}
      {/* LEFT PANEL */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="left-panel">
        {/* Search bar */}
        <CountrySearch 
          onSearchChange={handleSearchChange} 
          resultsCount={filteredCasesCountries.length}
        />

        {/* Total Confirmed - Composant individuel */}
        <QueryStateWrapper 
          query={data.totalCases}
          loadingMessage="Loading total cases..."
        >
          {(totalCasesData) => (
            <StatsCard 
              label="Total Confirmed"
              value={selectedCountry 
                ? filteredCasesCountries.find(c => c.country === selectedCountry)?.total_cases 
                : totalCasesData
              }
              colorClass="red-text"
            />
          )}
        </QueryStateWrapper>

        {/* Admin Level Selector - Composant individuel */}
        <AdminLevelSelector 
          selectedLevel={adminLevel}
          onLevelChange={handleAdminLevelChange}
        />

        {/* Country List - Composant individuel */}
        <QueryStateWrapper 
          query={data.totalCasesPerCountry}
          loadingMessage="Loading countries..."
        >
          {() => (
            <CountryList
              title="Confirmed Cases by Country/Region/Sovereignty"
              countries={filteredCasesCountries}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
              dataKey="total_cases"
              colorClass="red-text"
            />
          )}
        </QueryStateWrapper>

        {/* Last Updated - Composant individuel */}
        <LastUpdatedDisplay timestamp="4/2/2020 9:02:01 AM" />
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* CENTER PANEL - Map */}
      {/* ═══════════════════════════════════════════════════ */}
      <QueryStateWrapper 
        query={data.totalCasesPerCountry}
        loadingMessage="Loading map data..."
      >
        {() => (
          <MapComponent casesData={filteredCasesCountries} />
        )}
      </QueryStateWrapper>

      {/* ═══════════════════════════════════════════════════ */}
      {/* RIGHT PANEL */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="right-panels-container-narrow">
        <div className="right-stats-column">
          {/* ───────────────────────────────────────────────── */}
          {/* Deaths Panel */}
          {/* ───────────────────────────────────────────────── */}
          <div className="right-stat-panel">
            {/* Total Deaths - Composant individuel */}
            <QueryStateWrapper query={data.totalDeaths}>
              {(totalDeathsData) => (
                <StatsCard 
                  label="Total Deaths"
                  value={selectedCountry 
                    ? filteredDeathsCountries.find(c => c.country === selectedCountry)?.total_deaths 
                    : totalDeathsData
                  }
                  colorClass="white-text"
                />
              )}
            </QueryStateWrapper>

            {/* Deaths Country List - Composant individuel */}
            <QueryStateWrapper query={data.totalDeathsPerCountry}>
              {() => (
                <CountryList
                  countries={filteredDeathsCountries}
                  dataKey="total_deaths"
                  labelSuffix="deaths"
                  colorClass="white-text"
                />
              )}
            </QueryStateWrapper>
          </div>

          {/* ───────────────────────────────────────────────── */}
          {/* Recovered Panel */}
          {/* ───────────────────────────────────────────────── */}
          <div className="right-stat-panel">
            {/* Total Recovered - Composant individuel */}
            <QueryStateWrapper query={data.totalRecovered}>
              {(totalRecoveredData) => (
                <StatsCard 
                  label="Total Recovered"
                  value={totalRecoveredData}
                  colorClass="green-text"
                />
              )}
            </QueryStateWrapper>

            {/* Recovered Country List - Composant individuel */}
            <QueryStateWrapper query={data.totalRecoveredPerCountry}>
              {() => (
                <CountryList
                  countries={filteredRecoveredCountries}
                  dataKey="total_recovered"
                  labelSuffix="recovered"
                  colorClass="green-text"
                />
              )}
            </QueryStateWrapper>
          </div>
        </div>

        {/* ───────────────────────────────────────────────── */}
        {/* Chart Panel avec Timeline */}
        {/* ───────────────────────────────────────────────── */}
        <div className="chart-panel-with-timeline">
          {/* Timeline Slider - Composant individuel */}
          <div className="timeline-above-chart">
            <TimelineSlider onPeriodChange={onPeriodChange} />
          </div>

          {/* Chart - Composant individuel */}
          <div className="chart-scrollable-container">
            <QueryStateWrapper 
              query={data.chartData}
              loadingMessage="Loading chart data..."
            >
              {() => (
                <ChartComponent data={formattedChartData} />
              )}
            </QueryStateWrapper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;