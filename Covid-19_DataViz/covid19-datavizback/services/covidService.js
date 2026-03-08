import CovidData from '../models/CovidData.js';
import fetch from 'node-fetch';
import { kmeans } from 'ml-kmeans';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// ─── Nettoyage des noms de pays JHU ─────────────────────────────────────────
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
  'Korea, South':          'Korea, South',
  'Korea, North':          'Korea, North',
};
const DIRECTIONS = new Set(['North', 'South', 'East', 'West']);
const cleanName = (name) => {
  if (!name) return name;
  name = name.trim().replace(/\*+$/, '');
  while (name.length > 0 && (name[0] === '"' || name[0] === "'")) name = name.slice(1).trim();
  while (name.length > 0 && (name[name.length-1] === '"' || name[name.length-1] === "'")) name = name.slice(0,-1).trim();
  name = name.replace(/\*+$/, '').trim();
  if (COUNTRY_FIXED[name]) return COUNTRY_FIXED[name];
  if (name.includes(',')) {
    const [base, suffix] = name.split(',', 2).map(s => s.trim());
    if (DIRECTIONS.has(suffix)) return `${suffix} ${base}`;
  }
  return name;
};
// ─────────────────────────────────────────────────────────────────────────────

async function loadCleanedData(filename) {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'cleaned', filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading ${filename}:`, error.message);
    return null;
  }
}

async function fetchGitHubCSV(type) {
  const urls = {
    confirmed: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv',
    deaths: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv',
    recovered: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv',
    vaccine: 'https://raw.githubusercontent.com/govex/COVID-19/master/data_tables/vaccine_data/global_data/time_series_covid19_vaccine_global.csv'
  };
  const response = await fetch(urls[type]);
  if (!response.ok) throw new AppError(`Failed to fetch ${type} data from GitHub`, 502);
  return await response.text();
}

function getDateColumnsForPeriod(header, period) {
  if (!period) return { startIndex: 4, endIndex: header.length - 1 };
  const periodDays = parseInt(period);
  if (isNaN(periodDays)) return { startIndex: 4, endIndex: header.length - 1 };
  const endIndex = header.length - 1;
  const startIndex = Math.max(4, endIndex - periodDays);
  console.log(`📅 Filtering by period: ${periodDays} days (columns ${startIndex} to ${endIndex})`);
  return { startIndex, endIndex };
}

export const covidService = {
  getAllCovidData: async () => {
    try { return await CovidData.find({}); }
    catch (error) { throw new AppError('Failed to fetch COVID data', 500); }
  },

  getCountries: async () => {
    try { return await CovidData.distinct("Country_Region"); }
    catch (error) { throw new AppError('Failed to fetch countries', 500); }
  },

  getDeathByCountry: async (country) => {
    try {
      return await CovidData.aggregate([
        { $match: { Country_Region: country } },
        { $group: { _id: "$Country_Region", total_deaths: { $max: "$Deaths" } } }
      ]);
    } catch (error) { throw new AppError(`Failed to fetch deaths for ${country}`, 500); }
  },

  getTotalCases: async (period) => {
    try {
      const cleanedData = await loadCleanedData('merged_statistics.json');
      if (!period && cleanedData) return { total_cases: cleanedData.globalStats.totalCases, latest_date: cleanedData.lastUpdated };
      const data = await fetchGitHubCSV('confirmed');
      const rows = data.split('\n');
      const header = parseCSVLine(rows[0]);
      const endIndex = header.length - 1;
      const periodDays = parseInt(period);
      const targetIndex = Math.max(4, endIndex - periodDays);
      const targetDate = header[targetIndex];
      console.log(`📊 [getTotalCases] Period: ${periodDays} days, Target date: ${targetDate}, Column: ${targetIndex}/${endIndex}`);
      let globalTotal = 0, countriesProcessed = 0;
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const columns = parseCSVLine(rows[i]);
        if (targetIndex >= columns.length) continue;
        const casesAtDate = parseInt(columns[targetIndex], 10) || 0;
        if (casesAtDate > 0) { globalTotal += casesAtDate; countriesProcessed++; }
      }
      console.log(`📊 [getTotalCases] Total: ${globalTotal.toLocaleString()}, Countries: ${countriesProcessed}`);
      return { total_cases: globalTotal, reference_date: targetDate, period_days: periodDays, countries_count: countriesProcessed };
    } catch (error) {
      console.error('❌ [getTotalCases] Error:', error);
      throw new AppError('Failed to fetch total cases', 500);
    }
  },

  getTotalDeaths: async (period) => {
    try {
      const cleanedData = await loadCleanedData('merged_statistics.json');
      if (!period && cleanedData) return { total_deaths: cleanedData.globalStats.totalDeaths, latest_date: cleanedData.lastUpdated };
      const data = await fetchGitHubCSV('deaths');
      const rows = data.split('\n');
      const header = parseCSVLine(rows[0]);
      const endIndex = header.length - 1;
      const periodDays = parseInt(period);
      const targetIndex = Math.max(4, endIndex - periodDays);
      const targetDate = header[targetIndex];
      let globalTotalDeaths = 0, countriesProcessed = 0;
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const columns = parseCSVLine(rows[i]);
        if (targetIndex >= columns.length) continue;
        const deathsAtDate = parseInt(columns[targetIndex], 10) || 0;
        if (deathsAtDate > 0) { globalTotalDeaths += deathsAtDate; countriesProcessed++; }
      }
      console.log(`📊 [getTotalDeaths] Total: ${globalTotalDeaths.toLocaleString()}, Countries: ${countriesProcessed}`);
      return { total_deaths: globalTotalDeaths, reference_date: targetDate, period_days: periodDays };
    } catch (error) {
      console.error('❌ [getTotalDeaths] Error:', error);
      throw new AppError('Failed to fetch total deaths', 500);
    }
  },

  getTotalRecovered: async (period) => {
    try {
      const cleanedData = await loadCleanedData('merged_statistics.json');
      if (cleanedData) {
        console.log('📊 [getTotalRecovered] Using cleaned data (Recovered stopped in Aug 2021)');
        return { total_recovered: cleanedData.globalStats.totalRecovered, latest_date: cleanedData.lastUpdated, note: 'Recovered data collection ended in August 2021' };
      }
      const data = await fetchGitHubCSV('recovered');
      const rows = data.split('\n');
      let globalTotalRecovered = 0;
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const columns = parseCSVLine(rows[i]);
        globalTotalRecovered += Math.max(...columns.slice(4).map(val => parseInt(val, 10) || 0));
      }
      return { total_recovered: globalTotalRecovered, note: 'Recovered data collection ended in August 2021' };
    } catch (error) {
      console.error('❌ [getTotalRecovered] Error:', error);
      throw new AppError('Failed to fetch total recovered', 500);
    }
  },

  getAllCountryAndDeath: async () => {
    try { return await CovidData.aggregate([{ $group: { _id: "$Country_Region", total_deaths: { $max: "$Deaths" } } }]); }
    catch (error) { throw new AppError('Failed to fetch countries and deaths', 500); }
  },

  getCountryDeathAndCases: async () => {
    try {
      return await CovidData.aggregate([
        { $group: { _id: "$Country_Region", total_deaths: { $max: "$Deaths" }, total_confirmed: { $max: "$Confirmed" } } }
      ]);
    } catch (error) { throw new AppError('Failed to fetch country deaths and cases', 500); }
  },

  getTotalCasesPerCountry: async (period) => {
    try {
      const cleanedData = await loadCleanedData('confirmed_cases_cleaned.json');
      if (!period && cleanedData) {
        return {
          data: cleanedData.data.map(c => ({ country: cleanName(c.country), total_cases: c.totalCases })),
          latest_date: cleanedData.dateRange.end
        };
      }
      const data = await fetchGitHubCSV('confirmed');
      const rows = data.split('\n');
      const header = parseCSVLine(rows[0]);
      const endIndex = header.length - 1;
      const periodDays = parseInt(period);
      const targetIndex = Math.max(4, endIndex - periodDays);
      const targetDate = header[targetIndex];
      console.log(`📊 [getTotalCasesPerCountry] Period: ${periodDays} days, Column: ${targetIndex}/${endIndex}`);
      const countryCases = {};
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const columns = parseCSVLine(rows[i]);
        if (targetIndex >= columns.length) continue;
        const country = cleanName(columns[1]?.trim());
        if (!country) continue;
        const casesAtDate = parseInt(columns[targetIndex], 10) || 0;
        if (casesAtDate > 0) countryCases[country] = (countryCases[country] || 0) + casesAtDate;
      }
      const formattedResult = Object.entries(countryCases)
        .map(([country, total_cases]) => ({ country, total_cases }))
        .filter(c => c.total_cases > 0)
        .sort((a, b) => b.total_cases - a.total_cases);
      console.log(`📊 [getTotalCasesPerCountry] Countries: ${formattedResult.length}`);
      return { data: formattedResult, reference_date: targetDate, period_days: periodDays };
    } catch (error) {
      console.error('❌ [getTotalCasesPerCountry] Error:', error);
      throw new AppError('Failed to fetch cases per country', 500);
    }
  },

  getTotalDeathsPerCountry: async (period) => {
    try {
      const cleanedData = await loadCleanedData('deaths_cleaned.json');
      if (!period && cleanedData) {
        return {
          data: cleanedData.data.map(c => ({ country: cleanName(c.country), total_deaths: c.totalDeaths })),
          latest_date: cleanedData.dateRange.end
        };
      }
      const data = await fetchGitHubCSV('deaths');
      const rows = data.split('\n');
      const header = parseCSVLine(rows[0]);
      const endIndex = header.length - 1;
      const periodDays = parseInt(period);
      const targetIndex = Math.max(4, endIndex - periodDays);
      const targetDate = header[targetIndex];
      const countryDeaths = {};
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const columns = parseCSVLine(rows[i]);
        if (targetIndex >= columns.length) continue;
        const country = cleanName(columns[1]?.trim());
        if (!country) continue;
        const deathsAtDate = parseInt(columns[targetIndex], 10) || 0;
        if (deathsAtDate > 0) countryDeaths[country] = (countryDeaths[country] || 0) + deathsAtDate;
      }
      return {
        data: Object.entries(countryDeaths).map(([country, total_deaths]) => ({ country, total_deaths })).filter(c => c.total_deaths > 0).sort((a, b) => b.total_deaths - a.total_deaths),
        reference_date: targetDate, period_days: periodDays
      };
    } catch (error) {
      console.error('❌ [getTotalDeathsPerCountry] Error:', error);
      throw new AppError('Failed to fetch deaths per country', 500);
    }
  },

  getTotalRecoveredPerCountry: async (period) => {
    try {
      const cleanedData = await loadCleanedData('recovered_cleaned.json');
      if (cleanedData) {
        return {
          data: cleanedData.data.map(c => ({ country: cleanName(c.country), total_recovered: c.totalRecovered })),
          latest_date: cleanedData.dateRange.end,
          note: 'Recovered data collection ended in August 2021'
        };
      }
      const data = await fetchGitHubCSV('recovered');
      const rows = data.split('\n');
      const countryRecovered = {};
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const columns = parseCSVLine(rows[i]);
        const country = cleanName(columns[1]?.trim());
        if (!country) continue;
        const maxRecovered = Math.max(...columns.slice(4).map(val => parseInt(val, 10) || 0));
        if (maxRecovered > 0) countryRecovered[country] = (countryRecovered[country] || 0) + maxRecovered;
      }
      return {
        data: Object.entries(countryRecovered).map(([country, total_recovered]) => ({ country, total_recovered })).filter(c => c.total_recovered > 0).sort((a, b) => b.total_recovered - a.total_recovered),
        note: 'Recovered data collection ended in August 2021'
      };
    } catch (error) {
      console.error('❌ [getTotalRecoveredPerCountry] Error:', error);
      throw new AppError('Failed to fetch recovered per country', 500);
    }
  },

  getCasesTimeSeries: async (period) => {
    try {
      const cleanedData = await loadCleanedData('confirmed_cases_cleaned.json');
      let timeSeriesData;
      if (!cleanedData) {
        const data = await fetchGitHubCSV('confirmed');
        const rows = data.split('\n').filter(row => row.trim() !== '');
        const header = parseCSVLine(rows[0]);
        const dateColumns = header.slice(4);
        timeSeriesData = dateColumns.map(date => ({ date: date.trim(), cases: 0 }));
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row.trim()) continue;
          const columns = parseCSVLine(row);
          for (let j = 4; j < columns.length && j - 4 < timeSeriesData.length; j++) {
            const cases = parseInt(columns[j], 10);
            if (!isNaN(cases)) timeSeriesData[j - 4].cases += cases;
          }
        }
      } else {
        const dateColumns = Object.keys(cleanedData.data[0].timeSeries);
        timeSeriesData = dateColumns.map(date => {
          let totalCases = 0;
          cleanedData.data.forEach(country => { totalCases += country.timeSeries[date] || 0; });
          return { date, cases: totalCases };
        });
      }
      const parsedData = timeSeriesData.map(item => {
        const parts = item.date.split("/");
        let dateObj;
        if (parts.length === 3) {
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          dateObj = new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
        } else { dateObj = new Date(item.date); }
        return { date: item.date, cases: item.cases, dateObj };
      }).filter(item => !isNaN(item.dateObj.getTime())).sort((a, b) => a.dateObj - b.dateObj);
      let filteredData = parsedData;
      if (period && !isNaN(period)) {
        const periodDays = parseInt(period);
        const latestDate = parsedData[parsedData.length - 1].dateObj;
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - periodDays);
        filteredData = parsedData.filter(item => item.dateObj >= startDate);
      }
      const lastDataPoint = filteredData[filteredData.length - 1];
      const lastDate = lastDataPoint ? lastDataPoint.dateObj : null;
      const formattedLastDate = lastDate ? `${lastDate.getMonth() + 1}/${lastDate.getDate()}/${lastDate.getFullYear()}` : null;
      const finalData = filteredData.map(({ dateObj, ...rest }) => rest);
      return { data: finalData, metadata: { lastDate: formattedLastDate, totalPoints: finalData.length, period: period ? parseInt(period) : null } };
    } catch (error) { throw new AppError('Failed to fetch cases time series', 500); }
  },

  getCasesTimeSeriesByCountry: async (country, period) => {
    try {
      const cleanedData = await loadCleanedData('confirmed_cases_cleaned.json');
      let countryTimeSeries = [];
      if (cleanedData) {
        const countryData = cleanedData.data.find(c => c.country.toLowerCase() === country.toLowerCase());
        if (!countryData) throw new AppError(`Country "${country}" not found`, 404);
        countryTimeSeries = Object.entries(countryData.timeSeries).map(([date, cases]) => ({ date, cases: cases || 0 }));
        console.log(`📊 [getCasesTimeSeriesByCountry] Found ${countryTimeSeries.length} data points for ${country}`);
      } else {
        const data = await fetchGitHubCSV('confirmed');
        const rows = data.split('\n').filter(row => row.trim() !== '');
        const header = parseCSVLine(rows[0]);
        const dateColumns = header.slice(4);
        const countryRows = [];
        for (let i = 1; i < rows.length; i++) {
          const columns = parseCSVLine(rows[i]);
          const rowCountry = columns[1]?.trim();
          if (rowCountry && rowCountry.toLowerCase() === country.toLowerCase()) countryRows.push(columns);
        }
        if (countryRows.length === 0) throw new AppError(`Country "${country}" not found`, 404);
        countryTimeSeries = dateColumns.map((date, idx) => {
          let totalCases = 0;
          countryRows.forEach(columns => {
            const cases = parseInt(columns[4 + idx], 10);
            if (!isNaN(cases)) totalCases += cases;
          });
          return { date: date.trim(), cases: totalCases };
        });
      }
      const parsedData = countryTimeSeries.map(item => {
        const parts = item.date.split("/");
        let dateObj;
        if (parts.length === 3) {
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          dateObj = new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
        } else { dateObj = new Date(item.date); }
        return { date: item.date, cases: item.cases, dateObj };
      }).filter(item => !isNaN(item.dateObj.getTime())).sort((a, b) => a.dateObj - b.dateObj);
      let filteredData = parsedData;
      if (period && !isNaN(period)) {
        const periodDays = parseInt(period);
        const latestDate = parsedData[parsedData.length - 1].dateObj;
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - periodDays);
        filteredData = parsedData.filter(item => item.dateObj >= startDate);
      }
      const lastDataPoint = filteredData[filteredData.length - 1];
      const lastDate = lastDataPoint ? lastDataPoint.dateObj : null;
      const formattedLastDate = lastDate ? `${lastDate.getMonth() + 1}/${lastDate.getDate()}/${lastDate.getFullYear()}` : null;
      const finalData = filteredData.map(({ dateObj, ...rest }) => rest);
      return { data: finalData, metadata: { country, lastDate: formattedLastDate, totalPoints: finalData.length, period: period ? parseInt(period) : null } };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('❌ [getCasesTimeSeriesByCountry] Error:', error);
      throw new AppError(`Failed to fetch time series for ${country}`, 500);
    }
  },

  getAvailableDateRange: async () => {
    try {
      const data = await fetchGitHubCSV('confirmed');
      const rows = data.split('\n');
      const header = parseCSVLine(rows[0]);
      const dateColumns = header.slice(4);
      if (dateColumns.length === 0) throw new AppError('No date columns found', 500);
      const firstDate = dateColumns[0].trim();
      const lastDate = dateColumns[dateColumns.length - 1].trim();
      console.log(`📅 Available dates: ${firstDate} → ${lastDate} (${dateColumns.length} days)`);
      return { firstDate, lastDate, totalDays: dateColumns.length, allDates: dateColumns.map(d => d.trim()) };
    } catch (error) {
      console.error('❌ [getAvailableDateRange] Error:', error);
      throw new AppError('Failed to fetch date range', 500);
    }
  },

  getAllTimeSeriesData: async () => {
    try {
      console.log('📊 [getAllTimeSeriesData] Loading ALL time-series data (cases, deaths, recovered)...');

      const confirmedData = await fetchGitHubCSV('confirmed');
      const deathsData    = await fetchGitHubCSV('deaths');
      const recoveredData = await fetchGitHubCSV('recovered');

      const confirmedRows = confirmedData.split('\n');
      const deathsRows    = deathsData.split('\n');
      const recoveredRows = recoveredData.split('\n');

      const confirmedHeader = parseCSVLine(confirmedRows[0]);
      const realDateColumns = confirmedHeader.slice(4);

      const preCovidDates = [];
      const startDate = new Date(2019, 10, 1);
      const firstRealDate = new Date(2020, 0, 22);
      let currentDate = new Date(startDate);
      while (currentDate < firstRealDate) {
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const year = currentDate.getFullYear() % 100;
        preCovidDates.push(`${month}/${day}/${year}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      console.log(`📅 Generated ${preCovidDates.length} pre-COVID dates (Nov 1 2019 → Jan 21 2020)`);

      const allDates = [...preCovidDates, ...realDateColumns.map(d => d.trim())];

      const countriesData = {};
      const allCountries = new Set();

      for (const rows of [confirmedRows, deathsRows, recoveredRows]) {
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue;
          const country = cleanName(parseCSVLine(rows[i])[1]?.trim());
          if (country) allCountries.add(country);
        }
      }

      console.log(`📊 Found ${allCountries.size} unique countries`);

      allCountries.forEach(country => {
        countriesData[country] = { cases: {}, deaths: {}, recovered: {} };
        preCovidDates.forEach(date => {
          countriesData[country].cases[date]     = 0;
          countriesData[country].deaths[date]    = 0;
          countriesData[country].recovered[date] = 0;
        });
      });

      console.log(`✅ Initialized ${allCountries.size} countries with 0 for pre-COVID dates`);

      for (let i = 1; i < confirmedRows.length; i++) {
        if (!confirmedRows[i].trim()) continue;
        const columns = parseCSVLine(confirmedRows[i]);
        const country = cleanName(columns[1]?.trim());
        if (!country || !countriesData[country]) continue;
        for (let j = 0; j < realDateColumns.length; j++) {
          const date = realDateColumns[j].trim();
          const cases = parseInt(columns[4 + j], 10) || 0;
          countriesData[country].cases[date] = (countriesData[country].cases[date] || 0) + cases;
        }
      }

      for (let i = 1; i < deathsRows.length; i++) {
        if (!deathsRows[i].trim()) continue;
        const columns = parseCSVLine(deathsRows[i]);
        const country = cleanName(columns[1]?.trim());
        if (!country || !countriesData[country]) continue;
        for (let j = 0; j < realDateColumns.length; j++) {
          const date = realDateColumns[j].trim();
          const deaths = parseInt(columns[4 + j], 10) || 0;
          countriesData[country].deaths[date] = (countriesData[country].deaths[date] || 0) + deaths;
        }
      }

      for (let i = 1; i < recoveredRows.length; i++) {
        if (!recoveredRows[i].trim()) continue;
        const columns = parseCSVLine(recoveredRows[i]);
        const country = cleanName(columns[1]?.trim());
        if (!country || !countriesData[country]) continue;
        for (let j = 0; j < realDateColumns.length; j++) {
          const date = realDateColumns[j].trim();
          const recovered = parseInt(columns[4 + j], 10) || 0;
          countriesData[country].recovered[date] = (countriesData[country].recovered[date] || 0) + recovered;
        }
      }

      console.log('📊 [getAllTimeSeriesData] Filling recovered gaps after Aug 2021...');

      Object.keys(countriesData).forEach(country => {
        const recoveredDates = Object.keys(countriesData[country].recovered)
          .filter(d => countriesData[country].recovered[d] > 0).sort();
        if (recoveredDates.length > 0) {
          const lastRecoveredDate  = recoveredDates[recoveredDates.length - 1];
          const lastRecoveredValue = countriesData[country].recovered[lastRecoveredDate];
          const lastRecoveredIndex = allDates.indexOf(lastRecoveredDate);
          if (lastRecoveredIndex !== -1) {
            for (let i = lastRecoveredIndex + 1; i < allDates.length; i++) {
              countriesData[country].recovered[allDates[i]] = lastRecoveredValue;
            }
          }
        }
      });

      console.log(`✅ Loaded time-series for ${Object.keys(countriesData).length} countries (cases, deaths, recovered)`);
      console.log(`📅 Total dates: ${allDates.length} (${preCovidDates.length} pre-COVID + ${realDateColumns.length} real data)`);
      console.log(`📊 Recovered: Last update ~Aug 2021, values repeated until ${allDates[allDates.length - 1]}`);

      return { countries: countriesData, dates: allDates, firstDate: allDates[0], lastDate: allDates[allDates.length - 1] };

    } catch (error) {
      console.error('❌ [getAllTimeSeriesData] Error:', error);
      throw new AppError('Failed to load all time-series data', 500);
    }
  },

  getDataAtSpecificDate: async (dateString) => {
    try {
      console.log(`📅 [getDataAtSpecificDate] Fetching data for: ${dateString}`);
      const data = await fetchGitHubCSV('confirmed');
      const rows = data.split('\n');
      const header = parseCSVLine(rows[0]);
      const dateIndex = header.findIndex(col => col.trim() === dateString);
      if (dateIndex === -1 || dateIndex < 4) throw new AppError(`Date ${dateString} not found in data`, 404);
      console.log(`📊 Found date at column ${dateIndex}`);
      const countryCases = {};
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const columns = parseCSVLine(rows[i]);
        const country = cleanName(columns[1]?.trim());
        if (!country) continue;
        const casesAtDate = parseInt(columns[dateIndex], 10) || 0;
        countryCases[country] = (countryCases[country] || 0) + casesAtDate;
      }
      const formattedResult = Object.entries(countryCases)
        .map(([country, total_cases]) => ({ country, total_cases }))
        .filter(c => c.total_cases > 0)
        .sort((a, b) => b.total_cases - a.total_cases);
      console.log(`📊 [getDataAtSpecificDate] Found ${formattedResult.length} countries with cases`);
      return { data: formattedResult, date: dateString, totalCountries: formattedResult.length };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('❌ [getDataAtSpecificDate] Error:', error);
      throw new AppError('Failed to fetch data at specific date', 500);
    }
  },

  getGlobalTotalsAtDate: async (dateString) => {
    try {
      console.log(`📅 [getGlobalTotalsAtDate] Fetching totals for: ${dateString}`);
      const confirmedData = await fetchGitHubCSV('confirmed');
      const deathsData    = await fetchGitHubCSV('deaths');
      const confirmedRows = confirmedData.split('\n');
      const deathsRows    = deathsData.split('\n');
      const confirmedHeader = parseCSVLine(confirmedRows[0]);
      const deathsHeader    = parseCSVLine(deathsRows[0]);
      const confirmedDateIndex = confirmedHeader.findIndex(col => col.trim() === dateString);
      const deathsDateIndex    = deathsHeader.findIndex(col => col.trim() === dateString);
      if (confirmedDateIndex === -1 || deathsDateIndex === -1) throw new AppError(`Date ${dateString} not found`, 404);
      let totalCases = 0, totalDeaths = 0;
      for (let i = 1; i < confirmedRows.length; i++) {
        if (!confirmedRows[i].trim()) continue;
        totalCases += parseInt(parseCSVLine(confirmedRows[i])[confirmedDateIndex], 10) || 0;
      }
      for (let i = 1; i < deathsRows.length; i++) {
        if (!deathsRows[i].trim()) continue;
        totalDeaths += parseInt(parseCSVLine(deathsRows[i])[deathsDateIndex], 10) || 0;
      }
      console.log(`📊 [getGlobalTotalsAtDate] Cases: ${totalCases.toLocaleString()}, Deaths: ${totalDeaths.toLocaleString()}`);
      return { total_cases: totalCases, total_deaths: totalDeaths, date: dateString };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('❌ [getGlobalTotalsAtDate] Error:', error);
      throw new AppError('Failed to fetch global totals at date', 500);
    }
  },
};