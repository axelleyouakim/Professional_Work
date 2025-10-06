import cron from 'node-cron';
import { runAllCleaningScripts } from './cleanData.mjs';

console.log('⏰ Data cleaning scheduler started');
console.log('📅 Schedule: Daily at 3:00 AM');
console.log('-----------------------------------\n');

// Schedule: Run every day at 3:00 AM
// Format: second minute hour day month weekday
cron.schedule('0 3 * * *', async () => {
  console.log(`\n🕒 [${new Date().toISOString()}] Scheduled cleaning triggered`);
  
  try {
    await runAllCleaningScripts();
    console.log('✅ Scheduled cleaning completed successfully\n');
  } catch (error) {
    console.error('❌ Scheduled cleaning failed:', error.message, '\n');
  }
}, {
  timezone: "Europe/Madrid"
});

// Also run once immediately on startup
console.log('🚀 Running initial data cleaning...\n');
runAllCleaningScripts()
  .then(() => {
    console.log('\n✅ Initial cleaning completed');
    console.log('⏳ Waiting for next scheduled run (3:00 AM daily)...\n');
  })
  .catch(error => {
    console.error('❌ Initial cleaning failed:', error.message);
  });

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Scheduler stopped');
  process.exit(0);
});