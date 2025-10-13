# COVID-19 Dashboard – 5-Month Timeline

This document presents the complete development plan of the COVID-19 Dashboard project over a **5-month period** (10 credits in total).

---

## MONTH 1

### Feature 1: Backend Infrastructure + Data Import
MongoDB + Mongoose schema configured  
Basic Express API routes operational  
CSV import from GitHub *(confirmed, deaths, recovered)*  
Data stored in MongoDB  
Testable API routes:  
`/get_total_cases`, `/get_total_deaths`, `/get_total_recovered`

**Technical Deliverables:**
- Docker Compose with MongoDB  
- Mongoose Models  
- 3 main GET API routes  
- Data import script  

---

### Feature 2: Basic Frontend Dashboard
Main layout with Header + Navbar  
Global totals displayed (cases / deaths / recovered)  
Country list with data (simple table)  
Frontend-backend connection functional  
Page accessible at `localhost:3000`

**Technical Deliverables:**
- Functional main page `/`  
- 3 global statistics displayed  
- Country data table  
- API calls connected to backend  

**To Document:**
- Global architecture (diagram)  
- Feature list for all 5 months  
- README with setup instructions  

---

## MONTH 2

### Feature 3: Interactive Map Visualization
World map with D3.js  
Red circles = cases per country (size proportional)  
Functional zoom/pan  
Real-time data from MongoDB  

**Technical Deliverables:**
- Operational `/map` page  
- Functional D3.js canvas  
- MongoDB data integration  

---

### Feature 4: Redis Cache + Backend Optimization
Redis installed and integrated  
5-minute cache on main routes  
Visible *Cache HIT/MISS* logs  
Improved API performance  

**Technical Deliverables:**
- Redis middleware  
- 10+ routes with cache  
- Updated Docker Compose  

---

## MONTH 3

### Feature 5: Advanced Data Table
Complete `/table` page  
Table with: Country, Cases, Deaths, Recovered  
Country search (filter)  
Sortable columns  

**Technical Deliverables:**
- Fully functional table page  
- Search/filter implemented  
- Data fetched from backend  

---

### Feature 6: K-Means Clustering
Operational `/get_kmeans_clusters` route  
Clustering countries into 3 groups  
Displaying clusters in the table  
Different colors per cluster  

**Technical Deliverables:**
- Integrated `ml-kmeans`  
- API route returning clusters  
- Frontend displaying clusters  

---

## MONTH 4

### Feature 7: Real-Time Charts
`/charts` page with Chart.js  
Line chart: global cases over time  
Data from `/get_cases_time_series`  
Real-time updates  

**Technical Deliverables:**
- Integrated Chart.js  
- Functional time series route  
- Fully working charts page  

---

### Feature 8: 28-Day Statistics
Display of 28-day evolution  
Routes: `/get_28_day_cases`, `/get_28_day_deaths`  
Automatic difference calculation  
Widget in dashboard showing results  

**Technical Deliverables:**
- 2 operational 28-day routes  
- Dashboard widget displaying data  
- Backend-side calculations  

---

## MONTH 5

### Feature 9: Vaccines + Animations
Operational `/get_total_vaccine_doses` route  
Vaccine dose display in dashboard  
Light animations *(fade-in, transitions)*  
Completed **About** page  

**Technical Deliverables:**
- Vaccine dose routes  
- Basic CSS animations  
- About page with project info  

---

### Feature 10: Polish + Final Documentation
Responsive design (desktop + mobile)  
Consistent dark mode  
All navigation links functional  
Complete README with setup  
Commented code  
API routes tested  

**Technical Deliverables:**
- Responsive CSS  
- Complete documentation  
- All bugs fixed  
- Demo video *(optional)*  

---

## Summary
At the end of the 5 months:
- Robust and optimized backend (MongoDB + Redis)  
- Interactive and responsive frontend (Next.js + Chart.js + D3.js)  
- Dynamic and analytical visualizations  
- Clear and complete documentation  

---
