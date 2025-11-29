'use client';

import React, { useState, useCallback } from 'react';
import { useCovidDashboardData } from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import StatsCard from './StatsCard';
import CountryList from './CountryList';
import MapComponent from './MapComponent';
import ChartComponent from './ChartComponent';
import TimelineSlider from './TimelineSlider';
import CountrySearch from './CountrySearch';
import "./Dashboard.css";

const Dashboard = () => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel] = useState("admin0");
  const [selectedPeriod, setSelectedPeriod] = useState({ id: 'all', days: null });
  const [searchTerm, setSearchTerm] = useState('');

  const dashboardData = useCovidDashboardData(selectedPeriod.days);

  const handleCountryClick = useCallback((countryName) => {
    setSelectedCountry(countryName);
  }, []);

  const handlePeriodChange = useCallback((period) => {
    setSelectedPeriod(period);
    console.log('📅 Period changed:', period.label, 'days:', period.days);
  }, []);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const filterCountriesBySearch = useCallback((countries, term) => {
    if (!term || !countries) return countries;
    const searchLower = term.toLowerCase().trim();
    return countries.filter((c) =>
      c.country.toLowerCase().includes(searchLower)
    );
  }, []);

  const filteredCasesCountries = filterCountriesBySearch(
    dashboardData.totalCasesPerCountry.data || [], 
    searchTerm
  );
  const filteredDeathsCountries = filterCountriesBySearch(
    dashboardData.totalDeathsPerCountry.data || [], 
    searchTerm
  );
  const filteredRecoveredCountries = filterCountriesBySearch(
    dashboardData.totalRecoveredPerCountry.data || [], 
    searchTerm
  );

  const formatChartData = useCallback((data) => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => {
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

  const formattedChartData = formatChartData(dashboardData.chartData.data || []);

  return (
    <div className="dashboard-grid">
      <div className="left-panel">
        <CountrySearch 
          onSearchChange={handleSearchChange} 
          resultsCount={filteredCasesCountries.length}
        />

        <QueryStateWrapper 
          query={dashboardData.totalCases}
          loadingMessage="Loading total cases..."
        >
          {(data) => (
            <StatsCard 
              label="Total Confirmed"
              value={selectedCountry 
                ? filteredCasesCountries.find(c => c.country === selectedCountry)?.total_cases 
                : data
              }
              colorClass="red-text"
            />
          )}
        </QueryStateWrapper>

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

        <QueryStateWrapper 
          query={dashboardData.totalCasesPerCountry}
          loadingMessage="Loading countries..."
        >
          {(data) => (
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

      <QueryStateWrapper 
        query={dashboardData.totalCasesPerCountry}
        loadingMessage="Loading map data..."
      >
        {(data) => (
          <MapComponent casesData={filteredCasesCountries} />
        )}
      </QueryStateWrapper>

      <div className="right-panels-container-narrow">
        <div className="right-stats-column">
          {/* Deaths Panel */}
          <div className="right-stat-panel">
            <QueryStateWrapper query={dashboardData.totalDeaths}>
              {(data) => (
                <StatsCard 
                  label="Total Deaths"
                  value={selectedCountry 
                    ? filteredDeathsCountries.find(c => c.country === selectedCountry)?.total_deaths 
                    : data
                  }
                  colorClass="white-text"
                />
              )}
            </QueryStateWrapper>

            <QueryStateWrapper query={dashboardData.totalDeathsPerCountry}>
              {(data) => (
                <CountryList
                  countries={filteredDeathsCountries}
                  dataKey="total_deaths"
                  labelSuffix="deaths"
                  colorClass="white-text"
                />
              )}
            </QueryStateWrapper>
          </div>

          <div className="right-stat-panel">
            <QueryStateWrapper query={dashboardData.totalRecovered}>
              {(data) => (
                <StatsCard 
                  label="Total Recovered"
                  value={data}
                  colorClass="green-text"
                />
              )}
            </QueryStateWrapper>

            <QueryStateWrapper query={dashboardData.totalRecoveredPerCountry}>
              {(data) => (
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

        <div className="chart-panel-with-timeline">
          <div className="timeline-above-chart">
            <TimelineSlider onPeriodChange={handlePeriodChange} />
          </div>

          <div className="chart-scrollable-container">
            <QueryStateWrapper 
              query={dashboardData.chartData}
              loadingMessage="Loading chart data..."
            >
              {(data) => (
                <ChartComponent 
                  data={formattedChartData}
                  isLoading={false}
                  isError={false}
                />
              )}
            </QueryStateWrapper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;