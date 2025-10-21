# COVID-19 Dashboard – 5-Month Timeline

This document presents the complete development plan of the COVID-19 Dashboard project over a **5-month period** (10 credits in total).

---

## MONTH 1

### Feature 1: Backend Infrastructure + Data Import
MongoDB + Mongoose schema configured  
Basic Express API routes operational  
CSV import from JHU CSSE GitHub repository *(confirmed, deaths, recovered)*  
Data cleaned and stored in MongoDB  
Testable API routes:  
`/get_total_cases`, `/get_total_deaths`, `/get_total_recovered`

**Technical Deliverables:**
- Docker Compose with MongoDB  
- Mongoose Models  
- RESTful API structure  
- Data cleaning pipeline script  

---

### Feature 2: Basic Frontend Dashboard
Main layout with Header + Navbar  
Global totals displayed (cases / deaths / recovered)  
Country list with data (simple table)  
Frontend-backend connection functional (React + Axios)  
Page accessible at `localhost:3000`

**Technical Deliverables:**
- Functional main page `/`  
- 3 global statistics displayed  
- Country data table  
- API calls connected to backend  

**Documentation:**
- Architecture diagram (frontend ↔ backend ↔ database)  
- Complete feature list (this document)  
- README with setup instructions  

---

## MONTH 2

### Feature 3: Interactive Map Visualization
World map with D3.js  
Red bubbles = cases per country (size proportional to case count)  
Interactive hover tooltips showing country details  
Functional zoom/pan with D3 zoom behavior  
Real-time data from MongoDB via API  

**Technical Deliverables:**
- Operational `/map` component  
- D3.js GeoJSON rendering  
- MongoDB data integration  
- Responsive SVG canvas  

---

### Feature 4: Redis Cache + Backend Optimization
Redis installed and integrated  
Cache middleware on frequently requested routes  
5-minute TTL on global statistics  
Cache HIT/MISS logging visible in console  
Improved API response time  

**Technical Deliverables:**
- Redis middleware implemented  
- 5+ routes with caching layer  
- Updated Docker Compose with Redis service  
- Performance comparison documented  

---

## MONTH 3

### Feature 5: Advanced Data Table
Complete `/table` page with full dataset  
Table columns: Country, Confirmed, Deaths, Recovered  
Country search functionality (real-time filter)  
Sortable columns (ascending/descending)  
Pagination for large datasets  

**Technical Deliverables:**
- Fully functional table component  
- Client-side search/filter implemented  
- Sorting logic with React state  
- Data fetched from backend 

---

### Feature 6: K-Means Clustering Analysis
Operational `/get_kmeans_clusters` route  
K-means algorithm clustering countries into 3 groups  
Clusters based on cases/deaths/recovered patterns  
Cluster results displayed in table with color coding  
Visual representation of regional pandemic patterns  

**Technical Deliverables:**
- K-means implementation (ml-kmeans or custom)  
- API route returning cluster assignments  
- Frontend displaying clusters with distinct colors  
- Clustering logic documented  

---

## MONTH 4

### Feature 7: Time-Series Charts
`/charts` page with **Recharts** library  
Line chart: global cases over time  
Area chart: cumulative deaths and recoveries  
Data from `/get_cases_time_series` route (timeline)
Interactive tooltips and legends  

**Technical Deliverables:**
- Integrated Recharts (LineChart, AreaChart)  
- Time series API endpoint functional  
- Fully working charts page with multiple visualizations  
- Date range selector implemented  

---

### Feature 8: Statistical Analysis & Evolution Tracking
Mean/average calculations (global and by region)  
Routes: `/api/statistics/mean`, `/api/statistics/evolution`  
Growth rate and trend analysis  
Moving averages (7-day, 14-day)  
Dashboard widgets displaying statistical insights  

**Technical Deliverables:**
- Statistical calculation routes operational  
- Dashboard displaying mean, growth rate, trends  
- Backend-side data aggregation  
- Comparison between time periods  

---

## MONTH 5

### Feature 9: UI/UX Polish & Responsive Design
Fully responsive design (desktop, tablet, mobile)  
Consistent dark mode theme  
Loading states with skeleton loaders  
Error handling with user-friendly messages  
Improved navigation with active link indicators  

**Technical Deliverables:**
- Mobile-first CSS/responsive layout  
- Loading and error state components  
- Polished UI across all pages  
- Accessibility improvements  

---

### Feature 10: Final Documentation & Deployment
Complete README with:
  - Installation instructions
  - Tech stack explanation
  - API documentation
  - Usage examples  
All navigation links functional  
Code commented and cleaned  
Docker deployment ready (frontend + backend + MongoDB + Redis)  

**Technical Deliverables:**
- Production-ready Docker Compose  
- Comprehensive documentation  
- All features tested and working  
- Demo screenshots/video (optional)  

---

## Summary
At the end of the 5 months:
- Robust and optimized backend (Express + MongoDB + Redis)  
- Interactive and responsive frontend (React + Recharts + D3.js)  
- Dynamic and analytical visualizations (map, charts, tables)  
- Statistical analysis (k-means, means, trends)  
- Clear and complete documentation  

---

**Tech Stack:**
- **Frontend:** Next.js, React, Recharts, D3.js, Custom CSS
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Cache:** Redis
- **DevOps:** Docker, Docker Compose
- **Version Control:** GitHub