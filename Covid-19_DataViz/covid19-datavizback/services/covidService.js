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

  // ✅ MODIFIÉ - Récupérer TOUTES les données time-series avec dates pré-COVID à 0
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
      const realDateColumns = confirmedHeader.slice(4); // Toutes les dates RÉELLES (à partir du 22 jan 2020)
      
      // ✅ ÉTAPE 1 : Générer des dates du 1er nov 2019 au 21 jan 2020 (AVANT les données COVID)
      const preCovidDates = [];
      const startDate = new Date(2019, 10, 1); // 1er Nov 2019
      const firstRealDate = new Date(2020, 0, 22); // 22 Jan 2020
      
      let currentDate = new Date(startDate);
      while (currentDate < firstRealDate) {
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const year = currentDate.getFullYear() % 100;
        preCovidDates.push(`${month}/${day}/${year}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`📅 Generated ${preCovidDates.length} pre-COVID dates (Nov 1 2019 → Jan 21 2020)`);
      
      // ✅ ÉTAPE 2 : Combiner les dates pré-COVID + dates réelles
      const allDates = [...preCovidDates, ...realDateColumns.map(d => d.trim())];
      
      // Structure: { "US": { cases: {...}, deaths: {...}, recovered: {...} }, ... }
      const countriesData = {};
      
      // ✅ ÉTAPE 3 : Initialiser TOUS les pays pour TOUTES les dates (y compris pré-COVID)
      // D'abord, récupérer la liste de TOUS les pays
      const allCountries = new Set();
      
      for (let i = 1; i < confirmedRows.length; i++) {
        if (!confirmedRows[i].trim()) continue;
        const columns = confirmedRows[i].split(',');
        const country = columns[1]?.trim();
        if (country) allCountries.add(country);
      }
      
      for (let i = 1; i < deathsRows.length; i++) {
        if (!deathsRows[i].trim()) continue;
        const columns = deathsRows[i].split(',');
        const country = columns[1]?.trim();
        if (country) allCountries.add(country);
      }
      
      for (let i = 1; i < recoveredRows.length; i++) {
        if (!recoveredRows[i].trim()) continue;
        const columns = recoveredRows[i].split(',');
        const country = columns[1]?.trim();
        if (country) allCountries.add(country);
      }
      
      console.log(`📊 Found ${allCountries.size} unique countries`);
      
      // ✅ ÉTAPE 4 : Initialiser TOUS les pays avec 0 pour les dates pré-COVID
      allCountries.forEach(country => {
        countriesData[country] = { 
          cases: {}, 
          deaths: {}, 
          recovered: {} 
        };
        
        // Mettre 0 pour toutes les dates pré-COVID
        preCovidDates.forEach(date => {
          countriesData[country].cases[date] = 0;
          countriesData[country].deaths[date] = 0;
          countriesData[country].recovered[date] = 0;
        });
      });
      
      console.log(`✅ Initialized ${allCountries.size} countries with 0 for pre-COVID dates`);
      
      // ✅ ÉTAPE 5 : Traiter les cas confirmés (VRAIES DONNÉES à partir du 22 jan 2020)
      for (let i = 1; i < confirmedRows.length; i++) {
        if (!confirmedRows[i].trim()) continue;
        
        const columns = confirmedRows[i].split(',');
        const country = columns[1]?.trim();
        if (!country) continue;
        
        for (let j = 0; j < realDateColumns.length; j++) {
          const date = realDateColumns[j].trim();
          const cases = parseInt(columns[4 + j], 10) || 0;
          
          if (!countriesData[country].cases[date]) {
            countriesData[country].cases[date] = 0;
          }
          countriesData[country].cases[date] += cases;
        }
      }
      
      // ✅ ÉTAPE 6 : Traiter les deaths
      for (let i = 1; i < deathsRows.length; i++) {
        if (!deathsRows[i].trim()) continue;
        
        const columns = deathsRows[i].split(',');
        const country = columns[1]?.trim();
        if (!country) continue;
        
        for (let j = 0; j < realDateColumns.length; j++) {
          const date = realDateColumns[j].trim();
          const deaths = parseInt(columns[4 + j], 10) || 0;
          
          if (!countriesData[country].deaths[date]) {
            countriesData[country].deaths[date] = 0;
          }
          countriesData[country].deaths[date] += deaths;
        }
      }
      
      // ✅ ÉTAPE 7 : Traiter les recovered (peut être vide car arrêté en août 2021)
      for (let i = 1; i < recoveredRows.length; i++) {
        if (!recoveredRows[i].trim()) continue;
        
        const columns = recoveredRows[i].split(',');
        const country = columns[1]?.trim();
        if (!country) continue;
        
        for (let j = 0; j < realDateColumns.length; j++) {
          const date = realDateColumns[j].trim();
          const recovered = parseInt(columns[4 + j], 10) || 0;
          
          if (!countriesData[country].recovered[date]) {
            countriesData[country].recovered[date] = 0;
          }
          countriesData[country].recovered[date] += recovered;
        }
      }
      
      console.log(`✅ Loaded time-series for ${Object.keys(countriesData).length} countries (cases, deaths, recovered)`);
      console.log(`📅 Total dates: ${allDates.length} (${preCovidDates.length} pre-COVID + ${realDateColumns.length} real data)`);
      
      return {
        countries: countriesData,
        dates: allDates,
        firstDate: allDates[0],
        lastDate: allDates[allDates.length - 1]
      };
      
    } catch (error) {
      console.error('❌ [getAllTimeSeriesData] Error:', error);
      throw new AppError('Failed to load all time-series data', 500);
    }
  },

  // ... [reste du code identique - getDataAtSpecificDate, etc.]
  
  getDataAtSpecificDate: async (dateString) => {
    try {
      console.log(`📅 [getDataAtSpecificDate] Fetching data for: ${dateString}`);
      
      const data = await fetchGitHubCSV('confirmed');
      const rows = data.split('\n');
      const header = rows[0].split(',');
      
      const dateIndex = header.findIndex(col => col.trim() === dateString);
      
      if (dateIndex === -1 || dateIndex < 4) {
        throw new AppError(`Date ${dateString} not found in data`, 404);
      }
      
      console.log(`📊 Found date at column ${dateIndex}`);
      
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

  // ... [tout le reste du code reste identique]
  getAllCountryNames: async () => {
    try {
      const cleanedData = await loadCleanedData('confirmed_cases_cleaned.json');
      
      if (cleanedData && cleanedData.data) {
        const countries = cleanedData.data.map(c => c.country).sort();
        console.log(`✅ [getAllCountryNames] Found ${countries.length} countries`);
        return { countries };
      }
      
      throw new AppError('No cleaned data available', 500);
    } catch (error) {
      console.error('❌ [getAllCountryNames] Error:', error);
      throw new AppError('Failed to get country names', 500);
    }
  }
};