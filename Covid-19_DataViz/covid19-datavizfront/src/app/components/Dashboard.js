import React, { useState, useRef, useEffect, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import * as d3 from 'd3';
import * as topojson from "topojson-client";

// Import des hooks TanStack Query
import { useCovidDashboardData } from '../hooks/useCovidData';

// Import des nouveaux composants (OPTIONNEL - commentez si pas encore créés)
import TimelineSlider from './TimelineSlider';
import CountrySearch from './CountrySearch';

import "./Dashboard.css";

const Dashboard = ({ style }) => {
  // ============= TanStack Query Hooks =============
  const {
    totalCases,
    totalDeaths,
    totalRecovered,
    cases28Day,
    deaths28Day,
    totalCasesPerCountry,
    totalDeathsPerCountry,
    totalRecoveredPerCountry,
    cases28DayPerCountry,
    deaths28DayPerCountry,
    totalVaccineDoses,
    vaccines28Day,
    vaccines28DayPerCountry,
    chartData,
  } = useCovidDashboardData();

  // ============= Local State =============
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [adminLevel, setAdminLevel] = useState("admin0");
  const [worldData, setWorldData] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const canvasRef = useRef(null);

  // ============= NEW: Timeline & Search State =============
  const [selectedPeriod, setSelectedPeriod] = useState({ id: 'all', days: null });
  const [searchTerm, setSearchTerm] = useState('');

  // ============= Client-side Filtering Functions =============
  
  // Fonction pour filtrer les données du graphique par période
  const filterChartDataByPeriod = (data, days) => {
    if (!days || !data || data.length === 0) {
      return data;
    }
    // Garder les X derniers jours
    return data.slice(-days);
  };

  // Fonction pour filtrer les pays par recherche
  const filterCountriesBySearch = (countries, term) => {
    if (!term || !countries) {
      return countries;
    }
    const searchTerm = term.toLowerCase().trim();
    return countries.filter((country) =>
      country.country.toLowerCase().includes(searchTerm)
    );
  };

  // ============= Filtered Data =============
  
  // Filtrer les données du graphique par période
  const filteredChartData = filterChartDataByPeriod(chartData.data || [], selectedPeriod.days);

  // Filtrer les pays par recherche
  const filteredCasesCountries = filterCountriesBySearch(
    totalCasesPerCountry.data || [], 
    searchTerm
  );
  const filteredDeathsCountries = filterCountriesBySearch(
    totalDeathsPerCountry.data || [], 
    searchTerm
  );
  const filteredRecoveredCountries = filterCountriesBySearch(
    totalRecoveredPerCountry.data || [], 
    searchTerm
  );

  // ============= Event Handlers =============
  
  const handleCountryClick = (countryName) => {
    setSelectedCountry(countryName);
  };

  const handleAdminLevelChange = (level) => {
    setAdminLevel(level);
    console.log(`Admin level changed to: ${level}`);
  };

  const handlePeriodChange = useCallback((period) => {
    setSelectedPeriod(period);
    console.log('Period changed to:', period.label);
  }, []);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  // ============= Map Data Loading =============
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json")
      .then((response) => response.json())
      .then((topology) => {
        const countries = topojson.feature(topology, topology.objects.countries);
        countries.features.forEach((feature) => {
          const centroid = d3.geoCentroid(feature);
          feature.properties.centroid = centroid;
        });
        setWorldData(countries);
      })
      .catch((err) => console.error("Error loading map:", err));
  }, []);

  // ============= Map Rendering =============
  useEffect(() => {
    if (!worldData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    const width = (canvas.width = canvas.offsetWidth);
    const height = (canvas.height = canvas.offsetHeight);

    const projection = d3
      .geoMercator()
      .scale(width / (2 * Math.PI))
      .translate([width / 2, height / 2]);

    const path = d3.geoPath(projection, context);

    let currentTransform = d3.zoomIdentity;

    const oceanLabels = [
      { name: "PACIFIC OCEAN", coords: [-160, 0] },
      { name: "ATLANTIC OCEAN", coords: [-30, 15] },
      { name: "INDIAN OCEAN", coords: [75, -15] },
      { name: "ARCTIC OCEAN", coords: [0, 75] },
    ];

    const continentLabels = [
      { name: "NORTH AMERICA", coords: [-100, 45] },
      { name: "SOUTH AMERICA", coords: [-60, -15] },
      { name: "EUROPE", coords: [15, 52] },
      { name: "AFRICA", coords: [20, 5] },
      { name: "ASIA", coords: [90, 45] },
      { name: "AUSTRALIA", coords: [135, -25] },
    ];

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.save();

      context.translate(currentTransform.x, currentTransform.y);
      context.scale(currentTransform.k, currentTransform.k);

      context.fillStyle = "#0a1929";
      context.fillRect(-width * 2, -height * 2, width * 5, height * 5);

      context.fillStyle = "#1a2f3f";
      context.strokeStyle = "#2a4a5f";
      context.lineWidth = 0.5 / currentTransform.k;

      worldData.features.forEach((feature) => {
        context.beginPath();
        path(feature);
        context.fill();
        context.stroke();
      });

      drawCasesCircles(context, projection, currentTransform.k);

      const k = currentTransform.k;

      if (k < 2) {
        drawLabels(context, oceanLabels, projection, k, "#3a5a7a", 14, 0.7, "italic");
        drawLabels(context, continentLabels, projection, k, "#e0e0e0", 13, 0.9, "bold");
      } else {
        drawCountryLabels(context, projection, k);
      }

      context.restore();
    };

    const drawCasesCircles = (ctx, proj, zoom) => {
      const countriesData = filteredCasesCountries;
      if (!countriesData || countriesData.length === 0) return;

      const maxCases = Math.max(...countriesData.map((c) => c.total_cases || 0));

      countriesData.forEach((countryData) => {
        if (!countryData.total_cases || countryData.total_cases === 0) return;

        const feature = worldData.features.find((f) => {
          const name = f.properties.name || f.properties.NAME || f.properties.admin || f.properties.ADMIN || "";
          return name.toLowerCase() === countryData.country.toLowerCase();
        });

        if (feature && feature.properties.centroid) {
          const coords = proj(feature.properties.centroid);

          if (
            coords &&
            coords[0] >= -width &&
            coords[0] <= width * 2 &&
            coords[1] >= -height &&
            coords[1] <= height * 2
          ) {
            const baseRadius = Math.sqrt(countryData.total_cases / maxCases) * 40;
            const radius = Math.max(3, baseRadius / zoom);

            ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
            ctx.shadowBlur = 10 / zoom;
            ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
            ctx.beginPath();
            ctx.arc(coords[0], coords[1], radius, 0, 2 * Math.PI);
            ctx.fill();

            ctx.strokeStyle = "rgba(255, 100, 100, 0.8)";
            ctx.lineWidth = 1 / zoom;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      });
    };

    const drawCountryLabels = (ctx, proj, zoom) => {
      const minArea = 1000 / (zoom * zoom);

      ctx.font = `${10 / zoom}px Arial`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = Math.min(1, (zoom - 1.5) / 1);

      worldData.features.forEach((feature) => {
        const area = d3.geoArea(feature) * 1000000;

        if (area > minArea && feature.properties.centroid) {
          const coords = proj(feature.properties.centroid);

          if (coords && coords[0] >= 0 && coords[0] <= width && coords[1] >= 0 && coords[1] <= height) {
            const name =
              feature.properties.name ||
              feature.properties.NAME ||
              feature.properties.admin ||
              feature.properties.ADMIN ||
              "";

            if (name) {
              ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
              ctx.shadowBlur = 3 / zoom;
              ctx.fillText(name, coords[0], coords[1]);
              ctx.shadowBlur = 0;
            }
          }
        }
      });

      ctx.globalAlpha = 1;
    };

    const drawLabels = (ctx, labels, proj, zoom, color, fontSize, minZoom, fontWeight = "normal") => {
      if (zoom < minZoom) return;

      ctx.font = `${fontWeight} ${fontSize / zoom}px Arial`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = Math.min(1, (zoom - minZoom + 0.5) / 0.7);

      labels.forEach((label) => {
        const coords = proj(label.coords);
        if (coords) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = 3 / zoom;
          ctx.fillText(label.name, coords[0], coords[1]);
          ctx.shadowBlur = 0;
        }
      });

      ctx.globalAlpha = 1;
    };

    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        currentTransform = event.transform;
        setZoomLevel(event.transform.k);
        draw();
      });

    d3.select(canvas).call(zoom);

    draw();

    const handleResize = () => {
      const newWidth = canvas.offsetWidth;
      const newHeight = canvas.offsetHeight;
      canvas.width = newWidth;
      canvas.height = newHeight;
      projection.scale(newWidth / (2 * Math.PI)).translate([newWidth / 2, newHeight / 2]);
      draw();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [worldData, filteredCasesCountries]);

  const handleZoomIn = () => {
    const canvas = canvasRef.current;
    d3.select(canvas).transition().duration(300).call(d3.zoom().scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current;
    d3.select(canvas).transition().duration(300).call(d3.zoom().scaleBy, 0.77);
  };

  // ============= Render =============
  return (
    <>
      <div className="dashboard-grid">
        <div className="left-panel">
          {/* NEW: Timeline Slider */}
          <TimelineSlider onPeriodChange={handlePeriodChange} />

          {/* NEW: Country Search with Debouncing */}
          <CountrySearch 
            onSearchChange={handleSearchChange} 
            resultsCount={filteredCasesCountries.length}
          />

          <div className="stat-box">
            <h3 className="stat-label">Total Confirmed</h3>
            <p className="stat-value red-text">
              {totalCases.isLoading
                ? "Loading..."
                : totalCases.isError
                  ? "Error loading data"
                  : selectedCountry
                    ? filteredCasesCountries
                        ?.find((data) => data.country === selectedCountry)
                        ?.total_cases?.toLocaleString() || "No data available"
                    : totalCases.data !== null && totalCases.data !== undefined
                      ? totalCases.data.toLocaleString()
                      : "No data available"}
            </p>
          </div>

          <div className="country-list-container">
            <h4 className="country-list-title">
              Confirmed Cases by Country/Region
              <br />
              /Sovereignty
            </h4>

            <div className="admin-level-buttons">
              <button
                className={`admin-btn ${adminLevel === "admin0" ? "active" : ""}`}
                onClick={() => handleAdminLevelChange("admin0")}
              >
                Admin0
              </button>
              <button
                className={`admin-btn ${adminLevel === "admin1" ? "active" : ""}`}
                onClick={() => handleAdminLevelChange("admin1")}
              >
                Admin1
              </button>
              <button
                className={`admin-btn ${adminLevel === "admin2" ? "active" : ""}`}
                onClick={() => handleAdminLevelChange("admin2")}
              >
                Admin2
              </button>
            </div>

            <div className="country-list">
              {totalCasesPerCountry.isLoading ? (
                <p>Loading countries...</p>
              ) : totalCasesPerCountry.isError ? (
                <p>Error loading countries</p>
              ) : filteredCasesCountries.length === 0 ? (
                <p>No countries found</p>
              ) : (
                filteredCasesCountries.map((countryData) => (
                  <div
                    key={countryData.country}
                    className={`country-item ${selectedCountry === countryData.country ? "selected" : ""}`}
                    onClick={() => handleCountryClick(countryData.country)}
                  >
                    <span className="country-cases red-text">{countryData.total_cases?.toLocaleString() || "N/A"}</span>
                    <span> </span>
                    <span className="country-name">{countryData.country}</span>
                  </div>
                ))
              )}
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
              <span className="info-label">{filteredCasesCountries.length}</span>
              <span className="info-sublabel">countries/regions</span>
            </div>
            <div className="info-text">
              <strong>Lancet Inf Dis</strong> Article: <a href="#">Here</a>. Mobile Version: <a href="#">Here</a>.
              Visualization: <a href="#">JHU CSSE</a>. Automation Support: <a href="#">Esri Living Atlas team</a> and{" "}
              <a href="#">JHU APL</a>. <a href="#">Contact Us</a>. <a href="#">FAQ</a>.<br />
              Data sources: WHO, CDC, ECDC, NHC, DXY, 1point3acres, Worldometers.info, BNO, state and national
              government health departments, and local media reports. Read more in <a href="#">this blog</a>.<br />
              Downloadable database: GitHub: <a href="#">Here</a>. Feature layer: <a href="#">Here</a>.
            </div>
          </div>
        </div>

        <div className="right-panels-container-narrow">
          <div className="right-stats-column">
            <div className="right-stat-panel">
              <div className="stat-box">
                <h3 className="stat-label">Total Deaths</h3>
                <p className="stat-value white-text">
                  {totalDeaths.isLoading
                    ? "Loading..."
                    : totalDeaths.isError
                      ? "Error loading data"
                      : selectedCountry
                        ? filteredDeathsCountries
                            ?.find((data) => data.country === selectedCountry)
                            ?.total_deaths?.toLocaleString() || "No data available"
                        : totalDeaths.data !== null && totalDeaths.data !== undefined
                          ? totalDeaths.data.toLocaleString()
                          : "No data available"}
                </p>
              </div>

              <div className="country-list-container">
                <div className="country-list">
                  {totalDeathsPerCountry.isLoading ? (
                    <p>Loading...</p>
                  ) : totalDeathsPerCountry.isError ? (
                    <p>Error loading data</p>
                  ) : filteredDeathsCountries.length === 0 ? (
                    <p>No countries found</p>
                  ) : (
                    filteredDeathsCountries.map((countryData) => (
                      <div key={countryData.country} className="country-item">
                        <span className="country-deaths white-text">
                          {countryData.total_deaths?.toLocaleString() || "N/A"}
                        </span>{" "}
                        <span className="country-name-small">deaths</span>
                        <br />
                        <span className="country-name">{countryData.country}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="right-stat-panel">
              <div className="stat-box">
                <h3 className="stat-label">Total Recovered</h3>
                <p className="stat-value green-text">
                  {totalRecovered.isLoading
                    ? "Loading..."
                    : totalRecovered.isError
                      ? "Error loading data"
                      : totalRecovered.data !== null && totalRecovered.data !== undefined
                        ? totalRecovered.data.toLocaleString()
                        : "No data available"}
                </p>
              </div>

              <div className="country-list-container">
                <div className="country-list">
                  {totalRecoveredPerCountry.isLoading ? (
                    <p>Loading...</p>
                  ) : totalRecoveredPerCountry.isError ? (
                    <p>Error loading data</p>
                  ) : filteredRecoveredCountries.length === 0 ? (
                    <p>No countries found</p>
                  ) : (
                    filteredRecoveredCountries.map((countryData) => (
                      <div key={countryData.country} className="country-item">
                        <span className="country-recovered green-text">
                          {countryData.total_recovered?.toLocaleString() || "N/A"}
                        </span>{" "}
                        <span className="country-name-small">recovered</span>
                        <br />
                        <span className="country-name">{countryData.country}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="chart-panel">
            <div className="chart-container">
              {chartData.isLoading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
                  <p style={{ color: "#999" }}>Loading chart data...</p>
                </div>
              ) : chartData.isError ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
                  <p style={{ color: "#ff6b6b" }}>Error loading chart</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={filteredChartData}>
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
              )}
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