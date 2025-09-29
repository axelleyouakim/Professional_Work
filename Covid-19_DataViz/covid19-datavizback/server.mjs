import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import CovidData from './models/CovidData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/covid-data', async (req, res) => {
  try {
    const result = await CovidData.find({});
    res.json(result);
  } catch (err) {
    // console.error("Error fetching data:", err); // debugging
    res.status(500).json({ message: err.message });
  }
});

app.get('/', (req, res) => {
  res.send("Hello World");
});

app.get('/get_death_by_country', async (req, res) => {
  const country = req.query.country;
  if (!country) {
    return res.status(400).json({ error: 'Country parameter is required' });
  }

  try {
    const result = await CovidData.aggregate([
      { $match: { Country_Region: country } },
      { $group: { _id: "$Country_Region", total_deaths: { $max: "$Deaths" } } }
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/get_country', async (req, res) => {
  try {
    const result = await CovidData.distinct("Country_Region");
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/get_total_cases', async (req, res) => {
    try {
      const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv';
      const response = await fetch(url);
      const data = await response.text();
  
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
  
      res.json({ total_cases: globalTotal, latest_date: latestDate });
    } catch (error) {
      console.error('Error fetching global total cases:', error);
      res.status(500).json({ error: 'Failed to fetch global total cases' });
    }
  });  

app.get('/get_all_country_and_death', async (req, res) => {
  try {
    const result = await CovidData.aggregate([
      { $group: { _id: "$Country_Region", total_deaths: { $max: "$Deaths" } } }
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/get_country_death_and_cases', async (req, res) => {
  try {
    const result = await CovidData.aggregate([
      { $group: {
          _id: "$Country_Region",
          total_deaths: { $max: "$Deaths" },
          total_confirmed: { $max: "$Confirmed" }
        }
      }
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/get_death_cases_28_days', async (req, res) => {
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

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/get_total_cases_per_country', async (req, res) => {
  const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv';

  try {
    const response = await fetch(url);
    const data = await response.text();

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

    res.json({
      data: formattedResult,
      latest_date: latestDate,
    });
  } catch (error) {
    console.error('Error fetching total cases per country:', error);
    res.status(500).json({ message: 'Failed to fetch total cases per country', error: error.message });
  }
});

app.get('/get_total_deaths', async (req, res) => {
  try {
    const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
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

    res.json({ total_deaths: globalTotalDeaths, latest_date: latestDate });
  } catch (error) {
    console.error('Error fetching global total deaths:', error);
    res.status(500).json({ error: 'Failed to fetch global total deaths' });
  }
});

app.get('/get_total_deaths_per_country', async (req, res) => {
  try {
    const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
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

    res.json({
      data: formattedResult,
      latest_date: latestDate,
    });
  } catch (error) {
    console.error('Error fetching total deaths per country:', error);
    res.status(500).json({ message: 'Failed to fetch total deaths per country', error: error.message });
  }
});

app.get('/get_28_day_cases', async (req, res) => {
  try {
    const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv';
    const response = await fetch(url);
    const data = await response.text();
    
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

      if (!isNaN(latestCases)) {
        totalLatestCases += latestCases;
      }
      if (!isNaN(cases28DaysAgo)) {
        total28DaysAgoCases += cases28DaysAgo;
      }
    }

    const casesIncrease28Days = totalLatestCases - total28DaysAgoCases;

    res.json({
      total_28_day_cases: casesIncrease28Days,
      latest_date: latestDate,
      date_28_days_ago: date28DaysAgo
    });
  } catch (error) {
    console.error('Error fetching 28-day cases:', error);
    res.status(500).json({ error: 'Failed to fetch 28-day cases' });
  }
});

app.get('/get_28_day_cases_per_country', async (req, res) => {
  try {
    const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv';
    const response = await fetch(url);
    const data = await response.text();
    
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
        casesByCountry[country] = {
          latestCases: 0,
          cases28DaysAgo: 0
        };
      }

      if (!isNaN(latestCases)) {
        casesByCountry[country].latestCases += latestCases;
      }
      if (!isNaN(cases28DaysAgo)) {
        casesByCountry[country].cases28DaysAgo += cases28DaysAgo;
      }
    }

    const casesIncreasePerCountry = Object.keys(casesByCountry).map((country) => {
      const { latestCases, cases28DaysAgo } = casesByCountry[country];
      return {
        country,
        total_28_day_cases_per_country: latestCases - cases28DaysAgo
      };
    });

    const filteredCasesIncreasePerCountry = casesIncreasePerCountry.filter(
      entry => entry.country && entry.total_28_day_cases_per_country !== undefined
    );

    res.json({
      total_28_day_cases_per_country: filteredCasesIncreasePerCountry,
      latest_date: latestDate,
      date_28_days_ago: date28DaysAgo
    });
  } catch (error) {
    console.error('Error fetching 28-day cases per country:', error);
    res.status(500).json({ error: 'Failed to fetch 28-day cases per country' });
  }
});

app.get('/get_28_day_deaths', async (req, res) => {
  try {
    const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv';
    const response = await fetch(url);
    const data = await response.text();

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

      if (!isNaN(latestDeaths)) {
        totalLatestDeaths += latestDeaths;
      }
      if (!isNaN(deaths28DaysAgo)) {
        total28DaysAgoDeaths += deaths28DaysAgo;
      }
    }

    const deathsIncrease28Days = totalLatestDeaths - total28DaysAgoDeaths;

    res.json({
      total_28_day_deaths: deathsIncrease28Days,
      latest_date: latestDate,
      date_28_days_ago: date28DaysAgo
    });
  } catch (error) {
    console.error('Error fetching 28-day deaths:', error);
    res.status(500).json({ error: 'Failed to fetch 28-day deaths' });
  }
});

app.get('/get_28_day_deaths_per_country', async (req, res) => {
  try {
    const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv';
    const response = await fetch(url);
    const data = await response.text();

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
        deathsByCountry[country] = {
          latestDeaths: 0,
          deaths28DaysAgo: 0
        };
      }

      if (!isNaN(latestDeaths)) {
        deathsByCountry[country].latestDeaths += latestDeaths;
      }
      if (!isNaN(deaths28DaysAgo)) {
        deathsByCountry[country].deaths28DaysAgo += deaths28DaysAgo;
      }
    }

    const deathsIncreasePerCountry = Object.keys(deathsByCountry).map((country) => {
      const { latestDeaths, deaths28DaysAgo } = deathsByCountry[country];
      return {
        country,
        total_28_day_deaths_per_country: latestDeaths - deaths28DaysAgo
      };
    });

    const filteredDeathsIncreasePerCountry = deathsIncreasePerCountry.filter(
      entry => entry.country && entry.total_28_day_deaths_per_country !== undefined
    );

    res.json({
      total_28_day_deaths_per_country: filteredDeathsIncreasePerCountry,
      latest_date: latestDate,
      date_28_days_ago: date28DaysAgo
    });
  } catch (error) {
    console.error('Error fetching 28-day deaths per country:', error);
    res.status(500).json({ error: 'Failed to fetch 28-day deaths per country' });
  }
});

app.get('/get_total_vaccine_doses', async (req, res) => {
  try {
    const url = 'https://raw.githubusercontent.com/govex/COVID-19/master/data_tables/vaccine_data/global_data/time_series_covid19_vaccine_global.csv';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
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

    res.json({ total_vaccine_doses: totalDoses, latest_date: latestDate });
  } catch (error) {
    console.error('Error fetching total vaccine doses:', error);
    res.status(500).json({ error: 'Failed to fetch total vaccine doses' });
  }
});

// app.get('/get_vaccine_doses_per_country', async (req, res) => {
//   try {
//     const url = 'https://raw.githubusercontent.com/govex/COVID-19/master/data_tables/vaccine_data/global_data/time_series_covid19_vaccine_global.csv';
//     const response = await fetch(url);

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.text();
//     const rows = data.split('\n');
//     const header = rows[0].split(',');

//     const latestDate = header[header.length - 1];
//     const vaccineData = {};

//     for (let i = 1; i < rows.length; i++) {
//       const columns = rows[i].split(',');
//       const country = columns[0];
//       const totalCountryDoses = parseInt(columns[columns.length - 1], 10);
//       vaccineData[country] = {
//         total_28_day_vaccine_doses: totalCountryDoses,
//         latest_date: latestDate
//       };
//     }

//     res.json(vaccineData);
//   } catch (error) {
//     console.error('Error fetching vaccine doses by country:', error);
//     res.status(500).json({ error: 'Failed to fetch vaccine doses by country' });
//   }
// });

app.get('/get_vaccine_doses_per_country', async (req, res) => {
  const country = req.query.country;
  if (!country) {
    return res.status(400).json({ error: 'Country query param is required' });
  }

  try {
    const url = 'https://raw.githubusercontent.com/govex/COVID-19/master/data_tables/vaccine_data/global_data/time_series_covid19_vaccine_global.csv';
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.text();
    const rows = data.split('\n').filter(row => row.trim() !== '');
    const header = rows[0].split(',');

    const dosesIndex = header.indexOf('Doses_admin');
    const provinceIndex = header.indexOf('Province_State');
    const countryIndex = header.indexOf('Country_Region');
    const dateIndex = header.indexOf('Date');

    if (dosesIndex === -1) throw new Error('Doses_admin column not found');

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

    res.json({
      total_vaccine_doses: totalDoses,
      latest_date: latestDate,
    });
  } catch (error) {
    console.error('Error fetching vaccine doses by country:', error);
    res.status(500).json({ error: 'Failed to fetch vaccine doses by country' });
  }
});

app.get('/get_28_day_vaccine_doses', async (req, res) => {
  try {
    const url = 'https://raw.githubusercontent.com/govex/COVID-19/master/data_tables/vaccine_data/global_data/time_series_covid19_vaccine_global.csv';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
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

    const dosesIncrease28Days = totalLatestDoses - total28DaysAgoDoses;

    res.json({
      total_28_day_vaccine_doses: dosesIncrease28Days,
      latest_date: latestDate,
      date_28_days_ago: formattedDate28DaysAgo,
    });
  } catch (error) {
    console.error('Error fetching 28-day vaccine doses:', error);
    res.status(500).json({ error: 'Failed to fetch 28-day vaccine doses' });
  }
});

app.get('/get_28_day_vaccine_doses_per_country', async (req, res) => {
  try {
    const url = 'https://raw.githubusercontent.com/govex/COVID-19/master/data_tables/vaccine_data/global_data/time_series_covid19_vaccine_global.csv';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
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

      const dosesIncrease28Days = totalLatestDoses - total28DaysAgoDoses;

      result[country] = {
        total_28_day_vaccine_doses: dosesIncrease28Days,
        latest_date: latestDate,
        date_28_days_ago: formattedDate28DaysAgo,
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching 28-day vaccine doses per country:', error);
    res.status(500).json({ error: 'Failed to fetch 28-day vaccine doses per country' });
  }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});