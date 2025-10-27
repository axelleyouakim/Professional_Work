# COVID-19 Dashboard – 5-Month Timeline

This document presents the complete development plan of the COVID-19 Dashboard project over a **5-month period**.

---

## MONTH 1 - Backend Infrastructure & Data Pipeline

### Feature 1: Backend Setup & Data Cleaning Pipeline
MongoDB + Mongoose schema configured  
Docker Compose with MongoDB service  
Basic Express API server operational  
CSV download from JHU CSSE GitHub repository  
Data cleaning script (`cleanData.mjs`):
  - Parse CSV files (confirmed, deaths, recovered)
  - Aggregate data by country
  - Handle missing values and normalize country names
  - Export cleaned data to JSON format
Data import script (`importCleanedData.mjs`):
  - Batch import to MongoDB (5000 docs/batch)
  - Data validation after import

**Technical Deliverables:**
- `docker-compose.yml` with MongoDB service
- Mongoose `CovidData` model
- `cleanData.mjs` (data cleaning pipeline)
- `importCleanedData.mjs` (MongoDB import)
- `validateData.mjs` (data validation script)
- Cleaned JSON files in `/data/cleaned/`

**API Routes (Month 1):**
- `GET /get_total_cases` - Global total confirmed cases
- `GET /get_total_deaths` - Global total deaths
- `GET /get_total_recovered` - Global total recovered
- `GET /get_total_cases_per_country` - Cases by country
- `GET /get_total_deaths_per_country` - Deaths by country
- `GET /get_total_recovered_per_country` - Recovered by country

---

### Feature 2: Basic Frontend Dashboard
React application initialized  
Main dashboard layout with grid system  
Global statistics displayed (cases, deaths, recovered)  
Country list component with scrollable view  
Frontend-backend API integration with Axios/Fetch  
Basic CSS styling (dark theme)  
Page accessible at `localhost:3000`

**Technical Deliverables:**
- React components: `Dashboard.js`, `App.js`
- API service layer (`services/api.js`)
- Global statistics cards
- Country list with real-time data
- Basic responsive layout

**Documentation (Month 1):**
- README.md with installation instructions
- Project architecture overview
- Complete feature list (this document)
- GitHub repository setup
- Initial commit with project structure

---

## MONTH 2 - Data Visualization & Caching

### Feature 3: Interactive World Map (D3.js)
World map with D3.js on HTML5 Canvas  
TopoJSON data for country boundaries  
Red bubbles proportional to confirmed cases per country  
Interactive zoom and pan (d3.zoom)  
Dynamic labels (continents → countries based on zoom level)  
Hover tooltips showing country details  
Centroid calculation for bubble positioning  
Real-time data from `/get_total_cases_per_country` API  

**Technical Deliverables:**
- D3.js map component integrated in Dashboard
- Canvas-based rendering (performance optimized)
- Mercator projection with zoom controls
- Color-coded bubbles with logarithmic scaling
- Responsive map sizing

**Map Features:**
- Zoom in/out controls
- Country name labels appearing at zoom level 2+
- Ocean and continent labels at zoom level < 2
- Shadow effects and visual polish

---

### Feature 4: Redis Cache Layer
Redis installed and configured  
Docker Compose updated with Redis service  
Cache middleware (`cacheMiddleware.js`)  
5-minute TTL on frequently requested routes  
Cache HIT/MISS logging in console  
Significant performance improvement on repeated requests  

**Technical Deliverables:**
- Redis connection in `server.mjs`
- `cacheMiddleware.js` with TTL support
- Applied to 10+ API routes
- Performance benchmarking documented

**Cached Routes:**
- `/get_total_cases` (300s TTL)
- `/get_total_deaths` (300s TTL)
- `/get_total_recovered` (300s TTL)
- `/get_total_cases_per_country` (300s TTL)
- `/get_cases_time_series` (600s TTL)
- `/get_kmeans_clusters` (600s TTL)

---

## MONTH 3 - Statistical Analysis & Advanced Tables

### Feature 5: Advanced Data Table
Complete country data table with sorting  
Columns: Country, Confirmed Cases, Deaths, Recovered  
Real-time search/filter by country name  
Sortable columns (ascending/descending)  
Click on country to update all dashboard views  
Scrollable container for large datasets  

**Technical Deliverables:**
- Table component with React state management
- Search bar with filter logic
- Column sorting implementation
- Synchronized with map and statistics
- Responsive table design

---

### Feature 6: K-Means Clustering Analysis
K-means algorithm implemented with `ml-kmeans` library  
API route: `GET /get_kmeans_clusters`  
Countries grouped into 3 clusters based on:
  - Total cases (log scale)
  - Weekly growth rate percentage
Cluster results returned with centroids  
Frontend displays cluster assignments (color-coded)  
Statistical summary of cluster distribution  

**Technical Deliverables:**
- K-means clustering in `server.mjs`
- Dataset preparation with feature engineering
- Cluster centroids calculation
- JSON response with cluster assignments
- Documentation of clustering methodology

**Clustering Logic:**
```javascript
const dataset = countries.map(c => [
  Math.log10(c.totalCases + 1),  // Feature 1: Log scale cases
  c.weeklyGrowth                  // Feature 2: Growth rate %
]);
const result = kmeans(dataset, 3, { initialization: 'kmeans++' });
```

---

## MONTH 4 - Time-Series Visualization & Statistical Routes

### Feature 7: Time-Series Charts (Recharts)
Recharts library integrated  
Line chart: Global confirmed cases over time  
Area chart option for cumulative data  
API route: `GET /get_cases_time_series`  
Interactive tooltips with precise values  
Date axis with weekly sampling (performance)  
Responsive chart containers  

**Technical Deliverables:**
- Recharts components: `LineChart`, `AreaChart`
- Time-series data processing
- Date formatting for readability
- Chart customization (colors, grid, legends)
- Mobile-responsive charts

**Chart Features:**
- X-axis: Dates (formatted as "Jan 22")
- Y-axis: Case counts with k/M notation
- Hover tooltips with exact values
- Smooth line interpolation

---

### Feature 8: Statistical Analysis Routes
Mean/average calculations  
API routes:
  - `GET /get_mean_cases` - Daily mean of new cases
  - `GET /get_cases_evolution` - Weekly growth rate tracking
Moving averages (7-day calculation)  
Trend analysis (growth vs decline)  
Dashboard widgets displaying insights  

**Technical Deliverables:**
- Statistical aggregation in MongoDB
- Mean calculation with pipeline
- Evolution tracking algorithm
- JSON responses with statistical metrics

**Statistical Calculations:**
- Daily new cases = Today's total - Yesterday's total
- Mean = Sum of daily new cases / Number of days
- Weekly growth = (Week N - Week N-1) / Week N-1 × 100%

---

## MONTH 5 - Polish, Documentation & Final Deployment

### Feature 9: UI/UX Polish & Responsive Design
Fully responsive design (mobile, tablet, desktop)  
Consistent dark mode theme throughout  
Loading states for async data fetching  
Error handling with user-friendly messages  
Improved navigation and user flow  
CSS animations for smooth transitions  

**Technical Deliverables:**
- Responsive CSS with media queries
- Loading skeleton components
- Error boundary implementation
- Polished visual design
- Accessibility improvements (ARIA labels)

---

### Feature 10: Final Documentation & Deployment
Complete README.md with:
  - Installation instructions (step-by-step)
  - Tech stack explanation
  - API documentation (all routes)
  - Usage examples and screenshots
Code cleanup and comments  
Docker Compose production-ready 
TIMELINE.md (this document)  
Feature list document  

**Technical Deliverables:**
- Production Docker Compose configuration
- All features tested and working
- Comprehensive documentation
- GitHub project management setup
- Demo materials (screenshots/video optional)

---

## FINAL SUMMARY

### At the end of 5 months:
**Backend:** Express + MongoDB + Redis (fully optimized)  
**Frontend:** React + Recharts + D3.js (interactive visualizations)  
**Data Pipeline:** Automated cleaning, validation, and import  
**Visualizations:** World map, time-series charts, data tables  
**Statistical Analysis:** K-means clustering, means, evolution tracking  
**API:** 15+ RESTful routes with Redis caching  
**Documentation:** Complete README, timeline, feature list, GitHub tracking  
**Deployment:** Docker Compose with 3 services (app, MongoDB, Redis)  

---

## COMPLETE TECH STACK

**Frontend:**
- React (Create React App)
- D3.js (v7) - Map visualization
- Recharts - Time-series charts
- Custom CSS - Dark theme styling
- Axios/Fetch - API communication

**Backend:**
- Node.js (v18+)
- Express.js - REST API server
- Mongoose - MongoDB ODM
- node-fetch - CSV data fetching
- csv-parse - CSV parsing
- ml-kmeans - Clustering algorithm

**Infrastructure:**
- MongoDB - Primary database
- Redis - Cache layer
- Docker - Containerization
- Docker Compose - Multi-service orchestration

**Data Source:**
- Johns Hopkins University CSSE COVID-19 Dataset (GitHub)
- CSV files: confirmed, deaths, recovered (time-series)

**Development Tools:**
- Git & GitHub - Version control
- npm - Package management
- ESLint - Code quality

---
  
**Author:** Axelle Youakim 
**Module:** G-PRO-700 - Simulated Work Experience  
**Campus:** Epitech Barcelona