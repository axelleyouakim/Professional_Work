import { useMemo } from 'react';
import { useAllTimeSeriesData } from './useCovidData';

/**
 * INDEX LÉGER — ne stocke que les totaux par date
 * Pas de tri, pas de tableaux : juste { date → { totalCases, totalDeaths, totalRecovered } }
 * 
 * Avant : 1200 dates × 190 pays × 3 sorts = ~700 000 ops → bloque l'UI
 * Après  : 1200 × 190 additions = ~230 000 ops → ~15ms, invisible
 * 
 * Le tri et la construction des arrays se fait UNIQUEMENT à la date demandée
 * (une seule fois par changement de date, pas 1200 fois au démarrage)
 */
export const usePreCalculatedData = () => {
  const allTimeSeriesData = useAllTimeSeriesData();

  const preCalculatedIndex = useMemo(() => {
    if (!allTimeSeriesData.data?.countries || !allTimeSeriesData.data?.dates) {
      return null;
    }

    const t0 = performance.now();
    const { countries, dates } = allTimeSeriesData.data;
    const countryNames = Object.keys(countries);

    // ─── Index léger : seulement les totaux globaux par date ─────────────────
    // Ne stocke PAS les arrays par pays → 10x moins de mémoire et 10x plus rapide
    const totalsIndex = {};

    dates.forEach(date => {
      let totalCases     = 0;
      let totalDeaths    = 0;
      let totalRecovered = 0;

      for (let i = 0; i < countryNames.length; i++) {
        const c = countries[countryNames[i]];
        totalCases     += c.cases[date]     || 0;
        totalDeaths    += c.deaths[date]    || 0;
        totalRecovered += c.recovered[date] || 0;
      }

      totalsIndex[date] = { totalCases, totalDeaths, totalRecovered };
    });

    console.log(`✅ [PRE-CALC] Light index: ${dates.length} dates in ${(performance.now() - t0).toFixed(0)}ms`);

    return {
      totalsIndex,   // { date → { totalCases, totalDeaths, totalRecovered } }
      countries,     // données brutes par pays
      dates,
      countryNames,
      isReady: true,
    };
  }, [allTimeSeriesData.data]);

  // ─── getDataForDate : construit les arrays triés UNIQUEMENT à la demande ───
  // Appelé une seule fois par changement de date (pas 1200 fois au démarrage)
  const getDataForDate = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return null;

    const { totalsIndex, countries, countryNames, dates } = preCalculatedIndex;

    return (targetDate) => {
      const date = targetDate || dates[dates.length - 1];
      const totals = totalsIndex[date];

      if (!totals) {
        return {
          casesPerCountry: [], deathsPerCountry: [], recoveredPerCountry: [],
          totalCases: 0, totalDeaths: 0, totalRecovered: 0,
        };
      }

      // Construction des arrays + tri : ~190 itérations, imperceptible
      const casesArr     = [];
      const deathsArr    = [];
      const recoveredArr = [];

      for (let i = 0; i < countryNames.length; i++) {
        const country = countryNames[i];
        const c       = countries[country];

        const cases     = c.cases[date]     || 0;
        const deaths    = c.deaths[date]    || 0;
        const recovered = c.recovered[date] || 0;

        if (cases     > 0) casesArr.push({ country, total_cases: cases });
        if (deaths    > 0) deathsArr.push({ country, total_deaths: deaths });
        if (recovered > 0) recoveredArr.push({ country, total_recovered: recovered });
      }

      casesArr.sort((a, b)     => b.total_cases     - a.total_cases);
      deathsArr.sort((a, b)    => b.total_deaths    - a.total_deaths);
      recoveredArr.sort((a, b) => b.total_recovered - a.total_recovered);

      return {
        casesPerCountry:     casesArr,
        deathsPerCountry:    deathsArr,
        recoveredPerCountry: recoveredArr,
        totalCases:          totals.totalCases,
        totalDeaths:         totals.totalDeaths,
        totalRecovered:      totals.totalRecovered,
      };
    };
  }, [preCalculatedIndex]);

  return {
    preCalculatedIndex,
    getDataForDate,
    isLoading: allTimeSeriesData.isLoading,
    error:     allTimeSeriesData.error,
    rawData:   allTimeSeriesData.data,
  };
};