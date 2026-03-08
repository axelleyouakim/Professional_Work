import { useState, useEffect, useRef } from 'react';
import { useAllTimeSeriesData } from './useCovidData';

// ─── Nettoyage des noms de pays JHU ──────────────────────────────────────────
const COUNTRY_FIXED = {
  "Cote d'Ivoire":         "Côte d'Ivoire",
  'Sao Tome and Principe': 'São Tomé and Príncipe',
  'Cabo Verde':            'Cape Verde',
  'Timor-Leste':           'East Timor',
  'Burma':                 'Myanmar',
  'Holy See':              'Vatican City',
  'United Arab Emirates':  'UAE',
  'MS Zaandam':            'MS Zaandam (ship)',
  'Diamond Princess':      'Diamond Princess (ship)',
  'Korea, South':          'Korea, South',  // ← AJOUTER
  'Korea, North':          'Korea, North',  // ← AJOUTER
};
const DIRECTIONS = new Set(['North', 'South', 'East', 'West']);
const cleanName = (name) => {
  if (!name) return name;
  name = name.trim();
  while (name.length > 0 && (name[0] === '"' || name[0] === "'")) name = name.slice(1).trim();
  while (name.length > 0 && (name[name.length-1] === '"' || name[name.length-1] === "'")) name = name.slice(0,-1).trim();
  name = name.replace(/\*+$/, '').trim();
  if (COUNTRY_FIXED[name]) return COUNTRY_FIXED[name]; // ← VÉRIFIER EN PREMIER
  if (name.includes(',')) {
    const commaIdx = name.indexOf(',');
    const base   = name.slice(0, commaIdx).trim();
    const suffix = name.slice(commaIdx + 1).trim();
    if (DIRECTIONS.has(suffix)) return suffix + ' ' + base;
  }
  return name;
};

// Renomme toutes les clés du dict countries en une seule passe
const renameCountries = (countries) => {
  const result = {};
  for (const [key, value] of Object.entries(countries)) {
    const clean = cleanName(key);
    if (result[clean]) {
      // Fusionner si deux noms bruts donnent le même nom propre
      for (const date of Object.keys(value.cases)) {
        result[clean].cases[date]     = (result[clean].cases[date]     || 0) + (value.cases[date]     || 0);
        result[clean].deaths[date]    = (result[clean].deaths[date]    || 0) + (value.deaths[date]    || 0);
        result[clean].recovered[date] = (result[clean].recovered[date] || 0) + (value.recovered[date] || 0);
      }
    } else {
      result[clean] = value;
    }
  }
  return result;
};
// ─────────────────────────────────────────────────────────────────────────────

const precalcAsync = (countries, dates) => new Promise((resolve) => {
  const countryNames = Object.keys(countries);
  const totalsIndex  = {};
  const sortedIndex  = {};
  const CHUNK = 50;
  let i = 0;

  const processChunk = () => {
    const end = Math.min(i + CHUNK, dates.length);
    for (; i < end; i++) {
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

    if (i < dates.length) {
      setTimeout(processChunk, 0);
    } else {
      const globalChartFull = [];
      const dateToGlobalChartIdx = {};
      let ci = 0;
      for (let k = 0; k < dates.length; k++) {
        if (k % 7 === 0 || k === dates.length - 1) {
          globalChartFull.push({ date: dates[k], cases: totalsIndex[dates[k]].totalCases });
          dateToGlobalChartIdx[dates[k]] = ci++;
        } else {
          dateToGlobalChartIdx[dates[k]] = ci - 1;
        }
      }

      const countryChartFull = {};
      for (let j = 0; j < countryNames.length; j++) {
        const country = countryNames[j];
        const c = countries[country];
        const arr = [];
        for (let k = 0; k < dates.length; k++) {
          if (k % 7 === 0 || k === dates.length - 1)
            arr.push({ date: dates[k], cases: c.cases[dates[k]] || 0 });
        }
        countryChartFull[country] = arr;
      }

      const countryLookup = {};
      for (let j = 0; j < countryNames.length; j++)
        countryLookup[countryNames[j].toLowerCase()] = countryNames[j];

      resolve({
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
      });
    }
  };

  processChunk();
});

export const usePreCalculatedData = () => {
  const allTimeSeriesData = useAllTimeSeriesData();
  const [preCalculatedIndex, setPreCalculatedIndex] = useState(null);
  const [isCalcDone, setIsCalcDone]                 = useState(false);
  const calcStartedRef = useRef(false);

  useEffect(() => {
    if (!allTimeSeriesData.data?.countries || !allTimeSeriesData.data?.dates) return;
    if (calcStartedRef.current) return;
    calcStartedRef.current = true;

    const t0 = performance.now();
    console.log('🔥 [PRE-CALC] Starting async precalculation...');

    // ✅ Nettoyer les noms ici, avant le précalcul — garanti peu importe le cache backend
    const cleanedCountries = renameCountries(allTimeSeriesData.data.countries);

    precalcAsync(cleanedCountries, allTimeSeriesData.data.dates)
      .then((result) => {
        console.log(`✅ [PRE-CALC] Done in ${(performance.now() - t0).toFixed(0)}ms`);
        setPreCalculatedIndex(result);
        setIsCalcDone(true);
      });
  }, [allTimeSeriesData.data]);

  return {
    preCalculatedIndex,
    isLoading: allTimeSeriesData.isLoading && !allTimeSeriesData.data,
    isCalcDone,
    error: allTimeSeriesData.error,
  };
};