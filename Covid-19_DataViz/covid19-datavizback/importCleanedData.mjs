import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CovidData from './models/CovidData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importCleanedDataToMongoDB() {
  console.log('🚀 Starting import of cleaned data to MongoDB...\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected for import\n');

    console.log('🗑️  Clearing existing data...');
    const deleteResult = await CovidData.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} existing documents\n`);

    console.log('📂 Loading cleaned JSON files...');
    const cleanedDir = path.join(__dirname, 'data', 'cleaned');

    const confirmedData = JSON.parse(
      await fs.readFile(path.join(cleanedDir, 'confirmed_cases_cleaned.json'), 'utf-8')
    );
    
    const deathsData = JSON.parse(
      await fs.readFile(path.join(cleanedDir, 'deaths_cleaned.json'), 'utf-8')
    );
    
    const recoveredData = JSON.parse(
      await fs.readFile(path.join(cleanedDir, 'recovered_cleaned.json'), 'utf-8')
    );

    console.log(`   ✅ Confirmed: ${confirmedData.data.length} countries`);
    console.log(`   ✅ Deaths: ${deathsData.data.length} countries`);
    console.log(`   ✅ Recovered: ${recoveredData.data.length} countries\n`);

    console.log('🔨 Building MongoDB documents...');
    const documents = [];

    const sampleCountry = confirmedData.data[0];
    const allDates = Object.keys(sampleCountry.timeSeries);

    console.log(`   Found ${allDates.length} dates from ${confirmedData.dateRange.start} to ${confirmedData.dateRange.end}\n`);

    const deathsMap = new Map();
    deathsData.data.forEach(country => {
      deathsMap.set(country.country, country.timeSeries);
    });

    const recoveredMap = new Map();
    recoveredData.data.forEach(country => {
      recoveredMap.set(country.country, country.timeSeries);
    });

    let docCount = 0;
    for (const country of confirmedData.data) {
      const countryName = country.country;
      const deathsTimeSeries = deathsMap.get(countryName) || {};
      const recoveredTimeSeries = recoveredMap.get(countryName) || {};

      for (const date of allDates) {
        const confirmed = country.timeSeries[date] || 0;
        const deaths = deathsTimeSeries[date] || 0;
        const recovered = recoveredTimeSeries[date] || 0;

        if (confirmed > 0 || deaths > 0 || recovered > 0) {
          documents.push({
            Country_Region: countryName,
            Date: parseDate(date),
            Confirmed: confirmed,
            Deaths: deaths,
            Recovered: recovered,
            Doses_admin: 0
          });
          docCount++;
        }
      }

      if (docCount % 50000 === 0) {
        console.log(`   Processed ${docCount} documents...`);
      }
    }

    console.log(`   ✅ Built ${documents.length} documents\n`);

    console.log('💾 Inserting into MongoDB...');
    const batchSize = 5000;
    let inserted = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(documents.length / batchSize);

      try {
        await CovidData.insertMany(batch, { ordered: false });
        inserted += batch.length;
        console.log(`   Batch ${batchNum}/${totalBatches} inserted (${inserted}/${documents.length})`);
      } catch (error) {
        console.error(`   ⚠️  Batch ${batchNum} had some errors (duplicates?)`);
      }
    }

    console.log(`\n✅ Import completed!\n`);

    console.log('🔍 Verifying import...');
    const totalDocs = await CovidData.countDocuments();
    const distinctCountries = await CovidData.distinct('Country_Region');
    const confirmedCount = await CovidData.countDocuments({ Confirmed: { $gt: 0 } });
    const deathsCount = await CovidData.countDocuments({ Deaths: { $gt: 0 } });

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total documents:         ${totalDocs.toLocaleString()}`);
    console.log(`Unique countries:        ${distinctCountries.length}`);
    console.log(`Docs with confirmed:     ${confirmedCount.toLocaleString()}`);
    console.log(`Docs with deaths:        ${deathsCount.toLocaleString()}`);
    console.log('='.repeat(60));
    console.log(`\nCountries (first 20): ${distinctCountries.slice(0, 20).join(', ')}...`);
    console.log('\n✨ MongoDB now contains cleaned, aggregated data!');

    console.log('\n🗑️  Invalidating cache...');
    try {
      const { invalidateCache } = await import('./middleware/cacheMiddleware.js');
      const invalidated = await invalidateCache('covid:cache:*');
      console.log(`✅ Invalidated ${invalidated} cache entries`);
    } catch (error) {
      console.log(`⚠️  Cache invalidation skipped: ${error.message}`);
      console.log('   (This is OK if Redis is not running)');
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 MongoDB connection closed');
  }
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

const isMainModule = process.argv[1] === __filename || process.argv[1].endsWith('importCleanedData.mjs');

if (isMainModule) {
  importCleanedDataToMongoDB();
}

export { importCleanedDataToMongoDB };