'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  useTotalCasesPerCountry, 
  useTotalDeathsPerCountry,
  useTotalRecoveredPerCountry,
  useCasesTimeSeries,
  useAllTimeSeriesData
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
  
  const allTimeSeriesData = useAllTimeSeriesData();
  
  const isSliderMode = selectedPeriod?.dateString != null && selectedPeriod.dateString !== '';
  const hasNoData = selectedPeriod?.hasData === false;
  
  const queryParam = isSliderMode ? null : null;
  
  const apiCasesQuery = useTotalCasesPerCountry(queryParam);
  const apiDeathsQuery = useTotalDeathsPerCountry(queryParam);
  const apiRecoveredQuery = useTotalRecoveredPerCountry(queryParam);
  const chartData = useCasesTimeSeries(queryParam, selectedCountry);
  
  const filteredData = useMemo(() => {
    if (!isSliderMode || !allTimeSeriesData.data) {
      return null;
    }
    
    if (!allTimeSeriesData.data.countries) {
      console.warn('⚠️ [Dashboard] Countries data not ready yet');
      return null;
    }
    
    const { countries } = allTimeSeriesData.data;
    
    if (hasNoData) {
      console.log('📊 [Dashboard] Before COVID data - showing ALL countries at 0');
      
      const allCountries = Object.keys(countries);
      
      const casesPerCountry = allCountries.map(country => ({
        country: country,
        total_cases: 0
      })).sort((a, b) => a.country.localeCompare(b.country));
      
      const deathsPerCountry = allCountries.map(country => ({
        country: country,
        total_deaths: 0
      })).sort((a, b) => a.country.localeCompare(b.country));
      
      const recoveredPerCountry = allCountries.map(country => ({
        country: country,
        total_recovered: 0
      })).sort((a, b) => a.country.localeCompare(b.country));
      
      return { 
        casesPerCountry,
        deathsPerCountry,
        recoveredPerCountry,
        totalCases: 0,
        totalDeaths: 0,
        totalRecovered: 0
      };
    }
    
    const targetDate = selectedPeriod.dateString;
    
    const casesPerCountry = Object.keys(countries)
      .map(country => ({
        country: country,
        total_cases: countries[country].cases[targetDate] || 0
      }))
      .filter(c => c.total_cases > 0)
      .sort((a, b) => b.total_cases - a.total_cases);
    
    const deathsPerCountry = Object.keys(countries)
      .map(country => ({
        country: country,
        total_deaths: countries[country].deaths[targetDate] || 0
      }))
      .filter(c => c.total_deaths > 0)
      .sort((a, b) => b.total_deaths - a.total_deaths);
    
    const recoveredPerCountry = Object.keys(countries)
      .map(country => ({
        country: country,
        total_recovered: countries[country].recovered[targetDate] || 0
      }))
      .filter(c => c.total_recovered > 0)
      .sort((a, b) => b.total_recovered - a.total_recovered);
    
    const totalCases = casesPerCountry.reduce((sum, c) => sum + c.total_cases, 0);
    const totalDeaths = deathsPerCountry.reduce((sum, c) => sum + c.total_deaths, 0);
    const totalRecovered = recoveredPerCountry.reduce((sum, c) => sum + c.total_recovered, 0);
    
    console.log(`📊 [Dashboard] ${targetDate}: Cases=${totalCases.toLocaleString()}, Deaths=${totalDeaths.toLocaleString()}, Recovered=${totalRecovered.toLocaleString()}`);
    console.log(`📊 [Dashboard] Countries with data: Cases=${casesPerCountry.length}, Deaths=${deathsPerCountry.length}, Recovered=${recoveredPerCountry.length}`);
    
    return { 
      casesPerCountry,
      deathsPerCountry,
      recoveredPerCountry,
      totalCases,
      totalDeaths,
      totalRecovered
    };
  }, [allTimeSeriesData.data, selectedPeriod, isSliderMode, hasNoData]);
  
  const chartTimelineData = useMemo(() => {
    if (!isSliderMode || !allTimeSeriesData.data) {
      return null;
    }
    
    if (!allTimeSeriesData.data.countries || !allTimeSeriesData.data.dates) {
      console.warn('⚠️ [Dashboard] Timeline data not ready yet');
      return null;
    }
    
    const { countries, dates } = allTimeSeriesData.data;
    const targetDate = selectedPeriod.dateString;
    
    let timeline = [];
    
    const startDate = new Date(2019, 10, 1);
    const firstDataDate = new Date(2020, 0, 22);
    const targetDateObj = new Date(
      parseInt(targetDate.split('/')[2]) + 2000,
      parseInt(targetDate.split('/')[0]) - 1,
      parseInt(targetDate.split('/')[1])
    );
    
    if (targetDateObj < firstDataDate) {
      let currentDate = new Date(startDate);
      
      while (currentDate <= targetDateObj) {
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const year = currentDate.getFullYear() % 100;
        
        timeline.push({
          date: `${month}/${day}/${year}`,
          cases: 0
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`📊 [Dashboard] Chart timeline (before data): ${timeline.length} points at 0 cases`);
      return timeline;
    }
    
    let currentDate = new Date(startDate);
    while (currentDate < firstDataDate) {
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      const year = currentDate.getFullYear() % 100;
      
      timeline.push({
        date: `${month}/${day}/${year}`,
        cases: 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const filteredDates = dates.filter(d => d <= targetDate);
    
    filteredDates.forEach(date => {
      let totalCases = 0;
      
      if (selectedCountry) {
        if (countries[selectedCountry]) {
          totalCases = countries[selectedCountry].cases[date] || 0;
        }
      } else {
        Object.keys(countries).forEach(country => {
          totalCases += countries[country].cases[date] || 0;
        });
      }
      
      timeline.push({
        date: date,
        cases: totalCases
      });
    });
    
    const label = selectedCountry ? `for ${selectedCountry}` : '(global)';
    console.log(`📊 [Dashboard] Chart timeline ${label}: ${timeline.length} points up to ${targetDate}`);
    
    return timeline;
  }, [isSliderMode, allTimeSeriesData.data, selectedPeriod, selectedCountry]);
  
  const totalCasesPerCountry = useMemo(() => {
    return isSliderMode && allTimeSeriesData.data
      ? { 
          data: filteredData?.casesPerCountry || [],
          isLoading: allTimeSeriesData.isLoading,
          error: allTimeSeriesData.error
        }
      : apiCasesQuery;
  }, [isSliderMode, allTimeSeriesData.data, allTimeSeriesData.isLoading, allTimeSeriesData.error, filteredData, apiCasesQuery]);
  
  const totalDeathsPerCountry = useMemo(() => {
    return isSliderMode && allTimeSeriesData.data
      ? { 
          data: filteredData?.deathsPerCountry || [],
          isLoading: allTimeSeriesData.isLoading,
          error: allTimeSeriesData.error
        }
      : apiDeathsQuery;
  }, [isSliderMode, allTimeSeriesData.data, allTimeSeriesData.isLoading, allTimeSeriesData.error, filteredData, apiDeathsQuery]);
  
  const totalRecoveredPerCountry = useMemo(() => {
    return isSliderMode && allTimeSeriesData.data
      ? { 
          data: filteredData?.recoveredPerCountry || [],
          isLoading: allTimeSeriesData.isLoading,
          error: allTimeSeriesData.error
        }
      : apiRecoveredQuery;
  }, [isSliderMode, allTimeSeriesData.data, allTimeSeriesData.isLoading, allTimeSeriesData.error, filteredData, apiRecoveredQuery]);

  const globalStats = useMemo(() => {
    if (!isSliderMode || !filteredData) return null;
    
    if (selectedCountry) {
      const countryCase = filteredData.casesPerCountry.find(
        c => c.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      const countryDeath = filteredData.deathsPerCountry.find(
        c => c.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      const countryRecovered = filteredData.recoveredPerCountry.find(
        c => c.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      
      return {
        total_cases: countryCase?.total_cases || 0,
        total_deaths: countryDeath?.total_deaths || 0,
        total_recovered: countryRecovered?.total_recovered || 0
      };
    }
    
    return {
      total_cases: filteredData.totalCases,
      total_deaths: filteredData.totalDeaths,
      total_recovered: filteredData.totalRecovered
    };
  }, [isSliderMode, filteredData, selectedCountry]);

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

  const handleCountryClick = useCallback((countryName) => {
    console.log('🌍 Country selected:', countryName);
    setSelectedCountry(countryName);
  }, []);

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

  
  if (isSliderMode && allTimeSeriesData.isLoading) {
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
            Loading timeline data... (this may take 10-20 seconds)
          </p>
        </div>
      </div>
    );
  }

  if (isSliderMode && allTimeSeriesData.error) {
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
          <p style={{ fontSize: '18px' }}>Failed to load timeline data</p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            {allTimeSeriesData.error.message}
          </p>
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


  return (
    <div className="dashboard-grid">
      {selectedCountry && (
        <div className="country-view-banner">
          <button className="back-to-global-btn" onClick={handleBackToGlobal}>
            ← Back to Global View
          </button>
          <h2 className="country-view-title">
            {selectedCountry} - Country View
          </h2>
        </div>
      )}

      <div className="left-panel">
        <CountrySearch 
          onSearchChange={handleSearchChange} 
          resultsCount={0}
        />

        <StatsCard 
        label={selectedCountry ? `${selectedCountry} - Total Confirmed` : "Total Confirmed"}
        type="cases"
        selectedCountry={selectedCountry}
        globalStats={globalStats}
        isLoading={totalCasesPerCountry.isLoading}
        error={totalCasesPerCountry.error}
        currentDate={selectedPeriod?.dateString}
        colorClass="red-text"
        />

        <AdminLevelSelector 
          selectedLevel={adminLevel}
          onLevelChange={handleAdminLevelChange}
        />

        <CountryList
          title="Confirmed Cases by Country/Region/Sovereignty"
          type="cases"
          countriesData={totalCasesPerCountry.data || []}
          isLoading={totalCasesPerCountry.isLoading}
          error={totalCasesPerCountry.error}
          searchTerm={searchTerm}
          selectedCountry={selectedCountry}
          onCountryClick={handleCountryClick}
          colorClass="red-text"
        />

        <LastUpdatedDisplay timestamp="4/2/2020 9:02:01 AM" />
      </div>

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

      <div className="right-panels-container-narrow">
        <div className="right-stats-column">
          <div className="right-stat-panel">
            <StatsCard 
              label={selectedCountry ? `${selectedCountry} - Total Deaths` : "Total Deaths"}
              type="deaths"
              selectedCountry={selectedCountry}
              globalStats={globalStats}
              isLoading={totalDeathsPerCountry.isLoading}
              error={totalDeathsPerCountry.error}
              currentDate={selectedPeriod?.dateString}
              colorClass="white-text"
            />

            <CountryList
              type="deaths"
              countriesData={totalDeathsPerCountry.data || []}
              isLoading={totalDeathsPerCountry.isLoading}
              error={totalDeathsPerCountry.error}
              searchTerm={searchTerm}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
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
              isLoading={totalRecoveredPerCountry.isLoading}
              error={totalRecoveredPerCountry.error}
              currentDate={selectedPeriod?.dateString}
              colorClass="green-text"
            />

            <CountryList
              type="recovered"
              countriesData={totalRecoveredPerCountry.data || []}
              isLoading={totalRecoveredPerCountry.isLoading}
              error={totalRecoveredPerCountry.error}
              searchTerm={searchTerm}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
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
              period={queryParam}
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