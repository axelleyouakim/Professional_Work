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

  getTotalCases: async () => {
    try {
      const cleanedData = await loadCleanedData('merged_statistics.json');
      
      if (!cleanedData) {
        const data = await fetchGitHubCSV('confirmed');
        const rows = data.split('\n');
        const header = rows[0].split(',');
        const latestDate = header[header.length - 1];

        let globalTotal = 0;
        for (let i = 1; i < rows.length; i++) {
          const columns = rows[i].split(',');
          const countryCases = parseInt(columns[columns.length - 1], 10);
          if (!isNaN(countryCases)) {
            globalTotal += countryCases;
          }
        }
        return { total_cases: globalTotal, latest_date: latestDate };
      }

      return {
        total_cases: cleanedData.globalStats.totalCases,
        latest_date: cleanedData.lastUpdated
      };
    } catch (error) {
      throw new AppError('Failed to fetch total cases', 500);
    }
  },

  getTotalDeaths: async () => {
    try {
      const cleanedData = await loadCleanedData('merged_statistics.json');
      
      if (!cleanedData) {
        const data = await fetchGitHubCSV('deaths');
        const rows = data.split('\n');
        const header = rows[0].split(',');
        const latestDate = header[header.length - 1];

        let globalTotalDeaths = 0;
        for (let i = 1; i < rows.length; i++) {
          const columns = rows[i].split(',');
          const countryDeaths = parseInt(columns[columns.length - 1], 10);
          if (!isNaN(countryDeaths)) {
            globalTotalDeaths += countryDeaths;
          }
        }
        return { total_deaths: globalTotalDeaths, latest_date: latestDate };
      }

      return {
        total_deaths: cleanedData.globalStats.totalDeaths,
        latest_date: cleanedData.lastUpdated
      };
    } catch (error) {
      throw new AppError('Failed to fetch total deaths', 500);
    }
  },

  getTotalRecovered: async () => {
    try {
      const cleanedData = await loadCleanedData('merged_statistics.json');
      
      if (!cleanedData) {
        const data = await fetchGitHubCSV('recovered');
        const rows = data.split('\n');
        const header = rows[0].split(',');
        const dateColumns = header.slice(4);

        let globalTotalRecovered = 0;
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue;
          const columns = rows[i].split(',');
          const recoveredValues = columns.slice(4).map(val => parseInt(val, 10) || 0);
          const maxRecovered = Math.max(...recoveredValues);
          globalTotalRecovered += maxRecovered;
        }
        return { total_recovered: globalTotalRecovered };
      }

      return {
        total_recovered: cleanedData.globalStats.totalRecovered,
        latest_date: cleanedData.lastUpdated
      };
    } catch (error) {
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

  getTotalCasesPerCountry: async () => {
    try {
      const cleanedData = await loadCleanedData('confirmed_cases_cleaned.json');
      
      if (!cleanedData) {
        const data = await fetchGitHubCSV('confirmed');
        const rows = data.split('\n');
        const header = rows[0].split(',');
        const latestDate = header[header.length - 1];

        const countryTotalCases = {};
        for (let i = 1; i < rows.length; i++) {
          const columns = rows[i].split(',');
          const country = columns[1];
          const countryCases = parseInt(columns[columns.length - 1], 10);

          if (!isNaN(countryCases)) {
            if (!countryTotalCases[country]) {
              countryTotalCases[country] = 0;
            }
            countryTotalCases[country] += countryCases;
          }
        }

        const formattedResult = Object.keys(countryTotalCases).map(country => ({
          country: country,
          total_cases: countryTotalCases[country],
        }));

        return {
          data: formattedResult,
          latest_date: latestDate,
        };
      }

      const formattedData = cleanedData.data.map(country => ({
        country: country.country,
        total_cases: country.totalCases
      }));

      return {
        data: formattedData,
        latest_date: cleanedData.dateRange.end
      };
    } catch (error) {
      throw new AppError('Failed to fetch cases per country', 500);
    }
  },

  getTotalDeathsPerCountry: async () => {
    try {
      const cleanedData = await loadCleanedData('deaths_cleaned.json');
      
      if (!cleanedData) {
        const data = await fetchGitHubCSV('deaths');
        const rows = data.split('\n');
        const header = rows[0].split(',');
        const latestDate = header[header.length - 1];

        const countryTotalDeaths = {};
        for (let i = 1; i < rows.length; i++) {
          const columns = rows[i].split(',');
          const country = columns[1];
          const countryDeaths = parseInt(columns[columns.length - 1], 10);

          if (!isNaN(countryDeaths)) {
            if (!countryTotalDeaths[country]) {
              countryTotalDeaths[country] = 0;
            }
            countryTotalDeaths[country] += countryDeaths;
          }
        }

        const formattedResult = Object.keys(countryTotalDeaths).map(country => ({
          country: country,
          total_deaths: countryTotalDeaths[country],
        }));

        return {
          data: formattedResult,
          latest_date: latestDate,
        };
      }

      const formattedData = cleanedData.data.map(country => ({
        country: country.country,
        total_deaths: country.totalDeaths
      }));

      return {
        data: formattedData,
        latest_date: cleanedData.dateRange.end
      };
    } catch (error) {
      throw new AppError('Failed to fetch deaths per country', 500);
    }
  },

  getTotalRecoveredPerCountry: async () => {
    try {
      const cleanedData = await loadCleanedData('recovered_cleaned.json');
      
      if (!cleanedData) {
        const data = await fetchGitHubCSV('recovered');
        const rows = data.split('\n');
        const header = rows[0].split(',');
        const dateColumns = header.slice(4);

        const countryTotalRecovered = {};
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue;
          const columns = rows[i].split(',');
          const country = columns[1];
          const recoveredValues = columns.slice(4).map(val => parseInt(val, 10) || 0);
          const maxRecovered = Math.max(...recoveredValues);

          if (!countryTotalRecovered[country]) {
            countryTotalRecovered[country] = 0;
          }
          countryTotalRecovered[country] += maxRecovered;
        }

        const formattedResult = Object.keys(countryTotalRecovered).map(country => ({
          country: country,
          total_recovered: countryTotalRecovered[country],
        }));

        return { data: formattedResult };
      }

      const formattedData = cleanedData.data.map(country => ({
        country: country.country,
        total_recovered: country.totalRecovered
      }));

      return {
        data: formattedData,
        latest_date: cleanedData.dateRange.end
      };
    } catch (error) {
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