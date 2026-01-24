'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  useTotalCasesPerCountry, 
  useTotalDeathsPerCountry,
  useTotalRecoveredPerCountry,
  useCasesTimeSeries 
} from '../hooks/useCovidData';
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
  selectedPeriod,
  onPeriodChange
}) => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel] = useState("admin0");
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ Utiliser la date du slider si disponible, sinon period
  const queryParam = selectedPeriod?.dateString || selectedPeriod?.days || null;
  
  // ✅ Récupérer LES 3 DATASETS avec la date
  const totalCasesPerCountry = useTotalCasesPerCountry(queryParam);
  const totalDeathsPerCountry = useTotalDeathsPerCountry(queryParam);
  const totalRecoveredPerCountry = useTotalRecoveredPerCountry(queryParam);
  const chartData = useCasesTimeSeries(queryParam, selectedCountry);

  // ✅ COMBINER les stats du pays sélectionné
  const selectedCountryStats = useMemo(() => {
    if (!selectedCountry) return null;
    
    const casesData = totalCasesPerCountry.data?.find(
      c => c.country.toLowerCase() === selectedCountry.toLowerCase()
    );
    
    const deathsData = totalDeathsPerCountry.data?.find(
      c => c.country.toLowerCase() === selectedCountry.toLowerCase()
    );
    
    const recoveredData = totalRecoveredPerCountry.data?.find(
      c => c.country.toLowerCase() === selectedCountry.toLowerCase()
    );

    if (!casesData && !deathsData && !recoveredData) return null;

    return {
      country: selectedCountry,
      total_cases: casesData?.total_cases || 0,
      total_deaths: deathsData?.total_deaths || 0,
      total_recovered: recoveredData?.total_recovered || 0
    };
  }, [selectedCountry, totalCasesPerCountry.data, totalDeathsPerCountry.data, totalRecoveredPerCountry.data]);

  // ✅ Handler pour sélectionner un pays
  const handleCountryClick = useCallback((countryName) => {
    console.log('🌍 Country selected:', countryName);
    setSelectedCountry(countryName);
  }, []);

  // ✅ Handler pour retour à la vue globale
  const handleBackToGlobal = useCallback(() => {
    console.log('🌍 Back to global view');
    setSelectedCountry(null);
  }, []);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleAdminLevelChange = useCallback((level) => {
    setAdminLevel(level);
  }, []);

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

  return (
    <div className="dashboard-grid">
      {/* ✅ BANNIÈRE DE VUE PAYS */}
      {selectedCountry && (
        <div className="country-view-banner">
          <button className="back-to-global-btn" onClick={handleBackToGlobal}>
            ← Back to Global View
          </button>
          <h2 className="country-view-title">
            🌍 {selectedCountry} - Country View
          </h2>
        </div>
      )}

      {/* LEFT PANEL */}
      <div className="left-panel">
        <CountrySearch 
          onSearchChange={handleSearchChange} 
          resultsCount={0}
        />

        {/* ✅ StatsCard avec données du pays si sélectionné */}
        <StatsCard 
          label={selectedCountry ? `${selectedCountry} - Total Confirmed` : "Total Confirmed"}
          type="cases"
          period={queryParam}
          selectedCountry={selectedCountry}
          selectedCountryData={selectedCountryStats}
          colorClass="red-text"
        />

        <AdminLevelSelector 
          selectedLevel={adminLevel}
          onLevelChange={handleAdminLevelChange}
        />

        <CountryList
          title="Confirmed Cases by Country/Region/Sovereignty"
          type="cases"
          period={queryParam}
          searchTerm={searchTerm}
          selectedCountry={selectedCountry}
          onCountryClick={handleCountryClick}
          colorClass="red-text"
        />

        <LastUpdatedDisplay timestamp="4/2/2020 9:02:01 AM" />
      </div>

      {/* CENTER PANEL - MAP */}
      <QueryStateWrapper 
        query={totalCasesPerCountry}
        loadingMessage="Loading map data..."
      >
        {(casesData) => (
          <MapComponent 
            casesData={casesData.filter(c => 
              !searchTerm || c.country.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            selectedCountry={selectedCountry}
            onCountryClick={handleCountryClick}
          />
        )}
      </QueryStateWrapper>

      {/* RIGHT PANEL */}
      <div className="right-panels-container-narrow">
        <div className="right-stats-column">
          {/* Deaths Panel */}
          <div className="right-stat-panel">
            <StatsCard 
              label={selectedCountry ? `${selectedCountry} - Total Deaths` : "Total Deaths"}
              type="deaths"
              period={queryParam}
              selectedCountry={selectedCountry}
              selectedCountryData={selectedCountryStats}
              colorClass="white-text"
            />

            <CountryList
              type="deaths"
              period={queryParam}
              searchTerm={searchTerm}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
              labelSuffix="deaths"
              colorClass="white-text"
            />
          </div>

          {/* Recovered Panel */}
          <div className="right-stat-panel">
            <StatsCard 
              label={selectedCountry ? `${selectedCountry} - Total Recovered` : "Total Recovered"}
              type="recovered"
              period={queryParam}
              selectedCountry={selectedCountry}
              selectedCountryData={selectedCountryStats}
              colorClass="green-text"
            />

            <CountryList
              type="recovered"
              period={queryParam}
              searchTerm={searchTerm}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
              labelSuffix="recovered"
              colorClass="green-text"
            />
          </div>
        </div>

        {/* Chart Panel */}
        <div className="chart-panel-with-timeline">
          <div className="timeline-above-chart">
            <TimelineSlider onPeriodChange={onPeriodChange} />
          </div>

          <div className="chart-scrollable-container">
            {/* ✅ Chart filtré par pays */}
            <ChartComponent 
              period={queryParam}
              selectedCountry={selectedCountry}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;