import { useMemo } from 'react';
import { useAllTimeSeriesData } from './useCovidData';

export const usePreCalculatedData = () => {
  const allTimeSeriesData = useAllTimeSeriesData();

  const preCalculatedIndex = useMemo(() => {
    if (!allTimeSeriesData.data?.countries || !allTimeSeriesData.data?.dates) return null;

    const t0 = performance.now();
    const { countries, dates } = allTimeSeriesData.data;
    const countryNames = Object.keys(countries);

    const totalsIndex = {};
    const sortedIndex = {};

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      let totalCases = 0, totalDeaths = 0, totalRecovered = 0;
      const casesArr = [], deathsArr = [], recoveredArr = [];

      for (let j = 0; j < countryNames.length; j++) {
        const country = countryNames[j];
        const c = countries[country];
        const cases     = c.cases[date]     || 0;
        const deaths    = c.deaths[date]    || 0;
        const recovered = c.recovered[date] || 0;

        totalCases     += cases;
        totalDeaths    += deaths;
        totalRecovered += recovered;

        if (cases     > 0) casesArr.push({ country, total_cases: cases });
        if (deaths    > 0) deathsArr.push({ country, total_deaths: deaths });
        if (recovered > 0) recoveredArr.push({ country, total_recovered: recovered });
      }

      casesArr.sort((a, b)     => b.total_cases     - a.total_cases);
      deathsArr.sort((a, b)    => b.total_deaths    - a.total_deaths);
      recoveredArr.sort((a, b) => b.total_recovered - a.total_recovered);

      totalsIndex[date] = { totalCases, totalDeaths, totalRecovered };
      sortedIndex[date] = {
        casesPerCountry:     casesArr,
        deathsPerCountry:    deathsArr,
        recoveredPerCountry: recoveredArr,
      };
    }

    // Chart global 1pt/7j
    const globalChartFull = [];
    for (let i = 0; i < dates.length; i++) {
      if (i % 7 === 0 || i === dates.length - 1)
        globalChartFull.push({ date: dates[i], cases: totalsIndex[dates[i]].totalCases });
    }

    const dateToGlobalChartIdx = {};
    let ci = 0;
    for (let i = 0; i < dates.length; i++) {
      if (i % 7 === 0 || i === dates.length - 1) { dateToGlobalChartIdx[dates[i]] = ci; ci++; }
      else { dateToGlobalChartIdx[dates[i]] = ci - 1; }
    }

    // Chart par pays 1pt/7j
    const countryChartFull = {};
    for (let j = 0; j < countryNames.length; j++) {
      const country = countryNames[j];
      const c = countries[country];
      const arr = [];
      for (let i = 0; i < dates.length; i++) {
        if (i % 7 === 0 || i === dates.length - 1)
          arr.push({ date: dates[i], cases: c.cases[dates[i]] || 0 });
      }
      countryChartFull[country] = arr;
    }

    // Lookup insensible à la casse : "us" → "US", "united states of america" → "US"
    const countryLookup = {};
    for (let j = 0; j < countryNames.length; j++) {
      countryLookup[countryNames[j].toLowerCase()] = countryNames[j];
    }

    console.log(`✅ [PRE-CALC] ${dates.length} dates × ${countryNames.length} pays en ${(performance.now() - t0).toFixed(0)}ms`);

    return {
      totalsIndex,
      sortedIndex,
      globalChartFull,
      dateToGlobalChartIdx,
      countryChartFull,
      countryLookup,
      countries,
      dates,
      countryNames,
      isReady: true,
    };
  }, [allTimeSeriesData.data]);

  return {
    preCalculatedIndex,
    isLoading: allTimeSeriesData.isLoading,
    error:     allTimeSeriesData.error,
  };
};