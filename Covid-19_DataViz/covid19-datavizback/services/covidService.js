import CovidData from '../models/CovidData.js';
import fetch from 'node-fetch';
import { kmeans } from 'ml-kmeans';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  if (!response.ok) {
    throw new AppError(`Failed to fetch ${type} data from GitHub`, 502);
  }
  return await response.text();
}

function getDateColumnsForPeriod(header, period) {
  if (!period) {
    // Pas de période = toutes les dates
    return { startIndex: 4, endIndex: header.length - 1 };
  }

  const periodDays = parseInt(period);
  if (isNaN(periodDays)) {
    return { startIndex: 4, endIndex: header.length - 1 };
  }

  const endIndex = header.length - 1;
  const startIndex = Math.max(4, endIndex - periodDays);

  console.log(`📅 Filtering by period: ${periodDays} days (columns ${startIndex} to ${endIndex})`);

  return { startIndex, endIndex };
}

export const covidService = {
  getAllCovidData: async () => {
    try {
      return await CovidData.find({});
    } catch (error) {
      throw new AppError('Failed to fetch COVID data', 500);
    }
  },

  getCountries: async () => {
    try {
      return await CovidData.distinct("Country_Region");
    } catch (error) {
      throw new AppError('Failed to fetch countries', 500);
    }
  },

  getDeathByCountry: async (country) => {
    try {
      const result = await CovidData.aggregate([
        { $match: { Country_Region: country } },
        { $group: { _id: "$Country_Region", total_deaths: { $max: "$Deaths" } } }
      ]);
      return result;
    } catch (error) {
      throw new AppError(`Failed to fetch deaths for ${country}`, 500);
    }
  },

  getTotalCases: async (period) => {
  try {
    const cleanedData = await loadCleanedData('merged_statistics.json');
    
    if (!period && cleanedData) {
      return {
        total_cases: cleanedData.globalStats.totalCases,
        latest_date: cleanedData.lastUpdated
      };
    }

    const data = await fetchGitHubCSV('confirmed');
    const rows = data.split('\n');
    const header = rows[0].split(',');
    
    const endIndex = header.length - 1;
    const periodDays = parseInt(period);
    
    const targetIndex = Math.max(4, endIndex - periodDays);
    const targetDate = header[targetIndex];

    console.log(`📊 [getTotalCases] Period: ${periodDays} days, Target date: ${targetDate}, Column: ${targetIndex}/${endIndex}`);

    let globalTotal = 0;
    let countriesProcessed = 0;
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      
      const columns = rows[i].split(',');
      
      // ✅ FIX : Vérifier que la colonne existe
      if (targetIndex >= columns.length) continue;
      
      const casesAtDate = parseInt(columns[targetIndex], 10) || 0;
      
      if (casesAtDate > 0) {
        globalTotal += casesAtDate;
        countriesProcessed++;
      }
    }

    console.log(`📊 [getTotalCases] Total: ${globalTotal.toLocaleString()}, Countries: ${countriesProcessed}`);

    return { 
      total_cases: globalTotal, 
      reference_date: targetDate,
      period_days: periodDays,
      countries_count: countriesProcessed
    };
  } catch (error) {
    console.error('❌ [getTotalCases] Error:', error);
    throw new AppError('Failed to fetch total cases', 500);
  }
},

  getTotalDeaths: async (period) => {
  try {
    const cleanedData = await loadCleanedData('merged_statistics.json');
    
    if (!period && cleanedData) {
      return {
        total_deaths: cleanedData.globalStats.totalDeaths,
        latest_date: cleanedData.lastUpdated
      };
    }

    const data = await fetchGitHubCSV('deaths');
    const rows = data.split('\n');
    const header = rows[0].split(',');
    
    const endIndex = header.length - 1;
    const periodDays = parseInt(period);
    const targetIndex = Math.max(4, endIndex - periodDays);
    const targetDate = header[targetIndex];

    let globalTotalDeaths = 0;
    let countriesProcessed = 0;

    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      
      const columns = rows[i].split(',');
      if (targetIndex >= columns.length) continue;
      
      const deathsAtDate = parseInt(columns[targetIndex], 10) || 0;
      
      if (deathsAtDate > 0) {
        globalTotalDeaths += deathsAtDate;
        countriesProcessed++;
      }
    }

    console.log(`📊 [getTotalDeaths] Total: ${globalTotalDeaths.toLocaleString()}, Countries: ${countriesProcessed}`);

    return { 
      total_deaths: globalTotalDeaths, 
      reference_date: targetDate,
      period_days: periodDays
    };
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
      return {
        total_recovered: cleanedData.globalStats.totalRecovered,
        latest_date: cleanedData.lastUpdated,
        note: 'Recovered data collection ended in August 2021'
      };
    }

    const data = await fetchGitHubCSV('recovered');
    const rows = data.split('\n');
    const header = rows[0].split(',');

    let globalTotalRecovered = 0;
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      const columns = rows[i].split(',');
      const recoveredValues = columns.slice(4).map(val => parseInt(val, 10) || 0);
      const maxRecovered = Math.max(...recoveredValues);
      globalTotalRecovered += maxRecovered;
    }

    return { 
      total_recovered: globalTotalRecovered,
      note: 'Recovered data collection ended in August 2021'
    };
  } catch (error) {
    console.error('❌ [getTotalRecovered] Error:', error);
    throw new AppError('Failed to fetch total recovered', 500);
  }
},

  getAllCountryAndDeath: async () => {
    try {
      return await CovidData.aggregate([
        { $group: { _id: "$Country_Region", total_deaths: { $max: "$Deaths" } } }
      ]);
    } catch (error) {
      throw new AppError('Failed to fetch countries and deaths', 500);
    }
  },

  getCountryDeathAndCases: async () => {
    try {
      return await CovidData.aggregate([
        { $group: {
            _id: "$Country_Region",
            total_deaths: { $max: "$Deaths" },
            total_confirmed: { $max: "$Confirmed" }
          }
        }
      ]);
    } catch (error) {
      throw new AppError('Failed to fetch country deaths and cases', 500);
    }
  },

  getTotalCasesPerCountry: async (period) => {
  try {
    const cleanedData = await loadCleanedData('confirmed_cases_cleaned.json');
    
    if (!period && cleanedData) {
      const formattedData = cleanedData.data.map(country => ({
        country: country.country,
        total_cases: country.totalCases
      }));

      return {
        data: formattedData,
        latest_date: cleanedData.dateRange.end
      };
    }

    const data = await fetchGitHubCSV('confirmed');
    const rows = data.split('\n');
    const header = rows[0].split(',');
    
    const endIndex = header.length - 1;
    const periodDays = parseInt(period);
    const targetIndex = Math.max(4, endIndex - periodDays);
    const targetDate = header[targetIndex];

    console.log(`📊 [getTotalCasesPerCountry] Period: ${periodDays} days, Column: ${targetIndex}/${endIndex}`);

    const countryCases = {};
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      
      const columns = rows[i].split(',');
      if (targetIndex >= columns.length) continue;
      
      const country = columns[1]?.trim();
      if (!country) continue;
      
      const casesAtDate = parseInt(columns[targetIndex], 10) || 0;

      if (casesAtDate > 0) {
        if (!countryCases[country]) {
          countryCases[country] = 0;
        }
        countryCases[country] += casesAtDate;
      }
    }

    const formattedResult = Object.keys(countryCases)
      .map(country => ({
        country: country,
        total_cases: countryCases[country],
      }))
      .filter(c => c.total_cases > 0)
      .sort((a, b) => b.total_cases - a.total_cases);

    console.log(`📊 [getTotalCasesPerCountry] Countries: ${formattedResult.length}`);

    return {
      data: formattedResult,
      reference_date: targetDate,
      period_days: periodDays
    };
  } catch (error) {
    console.error('❌ [getTotalCasesPerCountry] Error:', error);
    throw new AppError('Failed to fetch cases per country', 500);
  }
},

  getTotalDeathsPerCountry: async (period) => {
  try {
    const cleanedData = await loadCleanedData('deaths_cleaned.json');
    
    if (!period && cleanedData) {
      const formattedData = cleanedData.data.map(country => ({
        country: country.country,
        total_deaths: country.totalDeaths
      }));

      return {
        data: formattedData,
        latest_date: cleanedData.dateRange.end
      };
    }

    const data = await fetchGitHubCSV('deaths');
    const rows = data.split('\n');
    const header = rows[0].split(',');
    
    const endIndex = header.length - 1;
    const periodDays = parseInt(period);
    const targetIndex = Math.max(4, endIndex - periodDays);
    const targetDate = header[targetIndex];

    const countryDeaths = {};
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      
      const columns = rows[i].split(',');
      if (targetIndex >= columns.length) continue;
      
      const country = columns[1]?.trim();
      if (!country) continue;
      
      const deathsAtDate = parseInt(columns[targetIndex], 10) || 0;

      if (deathsAtDate > 0) {
        if (!countryDeaths[country]) {
          countryDeaths[country] = 0;
        }
        countryDeaths[country] += deathsAtDate;
      }
    }

    const formattedResult = Object.keys(countryDeaths)
      .map(country => ({
        country: country,
        total_deaths: countryDeaths[country],
      }))
      .filter(c => c.total_deaths > 0)
      .sort((a, b) => b.total_deaths - a.total_deaths);

    return {
      data: formattedResult,
      reference_date: targetDate,
      period_days: periodDays
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
      const formattedData = cleanedData.data.map(country => ({
        country: country.country,
        total_recovered: country.totalRecovered
      }));

      return {
        data: formattedData,
        latest_date: cleanedData.dateRange.end,
        note: 'Recovered data collection ended in August 2021'
      };
    }

    // Fallback
    const data = await fetchGitHubCSV('recovered');
    const rows = data.split('\n');
    const countryRecovered = {};
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      const columns = rows[i].split(',');
      const country = columns[1]?.trim();
      if (!country) continue;
      
      const recoveredValues = columns.slice(4).map(val => parseInt(val, 10) || 0);
      const maxRecovered = Math.max(...recoveredValues);

      if (maxRecovered > 0) {
        if (!countryRecovered[country]) {
          countryRecovered[country] = 0;
        }
        countryRecovered[country] += maxRecovered;
      }
    }

    const formattedResult = Object.keys(countryRecovered)
      .map(country => ({
        country: country,
        total_recovered: countryRecovered[country],
      }))
      .filter(c => c.total_recovered > 0)
      .sort((a, b) => b.total_recovered - a.total_recovered);

    return { 
      data: formattedResult,
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
        const header = rows[0].split(',');
        const dateColumns = header.slice(4);
      
        timeSeriesData = dateColumns.map(date => ({
          date: date.trim(),
          cases: 0
        }));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row.trim()) continue;
          const columns = row.split(',');
        
          for (let j = 4; j < columns.length && j - 4 < timeSeriesData.length; j++) {
            const cases = parseInt(columns[j], 10);
            if (!isNaN(cases)) {
              timeSeriesData[j - 4].cases += cases;
            }
          }
        }
      } else {
        const dateColumns = Object.keys(cleanedData.data[0].timeSeries);
        timeSeriesData = dateColumns.map(date => {
          let totalCases = 0;
          cleanedData.data.forEach(country => {
            totalCases += country.timeSeries[date] || 0;
          });
          return { date: date, cases: totalCases };
        });
      }

      const parsedData = timeSeriesData.map(item => {
        const parts = item.date.split("/");
        let dateObj;
      
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10);
          const day = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
        
          if (year < 100) {
            year += 2000;
          }
        
          dateObj = new Date(year, month - 1, day);
        } else {
          dateObj = new Date(item.date);
        }
      
        return {
          date: item.date,
          cases: item.cases,
          dateObj: dateObj
        };
      }).filter(item => !isNaN(item.dateObj.getTime()))
        .sort((a, b) => a.dateObj - b.dateObj);

      let filteredData = parsedData;
    
      if (period && !isNaN(period)) {
        const periodDays = parseInt(period);
      
        const latestDate = parsedData[parsedData.length - 1].dateObj;
      
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - periodDays);
      
        filteredData = parsedData.filter(item => item.dateObj >= startDate);
      
        console.log(`📅 Timeline filter: ${periodDays} days from ${startDate.toLocaleDateString()} to ${latestDate.toLocaleDateString()}`);
        console.log(`📊 Points: ${filteredData.length}`);
      }

      const lastDataPoint = filteredData[filteredData.length - 1];
      const lastDate = lastDataPoint ? lastDataPoint.dateObj : null;
    
      const formattedLastDate = lastDate 
        ? `${lastDate.getMonth() + 1}/${lastDate.getDate()}/${lastDate.getFullYear()}`
        : null;

      const finalData = filteredData.map(({ dateObj, ...rest }) => rest);

      return { 
        data: finalData,
        metadata: {
          lastDate: formattedLastDate,
          totalPoints: finalData.length,
          period: period ? parseInt(period) : null
        }
      };
    } catch (error) {
      throw new AppError('Failed to fetch cases time series', 500);
    }
  },

  // ✅ NOUVEAU - Time series par pays spécifique
  getCasesTimeSeriesByCountry: async (country, period) => {
    try {
      const cleanedData = await loadCleanedData('confirmed_cases_cleaned.json');
      
      let countryTimeSeries = [];
      
      if (cleanedData) {
        // Chercher le pays dans les données cleaned
        const countryData = cleanedData.data.find(
          c => c.country.toLowerCase() === country.toLowerCase()
        );
        
        if (!countryData) {
          throw new AppError(`Country "${country}" not found`, 404);
        }
        
        // Convertir timeSeries object en array
        const dateColumns = Object.keys(countryData.timeSeries);
        countryTimeSeries = dateColumns.map(date => ({
          date: date,
          cases: countryData.timeSeries[date] || 0
        }));
        
        console.log(`📊 [getCasesTimeSeriesByCountry] Found ${countryTimeSeries.length} data points for ${country}`);
        
      } else {
        // Fallback: fetch from GitHub CSV
        const data = await fetchGitHubCSV('confirmed');
        const rows = data.split('\n').filter(row => row.trim() !== '');
        const header = rows[0].split(',');
        const dateColumns = header.slice(4);
        
        // Chercher toutes les lignes correspondant au pays
        const countryRows = [];
        for (let i = 1; i < rows.length; i++) {
          const columns = rows[i].split(',');
          const rowCountry = columns[1]?.trim();
          
          if (rowCountry && rowCountry.toLowerCase() === country.toLowerCase()) {
            countryRows.push(columns);
          }
        }
        
        if (countryRows.length === 0) {
          throw new AppError(`Country "${country}" not found`, 404);
        }
        
        // Agréger les données de toutes les régions du pays
        countryTimeSeries = dateColumns.map((date, idx) => {
          let totalCases = 0;
          countryRows.forEach(columns => {
            const cases = parseInt(columns[4 + idx], 10);
            if (!isNaN(cases)) {
              totalCases += cases;
            }
          });
          return { date: date.trim(), cases: totalCases };
        });
      }
      
      // Parser et trier les dates
      const parsedData = countryTimeSeries.map(item => {
        const parts = item.date.split("/");
        let dateObj;
        
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10);
          const day = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          
          if (year < 100) {
            year += 2000;
          }
          
          dateObj = new Date(year, month - 1, day);
        } else {
          dateObj = new Date(item.date);
        }
        
        return {
          date: item.date,
          cases: item.cases,
          dateObj: dateObj
        };
      }).filter(item => !isNaN(item.dateObj.getTime()))
        .sort((a, b) => a.dateObj - b.dateObj);
      
      // Filtrer par période si demandé
      let filteredData = parsedData;
      
      if (period && !isNaN(period)) {
        const periodDays = parseInt(period);
        const latestDate = parsedData[parsedData.length - 1].dateObj;
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - periodDays);
        
        filteredData = parsedData.filter(item => item.dateObj >= startDate);
        
        console.log(`📅 [${country}] Timeline filter: ${periodDays} days, Points: ${filteredData.length}`);
      }
      
      const lastDataPoint = filteredData[filteredData.length - 1];
      const lastDate = lastDataPoint ? lastDataPoint.dateObj : null;
      
      const formattedLastDate = lastDate 
        ? `${lastDate.getMonth() + 1}/${lastDate.getDate()}/${lastDate.getFullYear()}`
        : null;
      
      // Retirer dateObj avant d'envoyer
      const finalData = filteredData.map(({ dateObj, ...rest }) => rest);
      
      return { 
        data: finalData,
        metadata: {
          country: country,
          lastDate: formattedLastDate,
          totalPoints: finalData.length,
          period: period ? parseInt(period) : null
        }
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('❌ [getCasesTimeSeriesByCountry] Error:', error);
      throw new AppError(`Failed to fetch time series for ${country}`, 500);
    }
  },

  // ✅ NOUVEAU - Récupérer les dates disponibles
  getAvailableDateRange: async () => {
    try {
      const data = await fetchGitHubCSV('confirmed');
      const rows = data.split('\n');
      const header = rows[0].split(',');
      
      const dateColumns = header.slice(4); // Toutes les dates (colonnes 5+)
      
      if (dateColumns.length === 0) {
        throw new AppError('No date columns found', 500);
      }
      
      const firstDate = dateColumns[0].trim();
      const lastDate = dateColumns[dateColumns.length - 1].trim();
      
      console.log(`📅 Available dates: ${firstDate} → ${lastDate} (${dateColumns.length} days)`);
      
      return {
        firstDate,
        lastDate,
        totalDays: dateColumns.length,
        allDates: dateColumns.map(d => d.trim())
      };
    } catch (error) {
      console.error('❌ [getAvailableDateRange] Error:', error);
      throw new AppError('Failed to fetch date range', 500);
    }
  },

  // ✅ NOUVEAU - Récupérer TOUTES les données time-series (cases, deaths, recovered)
  getAllTimeSeriesData: async () => {
    try {
      console.log('📊 [getAllTimeSeriesData] Loading ALL time-series data (cases, deaths, recovered)...');
      
      // ✅ Charger les 3 CSV
      const confirmedData = await fetchGitHubCSV('confirmed');
      const deathsData = await fetchGitHubCSV('deaths');
      const recoveredData = await fetchGitHubCSV('recovered');
      
      const confirmedRows = confirmedData.split('\n');
      const deathsRows = deathsData.split('\n');
      const recoveredRows = recoveredData.split('\n');
      
      const confirmedHeader = confirmedRows[0].split(',');
      const dateColumns = confirmedHeader.slice(4); // Toutes les dates
      
      // Structure: { "US": { cases: {...}, deaths: {...}, recovered: {...} }, ... }
      const countriesData = {};
      
      // ✅ Traiter les cas confirmés
      for (let i = 1; i < confirmedRows.length; i++) {
        if (!confirmedRows[i].trim()) continue;
        
        const columns = confirmedRows[i].split(',');
        const country = columns[1]?.trim();
        if (!country) continue;
        
        if (!countriesData[country]) {
          countriesData[country] = { cases: {}, deaths: {}, recovered: {} };
        }
        
        for (let j = 0; j < dateColumns.length; j++) {
          const date = dateColumns[j].trim();
          const cases = parseInt(columns[4 + j], 10) || 0;
          
          if (!countriesData[country].cases[date]) {
            countriesData[country].cases[date] = 0;
          }
          countriesData[country].cases[date] += cases;
        }
      }
      
      // ✅ Traiter les deaths
      for (let i = 1; i < deathsRows.length; i++) {
        if (!deathsRows[i].trim()) continue;
        
        const columns = deathsRows[i].split(',');
        const country = columns[1]?.trim();
        if (!country) continue;
        
        if (!countriesData[country]) {
          countriesData[country] = { cases: {}, deaths: {}, recovered: {} };
        }
        
        for (let j = 0; j < dateColumns.length; j++) {
          const date = dateColumns[j].trim();
          const deaths = parseInt(columns[4 + j], 10) || 0;
          
          if (!countriesData[country].deaths[date]) {
            countriesData[country].deaths[date] = 0;
          }
          countriesData[country].deaths[date] += deaths;
        }
      }
      
      // ✅ Traiter les recovered (peut être vide car arrêté en août 2021)
      for (let i = 1; i < recoveredRows.length; i++) {
        if (!recoveredRows[i].trim()) continue;
        
        const columns = recoveredRows[i].split(',');
        const country = columns[1]?.trim();
        if (!country) continue;
        
        if (!countriesData[country]) {
          countriesData[country] = { cases: {}, deaths: {}, recovered: {} };
        }
        
        for (let j = 0; j < dateColumns.length; j++) {
          const date = dateColumns[j].trim();
          const recovered = parseInt(columns[4 + j], 10) || 0;
          
          if (!countriesData[country].recovered[date]) {
            countriesData[country].recovered[date] = 0;
          }
          countriesData[country].recovered[date] += recovered;
        }
      }
      
      console.log(`✅ Loaded time-series for ${Object.keys(countriesData).length} countries (cases, deaths, recovered)`);
      
      return {
        countries: countriesData,
        dates: dateColumns.map(d => d.trim()),
        firstDate: dateColumns[0].trim(),
        lastDate: dateColumns[dateColumns.length - 1].trim()
      };
      
    } catch (error) {
      console.error('❌ [getAllTimeSeriesData] Error:', error);
      throw new AppError('Failed to load all time-series data', 500);
    }
  },

  // ✅ NOUVEAU - Données à une date spécifique
  getDataAtSpecificDate: async (dateString) => {
    try {
      // dateString format: "3/15/20"
      console.log(`📅 [getDataAtSpecificDate] Fetching data for: ${dateString}`);
      
      const data = await fetchGitHubCSV('confirmed');
      const rows = data.split('\n');
      const header = rows[0].split(',');
      
      // Trouver l'index de la colonne correspondant à cette date
      const dateIndex = header.findIndex(col => col.trim() === dateString);
      
      if (dateIndex === -1 || dateIndex < 4) {
        throw new AppError(`Date ${dateString} not found in data`, 404);
      }
      
      console.log(`📊 Found date at column ${dateIndex}`);
      
      // Récupérer les données pour tous les pays à cette date
      const countryCases = {};
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const columns = rows[i].split(',');
        const country = columns[1]?.trim();
        if (!country) continue;
        
        const casesAtDate = parseInt(columns[dateIndex], 10) || 0;
        
        if (!countryCases[country]) {
          countryCases[country] = 0;
        }
        countryCases[country] += casesAtDate;
      }
      
      const formattedResult = Object.keys(countryCases)
        .map(country => ({
          country: country,
          total_cases: countryCases[country],
        }))
        .filter(c => c.total_cases > 0)
        .sort((a, b) => b.total_cases - a.total_cases);
      
      console.log(`📊 [getDataAtSpecificDate] Found ${formattedResult.length} countries with cases`);
      
      return {
        data: formattedResult,
        date: dateString,
        totalCountries: formattedResult.length
      };
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('❌ [getDataAtSpecificDate] Error:', error);
      throw new AppError('Failed to fetch data at specific date', 500);
    }
  },

  // ✅ NOUVEAU - Totaux mondiaux à une date spécifique
  getGlobalTotalsAtDate: async (dateString) => {
    try {
      console.log(`📅 [getGlobalTotalsAtDate] Fetching totals for: ${dateString}`);
      
      const confirmedData = await fetchGitHubCSV('confirmed');
      const deathsData = await fetchGitHubCSV('deaths');
      
      const confirmedRows = confirmedData.split('\n');
      const deathsRows = deathsData.split('\n');
      
      const confirmedHeader = confirmedRows[0].split(',');
      const deathsHeader = deathsRows[0].split(',');
      
      const confirmedDateIndex = confirmedHeader.findIndex(col => col.trim() === dateString);
      const deathsDateIndex = deathsHeader.findIndex(col => col.trim() === dateString);
      
      if (confirmedDateIndex === -1 || deathsDateIndex === -1) {
        throw new AppError(`Date ${dateString} not found`, 404);
      }
      
      let totalCases = 0;
      let totalDeaths = 0;
      
      // Calculer les totaux
      for (let i = 1; i < confirmedRows.length; i++) {
        if (!confirmedRows[i].trim()) continue;
        const columns = confirmedRows[i].split(',');
        const cases = parseInt(columns[confirmedDateIndex], 10) || 0;
        totalCases += cases;
      }
      
      for (let i = 1; i < deathsRows.length; i++) {
        if (!deathsRows[i].trim()) continue;
        const columns = deathsRows[i].split(',');
        const deaths = parseInt(columns[deathsDateIndex], 10) || 0;
        totalDeaths += deaths;
      }
      
      console.log(`📊 [getGlobalTotalsAtDate] Cases: ${totalCases.toLocaleString()}, Deaths: ${totalDeaths.toLocaleString()}`);
      
      return {
        total_cases: totalCases,
        total_deaths: totalDeaths,
        date: dateString
      };
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('❌ [getGlobalTotalsAtDate] Error:', error);
      throw new AppError('Failed to fetch global totals at date', 500);
    }
  },

  getMeanCases: async () => {
    try {
      const dailyTotals = await CovidData.aggregate([
        {
          $group: {
            _id: "$Date",
            totalConfirmed: { $sum: "$Confirmed" }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      if (dailyTotals.length < 2) {
        return { mean_daily_cases: 0 };
      }

      let dailyNew = [];
      for (let i = 1; i < dailyTotals.length; i++) {
        const diff = dailyTotals[i].totalConfirmed - dailyTotals[i - 1].totalConfirmed;
        if (diff > 0) dailyNew.push(diff);
      }

      const mean = dailyNew.length > 0 
        ? dailyNew.reduce((a, b) => a + b, 0) / dailyNew.length 
        : 0;

      return { 
        mean_daily_cases: mean.toFixed(2),
        source: 'mongodb'
      };
    } catch (error) {
      throw new AppError('Failed to calculate mean cases', 500);
    }
  },

  getCasesEvolution: async () => {
    try {
      const dailyTotals = await CovidData.aggregate([
        {
          $group: {
            _id: "$Date",
            totalConfirmed: { $sum: "$Confirmed" }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      if (dailyTotals.length < 7) {
        return { weekly_evolution: [] };
      }

      let weeklyEvolution = [];
      for (let i = 7; i < dailyTotals.length; i += 7) {
        const prev = dailyTotals[i - 7].totalConfirmed;
        const curr = dailyTotals[i].totalConfirmed;
        const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
        
        weeklyEvolution.push({ 
          week: Math.floor(i / 7), 
          growth: growth.toFixed(2),
          date: dailyTotals[i]._id
        });
      }

      return { 
        weekly_evolution: weeklyEvolution,
        source: 'mongodb'
      };
    } catch (error) {
      throw new AppError('Failed to calculate evolution', 500);
    }
  },

  getKMeansClusters: async () => {
    try {
      const latestData = await CovidData.aggregate([
        { $sort: { Date: -1 } },
        {
          $group: {
            _id: "$Country_Region",
            latestDate: { $first: "$Date" },
            latestCases: { $first: "$Confirmed" }
          }
        }
      ]);

      const sevenDaysAgo = new Date(latestData[0].latestDate);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const previousData = await CovidData.aggregate([
        { $match: { Date: { $gte: sevenDaysAgo } } },
        { $sort: { Date: 1 } },
        {
          $group: {
            _id: "$Country_Region",
            firstCases: { $first: "$Confirmed" }
          }
        }
      ]);

      const previousMap = {};
      previousData.forEach(item => {
        previousMap[item._id] = item.firstCases;
      });

      let dataset = [];
      let countryNames = [];
      let countryMap = {};

      latestData.forEach(country => {
        const latestCases = country.latestCases || 0;
        const previousCases = previousMap[country._id] || 0;

        if (latestCases === 0) return;

        const weeklyGrowth = previousCases > 0 
          ? ((latestCases - previousCases) / previousCases) * 100 
          : 0;

        const logCases = Math.log10(latestCases + 1);

        dataset.push([logCases, weeklyGrowth]);
        countryNames.push(country._id);
        countryMap[country._id] = {
          totalCases: latestCases,
          weeklyGrowth: weeklyGrowth
        };
      });

      if (dataset.length < 3) {
        return { 
          error: 'Not enough data for clustering',
          source: 'mongodb'
        };
      }

      const numClusters = 3;
      const result = kmeans(dataset, numClusters, {
        initialization: 'kmeans++',
        maxIterations: 100
      });

      const countriesClustered = countryNames.map((country, idx) => ({
        country: country,
        cluster: result.clusters[idx],
        totalCases: countryMap[country].totalCases,
        weeklyGrowth: dataset[idx][1].toFixed(2) + '%'
      }));

      const clusterGroups = {};
      for (let i = 0; i < numClusters; i++) {
        clusterGroups[i] = countriesClustered.filter(c => c.cluster === i);
      }

      return {
        centroids: result.centroids.map(c => ({
          logCases: c[0].toFixed(2),
          weeklyGrowth: c[1].toFixed(2) + '%'
        })),
        clusters: clusterGroups,
        summary: {
          totalCountries: countryNames.length,
          clusterDistribution: Object.values(clusterGroups).map(arr => arr.length)
        },
        source: 'mongodb'
      };
    } catch (error) {
      throw new AppError('Failed to perform k-means clustering', 500);
    }
  },

  get28DayCases: async () => {
    try {
      const data = await fetchGitHubCSV('confirmed');
      const rows = data.split('\n');
      const header = rows[0].split(',');
      const latestDate = header[header.length - 1];
      const date28DaysAgo = header[header.length - 29];

      let totalLatestCases = 0;
      let total28DaysAgoCases = 0;

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        const latestCases = parseInt(columns[columns.length - 1], 10);
        const cases28DaysAgo = parseInt(columns[columns.length - 29], 10);

        if (!isNaN(latestCases)) totalLatestCases += latestCases;
        if (!isNaN(cases28DaysAgo)) total28DaysAgoCases += cases28DaysAgo;
      }

      return {
        total_28_day_cases: totalLatestCases - total28DaysAgoCases,
        latest_date: latestDate,
        date_28_days_ago: date28DaysAgo
      };
    } catch (error) {
      throw new AppError('Failed to fetch 28-day cases', 500);
    }
  },

  get28DayCasesPerCountry: async () => {
    try {
      const data = await fetchGitHubCSV('confirmed');
      const rows = data.split('\n');
      const header = rows[0].split(',');
      const latestDate = header[header.length - 1];
      const date28DaysAgo = header[header.length - 29];

      const casesByCountry = {};

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        const country = columns[1]?.trim();
        if (!country) continue;

        const latestCases = parseInt(columns[columns.length - 1], 10);
        const cases28DaysAgo = parseInt(columns[columns.length - 29], 10);

        if (!casesByCountry[country]) {
          casesByCountry[country] = { latestCases: 0, cases28DaysAgo: 0 };
        }

        if (!isNaN(latestCases)) casesByCountry[country].latestCases += latestCases;
        if (!isNaN(cases28DaysAgo)) casesByCountry[country].cases28DaysAgo += cases28DaysAgo;
      }

      const casesIncreasePerCountry = Object.keys(casesByCountry).map((country) => {
        const { latestCases, cases28DaysAgo } = casesByCountry[country];
        return {
          country,
          total_28_day_cases_per_country: latestCases - cases28DaysAgo
        };
      }).filter(entry => entry.country && entry.total_28_day_cases_per_country !== undefined);

      return {
        total_28_day_cases_per_country: casesIncreasePerCountry,
        latest_date: latestDate,
        date_28_days_ago: date28DaysAgo
      };
    } catch (error) {
      throw new AppError('Failed to fetch 28-day cases per country', 500);
    }
  },

  get28DayDeaths: async () => {
    try {
      const data = await fetchGitHubCSV('deaths');
      const rows = data.split('\n');
      const header = rows[0].split(',');
      const latestDate = header[header.length - 1];
      const date28DaysAgo = header[header.length - 29];

      let totalLatestDeaths = 0;
      let total28DaysAgoDeaths = 0;

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        const latestDeaths = parseInt(columns[columns.length - 1], 10);
        const deaths28DaysAgo = parseInt(columns[columns.length - 29], 10);

        if (!isNaN(latestDeaths)) totalLatestDeaths += latestDeaths;
        if (!isNaN(deaths28DaysAgo)) total28DaysAgoDeaths += deaths28DaysAgo;
      }

      return {
        total_28_day_deaths: totalLatestDeaths - total28DaysAgoDeaths,
        latest_date: latestDate,
        date_28_days_ago: date28DaysAgo
      };
    } catch (error) {
      throw new AppError('Failed to fetch 28-day deaths', 500);
    }
  },

  get28DayDeathsPerCountry: async () => {
    try {
      const data = await fetchGitHubCSV('deaths');
      const rows = data.split('\n');
      const header = rows[0].split(',');
      const latestDate = header[header.length - 1];
      const date28DaysAgo = header[header.length - 29];

      const deathsByCountry = {};

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        const country = columns[1]?.trim();
        if (!country) continue;

        const latestDeaths = parseInt(columns[columns.length - 1], 10);
        const deaths28DaysAgo = parseInt(columns[columns.length - 29], 10);

        if (!deathsByCountry[country]) {
          deathsByCountry[country] = { latestDeaths: 0, deaths28DaysAgo: 0 };
        }

        if (!isNaN(latestDeaths)) deathsByCountry[country].latestDeaths += latestDeaths;
        if (!isNaN(deaths28DaysAgo)) deathsByCountry[country].deaths28DaysAgo += deaths28DaysAgo;
      }

      const deathsIncreasePerCountry = Object.keys(deathsByCountry).map((country) => {
        const { latestDeaths, deaths28DaysAgo } = deathsByCountry[country];
        return {
          country,
          total_28_day_deaths_per_country: latestDeaths - deaths28DaysAgo
        };
      }).filter(entry => entry.country && entry.total_28_day_deaths_per_country !== undefined);

      return {
        total_28_day_deaths_per_country: deathsIncreasePerCountry,
        latest_date: latestDate,
        date_28_days_ago: date28DaysAgo
      };
    } catch (error) {
      throw new AppError('Failed to fetch 28-day deaths per country', 500);
    }
  },

  getDeathCases28Days: async () => {
    try {
      const resultTotal = await CovidData.aggregate([
        { $match: { Date: new Date('2023-09-03') } },
        { $group: {
            _id: "$Country_Region",
            total_deaths: { $max: "$Deaths" },
            total_confirmed: { $max: "$Confirmed" }
          }
        }
      ]);

      const result28Days = await CovidData.aggregate([
        { $match: { Date: new Date('2023-09-02') } },
        { $group: {
            _id: "$Country_Region",
            days28_deaths: { $max: "$Deaths" },
            days28_confirmed: { $max: "$Confirmed" }
          }
        }
      ]);

      const result = resultTotal.map(country => {
        const country28 = result28Days.find(c => c._id === country._id);
        return {
          Country_Region: country._id,
          total_deaths: country.total_deaths,
          total_confirmed: country.total_confirmed,
          days28_deaths: country28 ? country28.days28_deaths : null,
          days28_confirmed: country28 ? country28.days28_confirmed : null,
          days28_deaths_increase: country.total_deaths - (country28 ? country28.days28_deaths : 0),
          days28_confirmed_increase: country.total_confirmed - (country28 ? country28.days28_confirmed : 0)
        };
      });

      return result;
    } catch (error) {
      throw new AppError('Failed to fetch death cases 28 days', 500);
    }
  },

  getTotalVaccineDoses: async () => {
    try {
      const data = await fetchGitHubCSV('vaccine');
      const rows = data.split('\n').filter(row => row.trim() !== '');
      const header = rows[0].split(',');

      let dosesByDate = new Map();

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        for (let j = 4; j < columns.length; j++) {
          const date = header[j];
          const doses = parseInt(columns[j], 10);

          if (!isNaN(doses)) {
            if (dosesByDate.has(date)) {
              dosesByDate.set(date, dosesByDate.get(date) + doses);
            } else {
              dosesByDate.set(date, doses);
            }
          }
        }
      }

      const availableDates = Array.from(dosesByDate.keys()).sort();
      const latestDate = availableDates[availableDates.length - 1];
      const totalDoses = dosesByDate.get(latestDate) || 0;

      return { total_vaccine_doses: totalDoses, latest_date: latestDate };
    } catch (error) {
      throw new AppError('Failed to fetch total vaccine doses', 500);
    }
  },

  getVaccineDosesPerCountry: async (country) => {
    try {
      const data = await fetchGitHubCSV('vaccine');
      const rows = data.split('\n').filter(row => row.trim() !== '');
      const header = rows[0].split(',');

      const dosesIndex = header.indexOf('Doses_admin');
      const provinceIndex = header.indexOf('Province_State');
      const countryIndex = header.indexOf('Country_Region');
      const dateIndex = header.indexOf('Date');

      if (dosesIndex === -1) throw new AppError('Doses_admin column not found', 400);

      let totalDoses = 0;
      let latestDate = '';

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        if (
          columns[countryIndex].toLowerCase() === country.toLowerCase() &&
          columns[provinceIndex].trim() === ''
        ) {
          totalDoses = parseInt(columns[dosesIndex], 10) || 0;
          latestDate = columns[dateIndex];
          break;
        }
      }

      return {
        total_vaccine_doses: totalDoses,
        latest_date: latestDate,
      };
    } catch (error) {
      throw new AppError('Failed to fetch vaccine doses by country', 500);
    }
  },

  get28DayVaccineDoses: async () => {
    try {
      const data = await fetchGitHubCSV('vaccine');
      const rows = data.split('\n').filter(row => row.trim() !== '');
      const header = rows[0].split(',');

      const dateIndex = header.indexOf('Date');
      const dosesAdminIndex = header.indexOf('Doses_admin');

      let dosesByDate = new Map();

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        const date = columns[dateIndex];
        const doses = parseInt(columns[dosesAdminIndex], 10);

        if (!isNaN(doses)) {
          if (dosesByDate.has(date)) {
            dosesByDate.set(date, dosesByDate.get(date) + doses);
          } else {
            dosesByDate.set(date, doses);
          }
        }
      }

      const availableDates = Array.from(dosesByDate.keys()).sort();
      const latestDate = availableDates[availableDates.length - 1];
      
      const latestDateObject = new Date(latestDate);
      const date28DaysAgoObject = new Date(latestDateObject);
      date28DaysAgoObject.setDate(latestDateObject.getDate() - 28);
      
      const formattedDate28DaysAgo = date28DaysAgoObject.toISOString().split('T')[0];

      const totalLatestDoses = dosesByDate.get(latestDate) || 0;
      const total28DaysAgoDoses = dosesByDate.get(formattedDate28DaysAgo) || 0;

      return {
        total_28_day_vaccine_doses: totalLatestDoses - total28DaysAgoDoses,
        latest_date: latestDate,
        date_28_days_ago: formattedDate28DaysAgo,
      };
    } catch (error) {
      throw new AppError('Failed to fetch 28-day vaccine doses', 500);
    }
  },

  get28DayVaccineDosesPerCountry: async () => {
    try {
      const data = await fetchGitHubCSV('vaccine');
      const rows = data.split('\n').filter(row => row.trim() !== '');
      const header = rows[0].split(',');

      const dateIndex = header.indexOf('Date');
      const countryIndex = header.indexOf('Country_Region');
      const dosesAdminIndex = header.indexOf('Doses_admin');

      const dosesByCountry = new Map();

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        const date = columns[dateIndex];
        const country = columns[countryIndex];
        const doses = parseInt(columns[dosesAdminIndex], 10);

        if (!isNaN(doses)) {
          if (!dosesByCountry.has(country)) {
            dosesByCountry.set(country, new Map());
          }
          const countryData = dosesByCountry.get(country);
          
          if (countryData.has(date)) {
            countryData.set(date, countryData.get(date) + doses);
          } else {
            countryData.set(date, doses);
          }
        }
      }

      const result = {};
      const availableDates = Array.from(new Set(rows.slice(1).map(row => row.split(',')[dateIndex]))).sort();
      const latestDate = availableDates[availableDates.length - 1];

      for (const [country, countryData] of dosesByCountry) {
        const latestDateObject = new Date(latestDate);
        const date28DaysAgoObject = new Date(latestDateObject);
        date28DaysAgoObject.setDate(latestDateObject.getDate() - 28);
        const formattedDate28DaysAgo = date28DaysAgoObject.toISOString().split('T')[0];

        const totalLatestDoses = countryData.get(latestDate) || 0;
        const total28DaysAgoDoses = countryData.get(formattedDate28DaysAgo) || 0;

        result[country] = {
          total_28_day_vaccine_doses: totalLatestDoses - total28DaysAgoDoses,
          latest_date: latestDate,
          date_28_days_ago: formattedDate28DaysAgo,
        };
      }

      return result;
    } catch (error) {
      throw new AppError('Failed to fetch 28-day vaccine doses per country', 500);
    }
  }
};