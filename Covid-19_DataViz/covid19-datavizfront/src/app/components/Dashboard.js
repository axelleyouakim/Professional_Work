'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
 * DASHBOARD - Backend filtre maintenant par période
 * ════════════════════════════════════════════════════════════
 * 
 * ✅ TOUS les composants changent quand on slide :
 * - Total Confirmed (backend filtre)
 * - Total Deaths (backend filtre)
 * - Total Recovered (backend filtre)
 * - Country Lists (backend filtre)
 * - Map (backend filtre)
 * - Chart (backend filtre)
 */
const Dashboard = ({ 
  data,
  selectedPeriod,
  onPeriodChange
}) => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel] = useState("admin0");
  const [searchTerm, setSearchTerm] = useState('');

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
  // FILTRE PAR RECHERCHE (client-side uniquement)
  // ─────────────────────────────────────────────────────────
  const filterCountriesBySearch = useCallback((countries, term) => {
    if (!term || !countries) return countries;
    const searchLower = term.toLowerCase().trim();
    return countries.filter((c) =>
      c.country.toLowerCase().includes(searchLower)
    );
  }, []);

  const filteredCasesCountries = useMemo(() => {
    return filterCountriesBySearch(data.totalCasesPerCountry.data || [], searchTerm);
  }, [data.totalCasesPerCountry.data, searchTerm, filterCountriesBySearch]);

  const filteredDeathsCountries = useMemo(() => {
    return filterCountriesBySearch(data.totalDeathsPerCountry.data || [], searchTerm);
  }, [data.totalDeathsPerCountry.data, searchTerm, filterCountriesBySearch]);

  const filteredRecoveredCountries = useMemo(() => {
    return filterCountriesBySearch(data.totalRecoveredPerCountry.data || [], searchTerm);
  }, [data.totalRecoveredPerCountry.data, searchTerm, filterCountriesBySearch]);

  // ─────────────────────────────────────────────────────────
  // FORMAT CHART DATA
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
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="dashboard-grid">
      {/* LEFT PANEL */}
      <div className="left-panel">
        <CountrySearch 
          onSearchChange={handleSearchChange} 
          resultsCount={filteredCasesCountries.length}
        />

        {/* Total Confirmed - BACKEND FILTRE PAR PÉRIODE */}
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

        <AdminLevelSelector 
          selectedLevel={adminLevel}
          onLevelChange={handleAdminLevelChange}
        />

        {/* Country List - BACKEND FILTRE PAR PÉRIODE */}
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

        <LastUpdatedDisplay timestamp="4/2/2020 9:02:01 AM" />
      </div>

      {/* CENTER PANEL - Map - BACKEND FILTRE PAR PÉRIODE */}
      <QueryStateWrapper 
        query={data.totalCasesPerCountry}
        loadingMessage="Loading map data..."
      >
        {() => (
          <MapComponent casesData={filteredCasesCountries} />
        )}
      </QueryStateWrapper>

      {/* RIGHT PANEL */}
      <div className="right-panels-container-narrow">
        <div className="right-stats-column">
          {/* Deaths Panel - BACKEND FILTRE PAR PÉRIODE */}
          <div className="right-stat-panel">
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

          {/* Recovered Panel - BACKEND FILTRE PAR PÉRIODE */}
          <div className="right-stat-panel">
            <QueryStateWrapper query={data.totalRecovered}>
              {(totalRecoveredData) => (
                <StatsCard 
                  label="Total Recovered"
                  value={totalRecoveredData}
                  colorClass="green-text"
                />
              )}
            </QueryStateWrapper>

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

        {/* Chart Panel avec Timeline */}
        <div className="chart-panel-with-timeline">
          <div className="timeline-above-chart">
            <TimelineSlider onPeriodChange={onPeriodChange} />
          </div>

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