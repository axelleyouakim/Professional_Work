'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

const GEO_TO_API = {
  'United States of America': 'US',
  'United States':             'US',
  'South Korea':               'Korea, South',
  'Korea':                     'Korea, South',
  'North Korea':               'Korea, North',
  'DR Congo':                  'Congo (Kinshasa)',
  'Republic of the Congo':     'Congo (Brazzaville)',
  'Democratic Republic of the Congo': 'Congo (Kinshasa)',
  'Ivory Coast':               "Cote d'Ivoire",
  "Côte d'Ivoire":             "Cote d'Ivoire",
  'Czech Republic':            'Czechia',
  'Macedonia':                 'North Macedonia',
  'Taiwan':                    'Taiwan*',
  'Palestine':                 'West Bank and Gaza',
  'Somaliland':                'Somalia',
  'Swaziland':                 'Eswatini',
};

const resolveCountryName = (geoName, countryLookup) => {
  if (!geoName) return null;
  if (GEO_TO_API[geoName]) return GEO_TO_API[geoName];
  if (countryLookup?.[geoName.toLowerCase()]) return countryLookup[geoName.toLowerCase()];
  return geoName;
};

const INITIAL_PERIOD = {
  dateString: '3/9/23', dateObj: new Date(2023, 2, 9),
  displayDate: 'Mar 9, 2023', dayIndex: 1224, totalDays: 1225, hasData: true,
};

const EMPTY_ARR = [];

const Dashboard = () => {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod]   = useState(INITIAL_PERIOD);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel]           = useState("admin0");
  const [searchTerm, setSearchTerm]           = useState('');

  const { preCalculatedIndex, isLoading, error } = usePreCalculatedData();

  const isSliderMode = !!selectedPeriod?.dateString;
  const hasNoData    = selectedPeriod?.hasData === false;

  const targetDate = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return INITIAL_PERIOD.dateString;
    return isSliderMode
      ? selectedPeriod.dateString
      : preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
  }, [preCalculatedIndex, selectedPeriod, isSliderMode]);

  const currentData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) {
      return { casesPerCountry: EMPTY_ARR, deathsPerCountry: EMPTY_ARR, recoveredPerCountry: EMPTY_ARR, totalCases: 0, totalDeaths: 0, totalRecovered: 0, isReady: false };
    }
    if (hasNoData) {
      const empty = preCalculatedIndex.countryNames.map(c => ({ country: c, total_cases: 0 }));
      return { casesPerCountry: empty, deathsPerCountry: empty.map(c => ({ country: c.country, total_deaths: 0 })), recoveredPerCountry: empty.map(c => ({ country: c.country, total_recovered: 0 })), totalCases: 0, totalDeaths: 0, totalRecovered: 0, isReady: true };
    }
    const sorted = preCalculatedIndex.sortedIndex[targetDate];
    const totals = preCalculatedIndex.totalsIndex[targetDate];
    if (!sorted || !totals) return { casesPerCountry: EMPTY_ARR, deathsPerCountry: EMPTY_ARR, recoveredPerCountry: EMPTY_ARR, totalCases: 0, totalDeaths: 0, totalRecovered: 0, isReady: true };
    return { casesPerCountry: sorted.casesPerCountry, deathsPerCountry: sorted.deathsPerCountry, recoveredPerCountry: sorted.recoveredPerCountry, totalCases: totals.totalCases, totalDeaths: totals.totalDeaths, totalRecovered: totals.totalRecovered, isReady: true };
  }, [preCalculatedIndex, targetDate, hasNoData]);

  const chartTimelineData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return null;
    const { globalChartFull, dateToGlobalChartIdx, countryChartFull } = preCalculatedIndex;
    if (hasNoData) return [{ date: targetDate, cases: 0 }];
    const endIdx = (dateToGlobalChartIdx[targetDate] ?? globalChartFull.length - 1) + 1;
    if (selectedCountry && countryChartFull[selectedCountry])
      return countryChartFull[selectedCountry].slice(0, endIdx);
    return globalChartFull.slice(0, endIdx);
  }, [preCalculatedIndex, targetDate, selectedCountry, hasNoData]);

  const globalStats = useMemo(() => {
    if (!currentData.isReady) return null;
    if (selectedCountry) {
      const lc = selectedCountry.toLowerCase();
      const findVal = (arr, key) =>
        (arr.find(c => c.country === selectedCountry) || arr.find(c => c.country.toLowerCase() === lc))?.[key] || 0;
      return {
        total_cases:     findVal(currentData.casesPerCountry,     'total_cases'),
        total_deaths:    findVal(currentData.deathsPerCountry,    'total_deaths'),
        total_recovered: findVal(currentData.recoveredPerCountry, 'total_recovered'),
      };
    }
    return { total_cases: currentData.totalCases, total_deaths: currentData.totalDeaths, total_recovered: currentData.totalRecovered };
  }, [currentData, selectedCountry]);

  const handlePeriodChange     = useCallback((p) => setSelectedPeriod(p), []);
  const handleCountryClick     = useCallback((geoName) => {
    if (!preCalculatedIndex?.countryLookup) return;
    setSelectedCountry(resolveCountryName(geoName, preCalculatedIndex.countryLookup));
  }, [preCalculatedIndex]);
  const handleBackToGlobal     = useCallback(() => setSelectedCountry(null), []);
  const handleSearchChange     = useCallback((term) => setSearchTerm(term), []);
  const handleAdminLevelChange = useCallback((level) => setAdminLevel(level), []);
  const handleCompareClick     = useCallback(() => router.push('/compare'), [router]);

  if (isLoading) {
    return (
      <div className="dashboard-grid">
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '16px' }}>
          <div className="spinner" style={{ width: '48px', height: '48px' }} />
          <p style={{ color: '#7a9abc', fontSize: '16px', margin: 0 }}>Loading COVID-19 data…</p>
          <p style={{ color: '#4a6a8a', fontSize: '13px', margin: 0 }}>First load only — everything instant after</p>
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
  const geoSelectedCountry = selectedCountry
    ? (Object.entries(GEO_TO_API).find(([, api]) => api === selectedCountry)?.[0] || selectedCountry)
    : null;

  return (
    <div className="dashboard-grid">
      {selectedCountry && (
        <div className="country-view-banner">
          <button className="back-to-global-btn" onClick={handleBackToGlobal}>← Back to Global View</button>
          <h2 className="country-view-title">{selectedCountry} — Country View</h2>
        </div>
      )}

      <div className="left-panel">
        <CountrySearch onSearchChange={handleSearchChange} resultsCount={0} />
        <StatsCard label={selectedCountry ? `${selectedCountry} — Total Confirmed` : 'Total Confirmed'} type="cases" selectedCountry={selectedCountry} globalStats={globalStats} isLoading={false} error={null} currentDate={targetDate} colorClass="red-text" />
        <AdminLevelSelector selectedLevel={adminLevel} onLevelChange={handleAdminLevelChange} />
        <CountryList title="Confirmed Cases by Country/Region/Sovereignty" type="cases" countriesData={currentData.casesPerCountry} isLoading={false} error={null} searchTerm={searchTerm} selectedCountry={selectedCountry} onCountryClick={handleCountryClick} colorClass="red-text" />
        <LastUpdatedDisplay timestamp="4/2/2020 9:02:01 AM" />
      </div>

      <QueryStateWrapper query={fakeQuery} loadingMessage="Loading map data...">
        {(casesData) => (
          <MapComponent
            casesData={searchTerm ? casesData.filter(c => c.country.toLowerCase().includes(searchTerm.toLowerCase())) : casesData}
            selectedCountry={geoSelectedCountry}
            onCountryClick={handleCountryClick}
          />
        )}
      </QueryStateWrapper>

      <div className="right-panels-container-narrow">
        <div className="right-stats-column">
          <div className="right-stat-panel">
            <StatsCard label={selectedCountry ? `${selectedCountry} — Total Deaths` : 'Total Deaths'} type="deaths" selectedCountry={selectedCountry} globalStats={globalStats} isLoading={false} error={null} currentDate={targetDate} colorClass="white-text" />
            <CountryList type="deaths" countriesData={currentData.deathsPerCountry} isLoading={false} error={null} searchTerm={searchTerm} selectedCountry={selectedCountry} onCountryClick={handleCountryClick} labelSuffix="deaths" colorClass="white-text" />
          </div>
          <div className="right-stat-panel">
            <StatsCard label={selectedCountry ? `${selectedCountry} — Total Recovered` : 'Total Recovered'} type="recovered" selectedCountry={selectedCountry} globalStats={globalStats} isLoading={false} error={null} currentDate={targetDate} colorClass="green-text" />
            <CountryList type="recovered" countriesData={currentData.recoveredPerCountry} isLoading={false} error={null} searchTerm={searchTerm} selectedCountry={selectedCountry} onCountryClick={handleCountryClick} labelSuffix="recovered" colorClass="green-text" />
          </div>
        </div>

        <div className="chart-panel-with-timeline">
          {/* ✅ SEUL CHANGEMENT : bouton déplacé ici, intégré au panneau */}
          <div style={{ padding: '8px 12px 4px 12px' }}>
            <button
              onClick={handleCompareClick}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '10px 16px',
                background: 'linear-gradient(135deg, #4a8aff, #2a5acc)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(74,138,255,0.3)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,138,255,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(74,138,255,0.3)'; }}
            >
              ⚖️ Compare Countries
            </button>
          </div>
          <div className="timeline-above-chart">
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