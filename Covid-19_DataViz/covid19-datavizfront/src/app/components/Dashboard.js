'use client';

import React, { useState, useCallback } from 'react';
import QueryStateWrapper from './QueryStateWrapper';
import StatsCard from './StatsCard';
import CountryList from './CountryList';
import MapComponent from './MapComponent';
import ChartComponent from './ChartComponent';
import TimelineSlider from './TimelineSlider';
import CountrySearch from './CountrySearch';
import "./Dashboard.css";

/**
 * DASHBOARD - Composant Présentationnel
 * 
 * Responsabilités :
 * 1. Reçoit TOUTES les données de la page parent via props
 * 2. Gère uniquement l'état UI local (selectedCountry, searchTerm)
 * 3. Affiche les données dans les composants enfants
 * 4. NE FAIT AUCUN appel API directement
 */
const Dashboard = ({ 
  data,               // Toutes les données COVID de la page parent
  selectedPeriod,     // Période sélectionnée
  onPeriodChange      // Handler pour changer la période
}) => {
  // ─────────────────────────────────────────────────────────
  // STATE LOCAL - UI UNIQUEMENT (pas de data fetching)
  // ─────────────────────────────────────────────────────────
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel] = useState("admin0");
  const [searchTerm, setSearchTerm] = useState('');

  // ─────────────────────────────────────────────────────────
  // HANDLERS - Interactions UI
  // ─────────────────────────────────────────────────────────
  const handleCountryClick = useCallback((countryName) => {
    setSelectedCountry(countryName);
  }, []);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handlePeriodChange = useCallback((period) => {
    onPeriodChange(period);
    console.log('📅 Period changed:', period.label);
  }, [onPeriodChange]);

  // ─────────────────────────────────────────────────────────
  // COMPUTED VALUES - Filtres client-side
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
  // HELPER - Format chart data
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
      {/* ═══════════════════════════════════════════════════ */}
      {/* LEFT PANEL - Stats + Country List */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="left-panel">
        <CountrySearch 
          onSearchChange={handleSearchChange} 
          resultsCount={filteredCasesCountries.length}
        />

        {/* Total Confirmed Cases */}
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

        {/* Admin Level Buttons */}
        <div className="admin-level-buttons">
          <button
            className={`admin-btn ${adminLevel === "admin0" ? "active" : ""}`}
            onClick={() => setAdminLevel("admin0")}
          >
            Admin0
          </button>
          <button
            className={`admin-btn ${adminLevel === "admin1" ? "active" : ""}`}
            onClick={() => setAdminLevel("admin1")}
          >
            Admin1
          </button>
          <button
            className={`admin-btn ${adminLevel === "admin2" ? "active" : ""}`}
            onClick={() => setAdminLevel("admin2")}
          >
            Admin2
          </button>
        </div>

        {/* Country List - Cases */}
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

        <div className="last-updated">
          <h4 className="update-label">Last Updated at (M/D/YYYY)</h4>
          <p className="update-time">4/2/2020 9:02:01 AM</p>
        </div>
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
      {/* RIGHT PANEL - Deaths + Recovered + Chart */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="right-panels-container-narrow">
        <div className="right-stats-column">
          {/* Deaths Panel */}
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

          {/* Recovered Panel */}
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
            <TimelineSlider onPeriodChange={handlePeriodChange} />
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