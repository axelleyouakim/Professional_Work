import { useMemo } from 'react';
import { useAllTimeSeriesData } from './useCovidData';

/**
 * ✅ PRE-CALCULE TOUTES LES DONNÉES POUR TOUTES LES DATES
 * Une seule fois au chargement - Ensuite lookup instantané
 */
export const usePreCalculatedData = () => {
  const allTimeSeriesData = useAllTimeSeriesData();

  // ✅ PRE-CALCUL UNIQUE : Crée un index de TOUTES les dates
  const preCalculatedIndex = useMemo(() => {
    if (!allTimeSeriesData.data?.countries || !allTimeSeriesData.data?.dates) {
      return null;
    }

    console.log('🔥 [PRE-CALC] Starting pre-calculation for ALL dates...');
    const startTime = performance.now();

    const { countries, dates } = allTimeSeriesData.data;
    const index = {};

    // Pour chaque date, calculer les données
    dates.forEach(date => {
      const casesPerCountry = [];
      const deathsPerCountry = [];
      const recoveredPerCountry = [];
      
      let totalCases = 0;
      let totalDeaths = 0;
      let totalRecovered = 0;

      Object.keys(countries).forEach(country => {
        const cases = countries[country].cases[date] || 0;
        const deaths = countries[country].deaths[date] || 0;
        const recovered = countries[country].recovered[date] || 0;

        if (cases > 0) {
          casesPerCountry.push({ country, total_cases: cases });
          totalCases += cases;
        }

        if (deaths > 0) {
          deathsPerCountry.push({ country, total_deaths: deaths });
          totalDeaths += deaths;
        }

        if (recovered > 0) {
          recoveredPerCountry.push({ country, total_recovered: recovered });
          totalRecovered += recovered;
        }
      });

      // Trier
      casesPerCountry.sort((a, b) => b.total_cases - a.total_cases);
      deathsPerCountry.sort((a, b) => b.total_deaths - a.total_deaths);
      recoveredPerCountry.sort((a, b) => b.total_recovered - a.total_recovered);

      // Stocker dans l'index
      index[date] = {
        casesPerCountry,
        deathsPerCountry,
        recoveredPerCountry,
        totalCases,
        totalDeaths,
        totalRecovered
      };
    });

    const endTime = performance.now();
    console.log(`✅ [PRE-CALC] Pre-calculated ${dates.length} dates in ${(endTime - startTime).toFixed(0)}ms`);
    console.log(`📊 [PRE-CALC] Index size: ${Object.keys(index).length} dates ready for instant lookup`);

    return {
      index,
      countries,
      dates,
      isReady: true
    };
  }, [allTimeSeriesData.data]);

  return {
    preCalculatedIndex,
    isLoading: allTimeSeriesData.isLoading,
    error: allTimeSeriesData.error,
    rawData: allTimeSeriesData.data
  };
};