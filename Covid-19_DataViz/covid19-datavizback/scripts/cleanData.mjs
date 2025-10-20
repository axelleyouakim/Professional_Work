import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import fs from 'fs/promises';
import path from 'path';


async function cleanConfirmedCases() {
  console.log('🧹 Cleaning confirmed cases data...');
  
  try {
    const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv';
    const response = await fetch(url);
    const rawData = await response.text();

    const records = parse(rawData, { columns: true });
    const dateColumns = Object.keys(records[0]).slice(4);

    const countryData = {};

    records.forEach(row => {
      const country = row['Country/Region'];
      const lat = parseFloat(row['Lat']) || 0;
      const lon = parseFloat(row['Long']) || 0;

      if (!countryData[country]) {
        countryData[country] = {
          country: country,
          lat: lat,
          lon: lon,
          timeSeries: {}
        };
      }

      dateColumns.forEach(date => {
        const cases = parseInt(row[date], 10) || 0;
        if (!countryData[country].timeSeries[date]) {
          countryData[country].timeSeries[date] = 0;
        }
        countryData[country].timeSeries[date] += cases;
      });
    });

    const cleanedData = Object.values(countryData)
      .filter(country => {
        const latestDate = dateColumns[dateColumns.length - 1];
        return country.timeSeries[latestDate] > 0;
      })
      .map(country => ({
        country: country.country,
        coordinates: { lat: country.lat, lon: country.lon },
        timeSeries: country.timeSeries,
        totalCases: country.timeSeries[dateColumns[dateColumns.length - 1]]
      }))
      .sort((a, b) => b.totalCases - a.totalCases);

    await saveCleanedData('confirmed_cases_cleaned.json', {
      lastUpdated: new Date().toISOString(),
      dateRange: {
        start: dateColumns[0],
        end: dateColumns[dateColumns.length - 1]
      },
      totalCountries: cleanedData.length,
      data: cleanedData
    });

    console.log(`✅ Cleaned confirmed cases: ${cleanedData.length} countries`);
    return cleanedData;

  } catch (error) {
    console.error('❌ Error cleaning confirmed cases:', error.message);
    throw error;
  }
}


async function cleanDeathsData() {
  console.log('🧹 Cleaning deaths data...');
  
  try {
    const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv';
    const response = await fetch(url);
    const rawData = await response.text();

    const records = parse(rawData, { columns: true });
    const dateColumns = Object.keys(records[0]).slice(4);

    const countryData = {};

    records.forEach(row => {
      const country = row['Country/Region'];
      
      if (!countryData[country]) {
        countryData[country] = {
          country: country,
          timeSeries: {}
        };
      }

      dateColumns.forEach(date => {
        const deaths = parseInt(row[date], 10) || 0;
        if (!countryData[country].timeSeries[date]) {
          countryData[country].timeSeries[date] = 0;
        }
        countryData[country].timeSeries[date] += deaths;
      });
    });

    const cleanedData = Object.values(countryData)
      .map(country => ({
        country: country.country,
        timeSeries: country.timeSeries,
        totalDeaths: country.timeSeries[dateColumns[dateColumns.length - 1]]
      }))
      .filter(country => country.totalDeaths > 0)
      .sort((a, b) => b.totalDeaths - a.totalDeaths);

    await saveCleanedData('deaths_cleaned.json', {
      lastUpdated: new Date().toISOString(),
      dateRange: {
        start: dateColumns[0],
        end: dateColumns[dateColumns.length - 1]
      },
      totalCountries: cleanedData.length,
      data: cleanedData
    });

    console.log(`✅ Cleaned deaths data: ${cleanedData.length} countries`);
    return cleanedData;

  } catch (error) {
    console.error('❌ Error cleaning deaths data:', error.message);
    throw error;
  }
}


async function cleanRecoveredData() {
  console.log('🧹 Cleaning recovered data...');

  try {
    const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv';
    const response = await fetch(url);
    const rawData = await response.text();

    const records = parse(rawData, { columns: true });
    const dateColumns = Object.keys(records[0]).slice(4);

    const countryData = {};

    records.forEach(row => {
      const country = row['Country/Region'];

      const recoveredValues = dateColumns.map(date => parseInt(row[date], 10) || 0);
      const maxRecovered = Math.max(...recoveredValues);

      if (!countryData[country]) {
        countryData[country] = {
          country: country,
          timeSeries: {},
          totalRecovered: 0
        };
      }

      countryData[country].totalRecovered += maxRecovered;

      dateColumns.forEach(date => {
        const recovered = parseInt(row[date], 10) || 0;
        if (!countryData[country].timeSeries[date]) {
          countryData[country].timeSeries[date] = 0;
        }
        countryData[country].timeSeries[date] += recovered;
      });
    });

    const cleanedData = Object.values(countryData)
      .filter(country => country.totalRecovered > 0)
      .sort((a, b) => b.totalRecovered - a.totalRecovered);

    await saveCleanedData('recovered_cleaned.json', {
      lastUpdated: new Date().toISOString(),
      dateRange: {
        start: dateColumns[0],
        end: dateColumns[dateColumns.length - 1]
      },
      totalCountries: cleanedData.length,
      data: cleanedData
    });

    console.log(`✅ Cleaned recovered data: ${cleanedData.length} countries`);
    return cleanedData;

  } catch (error) {
    console.error('❌ Error cleaning recovered data:', error.message);
    throw error;
  }
}


async function mergeAndCalculateStats() {
  console.log('📊 Merging data and calculating statistics...');

  try {
    const confirmed = JSON.parse(await fs.readFile('./data/cleaned/confirmed_cases_cleaned.json', 'utf-8'));
    const deaths = JSON.parse(await fs.readFile('./data/cleaned/deaths_cleaned.json', 'utf-8'));
    const recovered = JSON.parse(await fs.readFile('./data/cleaned/recovered_cleaned.json', 'utf-8'));

    const countryStats = {};

    confirmed.data.forEach(country => {
      countryStats[country.country] = {
        country: country.country,
        coordinates: country.coordinates,
        totalCases: country.totalCases,
        totalDeaths: 0,
        totalRecovered: 0,
        activeCases: 0,
        mortalityRate: 0,
        recoveryRate: 0
      };
    });

    deaths.data.forEach(country => {
      if (countryStats[country.country]) {
        countryStats[country.country].totalDeaths = country.totalDeaths;
      }
    });

    recovered.data.forEach(country => {
      if (countryStats[country.country]) {
        countryStats[country.country].totalRecovered = country.totalRecovered;
      }
    });

    Object.values(countryStats).forEach(country => {
      country.activeCases = country.totalCases - country.totalDeaths - country.totalRecovered;
      country.mortalityRate = country.totalCases > 0 
        ? ((country.totalDeaths / country.totalCases) * 100).toFixed(2)
        : 0;
      country.recoveryRate = country.totalCases > 0
        ? ((country.totalRecovered / country.totalCases) * 100).toFixed(2)
        : 0;
    });

    const mergedData = Object.values(countryStats)
      .sort((a, b) => b.totalCases - a.totalCases);

    await saveCleanedData('merged_statistics.json', {
      lastUpdated: new Date().toISOString(),
      totalCountries: mergedData.length,
      globalStats: {
        totalCases: mergedData.reduce((sum, c) => sum + c.totalCases, 0),
        totalDeaths: mergedData.reduce((sum, c) => sum + c.totalDeaths, 0),
        totalRecovered: mergedData.reduce((sum, c) => sum + c.totalRecovered, 0),
        totalActive: mergedData.reduce((sum, c) => sum + c.activeCases, 0)
      },
      data: mergedData
    });

    console.log('✅ Merged statistics calculated and saved');
    return mergedData;

  } catch (error) {
    console.error('❌ Error merging statistics:', error.message);
    throw error;
  }
}


async function saveCleanedData(filename, data) {
  const dataDir = path.join(process.cwd(), 'data', 'cleaned');
  
  await fs.mkdir(dataDir, { recursive: true });
  
  const filePath = path.join(dataDir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  
  console.log(`💾 Saved: ${filename}`);
}


async function runAllCleaningScripts() {
  console.log('🚀 Starting data cleaning pipeline...\n');
  
  const startTime = Date.now();

  try {
    await cleanConfirmedCases();
    await cleanDeathsData();
    await cleanRecoveredData();
    await mergeAndCalculateStats();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n✅ All cleaning scripts completed in ${duration}s`);
    console.log('📁 Cleaned data saved to: ./data/cleaned/');

  } catch (error) {
    console.error('\n❌ Cleaning pipeline failed:', error.message);
    process.exit(1);
  }
}

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename || process.argv[1].endsWith('cleanData.mjs');

if (isMainModule) {
  runAllCleaningScripts();
}

export {
  cleanConfirmedCases,
  cleanDeathsData,
  cleanRecoveredData,
  mergeAndCalculateStats,
  runAllCleaningScripts
};