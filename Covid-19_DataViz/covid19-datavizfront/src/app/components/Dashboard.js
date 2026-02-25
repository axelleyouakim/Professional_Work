'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { usePreCalculatedData } from '../hooks/usePreCalculatedData';
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

const Dashboard = ({ selectedPeriod, onPeriodChange }) => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel] = useState("admin0");
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredCountry, setHoveredCountry] = useState(null);
  
  // ✅ HOOK PRE-CALCULÉ : Charge tout une fois, lookup instantané après
  const { preCalculatedIndex, isLoading, error, rawData } = usePreCalculatedData();
  
  const isSliderMode = selectedPeriod?.dateString != null && selectedPeriod.dateString !== '';
  const hasNoData = selectedPeriod?.hasData === false;
  
  // ✅ LOOKUP INSTANTANÉ - Pas de calcul !
  const currentData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) {
      return {
        casesPerCountry: [],
        deathsPerCountry: [],
        recoveredPerCountry: [],
        totalCases: 0,
        totalDeaths: 0,
        totalRecovered: 0,
        isReady: false
      };
    }

    const { index, countries, dates } = preCalculatedIndex;
    
    // Déterminer la date cible
    let targetDate;
    if (isSliderMode) {
      targetDate = selectedPeriod.dateString;
    } else {
      targetDate = dates[dates.length - 1]; // Dernière date
    }

    // Si avant le COVID
    if (hasNoData) {
      const allCountries = Object.keys(countries);
      return {
        casesPerCountry: allCountries.map(country => ({ country, total_cases: 0 })),
        deathsPerCountry: allCountries.map(country => ({ country, total_deaths: 0 })),
        recoveredPerCountry: allCountries.map(country => ({ country, total_recovered: 0 })),
        totalCases: 0,
        totalDeaths: 0,
        totalRecovered: 0,
        targetDate,
        isReady: true
      };
    }

    // ✅ LOOKUP INSTANTANÉ : Pas de calcul, juste lire l'index !
    const data = index[targetDate];
    
    if (!data) {
      console.warn(`⚠️ No pre-calculated data for ${targetDate}`);
      return {
        casesPerCountry: [],
        deathsPerCountry: [],
        recoveredPerCountry: [],
        totalCases: 0,
        totalDeaths: 0,
        totalRecovered: 0,
        targetDate,
        isReady: true
      };
    }

    console.log(`⚡ [LOOKUP] Instant data for ${targetDate}: ${data.totalCases.toLocaleString()} cases`);
    
    return {
      ...data,
      targetDate,
      isReady: true
    };
  }, [preCalculatedIndex, selectedPeriod, isSliderMode, hasNoData]);
  
  // ✅ CHART DATA - Aussi pré-calculé
  const chartTimelineData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return null;
    
    const { index, countries, dates } = preCalculatedIndex;
    const targetDate = isSliderMode ? selectedPeriod.dateString : dates[dates.length - 1];
    
    let timeline = [];
    
    // Dates avant COVID si nécessaire
    if (isSliderMode && hasNoData) {
      const startDate = new Date(2019, 10, 1);
      const targetDateObj = new Date(
        parseInt(selectedPeriod.dateString.split('/')[2]) + 2000,
        parseInt(selectedPeriod.dateString.split('/')[0]) - 1,
        parseInt(selectedPeriod.dateString.split('/')[1])
      );
      
      let currentDate = new Date(startDate);
      while (currentDate <= targetDateObj) {
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const year = currentDate.getFullYear() % 100;
        timeline.push({ date: `${month}/${day}/${year}`, cases: 0 });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return timeline;
    }
    
    const filteredDates = isSliderMode ? dates.filter(d => d <= targetDate) : dates;
    
    filteredDates.forEach(date => {
      let totalCases = 0;
      
      if (selectedCountry && countries[selectedCountry]) {
        totalCases = countries[selectedCountry].cases[date] || 0;
      } else if (!selectedCountry) {
        totalCases = index[date]?.totalCases || 0;
      }
      
      timeline.push({ date, cases: totalCases });
    });
    
    return timeline;
  }, [preCalculatedIndex, selectedPeriod, selectedCountry, isSliderMode, hasNoData]);
  
  const globalStats = useMemo(() => {
    if (!currentData.isReady) return null;
    
    if (selectedCountry) {
      const countryCase = currentData.casesPerCountry.find(
        c => c.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      const countryDeath = currentData.deathsPerCountry.find(
        c => c.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      const countryRecovered = currentData.recoveredPerCountry.find(
        c => c.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      
      return {
        total_cases: countryCase?.total_cases || 0,
        total_deaths: countryDeath?.total_deaths || 0,
        total_recovered: countryRecovered?.total_recovered || 0
      };
    }
    
    return {
      total_cases: currentData.totalCases,
      total_deaths: currentData.totalDeaths,
      total_recovered: currentData.totalRecovered
    };
  }, [currentData, selectedCountry]);

  const handleCountryClick = useCallback((countryName) => {
    setSelectedCountry(countryName);
  }, []);

  const handleBackToGlobal = useCallback(() => {
    setSelectedCountry(null);
  }, []);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleAdminLevelChange = useCallback((level) => {
    setAdminLevel(level);
  }, []);

  const handleCountryHover = useCallback((countryName) => {
    if (countryName && countryName !== hoveredCountry) {
      setHoveredCountry(countryName);
    }
  }, [hoveredCountry]);

  if (isLoading) {
    return (
      <div className="dashboard-grid">
        <div style={{ 
          gridColumn: '1 / -1', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '80vh',
          gap: '20px'
        }}>
          <div className="spinner" style={{ width: '50px', height: '50px' }}></div>
          <p style={{ color: '#999', fontSize: '18px' }}>
            Pre-calculating ALL dates... (10 seconds, ONLY ONCE)
          </p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            After this, slider will be INSTANT!
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-grid">
        <div style={{ 
          gridColumn: '1 / -1', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '80vh',
          gap: '20px',
          color: '#ff4444'
        }}>
          <span style={{ fontSize: '48px' }}>⚠️</span>
          <p style={{ fontSize: '18px' }}>Failed to load data</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const fakeQuery = { data: currentData.casesPerCountry, isLoading: false, error: null };

  return (
    <div className="dashboard-grid">
      {selectedCountry && (
        <div className="country-view-banner">
          <button className="back-to-global-btn" onClick={handleBackToGlobal}>
            ← Back to Global View
          </button>
          <h2 className="country-view-title">{selectedCountry} - Country View</h2>
        </div>
      )}

      <div className="left-panel">
        <CountrySearch onSearchChange={handleSearchChange} resultsCount={0} />
        
        <StatsCard 
          label={selectedCountry ? `${selectedCountry} - Total Confirmed` : "Total Confirmed"}
          type="cases"
          selectedCountry={selectedCountry}
          globalStats={globalStats}
          isLoading={false}
          error={null}
          currentDate={currentData.targetDate}
          colorClass="red-text"
        />

        <AdminLevelSelector selectedLevel={adminLevel} onLevelChange={handleAdminLevelChange} />

        <CountryList
          title="Confirmed Cases by Country/Region/Sovereignty"
          type="cases"
          countriesData={currentData.casesPerCountry}
          isLoading={false}
          error={null}
          searchTerm={searchTerm}
          selectedCountry={selectedCountry}
          onCountryClick={handleCountryClick}
          onCountryHover={handleCountryHover}
          colorClass="red-text"
        />

        <LastUpdatedDisplay timestamp="4/2/2020 9:02:01 AM" />
      </div>

      <QueryStateWrapper query={fakeQuery} loadingMessage="Loading map data...">
        {(casesData) => (
          <MapComponent 
            casesData={casesData.filter(c => 
              !searchTerm || c.country.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            selectedCountry={selectedCountry}
            onCountryClick={handleCountryClick}
            onCountryHover={handleCountryHover}
          />
        )}
      </QueryStateWrapper>

      <div className="right-panels-container-narrow">
        <div className="right-stats-column">
          <div className="right-stat-panel">
            <StatsCard 
              label={selectedCountry ? `${selectedCountry} - Total Deaths` : "Total Deaths"}
              type="deaths"
              selectedCountry={selectedCountry}
              globalStats={globalStats}
              isLoading={false}
              error={null}
              currentDate={currentData.targetDate}
              colorClass="white-text"
            />

            <CountryList
              type="deaths"
              countriesData={currentData.deathsPerCountry}
              isLoading={false}
              error={null}
              searchTerm={searchTerm}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
              onCountryHover={handleCountryHover}
              labelSuffix="deaths"
              colorClass="white-text"
            />
          </div>

          <div className="right-stat-panel">
            <StatsCard 
              label={selectedCountry ? `${selectedCountry} - Total Recovered` : "Total Recovered"}
              type="recovered"
              selectedCountry={selectedCountry}
              globalStats={globalStats}
              isLoading={false}
              error={null}
              currentDate={currentData.targetDate}
              colorClass="green-text"
            />

            <CountryList
              type="recovered"
              countriesData={currentData.recoveredPerCountry}
              isLoading={false}
              error={null}
              searchTerm={searchTerm}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
              onCountryHover={handleCountryHover}
              labelSuffix="recovered"
              colorClass="green-text"
            />
          </div>
        </div>

        <div className="chart-panel-with-timeline">
          <div className="timeline-above-chart">
            <TimelineSlider onPeriodChange={onPeriodChange} />
          </div>

          <div className="chart-scrollable-container">
            <ChartComponent 
              period={null}
              selectedCountry={selectedCountry}
              timelineData={chartTimelineData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;