import React, { useEffect, useState, useRef } from 'react';
import WorldMap from 'react-world-map';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const geoUrl = 'https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json';

import { 
  getGlobalTotalCases, 
  getGlobalTotalDeaths, 
  get28DayCases, 
  get28DayDeaths, 
  getTotalVaccineDoses,
  getTotalVaccineDosesPerCountry, 
  get28DayVaccineDoses,
  get28DayVaccineDosesPerCountry,
  getTotalCasesPerCountry,
  getTotalDeathsPerCountry,
  get28DayCasesPerCountry,
  get28DayDeathsPerCountry,
  getTotalRecoveredPerCountry,
  getGlobalTotalRecovered
} from '../../services/api';
import './Dashboard.css';

const Dashboard = ({ style }) => {
  const [totalCases, setTotalCases] = useState(null);
  const [totalDeaths, setTotalDeaths] = useState(null);
  const [casesLoading, setCasesLoading] = useState(true);
  const [deathsLoading, setDeathsLoading] = useState(true);
  const [casesError, setCasesError] = useState('');
  const [deathsError, setDeathsError] = useState('');

  const [cases28Day, setCases28Day] = useState(null);
  const [cases28DayLoading, setCases28DayLoading] = useState(true);
  const [cases28DayError, setCases28DayError] = useState('');

  const [deaths28Day, setDeaths28Day] = useState(null);
  const [deaths28DayLoading, setDeaths28DayLoading] = useState(true);
  const [deaths28DayError, setDeaths28DayError] = useState('');

  const [totalVaccineDoses, setTotalVaccineDoses] = useState(null);
  const [vaccineDosesLoading, setVaccineDosesLoading] = useState(true);
  const [vaccineDosesError, setVaccineDosesError] = useState('');

  const [totalVaccineDosesPerCountry, setTotalVaccineDosesPerCountry] = useState(null);
  const [vaccineDosesPerCountryLoading, setVaccineDosesPerCountryLoading] = useState(true);
  const [vaccineDosesPerCountryError, setVaccineDosesPerCountryError] = useState('');

  const [vaccineDoses28Day, setVaccineDoses28Day] = useState(null);
  const [vaccineDoses28DayLoading, setVaccineDoses28DayLoading] = useState(true);
  const [vaccineDoses28DayError, setVaccineDoses28DayError] = useState('');

  const [vaccineDoses28DayPerCountry, setVaccineDoses28DayPerCountry] = useState(null);
  const [vaccineDoses28DayPerCountryLoading, setVaccineDoses28DayPerCountryLoading] = useState(true);
  const [vaccineDoses28DayPerCountryError, setVaccineDoses28DayPerCountryError] = useState('');

  const [countryCases, setCountryCases] = useState([]);
  const [countryCasesLoading, setCountryCasesLoading] = useState(true);
  const [countryCasesError, setCountryCasesError] = useState('');

  const [totalCasesPerCountry, setTotalCasesPerCountry] = useState([]);
  const [totalCasesPerCountryLoading, setTotalCasesPerCountryLoading] = useState(true);
  const [totalCasesPerCountryError, setTotalCasesPerCountryError] = useState('');

  const [totalDeathsPerCountry, setTotalDeathsPerCountry] = useState([]);
  const [totalDeathsPerCountryLoading, setTotalDeathsPerCountryLoading] = useState(true);
  const [totalDeathsPerCountryError, setTotalDeathsPerCountryError] = useState('');

  const [cases28DayPerCountry, setCases28DayPerCountry] = useState(null);
  const [cases28DayPerCountryLoading, setCases28DayPerCountryLoading] = useState(true);
  const [cases28DayPerCountryError, setCases28DayPerCountryError] = useState('');

  const [deaths28DayPerCountry, setDeaths28DayPerCountry] = useState(null);
  const [deaths28DayPerCountryLoading, setDeaths28DayPerCountryLoading] = useState(true);
  const [deaths28DayPerCountryError, setDeaths28DayPerCountryError] = useState('');

  const [totalRecovered, setTotalRecovered] = useState(null);
  const [totalRecoveredPerCountry, setTotalRecoveredPerCountry] = useState([]);
  const [recoveredLoading, setRecoveredLoading] = useState(true);
  const [recoveredError, setRecoveredError] = useState('');

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCountry, setSelectedCountry] = useState(null);
  
  const data1 = [
    { week: '2022', cases: 6000000 },
  ];

  const formatYAxis = (tick) => {
    if (tick >= 1000000) {
      return `${tick / 1000000}M`;
    }
    return tick;
  };

  const data2 = [
    { week: 'Week 1', deaths: 30 },
    { week: 'Week 2', deaths: 50 },
    { week: 'Week 3', deaths: 45 },
  ];

  const data3 = [
    { week: 'Week 1', recovered: 800 },
    { week: 'Week 2', recovered: 1200 },
    { week: 'Week 3', recovered: 1000 },
  ];

    // HARDCODED: Replace this entire array with data from your API/database
  // This should come from an API call like: fetch('/api/chart-data')
  const chartData = [
    { date: "Jan", cases: 100000 },
    { date: "Feb", cases: 300000 },
    { date: "Mar", cases: 600000 },
    { date: "Apr", cases: 938373 },
  ]

  const filteredCountries = totalCasesPerCountry.filter((country) =>
    country.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCountryClick = (countryName) => {
    setSelectedCountry(countryName);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 1, 6))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 1, 1))
  }

  const canvasRef = useRef(null)
  const [zoom, setZoom] = useState(2)
  const [center, setCenter] = useState({ x: 0, y: 20 })

    useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    const tileSize = 256

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Calculate which tiles to load based on zoom and center
    const numTiles = Math.pow(2, zoom)
    const centerTileX = Math.floor(((center.x + 180) / 360) * numTiles)
    const centerTileY = Math.floor(
      ((1 - Math.log(Math.tan((center.y * Math.PI) / 180) + 1 / Math.cos((center.y * Math.PI) / 180)) / Math.PI) / 2) *
        numTiles,
    )

    // Clear canvas
    ctx.fillStyle = "#0a1929"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Calculate how many tiles we need to cover the canvas
    const tilesX = Math.ceil(canvas.width / tileSize) + 2
    const tilesY = Math.ceil(canvas.height / tileSize) + 2

    const startTileX = centerTileX - Math.floor(tilesX / 2)
    const startTileY = centerTileY - Math.floor(tilesY / 2)

    // Load and draw tiles
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const tileX = (startTileX + x + numTiles) % numTiles
        const tileY = startTileY + y

        if (tileY >= 0 && tileY < numTiles) {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.src = `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${tileX}/${tileY}.png`

          img.onload = () => {
            const drawX = x * tileSize - (canvas.width / 2 - (tilesX * tileSize) / 2)
            const drawY = y * tileSize - (canvas.height / 2 - (tilesY * tileSize) / 2)
            ctx.drawImage(img, drawX, drawY, tileSize, tileSize)
          }
        }
      }
    }
  }, [zoom, center])

  useEffect(() => {
    const fetchTotalCases = async () => {
      try {
        const data = await getGlobalTotalCases();
        setTotalCases(data.total_cases);
      } catch (error) {
        console.error('Error fetching total cases:', error);
        setCasesError('Failed to fetch total cases.');
      } finally {
        setCasesLoading(false);
      }
    };
    fetchTotalCases();
  }, []);

  useEffect(() => {
    const fetchTotalDeaths = async () => {
      try {
        const data = await getGlobalTotalDeaths();
        setTotalDeaths(data.total_deaths);
      } catch (error) {
        console.error('Error fetching total deaths:', error);
        setDeathsError('Failed to fetch total deaths.');
      } finally {
        setDeathsLoading(false);
      }
    };
    fetchTotalDeaths();
  }, []);

  useEffect(() => {
    const fetch28DayCases = async () => {
      try {
        const data = await get28DayCases();
        setCases28Day(data.total_28_day_cases);
      } catch (error) {
        console.error('Error fetching 28-day cases:', error);
        setCases28DayError('Failed to fetch 28-day cases.');
      } finally {
        setCases28DayLoading(false);
      }
    };
    fetch28DayCases();
  }, []);

  useEffect(() => {
    const fetch28DayCasesPerCountry = async () => {
      try {
        const data = await get28DayCasesPerCountry();
        console.log('Fetched 28-Day Cases Per Country:', data); // debugging
        setCases28DayPerCountry(data.total_28_day_cases_per_country);
      } catch (error) {
        console.error('Error fetching 28-day cases per country:', error);
        setCases28DayPerCountryError('Failed to fetch 28-day cases.');
      } finally {
        setCases28DayPerCountryLoading(false);
      }
    };
    fetch28DayCasesPerCountry();
  }, []);

  useEffect(() => {
    const fetch28DayDeaths = async () => {
      try {
        const data = await get28DayDeaths();
        console.log('Fetched 28-Day Deaths Data:', data);
        setDeaths28Day(data.total_28_day_deaths);
      } catch (error) {
        console.error('Error fetching 28-day deaths:', error);
        setDeaths28DayError('Failed to fetch 28-day deaths.');
      } finally {
        setDeaths28DayLoading(false);
      }
    };
    fetch28DayDeaths();
  }, []);

  useEffect(() => {
    const fetch28DayDeathsPerCountry = async () => {
      try {
        const data = await get28DayDeathsPerCountry();
        // console.log('Fetched 28-Day Deaths Per Country:', data); // debugging
        setDeaths28DayPerCountry(data.total_28_day_deaths_per_country);
      } catch (error) {
        console.error('Error fetching 28-day deaths per country:', error);
        setDeaths28DayPerCountryError('Failed to fetch 28-day deaths per country.');
      } finally {
        setDeaths28DayPerCountryLoading(false);
      }
    };
    fetch28DayDeathsPerCountry();
  }, []);  

  useEffect(() => {
    const fetchTotalVaccineDoses = async () => {
      try {
        const data = await getTotalVaccineDoses();
        setTotalVaccineDoses(data.total_vaccine_doses);
      } catch (error) {
        console.error('Error fetching total vaccine doses:', error);
        setVaccineDosesError('Failed to fetch total vaccine doses.');
      } finally {
        setVaccineDosesLoading(false);
      }
    };
    fetchTotalVaccineDoses();
  }, []);

  useEffect(() => {
    const fetchTotalVaccineDosesPerCountry = async () => {
      try {
        const data = await getTotalVaccineDosesPerCountry();
        setTotalVaccineDosesPerCountry(data?.data || []);
      } catch (error) {
        console.error('Error fetching vaccine doses per country:', error);
        setVaccineDosesPerCountryError('Failed to fetch vaccine doses per country.');
      } finally {
        setVaccineDosesPerCountryLoading(false);
      }
    };
    
    fetchTotalVaccineDosesPerCountry();
  }, []);

  useEffect(() => {
    const fetch28DayVaccineDoses = async () => {
      try {
        const data = await get28DayVaccineDoses();
        setVaccineDoses28Day(data.total_28_day_vaccine_doses);
      } catch (error) {
        console.error('Error fetching 28-day vaccine doses:', error);
        setVaccineDoses28DayError('Failed to fetch 28-day vaccine doses.');
      } finally {
        setVaccineDoses28DayLoading(false);
      }
    };
    fetch28DayVaccineDoses();
  }, []);

  useEffect(() => {
    const fetch28DayVaccineDosesPerCountry = async () => {
      try {
        const data = await get28DayVaccineDosesPerCountry();
        setVaccineDoses28DayPerCountry(data.total_28_day_vaccine_doses);
      } catch (error) {
        console.error('Error fetching 28-day vaccine doses per country:', error);
        setVaccineDoses28DayPerCountryError('Failed to fetch 28-day vaccine doses per country.');
      } finally {
        setVaccineDoses28DayPerCountryLoading(false);
      }
    };
    fetch28DayVaccineDosesPerCountry();
  }, []);

  useEffect(() => {
    const fetchTotalCasesPerCountry = async () => {
      try {
        const data = await getTotalCasesPerCountry();
        setTotalCasesPerCountry(data?.data || []);
      } catch (error) {
        console.error('Error fetching total cases per country:', error);
        setTotalCasesPerCountryError('Failed to fetch total cases per country.');
      } finally {
        setTotalCasesPerCountryLoading(false);
      }
    };
    fetchTotalCasesPerCountry();
  }, []);

  useEffect(() => {
    const fetchTotalDeathsPerCountry = async () => {
      try {
        const data = await getTotalDeathsPerCountry();
        setTotalDeathsPerCountry(data?.data || []);
      } catch (error) {
        console.error('Error fetching total deaths per country:', error);
        setTotalDeathsPerCountryError('Failed to fetch total deaths per country.');
      } finally {
        setTotalDeathsPerCountryLoading(false);
      }
    };
    fetchTotalDeathsPerCountry();
  }, []);

  useEffect(() => {
  const fetchRecovered = async () => {
    try {
      setRecoveredLoading(true);
      const global = await getGlobalTotalRecovered();
      setTotalRecovered(global.total_recovered);

      const perCountry = await getTotalRecoveredPerCountry();
      setTotalRecoveredPerCountry(perCountry.data);
    } catch (error) {
      setRecoveredError('Failed to fetch recovered data');
    } finally {
      setRecoveredLoading(false);
    }
  };

  fetchRecovered();
}, []);

return (
  <>
    {/* Main Dashboard Grid */}
    <div className="dashboard-grid">
      {/* Left Panel */}
      <div className="left-panel">
        <div className="stat-box">
          <h3 className="stat-label">Total Confirmed</h3>
          <p className="stat-value red-text">
            {casesLoading
              ? "Loading..."
              : casesError
              ? casesError
              : selectedCountry
              ? totalCasesPerCountry?.find((data) => data.country === selectedCountry)
                  ?.total_cases?.toLocaleString() || "No data available"
              : totalCases !== null && totalCases !== undefined
              ? totalCases.toLocaleString()
              : "No data available"}
          </p>
        </div>

        <div className="country-list-container">
          <h4 className="country-list-title">
            Confirmed Cases by Country/Region
            <br />
            /Sovereignty
          </h4>
          <div className="country-list">
            {totalCasesPerCountry.map((countryData) => (
              <div
                key={countryData.country}
                className={`country-item ${selectedCountry === countryData.country ? "selected" : ""}`}
                onClick={() => handleCountryClick(countryData.country)}
              >
                <span className="country-cases red-text">
                  {countryData.total_cases?.toLocaleString() || "N/A"}
                </span>
                <span> </span>
                <span className="country-name">{countryData.country}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="last-updated">
          <h4 className="update-label">Last Updated at (M/D/YYYY)</h4>
          <p className="update-time">4/2/2020 9:02:01 AM</p>
        </div>
      </div>

      <div className="map-panel">
        <div className="view-toggle-buttons">
          <button className="view-toggle-btn" title="Bookmark">…</button>
          <button className="view-toggle-btn" title="List view">…</button>
          <button className="view-toggle-btn" title="Grid view">…</button>
        </div>

        <canvas ref={canvasRef} className="map-container" />

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={handleZoomIn} title="Zoom in">+</button>
          <button className="zoom-btn" onClick={handleZoomOut} title="Zoom out">−</button>
        </div>

        <div className="map-tabs">
          <button className="map-tab active">Cumulative Confirmed Cases</button>
          <button className="map-tab">Active Cases</button>
        </div>

        <div className="info-bar">
          <div className="info-section">
            <span className="info-label">{totalCasesPerCountry.length}</span>
            <span className="info-sublabel">countries/regions</span>
          </div>
          <div className="info-text">
            <strong>Lancet Inf Dis</strong> Article: <a href="#">Here</a>. Mobile Version: <a href="#">Here</a>.
            Visualization: <a href="#">JHU CSSE</a>. Automation Support: <a href="#">Esri Living Atlas team</a> and{" "}
            <a href="#">JHU APL</a>. <a href="#">Contact Us</a>. <a href="#">FAQ</a>.<br />
            Data sources: WHO, CDC, ECDC, NHC, DXY, 1point3acres, Worldometers.info, BNO, state and national government
            health departments, and local media reports. Read more in <a href="#">this blog</a>.<br />
            Downloadable database: GitHub: <a href="#">Here</a>. Feature layer: <a href="#">Here</a>.
          </div>
        </div>
      </div>

      <div className="right-panels-container-narrow">
        {/* Top section with Deaths and Recovered stacked */}
        <div className="right-stats-column">
          {/* Total Deaths */}
          <div className="right-stat-panel">
            <div className="stat-box">
              <h3 className="stat-label">Total Deaths</h3>
                <p className="stat-value white-text">
    {deathsLoading
      ? 'Loading...'
      : deathsError
      ? deathsError
      : selectedCountry
      ? totalDeathsPerCountry?.find((data) => data.country === selectedCountry)?.total_deaths?.toLocaleString() || 'No data available'
      : totalDeaths !== null && totalDeaths !== undefined
      ? totalDeaths.toLocaleString()
      : 'No data available'}
  </p>

            </div>

            <div className="country-list-container">
              <div className="country-list">
                {totalDeathsPerCountry.map((countryData) => (
                  <div key={countryData.country} className="country-item">
                    <span className="country-deaths white-text">{totalDeathsPerCountryLoading
  ? "Loading..."
  : totalDeathsPerCountryError
  ? totalDeathsPerCountryError
  : totalDeathsPerCountry.length > 0
  ? totalDeathsPerCountry.map((countryData) => (
      <div key={countryData.country} className="country-item">
        <span className="country-deaths white-text">
          {countryData.total_deaths?.toLocaleString() || "N/A"}
        </span>{" "}
        <span className="country-name-small">{countryData.country}</span>
      </div>
    ))
  : "No data available"}</span>{" "}
                    <span className="country-name-small">deaths</span>
                    <br />
                    <span className="country-name">{countryData.country}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Total Recovered */}
          <div className="right-stat-panel">
            <div className="stat-box">
              <h3 className="stat-label">Total Recovered</h3>
                  <p className="stat-value green-text">
      {recoveredLoading
        ? 'Loading...'
        : recoveredError
        ? recoveredError
        : totalRecovered !== null && totalRecovered !== undefined
        ? totalRecovered.toLocaleString()
        : 'No data available'}
    </p>
            </div>

            <div className="country-list-container">
              <div className="country-list">
                {recoveredLoading
        ? <p>Loading...</p>
        : recoveredError
        ? <p>{recoveredError}</p>
        : totalRecoveredPerCountry.length > 0
        ? totalRecoveredPerCountry.map((countryData) => (
            <div key={countryData.country} className="country-item">
              <span className="country-recovered green-text">
                {countryData.total_recovered?.toLocaleString() || 'N/A'}
              </span>{" "}
              <span className="country-name-small">recovered</span>
              <br />
              <span className="country-name">{countryData.country}</span>
            </div>
          ))
        : <p>No data available</p>
      }
              </div>
            </div>
          </div>
        </div>

        {/* Chart below both stats */}
        <div className="chart-panel">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="cases"
                  stroke="#ff9800"
                  strokeWidth={2}
                  dot={{ fill: "#ff9800", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="chart-tabs">
              <button className="chart-tab active">Confirmed</button>
              <button className="chart-tab">Logarithmic</button>
              <button className="chart-tab">Daily Increase</button>
            </div>
            </div>
            </div>
            </div>
        </div>
  </>
);

};

export default Dashboard;