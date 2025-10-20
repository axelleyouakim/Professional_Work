import fs from 'fs/promises';
import path from 'path';

async function validateCleanedData() {
  console.log('🔍 Starting data validation...\n');

  const issues = [];
  const warnings = [];

  try {
    const dataDir = path.join(process.cwd(), 'data', 'cleaned');

    const requiredFiles = [
      'confirmed_cases_cleaned.json',
      'deaths_cleaned.json',
      'recovered_cleaned.json',
      'merged_statistics.json'
    ];

    console.log('📁 Checking required files...');
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(dataDir, file));
        console.log(`  ✅ ${file}`);
      } catch (error) {
        issues.push(`Missing file: ${file}`);
        console.log(`  ❌ ${file} - NOT FOUND`);
      }
    }

    console.log('\n📊 Validating confirmed cases...');
    const confirmed = JSON.parse(
      await fs.readFile(path.join(dataDir, 'confirmed_cases_cleaned.json'), 'utf-8')
    );

    if (!confirmed.data || !Array.isArray(confirmed.data)) {
      issues.push('Confirmed cases: Invalid data structure');
    } else {
      console.log(`  Countries: ${confirmed.data.length}`);
      
      const negativeValues = confirmed.data.filter(c => c.totalCases < 0);
      if (negativeValues.length > 0) {
        issues.push(`Confirmed cases: ${negativeValues.length} countries with negative values`);
      }

      const missingCoords = confirmed.data.filter(c => !c.coordinates || !c.coordinates.lat);
      if (missingCoords.length > 0) {
        warnings.push(`Confirmed cases: ${missingCoords.length} countries missing coordinates`);
      }

      if (confirmed.dateRange) {
        console.log(`  Date range: ${confirmed.dateRange.start} to ${confirmed.dateRange.end}`);
        
        const lastUpdate = new Date(confirmed.dateRange.end);
        const daysSinceUpdate = Math.floor((Date.now() - lastUpdate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceUpdate > 7) {
          warnings.push(`Data is ${daysSinceUpdate} days old`);
        }
      }
    }

    console.log('\n📈 Validating merged statistics...');
    const merged = JSON.parse(
      await fs.readFile(path.join(dataDir, 'merged_statistics.json'), 'utf-8')
    );

    if (!merged.globalStats) {
      issues.push('Merged statistics: Missing global stats');
    } else {
      console.log(`  Total cases: ${merged.globalStats.totalCases.toLocaleString()}`);
      console.log(`  Total deaths: ${merged.globalStats.totalDeaths.toLocaleString()}`);
      console.log(`  Total recovered: ${merged.globalStats.totalRecovered.toLocaleString()}`);
      console.log(`  Total active: ${merged.globalStats.totalActive.toLocaleString()}`);

      const globalMortality = (merged.globalStats.totalDeaths / merged.globalStats.totalCases * 100);
      if (globalMortality > 10 || globalMortality < 0.1) {
        warnings.push(`Global mortality rate seems unusual: ${globalMortality.toFixed(2)}%`);
      }
    }

    console.log('\n🔗 Checking data consistency...');
    const deaths = JSON.parse(
      await fs.readFile(path.join(dataDir, 'deaths_cleaned.json'), 'utf-8')
    );

    merged.data.forEach(country => {
      if (country.totalDeaths > country.totalCases) {
        issues.push(`${country.country}: Deaths (${country.totalDeaths}) exceed cases (${country.totalCases})`);
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log('📋 VALIDATION REPORT');
    console.log('='.repeat(50));

    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ All validations passed!');
      console.log('✨ Data quality: EXCELLENT');
    } else {
      if (issues.length > 0) {
        console.log('\n❌ CRITICAL ISSUES:');
        issues.forEach(issue => console.log(`  • ${issue}`));
      }

      if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(warning => console.log(`  • ${warning}`));
      }
    }

    console.log('\n' + '='.repeat(50));

    const report = {
      timestamp: new Date().toISOString(),
      status: issues.length === 0 ? 'PASSED' : 'FAILED',
      issues: issues,
      warnings: warnings,
      stats: {
        totalCountries: confirmed.data.length,
        globalCases: merged.globalStats.totalCases,
        lastDataUpdate: confirmed.dateRange.end
      }
    };

    await fs.writeFile(
      path.join(dataDir, 'validation_report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('💾 Validation report saved to: validation_report.json\n');

    if (issues.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename || process.argv[1].endsWith('validateData.mjs');

if (isMainModule) {
  validateCleanedData();
}

export { validateCleanedData };