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

  // ✅ Charger TOUTES les données time-series UNE SEULE FOIS
  const allTimeSeriesData = useAllTimeSeriesData();
  
  // ✅ Déterminer le mode : slider ou normal
  const isSliderMode = selectedPeriod?.dateString != null && selectedPeriod.dateString !== '';
console.log('🔍 [Dashboard] isSliderMode DEBUG:', { 
  dateString: selectedPeriod?.dateString, 
  hasData: selectedPeriod?.hasData,
  isSliderMode: selectedPeriod?.dateString != null && selectedPeriod.dateString !== ''
});
  const hasNoData = selectedPeriod?.hasData === false;
  
  // ✅ Filtrer les données selon la date du slider (côté client)
  const filteredData = useMemo(() => {
    if (!isSliderMode || !allTimeSeriesData.data) {
      return null;
    }
    
    // Si on est avant les données (nov 2019 - jan 21 2020)
    if (hasNoData) {
      return { 
        casesPerCountry: [],
        deathsPerCountry: [],
        recoveredPerCountry: [],
        totalCases: 0,
        totalDeaths: 0,
        totalRecovered: 0
      };
    }
    
    const { countries } = allTimeSeriesData.data;
    const targetDate = selectedPeriod.dateString;
    
    // ✅ Filtrer les CASES
    const casesPerCountry = Object.keys(countries)
      .map(country => ({
        country: country,
        total_cases: countries[country].cases[targetDate] || 0
      }))
      .filter(c => c.total_cases > 0)
      .sort((a, b) => b.total_cases - a.total_cases);
    
    // ✅ Filtrer les DEATHS
    const deathsPerCountry = Object.keys(countries)
      .map(country => ({
        country: country,
        total_deaths: countries[country].deaths[targetDate] || 0
      }))
      .filter(c => c.total_deaths > 0)
      .sort((a, b) => b.total_deaths - a.total_deaths);
    
    // ✅ Filtrer les RECOVERED
    const recoveredPerCountry = Object.keys(countries)
      .map(country => ({
        country: country,
        total_recovered: countries[country].recovered[targetDate] || 0
      }))
      .filter(c => c.total_recovered > 0)
      .sort((a, b) => b.total_recovered - a.total_recovered);
    
    // Calculer les totaux globaux
    const totalCases = casesPerCountry.reduce((sum, c) => sum + c.total_cases, 0);
    const totalDeaths = deathsPerCountry.reduce((sum, c) => sum + c.total_deaths, 0);
    const totalRecovered = recoveredPerCountry.reduce((sum, c) => sum + c.total_recovered, 0);
    
    console.log(`📊 [Dashboard] ${targetDate}: Cases=${totalCases.toLocaleString()}, Deaths=${totalDeaths.toLocaleString()}, Recovered=${totalRecovered.toLocaleString()}`);
    
    return { 
      casesPerCountry,
      deathsPerCountry,
      recoveredPerCountry,
      totalCases,
      totalDeaths,
      totalRecovered
    };
  }, [allTimeSeriesData.data, selectedPeriod, isSliderMode, hasNoData]);
  
  // ✅ Créer les données du graphique à partir des données filtrées
  const chartTimelineData = useMemo(() => {
    if (!isSliderMode || !allTimeSeriesData.data) {
      return null;
    }
    
    const { countries, dates } = allTimeSeriesData.data;
    const targetDate = selectedPeriod.dateString;
    
    let timeline = [];
    
    // ✅ ÉTAPE 1 : Générer des points à 0 AVANT les vraies données (Nov 2019 - Jan 21 2020)
    const startDate = new Date(2019, 10, 1);
    const firstDataDate = new Date(2020, 0, 22);
    const targetDateObj = new Date(
      parseInt(targetDate.split('/')[2]) + 2000,
      parseInt(targetDate.split('/')[0]) - 1,
      parseInt(targetDate.split('/')[1])
    );
    
    // Si la date sélectionnée est AVANT les vraies données
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
    
    // ✅ ÉTAPE 2 : Ajouter les points à 0 AVANT les vraies données
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
    
    // ✅ ÉTAPE 3 : Ajouter les vraies données jusqu'à la date sélectionnée
    const filteredDates = dates.filter(d => d <= targetDate);
    
    filteredDates.forEach(date => {
      let totalCases = 0;
      
      // ✅ SI UN PAYS EST SÉLECTIONNÉ, filtrer par pays
      if (selectedCountry) {
        if (countries[selectedCountry]) {
          totalCases = countries[selectedCountry].cases[date] || 0;
        }
      } else {
        // Sinon, total mondial
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
  
  // ✅ Query param pour l'API (si pas en mode slider)
  const queryParam = isSliderMode ? null : null;
  
  // ✅ TOUJOURS appeler les hooks
  const apiCasesQuery = useTotalCasesPerCountry(queryParam);
  const apiDeathsQuery = useTotalDeathsPerCountry(queryParam);
  const apiRecoveredQuery = useTotalRecoveredPerCountry(queryParam);
  const chartData = useCasesTimeSeries(queryParam, selectedCountry);
  
  // ✅ Utiliser les données filtrées si en mode slider
  const totalCasesPerCountry = isSliderMode && allTimeSeriesData.data
    ? { 
        data: filteredData?.casesPerCountry || [],
        isLoading: allTimeSeriesData.isLoading,
        error: allTimeSeriesData.error
      }
    : apiCasesQuery;
  
  const totalDeathsPerCountry = isSliderMode && allTimeSeriesData.data
    ? { 
        data: filteredData?.deathsPerCountry || [],
        isLoading: allTimeSeriesData.isLoading,
        error: allTimeSeriesData.error
      }
    : apiDeathsQuery;
  
  const totalRecoveredPerCountry = isSliderMode && allTimeSeriesData.data
    ? { 
        data: filteredData?.recoveredPerCountry || [],
        isLoading: allTimeSeriesData.isLoading,
        error: allTimeSeriesData.error
      }
    : apiRecoveredQuery;

  // ✅ Stats globales OU par pays pour les StatsCards
  const globalStats = useMemo(() => {
    if (!isSliderMode || !filteredData) return null;
    
    // ✅ SI UN PAYS EST SÉLECTIONNÉ
    if (selectedCountry) {
      // Chercher les stats du pays dans les données filtrées
      const countryCase = filteredData.casesPerCountry.find(
        c => c.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      const countryDeath = filteredData.deathsPerCountry.find(
        c => c.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      const countryRecovered = filteredData.recoveredPerCountry.find(
        c => c.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      
      console.log(`📊 [Dashboard] Stats for ${selectedCountry}:`, {
        cases: countryCase?.total_cases || 0,
        deaths: countryDeath?.total_deaths || 0,
        recovered: countryRecovered?.total_recovered || 0
      });
      
      return {
        total_cases: countryCase?.total_cases || 0,
        total_deaths: countryDeath?.total_deaths || 0,
        total_recovered: countryRecovered?.total_recovered || 0
      };
    }
    
    // ✅ SINON, stats globales
    return {
      total_cases: filteredData.totalCases,
      total_deaths: filteredData.totalDeaths,
      total_recovered: filteredData.totalRecovered
    };
  }, [isSliderMode, filteredData, selectedCountry]);

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

  console.log('🔍 [Dashboard] chartTimelineData:', chartTimelineData?.length, 'points');
  console.log('🔍 [Dashboard] isSliderMode:', isSliderMode);
  console.log('🔍 [Dashboard] selectedPeriod:', selectedPeriod);

  return (
    <div className="dashboard-grid">
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

      <div className="left-panel">
        <CountrySearch 
          onSearchChange={handleSearchChange} 
          resultsCount={0}
        />

        <StatsCard 
          label={selectedCountry ? `${selectedCountry} - Total Confirmed` : "Total Confirmed"}
          type="cases"
          period={queryParam}
          selectedCountry={selectedCountry}
          selectedCountryData={selectedCountryStats}
          globalStats={globalStats}
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
              period={queryParam}
              selectedCountry={selectedCountry}
              selectedCountryData={selectedCountryStats}
              globalStats={globalStats}
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

          <div className="right-stat-panel">
            <StatsCard 
              label={selectedCountry ? `${selectedCountry} - Total Recovered` : "Total Recovered"}
              type="recovered"
              period={queryParam}
              selectedCountry={selectedCountry}
              selectedCountryData={selectedCountryStats}
              globalStats={globalStats}
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