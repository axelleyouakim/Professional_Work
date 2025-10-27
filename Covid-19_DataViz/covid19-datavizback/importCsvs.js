// cleaned up version of this file is importCleanedData.mjs
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CovidData from './models/CovidData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for import'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  // console.log(`CSV split into ${lines.length} lines`); // debug
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  // console.log(`Parsed headers: ${headers.slice(0, 10).join(', ')}...`); // debug
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    // if (i % 100 === 0) { // debug
    //     console.log(`Processed ${i} rows`); // debug
    // } // debug
  }
  
  return { headers, data };
}

function parseDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    let [month, day, year] = parts;
    
    if (year.length === 2) {
      year = '20' + year;
    }
    
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');
    
    return new Date(`${year}-${month}-${day}`);
  }
  
  return new Date(dateStr);
}

async function processTimeSeriesData(filePath, dataType) {
  console.log(`Processing ${dataType} data from ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}, skipping...`);
    return;
  }
  
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  // console.log(`Read ${csvContent.length} characters from ${filePath}`); // debug
  const { headers, data } = parseCSV(csvContent);
  
  const dateColumns = headers.slice(4);
  const documentsToInsert = [];
  
  for (const row of data) {
    const countryRegion = row['Country/Region'] || row['Country_Region'];
    
    if (!countryRegion) continue;
    
    for (const dateColumn of dateColumns) {
      const value = parseInt(row[dateColumn]) || 0;
      const date = parseDate(dateColumn);
      
      if (isNaN(date.getTime())) continue;
      
      const existingDoc = documentsToInsert.find(doc => 
        doc.Country_Region === countryRegion && 
        doc.Date.getTime() === date.getTime()
      );
      
      if (existingDoc) {
        existingDoc[dataType] = value;
      } else {
        const newDoc = {
          Country_Region: countryRegion,
          Date: date,
          Confirmed: dataType === 'Confirmed' ? value : 0,
          Deaths: dataType === 'Deaths' ? value : 0,
          Recovered: dataType === 'Recovered' ? value : 0
        };
        documentsToInsert.push(newDoc);
      }
    }
  }
  
  console.log(`Prepared ${documentsToInsert.length} documents for ${dataType}`);
  return documentsToInsert;
}

async function processAllCSVFiles() {
  console.log("🔍 Entered processAllCSVFiles...");
  const dataPath = path.join(__dirname, 'data');
  
  if (!fs.existsSync(dataPath)) {
    console.log('Data directory not found!');
    return [];
  }
  
  const csvFiles = [];
  
  function findCSVFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        findCSVFiles(fullPath);
      } else if (file.endsWith('.csv')) {
        csvFiles.push(fullPath);
      }
    }
  }
  
  findCSVFiles(dataPath);
  console.log(`Found ${csvFiles.length} CSV files:`, csvFiles.map(f => path.basename(f)));
  
  const documentsToInsert = [];
  
  for (const filePath of csvFiles) {
    console.log(`Processing: ${path.basename(filePath)}`);
    
    try {
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      // console.log(`Read ${csvContent.length} characters from ${filePath}`); // debug
      const { headers, data } = parseCSV(csvContent);
      
      const isTimeSeries = headers.some(h => h.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/));
      const fileName = path.basename(filePath).toLowerCase();
      
      if (isTimeSeries) {
        const dateColumns = headers.filter(h => h.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/));
        let dataType = 'Confirmed';
        
        if (fileName.includes('death')) dataType = 'Deaths';
        else if (fileName.includes('recovered')) dataType = 'Recovered';
        else if (fileName.includes('vaccine')) dataType = 'Doses_admin';
        
        for (const row of data) {
          const countryRegion = row['Country/Region'] || row['Country_Region'] || row['Country'];
          if (!countryRegion) continue;
          
          for (const dateColumn of dateColumns) {
            const value = parseInt(row[dateColumn]) || 0;
            const date = parseDate(dateColumn);
            
            if (isNaN(date.getTime())) continue;
            
            const existingDoc = documentsToInsert.find(doc => 
              doc.Country_Region === countryRegion && 
              doc.Date.getTime() === date.getTime()
            );
            
            if (existingDoc) {
              existingDoc[dataType] = value;
            } else {
              const newDoc = {
                Country_Region: countryRegion,
                Date: date,
                Confirmed: dataType === 'Confirmed' ? value : 0,
                Deaths: dataType === 'Deaths' ? value : 0,
                Recovered: dataType === 'Recovered' ? value : 0,
                Doses_admin: dataType === 'Doses_admin' ? value : 0
              };
              documentsToInsert.push(newDoc);
            }
          }
        }
      } else if (fileName.includes('vaccine') && headers.includes('Date')) {
        for (const row of data) {
          const countryRegion = row['Country_Region'] || row['Country'] || row['Province_State'];
          const dateStr = row['Date'];
          const dosesAdmin = parseInt(row['Doses_admin']) || 0;
          
          if (!countryRegion || !dateStr) continue;
          
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) continue;
          
          const existingDoc = documentsToInsert.find(doc => 
            doc.Country_Region === countryRegion && 
            doc.Date.getTime() === date.getTime()
          );
          
          if (existingDoc) {
            existingDoc.Doses_admin = dosesAdmin;
          } else {
            documentsToInsert.push({
              Country_Region: countryRegion,
              Date: date,
              Confirmed: 0,
              Deaths: 0,
              Recovered: 0,
              Doses_admin: dosesAdmin
            });
          }
        }
      } else {
        for (const row of data) {
          const countryRegion = row['Country_Region'] || row['Country/Region'] || row['Country'];
          if (!countryRegion) continue;
          
          let date = new Date();
          const fileNameDate = path.basename(filePath, '.csv');
          const dateMatch = fileNameDate.match(/(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}-\d{1,2}-\d{2,4})/);
          
          if (dateMatch) {
            date = parseDate(dateMatch[1].replace(/-/g, '/'));
          } else if (row['Date']) {
            date = new Date(row['Date']);
          } else if (row['Last_Update']) {
            date = new Date(row['Last_Update']);
          }
          
          if (isNaN(date.getTime())) continue;
          
          const confirmed = parseInt(row['Confirmed']) || 0;
          const deaths = parseInt(row['Deaths']) || 0;
          const recovered = parseInt(row['Recovered']) || 0;
          const dosesAdmin = parseInt(row['Doses_admin']) || 0;
          
          const existingDoc = documentsToInsert.find(doc => 
            doc.Country_Region === countryRegion && 
            doc.Date.getTime() === date.getTime()
          );
          
          if (existingDoc) {
            existingDoc.Confirmed = Math.max(existingDoc.Confirmed, confirmed);
            existingDoc.Deaths = Math.max(existingDoc.Deaths, deaths);
            existingDoc.Recovered = Math.max(existingDoc.Recovered, recovered);
            existingDoc.Doses_admin = Math.max(existingDoc.Doses_admin, dosesAdmin);
          } else {
            documentsToInsert.push({
              Country_Region: countryRegion,
              Date: date,
              Confirmed: confirmed,
              Deaths: deaths,
              Recovered: recovered,
              Doses_admin: dosesAdmin
            });
          }
        }
      }
    } catch (error) {
      console.log(`Error processing ${filePath}:`, error.message);
    }
  }
  
  return documentsToInsert;
}

async function importAllData() {
  try {
    console.log('Starting COVID data import...');
    
    console.log('Clearing existing data...');
    await CovidData.deleteMany({});
    
    let allDocuments = [];
    
    const localDocuments = await processAllCSVFiles();
    if (localDocuments.length > 0) {
      allDocuments = localDocuments;
      console.log(`Processed ${localDocuments.length} documents from local CSV files`);
    }

    // console.log(`Local documents parsed: ${localDocuments.length}`); // debug
    
    const externalDocuments = await downloadAndProcessExternalData();
    if (externalDocuments.length > 0) {
      mergeDocumentsInPlace(allDocuments, externalDocuments);
      console.log(`Added external data, total documents: ${allDocuments.length}`);
    }
    
    // console.log(`External documents parsed: ${externalDocuments.length}`); // debug
    
    console.log(`Total documents to insert: ${allDocuments.length}`);
    
    if (allDocuments.length > 0) {
      const uniqueDocuments = [];
      const seen = new Set();
      
      for (const doc of allDocuments) {
        const key = `${doc.Country_Region}-${doc.Date.toISOString()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueDocuments.push(doc);
        } else {
          const existing = uniqueDocuments.find(d => 
            d.Country_Region === doc.Country_Region && 
            d.Date.getTime() === doc.Date.getTime()
          );
          if (existing) {
            existing.Confirmed = Math.max(existing.Confirmed, doc.Confirmed);
            existing.Deaths = Math.max(existing.Deaths, doc.Deaths);
            existing.Recovered = Math.max(existing.Recovered, doc.Recovered);
            existing.Doses_admin = Math.max(existing.Doses_admin, doc.Doses_admin);
          }
        }
      }
      
      console.log(`Unique documents after deduplication: ${uniqueDocuments.length}`);
      
      const batchSize = 1000;
      for (let i = 0; i < uniqueDocuments.length; i += batchSize) {
        const batch = uniqueDocuments.slice(i, i + batchSize);
        console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueDocuments.length/batchSize)}...`);
        
        try {
          await CovidData.insertMany(batch, { ordered: false });
        } catch (error) {
          console.log(`Some documents in batch may have been skipped due to duplicates`);
        }
      }
    }
    
    console.log('Import completed successfully!');
    
    const totalCount = await CovidData.countDocuments();
    const countries = await CovidData.distinct('Country_Region');
    const confirmedCount = await CovidData.countDocuments({ Confirmed: { $gt: 0 } });
    const deathsCount = await CovidData.countDocuments({ Deaths: { $gt: 0 } });
    const vaccineCount = await CovidData.countDocuments({ Doses_admin: { $gt: 0 } });
    
    console.log(`\n=== Import Statistics ===`);
    console.log(`Total documents in database: ${totalCount}`);
    console.log(`Total countries: ${countries.length}`);
    console.log(`Documents with confirmed cases: ${confirmedCount}`);
    console.log(`Documents with deaths: ${deathsCount}`);
    console.log(`Documents with vaccine data: ${vaccineCount}`);
    
    console.log(`\nCountries: ${countries.slice(0, 10).join(', ')}${countries.length > 10 ? '...' : ''}`);
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function downloadAndProcessExternalData() {
  console.log('Downloading external data sources...');
  const documentsToInsert = [];
  
  try {
    console.log('Fetching confirmed cases data...');
    const confirmedUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv';
    const confirmedResponse = await fetch(confirmedUrl);
    if (confirmedResponse.ok) {
      const confirmedData = await confirmedResponse.text();
      const confirmedDocs = processTimeSeriesFromText(confirmedData, 'Confirmed');
      documentsToInsert.push(...confirmedDocs);
      console.log(`Added ${confirmedDocs.length} confirmed cases documents`);
    }
    
    console.log('Fetching deaths data...');
    const deathsUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv';
    const deathsResponse = await fetch(deathsUrl);
    if (deathsResponse.ok) {
      const deathsData = await deathsResponse.text();
      const deathsDocs = processTimeSeriesFromText(deathsData, 'Deaths');
      mergeDocumentsInPlace(documentsToInsert, deathsDocs);
      console.log(`Merged deaths data`);
    }
    
    console.log('Fetching vaccine data...');
    const vaccineUrl = 'https://raw.githubusercontent.com/govex/COVID-19/master/data_tables/vaccine_data/global_data/time_series_covid19_vaccine_global.csv';
    const vaccineResponse = await fetch(vaccineUrl);
    if (vaccineResponse.ok) {
      const vaccineData = await vaccineResponse.text();
      const vaccineDocs = processVaccineDataFromText(vaccineData);
      mergeDocumentsInPlace(documentsToInsert, vaccineDocs);
      console.log(`Merged vaccine data`);
    }
    
  } catch (error) {
    console.log('Error downloading external data:', error.message);
  }
  
  return documentsToInsert;
}

function processTimeSeriesFromText(csvText, dataType) {
  const { headers, data } = parseCSV(csvText);
  const dateColumns = headers.filter(h => h.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/));
  const documents = [];
  
  for (const row of data) {
    const countryRegion = row['Country/Region'] || row['Country_Region'];
    if (!countryRegion) continue;
    
    for (const dateColumn of dateColumns) {
      const value = parseInt(row[dateColumn]) || 0;
      const date = parseDate(dateColumn);
      
      if (isNaN(date.getTime())) continue;
      
      const existingDoc = documents.find(doc => 
        doc.Country_Region === countryRegion && 
        doc.Date.getTime() === date.getTime()
      );
      
      if (existingDoc) {
        existingDoc[dataType] = value;
      } else {
        const newDoc = {
          Country_Region: countryRegion,
          Date: date,
          Confirmed: dataType === 'Confirmed' ? value : 0,
          Deaths: dataType === 'Deaths' ? value : 0,
          Recovered: dataType === 'Recovered' ? value : 0,
          Doses_admin: dataType === 'Doses_admin' ? value : 0
        };
        documents.push(newDoc);
      }
    }
  }
  
  return documents;
}

function processVaccineDataFromText(csvText) {
  const { headers, data } = parseCSV(csvText);
  const documents = [];
  
  const hasDateColumn = headers.includes('Date');
  const hasCountryColumn = headers.includes('Country_Region') || headers.includes('Country');
  const hasDosesColumn = headers.includes('Doses_admin');
  
  if (hasDateColumn && hasCountryColumn && hasDosesColumn) {
    for (const row of data) {
      const countryRegion = row['Country_Region'] || row['Country'];
      const dateStr = row['Date'];
      const doses = parseInt(row['Doses_admin']) || 0;
      
      if (!countryRegion || !dateStr) continue;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      
      documents.push({
        Country_Region: countryRegion,
        Date: date,
        Confirmed: 0,
        Deaths: 0,
        Recovered: 0,
        Doses_admin: doses
      });
    }
  } else {
    const dateColumns = headers.filter(h => h.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/) || h.match(/^\d{4}-\d{2}-\d{2}$/));
    
    for (const row of data) {
      const countryRegion = row['Country_Region'] || row['Country'] || row['Province_State'];
      if (!countryRegion) continue;
      
      for (const dateColumn of dateColumns) {
        const value = parseInt(row[dateColumn]) || 0;
        let date;
        
        if (dateColumn.includes('-')) {
          date = new Date(dateColumn);
        } else {
          date = parseDate(dateColumn);
        }
        
        if (isNaN(date.getTime())) continue;
        
        documents.push({
          Country_Region: countryRegion,
          Date: date,
          Confirmed: 0,
          Deaths: 0,
          Recovered: 0,
          Doses_admin: value
        });
      }
    }
  }
  
  return documents;
}

function mergeDocumentsInPlace(existingDocs, newDocs) {
  for (const newDoc of newDocs) {
    const existingIndex = existingDocs.findIndex(doc => 
      doc.Country_Region === newDoc.Country_Region && 
      doc.Date.getTime() === newDoc.Date.getTime()
    );
    
    if (existingIndex >= 0) {
      existingDocs[existingIndex].Confirmed = Math.max(existingDocs[existingIndex].Confirmed, newDoc.Confirmed);
      existingDocs[existingIndex].Deaths = Math.max(existingDocs[existingIndex].Deaths, newDoc.Deaths);
      existingDocs[existingIndex].Recovered = Math.max(existingDocs[existingIndex].Recovered, newDoc.Recovered);
      existingDocs[existingIndex].Doses_admin = Math.max(existingDocs[existingIndex].Doses_admin, newDoc.Doses_admin);
    } else {
      existingDocs.push(newDoc);
    }
  }
}

export { importAllData };

if (process.argv[1] === import.meta.url) {
  importAllData();
}
