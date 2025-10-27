# COVID-19 Dashboard – Development Timeline

This document presents the development plan of the COVID-19 Dashboard project.

---

## MONTH 1 - COMPLETE MVP (Major Features)

### All Major Features Implemented

This month covers **all technical and non-technical deliverables** required for the Major credits.

---

### BACKEND INFRASTRUCTURE

**Architecture:**
✅ Docker Compose with MongoDB and Redis  
✅ Express.js REST API server  
✅ Mongoose ODM for database modeling  
✅ Redis cache layer with configurable TTL  

**Data Pipeline:**
✅ Data cleaning script (`cleanData.mjs`):
  - Download CSV from JHU CSSE GitHub
  - Parse with csv-parse library
  - Aggregate by country
  - Handle missing values
  - Normalize country names
  - Export to JSON (`/data/cleaned/`)

✅ Data validation script (`validateData.mjs`):
  - Verify data integrity
  - Check for anomalies
  - Generate validation report

✅ MongoDB import script (`importCleanedData.mjs`):
  - Batch import (5000 docs/batch)
  - Transform to Mongoose documents
  - Verify import success

**Dataset Organization:**
```
data/
└── cleaned/
    ├── confirmed_cases_cleaned.json
    ├── deaths_cleaned.json
    ├── recovered_cleaned.json
    ├── merged_statistics.json
    └── validation_report.json
```

---

### API ROUTES

**Global Statistics:**
✅ `GET /get_total_cases` - Worldwide confirmed cases  
✅ `GET /get_total_deaths` - Worldwide deaths  
✅ `GET /get_total_recovered` - Worldwide recovered  

**Country-Level Data:**
✅ `GET /get_total_cases_per_country` - Cases by country  
✅ `GET /get_total_deaths_per_country` - Deaths by country  
✅ `GET /get_total_recovered_per_country` - Recovered by country  

**Time-Series:**
✅ `GET /get_cases_time_series` - Historical confirmed cases  

**Statistical Analysis (Scripts):**
✅ `GET /get_kmeans_clusters` - K-means clustering (3 groups)  
✅ `GET /get_mean_cases` - Average daily new cases  
✅ `GET /get_cases_evolution` - Weekly growth rates  

**Additional Routes:**
✅ `GET /get_country` - List all countries  
✅ `GET /get_death_by_country?country=X` - Country-specific deaths  
✅ `GET /covid-data` - Raw database access  

**All routes include:**
- JSON response format
- Error handling
- Redis caching (300-600s TTL)
- CORS enabled

---

### DATA VISUALIZATION

**Interactive World Map (D3.js):**
✅ HTML5 Canvas rendering with TopoJSON  
✅ Mercator projection  
✅ Red bubbles proportional to confirmed cases  
✅ Logarithmic scaling: `sqrt(cases/maxCases) * 40`  
✅ Centroid calculation with `d3.geoCentroid()`  
✅ Real-time data from `/get_total_cases_per_country`  
✅ Zoom controls (+/- buttons)  

**Time-Series Charts (Recharts):**
✅ Line chart: global cases evolution over time  
✅ Weekly data sampling (performance optimization)  
✅ Interactive tooltips with exact values  
✅ Responsive container  
✅ Custom styling (dark theme)  
✅ Date formatting ("Jan 22", "Feb 05", etc.)  
✅ Data from `/get_cases_time_series`  

**Data Table View:**
✅ Country list with cases, deaths, recovered  
✅ Scrollable container  
✅ Number formatting (toLocaleString)  
✅ Click-to-select country  
✅ Real-time search/filter by country name  
✅ Sortable columns (ascending/descending)  
✅ Synchronized with map and statistics  

**Dashboard Layout:**
✅ Global statistics cards (cases, deaths, recovered)  
✅ Country list panel (left)  
✅ Map visualization (center)  
✅ Additional stats panel (right)  
✅ Time-series chart (bottom right)  
✅ Dark theme CSS  
✅ Responsive grid layout  

---

### STATISTICAL ANALYSIS (Scripts)

**K-Means Clustering:**
✅ Algorithm: `ml-kmeans` library  
✅ Number of clusters: 3  
✅ Features:
  - Log-scale total cases: `log₁₀(cases + 1)`
  - Weekly growth rate: `(current - previous) / previous * 100`
✅ Initialization: k-means++  
✅ Output: Centroids + cluster assignments + distribution  
✅ Route: `/get_kmeans_clusters` (cached 600s)  

**Mean Average Calculation:**
✅ Daily new cases calculation: `today - yesterday`  
✅ Mean computation: `sum / count`  
✅ Filters positive values (handles data corrections)  
✅ MongoDB aggregation pipeline  
✅ Route: `/get_mean_cases` (cached 300s)  

**Evolution Tracking:**
✅ Weekly growth rate: `(week_n - week_n-1) / week_n-1 * 100`  
✅ Time-series aggregation  
✅ Trend detection (increasing/decreasing)  
✅ Route: `/get_cases_evolution` (cached 300s)  

---

### REDIS CACHE OPTIMIZATION

✅ Redis service in Docker Compose  
✅ Cache middleware (`cacheMiddleware.js`)  
✅ Configurable TTL (300s for stats, 600s for analytics)  
✅ Cache HIT/MISS logging  
✅ 10+ routes cached  
✅ Performance improvement: ~70% faster on cache hits  

**Cached Routes:**
- `/get_total_cases` (300s)
- `/get_total_deaths` (300s)
- `/get_total_recovered` (300s)
- `/get_total_cases_per_country` (300s)
- `/get_total_deaths_per_country` (300s)
- `/get_total_recovered_per_country` (300s)
- `/get_cases_time_series` (600s)
- `/get_kmeans_clusters` (600s)
- `/get_mean_cases` (300s)
- `/get_cases_evolution` (300s)

---

### FRONTEND NAVIGATION & ARCHITECTURE

**React Application Structure:**
```
src/
├── App.js (main router)
├── components/
│   └── Dashboard.js (main view)
├── services/
│   └── api.js (API calls)
└── index.js
```

**Navigation Elements:**
✅ Country selection from scrollable list  
✅ Map zoom controls (+/- buttons)  
✅ Admin level buttons (Admin0/Admin1/Admin2)  
✅ Tab switching (Cumulative/Active cases)  
✅ View toggle buttons (list/grid)  

**User Flow:**
1. Dashboard loads → Fetch global stats
2. Display map with bubbles
3. User selects country → All views update
4. User zooms map → Labels adapt
5. User views chart → Time-series data

**State Management:**
✅ React hooks: `useState`, `useEffect`  
✅ Multiple API calls with async/await  
✅ Loading states during data fetch  
✅ Error handling with user messages  
✅ Synchronized state across components  

---

### NON-TECHNICAL DELIVERABLES

**1. Complete Feature List (This Document):**
✅ All features documented with technical details  
✅ API routes explained  
✅ Statistical analyses described  
✅ Architecture overview  
✅ Tech stack breakdown  

**2. 5-Month Timeline:**
✅ Month 1: Complete MVP with all major features  
✅ Month 2-5: Enhancements, optimizations, additional features  
✅ Development plan documented in TIMELINE.md  

**3. Frontend Navigation Architecture:**
✅ Component hierarchy documented  
✅ User flow explained  
✅ State management described  
✅ Navigation elements implemented  

---

### DEPLOYMENT

**Docker Compose Configuration:**
✅ MongoDB service (port 27017)  
✅ Redis service (port 6379)  
✅ Persistent volumes for both services  
✅ Environment variables configured  
✅ Health checks (optional)  

**Commands:**
```bash
# Start services
docker-compose up -d

# Run data pipeline
npm run clean
node importCleanedData.mjs

# Start backend
npm start  # Port 5000

# Start frontend
cd frontend && npm start  # Port 3000
```

---

### DOCUMENTATION

✅ **README.md:**
  - Installation instructions
  - Tech stack explanation
  - Usage guide
  - API documentation
  - Troubleshooting

✅ **TIMELINE.md:** This document (5-month plan)

✅ **FEATURES.md:** Complete feature list (created separately)

✅ **Code Comments:** Complex logic explained inline

---

## COMPLETE TECH STACK (MONTH 1)

**Frontend:**
- React (Create React App)
- D3.js v7 (map visualization)
- Recharts (time-series charts)
- Custom CSS (dark theme)
- Axios/Fetch (API communication)

**Backend:**
- Node.js v18+
- Express.js (REST API)
- Mongoose (MongoDB ODM)
- node-fetch (CSV fetching)
- csv-parse (CSV parsing)
- ml-kmeans (clustering)

**Infrastructure:**
- MongoDB (primary database)
- Redis (cache layer)
- Docker & Docker Compose

**Data Source:**
- JHU CSSE COVID-19 Dataset (GitHub)
- Time-series CSVs: confirmed, deaths, recovered

---

## MONTH 1 SUMMARY

### Delivered:

✅ **Backend:** Express + MongoDB + Redis (fully functional)  
✅ **Data Pipeline:** Automated cleaning + validation + import  
✅ **API:** RESTful routes with caching  
✅ **Frontend:** React dashboard with D3.js map + Recharts  
✅ **Visualizations:** Map, charts, table (all interactive)  
✅ **Statistical Analysis:** K-means, mean, evolution (all implemented)  
✅ **Documentation:** README, TIMELINE, feature list, GitHub tracking  
✅ **Deployment:** Docker Compose ready  

### Metrics:

- **Data Coverage:** Many documents, 201 countries, 5+ months
- **API Routes:** Many endpoints
- **Cache Performance:** 70% improvement on hits
- **Visualizations:** 3 types (map, chart, table)
- **Statistical Scripts:** 3 analyses (k-means, mean, evolution)
- **Code Quality:** Clean, commented, organized

---

## MONTHS 2-5: ENHANCEMENTS & ADDITIONAL FEATURES

### MONTH 2 - Advanced Visualizations
**Planned Enhancements:**
- Area charts for cumulative data
- Bar charts for country comparisons
- Heatmap visualizations
- Animation effects on data updates
- Enhanced tooltips with more details

---

### MONTH 3 - User Experience
**Planned Enhancements:**
- Country comparison feature (multi-select)
- Date range selector for historical data
- Export data functionality (CSV/JSON)
- Dark/light theme toggle
- Accessibility improvements (ARIA labels)

---

### MONTH 4 - Advanced Analytics
**Planned Enhancements:**
- Prediction models (ARIMA, exponential smoothing)
- Correlation analysis between countries
- Regional aggregations (continents, WHO regions)
- Vaccination data integration
- Mortality rate analysis

---

### MONTH 5 - Production & Polish
**Planned Enhancements:**
- Full mobile optimization
- PWA (Progressive Web App) setup
- Performance profiling and optimization
- Unit and integration tests
- CI/CD pipeline setup
- Production deployment guide
- User documentation and video demo

---

## CURRENT STATUS: MONTH 1 COMPLETE

**All Major Features delivered:**
- ✅ Architecture
- ✅ Dataset organization
- ✅ Data pipeline (clean → organize → serve)
- ✅ K-means clustering script
- ✅ Mean average script
- ✅ Evolution tracking script
- ✅ API routes serving data
- ✅ Table view connected to backend
- ✅ Complete feature list
- ✅ 5-month timeline
- ✅ Frontend navigation architecture

---

**Project Start:** September 2025  
**Author:** Axelle YOUAKIM  
**Module:** G-PRO-700 - Simulated Work Experience  
**Campus:** Epitech Barcelona