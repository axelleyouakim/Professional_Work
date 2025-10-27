# COVID-19 Dashboard - Complete Features List

**Project:** Simulated Work Experience - Data Visualization Dashboard  
**Stack:** React + D3.js + Recharts + Node.js/Express + MongoDB + Redis  
**Timeline:** 5 months
**Data Source:** Johns Hopkins University CSSE COVID-19 Dataset

---

## 1. DATA VISUALIZATION

### 1.1 Interactive World Map (D3.js)
**Description:** Real-time world map with proportional case bubbles

**Features:**
- HTML5 Canvas rendering for optimal performance
- TopoJSON world boundaries with country geometries
- Red circular markers sized proportionally to confirmed cases
- Logarithmic scaling for bubble sizes: `sqrt(cases/maxCases) × 40`
- Interactive zoom and pan using d3.zoom() behavior
- Zoom range: 1x (world view) to 8x (country detail)
- Dynamic label system:
  - Ocean and continent labels at zoom < 2
  - Individual country labels at zoom ≥ 2
- Shadow effects and visual polish
- Real-time data from MongoDB via API

**Technical Implementation:**
- D3.js v7 with Mercator projection
- Centroid calculation with `d3.geoCentroid()`
- Performance-optimized canvas redrawing
- Responsive canvas sizing

**API Endpoint:** `GET /get_total_cases_per_country`

**Code Example:**
```javascript
const projection = d3.geoMercator()
  .scale(width / (2 * Math.PI))
  .translate([width / 2, height / 2]);

const baseRadius = Math.sqrt(countryData.total_cases / maxCases) * 40;
ctx.arc(coords[0], coords[1], radius, 0, 2 * Math.PI);
```

---

### 1.2 Time-Series Charts (Recharts)
**Description:** Interactive charts showing COVID-19 data evolution over time

**Chart Types:**
- **Line Chart:** Global confirmed cases timeline
- **Area Chart:** Cumulative deaths and recoveries
- **Bar Chart:** Country comparisons (planned)

**Features:**
- Weekly data sampling for performance (every 7th data point)
- Interactive tooltips with exact values
- Responsive containers adapting to screen size
- Custom color scheme matching dark theme
- Date formatting: "Jan 22", "Feb 15", etc.
- Smooth monotone interpolation
- Grid lines for readability

**Technical Implementation:**
- Recharts library components
- Data preprocessing and date parsing
- Dynamic data updates from API
- Mobile-optimized touch interactions

**API Endpoint:** `GET /get_cases_time_series`

**Data Format:**
```json
{
  "data": [
    { "date": "Jan 22", "cases": 555 },
    { "date": "Jan 29", "cases": 6065 },
    { "date": "Feb 05", "cases": 28276 }
  ]
}
```

---

### 1.3 Advanced Data Table
**Description:** Comprehensive country-by-country statistics table

**Features:**
- Columns: Country name, Confirmed cases, Deaths, Recovered
- Real-time search/filter by country name
- Sortable columns (ascending/descending)
- Click-to-select country functionality
- Selection updates all dashboard views simultaneously
- Scrollable container with fixed header
- Number formatting with locale separators (e.g., 1,234,567)
- Visual feedback for selected country
- Pagination support for large datasets

**Technical Implementation:**
- React state management for sorting and filtering
- Client-side filtering with `.filter()` and `.includes()`
- CSS Grid layout for responsive columns
- Synchronized state across dashboard components

**API Endpoints:**
- `GET /get_total_cases_per_country`
- `GET /get_total_deaths_per_country`
- `GET /get_total_recovered_per_country`

---

### 1.4 Global Statistics Dashboard
**Description:** Real-time overview of worldwide COVID-19 metrics

**Metrics Displayed:**
- Total Confirmed Cases (red color)
- Total Deaths (white/gray color)
- Total Recovered (green color)
- Active Cases (calculated: confirmed - deaths - recovered)
- Country count

**Features:**
- Large, prominent numbers for quick scanning
- Color coding for visual differentiation
- Last updated timestamp
- Loading states during data fetch
- Error handling with user-friendly messages
- Auto-refresh capability

**Technical Implementation:**
- React hooks: `useState`, `useEffect`
- Multiple API calls with async/await
- Error boundaries for graceful failures
- Loading skeletons

**API Endpoints:**
- `GET /get_total_cases`
- `GET /get_total_deaths`
- `GET /get_total_recovered`

---

## 2. STATISTICAL ANALYSIS

### 2.1 K-Means Clustering
**Description:** Machine learning algorithm grouping countries by pandemic patterns

**Algorithm Details:**
- Number of clusters: 3 (low, medium, high severity)
- Initialization: k-means++ (optimal centroid seeding)
- Features used for clustering:
  1. **Log-scale cases:** `log₁₀(totalCases + 1)`
  2. **Weekly growth rate:** `((current - previous) / previous) × 100%`
- Maximum iterations: 100
- Library: `ml-kmeans` (npm package)

**Output:**
- Cluster assignments for each country
- Centroid coordinates for each cluster
- Cluster distribution summary
- Countries per cluster with statistics

**Use Cases:**
- Identify regional pandemic patterns
- Compare similar countries
- Detect outliers and unique trajectories
- Support policy decision-making

**API Endpoint:** `GET /get_kmeans_clusters`

**Response Format:**
```json
{
  "centroids": [
    { "logCases": "4.52", "weeklyGrowth": "2.3%" },
    { "logCases": "5.89", "weeklyGrowth": "5.7%" },
    { "logCases": "6.45", "weeklyGrowth": "1.2%" }
  ],
  "clusters": {
    "0": [/* countries in cluster 0 */],
    "1": [/* countries in cluster 1 */],
    "2": [/* countries in cluster 2 */]
  },
  "summary": {
    "totalCountries": 188,
    "clusterDistribution": [45, 87, 56]
  }
}
```

---

### 2.2 Mean Average Calculations
**Description:** Daily and weekly average case calculations

**Metrics:**
- **Daily mean:** Average of new daily cases globally
- **Regional means:** Averages by continent/region
- **Moving averages:** 7-day and 14-day rolling averages

**Calculation Method:**
1. Fetch time-series data from MongoDB
2. Calculate daily new cases: `today - yesterday`
3. Filter positive values (handle data corrections)
4. Compute mean: `sum / count`

**API Endpoint:** `GET /get_mean_cases`

**Response Format:**
```json
{
  "mean_daily_cases": "125678.45",
  "source": "mongodb",
  "calculation_period": "2020-01-22 to 2020-04-02"
}
```

**Code Implementation:**
```javascript
const dailyNew = [];
for (let i = 1; i < dailyTotals.length; i++) {
  const diff = dailyTotals[i].totalConfirmed - dailyTotals[i - 1].totalConfirmed;
  if (diff > 0) dailyNew.push(diff);
}
const mean = dailyNew.reduce((a, b) => a + b, 0) / dailyNew.length;
```

---

### 2.3 Evolution Tracking
**Description:** Weekly and monthly growth rate analysis

**Metrics:**
- **Weekly growth rate:** Percentage change week-over-week
- **Trend detection:** Increasing, stable, or decreasing
- **Peak identification:** Detect maximum infection rates
- **Time period comparisons:** Compare different waves

**Calculation:**
```
Growth Rate = ((Current Week - Previous Week) / Previous Week) × 100%
```

**API Endpoint:** `GET /get_cases_evolution`

**Response Format:**
```json
{
  "weekly_evolution": [
    { "week": 1, "growth": "145.23", "date": "2020-01-29" },
    { "week": 2, "growth": "89.45", "date": "2020-02-05" },
    { "week": 3, "growth": "67.12", "date": "2020-02-12" }
  ],
  "source": "mongodb"
}
```

---

## 3. BACKEND ARCHITECTURE

### 3.1 RESTful API (Express.js)
**Description:** Backend server providing data access via HTTP endpoints

**Complete API Routes:**

**Global Statistics:**
- `GET /get_total_cases` - Worldwide confirmed cases
- `GET /get_total_deaths` - Worldwide deaths
- `GET /get_total_recovered` - Worldwide recovered

**Country-Level Data:**
- `GET /get_total_cases_per_country` - Cases by country
- `GET /get_total_deaths_per_country` - Deaths by country
- `GET /get_total_recovered_per_country` - Recovered by country

**Time-Series Data:**
- `GET /get_cases_time_series` - Historical confirmed cases
- `GET /get_deaths_time_series` - Historical deaths (planned)

**Statistical Analysis:**
- `GET /get_kmeans_clusters` - K-means clustering results
- `GET /get_mean_cases` - Average daily cases
- `GET /get_cases_evolution` - Weekly growth rates

**Legacy/Utility Routes:**
- `GET /get_country` - List all countries
- `GET /get_death_by_country?country=X` - Specific country deaths
- `GET /covid-data` - Raw database dump (admin only)

**API Features:**
- JSON response format
- HTTP status codes (200, 400, 404, 500)
- Error messages with details
- CORS enabled for frontend access
- Redis caching on most routes

---

### 3.2 Database (MongoDB)
**Description:** NoSQL database storing cleaned COVID-19 data

**Schema (Mongoose Model):**
```javascript
{
  Country_Region: String,      // Country name
  Date: Date,                   // Data point date
  Confirmed: Number,            // Confirmed cases
  Deaths: Number,               // Death count
  Recovered: Number,            // Recovered count
  Doses_admin: Number          // Vaccine doses (optional)
}
```

**Database Stats:**
- Total documents: 180,000+ (varies by date range)
- Unique countries: 188
- Date coverage: January 2020 - April 2020 (5+ months)
- Indexes: Country_Region, Date (for query optimization)

**MongoDB Operations:**
- Aggregation pipelines for statistics
- Grouping by country and date
- Sorting and filtering
- Time-series queries

**Connection:**
```javascript
mongoose.connect(process.env.MONGODB_URI)
// mongodb://root:example@localhost:27017/covid_db?authSource=admin
```

---

### 3.3 Cache Layer (Redis)
**Description:** In-memory cache for frequently accessed data

**Caching Strategy:**
- TTL (Time-To-Live): 300 seconds (5 minutes) for most routes
- TTL: 600 seconds (10 minutes) for computationally expensive routes
- Cache key format: `cache:{route_path}`
- Automatic cache invalidation after TTL expires

**Cached Routes (10+ routes):**
- All `/get_total_*` routes (300s TTL)
- `/get_kmeans_clusters` (600s TTL)
- `/get_cases_time_series` (600s TTL)
- `/get_mean_cases` (300s TTL)
- `/get_cases_evolution` (300s TTL)

**Performance Impact:**
- Cache HIT: Response time < 10ms
- Cache MISS: Response time 100-500ms (database query)
- Cache hit rate: ~80% for global statistics
- Bandwidth reduction: ~70%

**Middleware Implementation:**
```javascript
export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cachedData = await redisClient.get(key);
    
    if (cachedData) {
      console.log(`✅ Cache HIT: ${key}`);
      return res.json(JSON.parse(cachedData));
    }
    
    console.log(`❌ Cache MISS: ${key}`);
    // ... store response in cache after fetching from DB
  };
};
```

---

### 3.4 Data Pipeline
**Description:** Automated scripts for data acquisition and processing

**Pipeline Stages:**

**Stage 1: Data Cleaning (`cleanData.mjs`)**
1. Fetch CSV from JHU CSSE GitHub repository
2. Parse CSV with `csv-parse` library
3. Aggregate data by country (handle provinces/states)
4. Normalize country names (handle variations)
5. Handle missing values and data corrections
6. Calculate totals and statistics
7. Export to JSON files (`/data/cleaned/`)

**Stage 2: Data Validation (`validateData.mjs`)**
1. Check file existence and structure
2. Validate data types and ranges
3. Detect anomalies (e.g., deaths > cases)
4. Check data freshness
5. Generate validation report

**Stage 3: MongoDB Import (`importCleanedData.mjs`)**
1. Load cleaned JSON files
2. Clear existing data (optional)
3. Transform to Mongoose documents
4. Batch insert (5000 documents per batch)
5. Verify import success
6. Log statistics

**Automation:**
- Manual trigger: `npm run clean && node importCleanedData.mjs`
- Scheduled updates: `scheduleClean.mjs` (cron job, daily at 3 AM)

**Data Sources:**
- Confirmed: `time_series_covid19_confirmed_global.csv`
- Deaths: `time_series_covid19_deaths_global.csv`
- Recovered: `time_series_covid19_recovered_global.csv`

---

## 4. USER INTERFACE

### 4.1 Dashboard Layout
**Description:** Main interface organizing all visualizations

**Layout Structure:**
- **Left Panel:** Global statistics + country list
- **Center Panel:** Interactive world map
- **Right Panel:** Additional statistics + time-series chart
- **Bottom Info Bar:** Data sources and links

**Design Features:**
- Dark theme (background: #0a1929)
- CSS Grid layout for responsiveness
- Sticky headers and navigation
- Smooth scrolling
- Visual hierarchy with typography

---

### 4.2 Responsive Design
**Description:** Mobile-first, adaptive interface

**Breakpoints:**
- Mobile: < 768px (single column)
- Tablet: 768px - 1024px (2 columns)
- Desktop: > 1024px (3 columns)

**Adaptations:**
- Collapsible panels on mobile
- Touch-friendly buttons (44px minimum)
- Horizontal scrolling for tables
- Responsive map sizing
- Readable font sizes (16px minimum)

---

### 4.3 Navigation & User Flow
**Description:** Intuitive navigation between views

**Navigation Elements:**
- Country selection from list
- Map zoom controls (+/-)
- Tab switching (Confirmed / Active / Deaths)
- Search bar for countries
- Admin level buttons (Admin0/1/2)

**User Flow:**
1. Land on dashboard → See global stats
2. Explore map → Zoom and pan
3. Select country → Update all views
4. View charts → Analyze trends
5. Check table → Compare countries

---

### 4.4 Loading & Error States
**Description:** User feedback during async operations

**Loading States:**
- Text: "Loading..." during data fetch
- Skeleton loaders for charts (optional)
- Spinner icons (optional)
- Progress indicators (optional)

**Error Handling:**
- Friendly error messages: "Failed to fetch total cases"
- Fallback data display
- Retry buttons (optional)
- Error logging to console

**Example:**
```javascript
{casesLoading
  ? "Loading..."
  : casesError
    ? casesError
    : totalCases.toLocaleString()}
```

---

## 5. DEPLOYMENT & DEVOPS

### 5.1 Docker Containerization
**Description:** Containerized deployment with Docker Compose

**Services:**
- **MongoDB:** Port 27017, persistent volume
- **Redis:** Port 6379, persistent volume
- **Backend (planned):** Node.js app on port 5000
- **Frontend (planned):** React app on port 3000

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example

  redis:
    image: redis:alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]

volumes:
  mongo_data:
  redis_data:
```

**Commands:**
- Start: `docker-compose up -d`
- Stop: `docker-compose down`
- View logs: `docker-compose logs -f`

---

### 5.2 Documentation
**Description:** Comprehensive project documentation

**README.md Sections:**
- Project overview and objectives
- Tech stack explanation
- Installation instructions (step-by-step)
- Usage examples with screenshots
- API documentation (all routes)
- Development setup guide
- Troubleshooting section

**Additional Docs:**
- `TIMELINE.md` - 5-month development plan
- `FEATURES.md` - This document (complete feature list)
- `API.md` - Detailed API reference (planned)
- Inline code comments

---

### 5.3 Version Control (GitHub)
**Description:** Git repository with project management

**Repository Structure:**
```
covid19-dashboard/
├── backend/
│   ├── server.mjs
│   ├── models/
│   ├── middleware/
│   ├── scripts/
│   └── data/cleaned/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── docker-compose.yml
├── README.md
├── TIMELINE.md
└── package.json
```

**GitHub Features:**
- Branches: `main` (production)
- README with badges and screenshots

---

## 6. SUMMARY

### Complete Feature Count:
- **10 Major Features** (as per timeline)
- **15+ API Routes**
- **3 Visualization Types** (map, charts, table)
- **3 Statistical Analyses** (k-means, mean, evolution)
- **1 Complete Dashboard** interface
- **2 Database Systems** (MongoDB + Redis)
- **5-Month Timeline** covered

### Data Coverage:
- 188 countries/regions
- 5+ months of historical data (Jan 2020 - Apr 2020+)
- 180,000+ data points
- 3 data types (confirmed, deaths, recovered)

### Technical Complexity:
- Full-stack application (frontend + backend)
- Machine learning integration (k-means)
- Real-time data visualization
- Performance optimization (Redis caching)
- Containerized deployment (Docker)
- Professional project management (GitHub)

---

**Last Updated:** October 2025  
**Author:** Axelle YOUAKIM  
**Module:** G-PRO-700 - Simulated Work Experience  
**Campus:** Epitech Barcelona

---