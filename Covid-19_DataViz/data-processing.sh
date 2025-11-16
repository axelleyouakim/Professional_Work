#!/bin/bash

echo "📊 STATISTICAL ANALYSIS — START"

cd covid19-datavizback || exit 1

echo "🔹 Step 1 — Cleaning data"
npm run clean

echo "🔹 Step 2 — Validating data quality"
node scripts/validateData.mjs

echo "🔹 Step 3 — Starting auto-scheduler"
npm run clean:schedule

echo "🔹 Step 4 — Import cleaned data"
node importCleanedData.mjs

echo "✅ Statistical analysis complete!"
