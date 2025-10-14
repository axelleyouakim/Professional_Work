# Navigation Structure (Arborescence du Frontend)

## Application Routes

This COVID-19 Dashboard includes the following navigation structure:

```
/                   → Dashboard (Main page with statistics and map)
├── /table          → Data Table (Searchable country statistics)
├── /charts         → Charts View (Time-series visualizations)
├── /map            → Map View (Geographic data visualization)
└── /about          → About Page (Project information)
```

## Navigation Component

The application uses a persistent navigation bar (`Navbar.js`) that appears on all pages below the header. Users can navigate between different views by clicking on the navigation links.

### Navigation Features:
- **Dashboard**: Interactive overview with real-time statistics, country lists, and world map
- **Data Table**: Sortable and searchable table showing all countries' COVID-19 data
- **Charts**: Time-series graphs showing trends over time
- **Map View**: Interactive world map with zoom controls and case visualization
- **About**: Information about the project, data sources, and technology stack

## File Structure

```
src/
├── app/
│   ├── components/
│   │   ├── Header.js           # Top header with JHU branding
│   │   ├── Header.css
│   │   ├── Navbar.js           # Navigation bar component
│   │   ├── Navbar.css
│   │   ├── Dashboard.js        # Main dashboard component
│   │   └── Dashboard.css
│   ├── table/
│   │   ├── page.js             # Table view page
│   │   └── table.css
│   ├── charts/
│   │   ├── page.js             # Charts view page
│   │   └── charts.css
│   ├── map/
│   │   ├── page.js             # Map view page
│   │   └── map.css
│   ├── about/
│   │   ├── page.js             # About page
│   │   └── about.css
│   ├── page.js                 # Main entry point (Dashboard)
│   └── globals.css
└── services/
    └── api.js                  # API service functions
```

## How Navigation Works

1. **Header Component**: Displays the JHU branding and project title on all pages
2. **Navbar Component**: Provides clickable links to navigate between pages
3. **Next.js Routing**: Uses Next.js App Router for client-side navigation
4. **Active State**: Navigation links highlight the current page

## Implementation Details

Each page follows this structure:
```jsx
import Header from '../components/Header';
import Navbar from '../components/Navbar';

const PageComponent = () => {
  return (
    <div>
      <Header />
      <Navbar />
      {/* Page-specific content */}
    </div>
  );
};
```

## Navigation Screenshots

To demonstrate the navigation in action:

1. **Navigation Bar Appearance**: The navbar appears below the header on all pages
2. **Active Page Indication**: Current page is highlighted with orange underline
3. **Hover Effect**: Navigation links change color and background on hover
4. **Responsive Design**: Navigation adapts to smaller screens with column layout

## User Flow

```
User enters application
    ↓
Lands on Dashboard (/)
    ↓
Can navigate to:
    • Table (/table) - View detailed country data
    • Charts (/charts) - Analyze trends
    • Map (/map) - Geographic visualization
    • About (/about) - Learn about the project
    ↓
Can return to Dashboard at any time
```

## Testing Navigation

To verify navigation works correctly:

1. Start the application: `npm run dev`
2. Visit `http://localhost:3000`
3. Click each navigation link to verify page transitions
4. Confirm navbar appears on all pages
5. Check that active page is highlighted
6. Test responsive behavior on mobile devices