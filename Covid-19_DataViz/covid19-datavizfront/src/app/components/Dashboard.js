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
  'eSwatini':                  'Eswatini',
  'S. Sudan':                  'South Sudan',
  'Central African Rep.':      'Central African Republic',
  'Dominican Rep.':            'Dominican Republic',
  'Eq. Guinea':                'Equatorial Guinea',
  'Bosnia and Herz.':          'Bosnia and Herzegovina',
  'Solomon Is.':               'Solomon Islands',
  'Antigua and Barb.':         'Antigua and Barbuda',
  'St. Kitts and Nevis':       'Saint Kitts and Nevis',
  'St. Vin. and Gren.':        'Saint Vincent and the Grenadines',
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

  const { preCalculatedIndex, error } = usePreCalculatedData();

  const hasNoData = selectedPeriod?.hasData === false;

  // globalDate: always the last available date — used for lists & map (frozen)
  const globalDate = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return INITIAL_PERIOD.dateString;
    return preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
  }, [preCalculatedIndex]);

  // countryDate: follows the slider — used ONLY for the selected country
  const countryDate = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return INITIAL_PERIOD.dateString;
    if (hasNoData) return globalDate;
    return selectedPeriod.dateString;
  }, [preCalculatedIndex, selectedPeriod, hasNoData, globalDate]);

  // globalData: in global view follows the slider, in country view frozen at globalDate
  const globalData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) {
      return { casesPerCountry: EMPTY_ARR, deathsPerCountry: EMPTY_ARR, recoveredPerCountry: EMPTY_ARR, totalCases: 0, totalDeaths: 0, totalRecovered: 0, isReady: false };
    }
    // When a country is selected, lists are frozen at globalDate.
    // When in global view, lists follow the slider (countryDate).
    const dateToUse = selectedCountry ? globalDate : countryDate;
    const sorted = preCalculatedIndex.sortedIndex[dateToUse];
    const totals = preCalculatedIndex.totalsIndex[dateToUse];
    if (!sorted || !totals) return { casesPerCountry: EMPTY_ARR, deathsPerCountry: EMPTY_ARR, recoveredPerCountry: EMPTY_ARR, totalCases: 0, totalDeaths: 0, totalRecovered: 0, isReady: true };
    return {
      casesPerCountry:     sorted.casesPerCountry,
      deathsPerCountry:    sorted.deathsPerCountry,
      recoveredPerCountry: sorted.recoveredPerCountry,
      totalCases:          totals.totalCases,
      totalDeaths:         totals.totalDeaths,
      totalRecovered:      totals.totalRecovered,
      isReady: true,
    };
  }, [preCalculatedIndex, globalDate, countryDate, selectedCountry]);

  // countryStats: live value at countryDate for the selected country only
  // → passed as selectedCountryOverride to CountryList (only that row updates)
  // → also used for the StatsCards header when in country view
  const countryStats = useMemo(() => {
    if (!preCalculatedIndex?.isReady || !selectedCountry) return null;
    // Before first COVID date, hasNoData=true → show 0 for everything
    if (hasNoData) return { total_cases: 0, total_deaths: 0, total_recovered: 0 };
    const sorted = preCalculatedIndex.sortedIndex[countryDate];
    if (!sorted) return { total_cases: 0, total_deaths: 0, total_recovered: 0 };
    const lc = selectedCountry.toLowerCase();
    const findVal = (arr, key) =>
      (arr.find(c => c.country === selectedCountry) ||
       arr.find(c => c.country.toLowerCase() === lc))?.[key] || 0;
    return {
      total_cases:     findVal(sorted.casesPerCountry,     'total_cases'),
      total_deaths:    findVal(sorted.deathsPerCountry,    'total_deaths'),
      total_recovered: findVal(sorted.recoveredPerCountry, 'total_recovered'),
    };
  }, [preCalculatedIndex, selectedCountry, countryDate, hasNoData]);

  // globalStats for StatsCards:
  // - global view  → global totals at globalDate (frozen, no slider)
  // - country view → countryStats at countryDate (follows slider)
  const globalStats = useMemo(() => {
    if (selectedCountry) return countryStats;
    if (!globalData.isReady) return null;
    return { total_cases: globalData.totalCases, total_deaths: globalData.totalDeaths, total_recovered: globalData.totalRecovered };
  }, [selectedCountry, countryStats, globalData]);

  // Chart: country series up to countryDate OR global series (full, no slider)
  const chartTimelineData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return null;
    const { globalChartFull, dateToGlobalChartIdx, countryChartFull } = preCalculatedIndex;
    if (selectedCountry && countryChartFull[selectedCountry]) {
      const endIdx = (dateToGlobalChartIdx[hasNoData ? globalDate : countryDate] ?? globalChartFull.length - 1) + 1;
      return countryChartFull[selectedCountry].slice(0, endIdx);
    }
    return globalChartFull;
  }, [preCalculatedIndex, selectedCountry, countryDate, hasNoData, globalDate]);

  // mapCasesData:
  // - global view: all bubbles follow slider (countryDate)
  // - country view: other countries frozen at globalDate, selected country follows slider
  const mapCasesData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return EMPTY_ARR;

    if (!selectedCountry) {
      // Global view: everything follows the slider
      const sorted = preCalculatedIndex.sortedIndex[countryDate];
      return sorted?.casesPerCountry || EMPTY_ARR;
    }

    // Country view: freeze others at globalDate, selected country at countryDate
    const globalSorted = preCalculatedIndex.sortedIndex[globalDate];
    if (!globalSorted) return EMPTY_ARR;
    const countrySorted = preCalculatedIndex.sortedIndex[hasNoData ? globalDate : countryDate];
    const lc = selectedCountry.toLowerCase();

    // Build a zero-entry for when the country has no data at countryDate
    const zeroEntry = { country: selectedCountry, total_cases: 0 };

    const countryEntry = countrySorted?.casesPerCountry.find(
      c => c.country === selectedCountry || c.country.toLowerCase() === lc
    ) || zeroEntry;

    return globalSorted.casesPerCountry.map(c =>
      (c.country === selectedCountry || c.country.toLowerCase() === lc) ? countryEntry : c
    );
  }, [preCalculatedIndex, globalDate, countryDate, selectedCountry, hasNoData]);

  const handlePeriodChange     = useCallback((p) => setSelectedPeriod(p), []);
  const handleCountryClick     = useCallback((geoName) => {
    if (!preCalculatedIndex?.countryLookup) return;
    setSelectedCountry(resolveCountryName(geoName, preCalculatedIndex.countryLookup));
  }, [preCalculatedIndex]);
  const handleBackToGlobal     = useCallback(() => setSelectedCountry(null), []);
  const handleSearchChange     = useCallback((term) => setSearchTerm(term), []);
  const handleAdminLevelChange = useCallback((level) => setAdminLevel(level), []);
  const handleCompareClick     = useCallback(() => router.push('/compare'), [router]);

  if (error) {
    return (
      <div className="dashboard-grid">
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '20px', color: '#ff4444' }}>
          <p style={{ fontSize: '18px' }}>Failed to load data</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  const fakeQuery = { data: mapCasesData, isLoading: false, error: null };
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
        <StatsCard
          label={selectedCountry ? `${selectedCountry} — Total Confirmed` : 'Total Confirmed'}
          type="cases"
          selectedCountry={selectedCountry}
          globalStats={globalStats}
          isLoading={false}
          error={null}
          currentDate={selectedCountry ? countryDate : globalDate}
          colorClass="red-text"
        />
        <AdminLevelSelector selectedLevel={adminLevel} onLevelChange={handleAdminLevelChange} />
        <CountryList
          title="Confirmed Cases by Country/Region/Sovereignty"
          type="cases"
          countriesData={globalData.casesPerCountry}
          isLoading={false}
          error={null}
          searchTerm={searchTerm}
          selectedCountry={selectedCountry}
          onCountryClick={handleCountryClick}
          colorClass="red-text"
          selectedCountryOverride={countryStats}
        />
        <LastUpdatedDisplay timestamp="4/2/2020 9:02:01 AM" />
        <button
          onClick={handleCompareClick}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', padding: '10px 16px', marginTop: '8px',
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
          Compare Countries
        </button>
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
            <StatsCard
              label={selectedCountry ? `${selectedCountry} — Total Deaths` : 'Total Deaths'}
              type="deaths"
              selectedCountry={selectedCountry}
              globalStats={globalStats}
              isLoading={false}
              error={null}
              currentDate={selectedCountry ? countryDate : globalDate}
              colorClass="white-text"
            />
            <CountryList
              type="deaths"
              countriesData={globalData.deathsPerCountry}
              isLoading={false}
              error={null}
              searchTerm={searchTerm}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
              labelSuffix="deaths"
              colorClass="white-text"
              selectedCountryOverride={countryStats}
            />
          </div>
          <div className="right-stat-panel">
            <StatsCard
              label={selectedCountry ? `${selectedCountry} — Total Recovered` : 'Total Recovered'}
              type="recovered"
              selectedCountry={selectedCountry}
              globalStats={globalStats}
              isLoading={false}
              error={null}
              currentDate={selectedCountry ? countryDate : globalDate}
              colorClass="green-text"
            />
            <CountryList
              type="recovered"
              countriesData={globalData.recoveredPerCountry}
              isLoading={false}
              error={null}
              searchTerm={searchTerm}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
              labelSuffix="recovered"
              colorClass="green-text"
              selectedCountryOverride={countryStats}
            />
          </div>
        </div>

        <div className="chart-panel-with-timeline">
          <div className="timeline-above-chart">
            <TimelineSlider onPeriodChange={handlePeriodChange} />
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