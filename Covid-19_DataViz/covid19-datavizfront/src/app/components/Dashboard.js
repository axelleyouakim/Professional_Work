'use client';

import React, { useState, useCallback, useMemo, useTransition, useRef } from 'react';
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

// ─── State initial du slider (dernière date disponible) ───────────────────────
const INITIAL_PERIOD = {
  dateString:  '3/9/23',
  dateObj:     new Date(2023, 2, 9),
  displayDate: 'Mar 9, 2023',
  dayIndex:    1224,
  totalDays:   1225,
  hasData:     true,
};

const Dashboard = () => {
  // ─── Tout le state vit ICI, pas dans page.js ─────────────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState(INITIAL_PERIOD);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel]           = useState("admin0");
  const [searchTerm, setSearchTerm]           = useState('');
  const [hoveredCountry, setHoveredCountry]   = useState(null);

  // useTransition : les changements de pays/période passent en priorité basse
  // → le slider et le highlight répondent immédiatement, le re-render lourd suit
  const [isPending, startTransition] = useTransition();

  const { preCalculatedIndex, getDataForDate, isLoading, error } = usePreCalculatedData();

  const isSliderMode = selectedPeriod?.dateString != null && selectedPeriod.dateString !== '';
  const hasNoData    = selectedPeriod?.hasData === false;

  // ─── Handler slider : UI immédiate, recalcul en transition ───────────────
  const handlePeriodChange = useCallback((newPeriod) => {
    // setSelectedPeriod est léger (juste un objet), pas de transition nécessaire ici
    // Le recalcul lourd (currentData useMemo) sera en transition
    setSelectedPeriod(newPeriod);
  }, []);

  // ─── Données courantes ────────────────────────────────────────────────────
  const currentData = useMemo(() => {
    if (!preCalculatedIndex?.isReady || !getDataForDate) {
      return {
        casesPerCountry: [], deathsPerCountry: [], recoveredPerCountry: [],
        totalCases: 0, totalDeaths: 0, totalRecovered: 0,
        targetDate: null, isReady: false,
      };
    }

    const { dates, countryNames } = preCalculatedIndex;
    const targetDate = isSliderMode
      ? selectedPeriod.dateString
      : dates[dates.length - 1];

    if (hasNoData) {
      return {
        casesPerCountry:     countryNames.map(c => ({ country: c, total_cases: 0 })),
        deathsPerCountry:    countryNames.map(c => ({ country: c, total_deaths: 0 })),
        recoveredPerCountry: countryNames.map(c => ({ country: c, total_recovered: 0 })),
        totalCases: 0, totalDeaths: 0, totalRecovered: 0,
        targetDate, isReady: true,
      };
    }

    const data = getDataForDate(targetDate);
    return { ...data, targetDate, isReady: true };

  }, [preCalculatedIndex, getDataForDate, selectedPeriod, isSliderMode, hasNoData]);

  // ─── Chart timeline ───────────────────────────────────────────────────────
  const chartTimelineData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return null;

    const { totalsIndex, countries, dates } = preCalculatedIndex;
    const targetDate = isSliderMode ? selectedPeriod.dateString : dates[dates.length - 1];

    if (isSliderMode && hasNoData) {
      const startDate = new Date(2019, 10, 1);
      const [m, d, y] = selectedPeriod.dateString.split('/');
      const targetDateObj = new Date(parseInt(y) + 2000, parseInt(m) - 1, parseInt(d));
      const timeline = [];
      let cur = new Date(startDate);
      while (cur <= targetDateObj) {
        timeline.push({ date: `${cur.getMonth()+1}/${cur.getDate()}/${cur.getFullYear()%100}`, cases: 0 });
        cur.setDate(cur.getDate() + 1);
      }
      return timeline;
    }

    const filteredDates = isSliderMode ? dates.filter(d => d <= targetDate) : dates;

    return filteredDates.map(date => ({
      date,
      cases: selectedCountry && countries[selectedCountry]
        ? countries[selectedCountry].cases[date] || 0
        : totalsIndex[date]?.totalCases || 0,
    }));

  }, [preCalculatedIndex, selectedPeriod, selectedCountry, isSliderMode, hasNoData]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    if (!currentData.isReady) return null;
    if (selectedCountry) {
      return {
        total_cases:     currentData.casesPerCountry.find(c => c.country.toLowerCase() === selectedCountry.toLowerCase())?.total_cases || 0,
        total_deaths:    currentData.deathsPerCountry.find(c => c.country.toLowerCase() === selectedCountry.toLowerCase())?.total_deaths || 0,
        total_recovered: currentData.recoveredPerCountry.find(c => c.country.toLowerCase() === selectedCountry.toLowerCase())?.total_recovered || 0,
      };
    }
    return {
      total_cases:     currentData.totalCases,
      total_deaths:    currentData.totalDeaths,
      total_recovered: currentData.totalRecovered,
    };
  }, [currentData, selectedCountry]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  // useTransition pour le clic pays : le highlight CSS est immédiat,
  // le recalcul de chartTimelineData (filtrage par pays) passe en basse priorité
  const handleCountryClick = useCallback((name) => {
    startTransition(() => {
      setSelectedCountry(name);
    });
  }, []);

  const handleBackToGlobal  = useCallback(() => startTransition(() => setSelectedCountry(null)), []);
  const handleSearchChange  = useCallback((term) => setSearchTerm(term), []);
  const handleAdminLevelChange = useCallback((level) => setAdminLevel(level), []);
  const handleCountryHover  = useCallback((name) => {
    if (name !== hoveredCountry) setHoveredCountry(name);
  }, [hoveredCountry]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="dashboard-grid">
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '20px' }}>
          <div className="spinner" style={{ width: '50px', height: '50px' }} />
          <p style={{ color: '#999', fontSize: '18px' }}>Loading data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-grid">
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '20px', color: '#ff4444' }}>
          <span style={{ fontSize: '48px' }}>⚠️</span>
          <p style={{ fontSize: '18px' }}>Failed to load data</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  const fakeQuery = { data: currentData.casesPerCountry, isLoading: false, error: null };

  return (
    <div className="dashboard-grid" style={{ opacity: isPending ? 0.97 : 1 }}>
      {selectedCountry && (
        <div className="country-view-banner">
          <button className="back-to-global-btn" onClick={handleBackToGlobal}>← Back to Global View</button>
          <h2 className="country-view-title">{selectedCountry} - Country View</h2>
        </div>
      )}

      <div className="left-panel">
        <CountrySearch onSearchChange={handleSearchChange} resultsCount={0} />
        <StatsCard
          label={selectedCountry ? `${selectedCountry} - Total Confirmed` : "Total Confirmed"}
          type="cases" selectedCountry={selectedCountry} globalStats={globalStats}
          isLoading={false} error={null} currentDate={currentData.targetDate} colorClass="red-text"
        />
        <AdminLevelSelector selectedLevel={adminLevel} onLevelChange={handleAdminLevelChange} />
        <CountryList
          title="Confirmed Cases by Country/Region/Sovereignty" type="cases"
          countriesData={currentData.casesPerCountry} isLoading={false} error={null}
          searchTerm={searchTerm} selectedCountry={selectedCountry}
          onCountryClick={handleCountryClick} onCountryHover={handleCountryHover} colorClass="red-text"
        />
        <LastUpdatedDisplay timestamp="4/2/2020 9:02:01 AM" />
      </div>

      <QueryStateWrapper query={fakeQuery} loadingMessage="Loading map data...">
        {(casesData) => (
          <MapComponent
            casesData={casesData.filter(c => !searchTerm || c.country.toLowerCase().includes(searchTerm.toLowerCase()))}
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
              type="deaths" selectedCountry={selectedCountry} globalStats={globalStats}
              isLoading={false} error={null} currentDate={currentData.targetDate} colorClass="white-text"
            />
            <CountryList
              type="deaths" countriesData={currentData.deathsPerCountry} isLoading={false} error={null}
              searchTerm={searchTerm} selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick} onCountryHover={handleCountryHover}
              labelSuffix="deaths" colorClass="white-text"
            />
          </div>
          <div className="right-stat-panel">
            <StatsCard
              label={selectedCountry ? `${selectedCountry} - Total Recovered` : "Total Recovered"}
              type="recovered" selectedCountry={selectedCountry} globalStats={globalStats}
              isLoading={false} error={null} currentDate={currentData.targetDate} colorClass="green-text"
            />
            <CountryList
              type="recovered" countriesData={currentData.recoveredPerCountry} isLoading={false} error={null}
              searchTerm={searchTerm} selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick} onCountryHover={handleCountryHover}
              labelSuffix="recovered" colorClass="green-text"
            />
          </div>
        </div>

        <div className="chart-panel-with-timeline">
          <div className="timeline-above-chart">
            {/* onPeriodChange va directement dans Dashboard, pas dans page.js */}
            <TimelineSlider onPeriodChange={handlePeriodChange} />
          </div>
          <div className="chart-scrollable-container">
            <ChartComponent period={null} selectedCountry={selectedCountry} timelineData={chartTimelineData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;