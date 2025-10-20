import React, { useEffect, useState, useRef } from 'react';
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

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json"

import {
  getGlobalTotalCases,
  getGlobalTotalDeaths,
  get28DayCases,
  get28DayDeaths,
  getTotalVaccineDoses,
  get28DayVaccineDoses,
  get28DayVaccineDosesPerCountry,
  getTotalCasesPerCountry,
  getTotalDeathsPerCountry,
  get28DayCasesPerCountry,
  get28DayDeathsPerCountry,
  getTotalRecoveredPerCountry,
  getGlobalTotalRecovered,
  getCasesTimeSeries,
} from "../../services/api"
import "./Dashboard.css"

const Dashboard = ({ style }) => {
  const [totalCases, setTotalCases] = useState(null)
  const [totalDeaths, setTotalDeaths] = useState(null)
  const [casesLoading, setCasesLoading] = useState(true)
  const [deathsLoading, setDeathsLoading] = useState(true)
  const [casesError, setCasesError] = useState("")
  const [deathsError, setDeathsError] = useState("")

  const [cases28Day, setCases28Day] = useState(null)
  const [cases28DayLoading, setCases28DayLoading] = useState(true)
  const [cases28DayError, setCases28DayError] = useState("")

  const [deaths28Day, setDeaths28Day] = useState(null)
  const [deaths28DayLoading, setDeaths28DayLoading] = useState(true)
  const [deaths28DayError, setDeaths28DayError] = useState("")

  const [totalVaccineDoses, setTotalVaccineDoses] = useState(null)
  const [vaccineDosesLoading, setVaccineDosesLoading] = useState(true)
  const [vaccineDosesError, setVaccineDosesError] = useState("")

  const [totalVaccineDosesPerCountry, setTotalVaccineDosesPerCountry] = useState(null)
  const [vaccineDosesPerCountryLoading, setVaccineDosesPerCountryLoading] = useState(true)
  const [vaccineDosesPerCountryError, setVaccineDosesPerCountryError] = useState("")

  const [vaccineDoses28Day, setVaccineDoses28Day] = useState(null)
  const [vaccineDoses28DayLoading, setVaccineDoses28DayLoading] = useState(true)
  const [vaccineDoses28DayError, setVaccineDoses28DayError] = useState("")

  const [vaccineDoses28DayPerCountry, setVaccineDoses28DayPerCountry] = useState(null)
  const [vaccineDoses28DayPerCountryLoading, setVaccineDoses28DayPerCountryLoading] = useState(true)
  const [vaccineDoses28DayPerCountryError, setVaccineDoses28DayPerCountryError] = useState("")

  const [countryCases, setCountryCases] = useState([])
  const [countryCasesLoading, setCountryCasesLoading] = useState(true)
  const [countryCasesError, setCountryCasesError] = useState("")

  const [totalCasesPerCountry, setTotalCasesPerCountry] = useState([])
  const [totalCasesPerCountryLoading, setTotalCasesPerCountryLoading] = useState(true)
  const [totalCasesPerCountryError, setTotalCasesPerCountryError] = useState("")

  const [totalDeathsPerCountry, setTotalDeathsPerCountry] = useState([])
  const [totalDeathsPerCountryLoading, setTotalDeathsPerCountryLoading] = useState(true)
  const [totalDeathsPerCountryError, setTotalDeathsPerCountryError] = useState("")

  const [cases28DayPerCountry, setCases28DayPerCountry] = useState(null)
  const [cases28DayPerCountryLoading, setCases28DayPerCountryLoading] = useState(true)
  const [cases28DayPerCountryError, setCases28DayPerCountryError] = useState("")

  const [deaths28DayPerCountry, setDeaths28DayPerCountry] = useState(null)
  const [deaths28DayPerCountryLoading, setDeaths28DayPerCountryLoading] = useState(true)
  const [deaths28DayPerCountryError, setDeaths28DayPerCountryError] = useState("")

  const [totalRecovered, setTotalRecovered] = useState(null)
  const [totalRecoveredPerCountry, setTotalRecoveredPerCountry] = useState([])
  const [recoveredLoading, setRecoveredLoading] = useState(true)
  const [recoveredError, setRecoveredError] = useState("")

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCountry, setSelectedCountry] = useState(null)

  const [chartData, setChartData] = useState([])
  const [chartLoading, setChartLoading] = useState(true)
  const [chartError, setChartError] = useState("")

  const [adminLevel, setAdminLevel] = useState("admin0") // 'admin0' (country), 'admin1' (state/province), 'admin2' (county/district)

  const filteredCountries = totalCasesPerCountry.filter((country) =>
    country.country.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCountryClick = (countryName) => {
    setSelectedCountry(countryName)
  }

  const handleAdminLevelChange = (level) => {
    setAdminLevel(level)
    // TODO: fetch data for the selected admin level
    // for now, this just changes the active button state
    console.log(`[v0] Admin level changed to: ${level}`)
  }

  const canvasRef = useRef(null)
  const [worldData, setWorldData] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  useEffect(() => {
    const fetchTotalCases = async () => {
      try {
        const data = await getGlobalTotalCases()
        setTotalCases(data.total_cases)
      } catch (error) {
        console.error("Error fetching total cases:", error)
        setCasesError("Failed to fetch total cases.")
      } finally {
        setCasesLoading(false)
      }
    }
    fetchTotalCases()
  }, [])

  useEffect(() => {
    const fetchTotalDeaths = async () => {
      try {
        const data = await getGlobalTotalDeaths()
        setTotalDeaths(data.total_deaths)
      } catch (error) {
        console.error("Error fetching total deaths:", error)
        setDeathsError("Failed to fetch total deaths.")
      } finally {
        setDeathsLoading(false)
      }
    }
    fetchTotalDeaths()
  }, [])

  useEffect(() => {
    const fetch28DayCases = async () => {
      try {
        const data = await get28DayCases()
        setCases28Day(data.total_28_day_cases)
      } catch (error) {
        console.error("Error fetching 28-day cases:", error)
        setCases28DayError("Failed to fetch 28-day cases.")
      } finally {
        setCases28DayLoading(false)
      }
    }
    fetch28DayCases()
  }, [])

  useEffect(() => {
    const fetch28DayCasesPerCountry = async () => {
      try {
        const data = await get28DayCasesPerCountry()
        console.log("Fetched 28-Day Cases Per Country:", data)
        setCases28DayPerCountry(data.total_28_day_cases_per_country)
      } catch (error) {
        console.error("Error fetching 28-day cases per country:", error)
        setCases28DayPerCountryError("Failed to fetch 28-day cases.")
      } finally {
        setCases28DayPerCountryLoading(false)
      }
    }
    fetch28DayCasesPerCountry()
  }, [])

  useEffect(() => {
    const fetch28DayDeaths = async () => {
      try {
        const data = await get28DayDeaths()
        console.log("Fetched 28-Day Deaths Data:", data)
        setDeaths28Day(data.total_28_day_deaths)
      } catch (error) {
        console.error("Error fetching 28-day deaths:", error)
        setDeaths28DayError("Failed to fetch 28-day deaths.")
      } finally {
        setDeaths28DayLoading(false)
      }
    }
    fetch28DayDeaths()
  }, [])

  useEffect(() => {
    const fetch28DayDeathsPerCountry = async () => {
      try {
        const data = await get28DayDeathsPerCountry()
        setDeaths28DayPerCountry(data.total_28_day_deaths_per_country)
      } catch (error) {
        console.error("Error fetching 28-day deaths per country:", error)
        setDeaths28DayPerCountryError("Failed to fetch 28-day deaths per country.")
      } finally {
        setDeaths28DayPerCountryLoading(false)
      }
    }
    fetch28DayDeathsPerCountry()
  }, [])

  useEffect(() => {
    const fetchTotalVaccineDoses = async () => {
      try {
        const data = await getTotalVaccineDoses()
        setTotalVaccineDoses(data.total_vaccine_doses)
      } catch (error) {
        console.error("Error fetching total vaccine doses:", error)
        setVaccineDosesError("Failed to fetch total vaccine doses.")
      } finally {
        setVaccineDosesLoading(false)
      }
    }
    fetchTotalVaccineDoses()
  }, [])

  useEffect(() => {
    const fetch28DayVaccineDoses = async () => {
      try {
        const data = await get28DayVaccineDoses()
        setVaccineDoses28Day(data.total_28_day_vaccine_doses)
      } catch (error) {
        console.error("Error fetching 28-day vaccine doses:", error)
        setVaccineDoses28DayError("Failed to fetch 28-day vaccine doses.")
      } finally {
        setVaccineDoses28DayLoading(false)
      }
    }
    fetch28DayVaccineDoses()
  }, [])

  useEffect(() => {
    const fetch28DayVaccineDosesPerCountry = async () => {
      try {
        const data = await get28DayVaccineDosesPerCountry()
        setVaccineDoses28DayPerCountry(data.total_28_day_vaccine_doses)
      } catch (error) {
        console.error("Error fetching 28-day vaccine doses per country:", error)
        setVaccineDoses28DayPerCountryError("Failed to fetch 28-day vaccine doses per country.")
      } finally {
        setVaccineDoses28DayPerCountryLoading(false)
      }
    }
    fetch28DayVaccineDosesPerCountry()
  }, [])

  useEffect(() => {
    const fetchTotalCasesPerCountry = async () => {
      try {
        const data = await getTotalCasesPerCountry()
        setTotalCasesPerCountry(data?.data || [])
      } catch (error) {
        console.error("Error fetching total cases per country:", error)
        setTotalCasesPerCountryError("Failed to fetch total cases per country.")
      } finally {
        setTotalCasesPerCountryLoading(false)
      }
    }
    fetchTotalCasesPerCountry()
  }, [])

  useEffect(() => {
    const fetchTotalDeathsPerCountry = async () => {
      try {
        const data = await getTotalDeathsPerCountry()
        setTotalDeathsPerCountry(data?.data || [])
      } catch (error) {
        console.error("Error fetching total deaths per country:", error)
        setTotalDeathsPerCountryError("Failed to fetch total deaths per country.")
      } finally {
        setTotalDeathsPerCountryLoading(false)
      }
    }
    fetchTotalDeathsPerCountry()
  }, [])

  useEffect(() => {
    const fetchRecovered = async () => {
      try {
        setRecoveredLoading(true)
        const global = await getGlobalTotalRecovered()
        setTotalRecovered(global.total_recovered)

        const perCountry = await getTotalRecoveredPerCountry()
        setTotalRecoveredPerCountry(perCountry.data)
      } catch (error) {
        setRecoveredError("Failed to fetch recovered data")
      } finally {
        setRecoveredLoading(false)
      }
    }

    fetchRecovered()
  }, [])

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setChartLoading(true)
        const data = await getCasesTimeSeries()

        const formattedData = data.data
          .filter((_, index) => index % 7 === 0)
          .map((item) => {
            const parts = item.date.split("/")
            if (parts.length === 3) {
              const month = Number.parseInt(parts[0], 10)
              const day = Number.parseInt(parts[1], 10)
              const year = Number.parseInt(parts[2], 10) + 2000
              const date = new Date(year, month - 1, day)
              return {
                date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                cases: item.cases,
              }
            }
            return {
              date: item.date,
              cases: item.cases,
            }
          })

        setChartData(formattedData)
      } catch (error) {
        console.error("Error fetching chart data:", error)
        setChartError("Failed to load chart data")
      } finally {
        setChartLoading(false)
      }
    }

    fetchChartData()
  }, [])

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json")
      .then((response) => response.json())
      .then((topology) => {
        const countries = topojson.feature(topology, topology.objects.countries)

        countries.features.forEach((feature) => {
          const centroid = d3.geoCentroid(feature)
          feature.properties.centroid = centroid
        })
        setWorldData(countries)
      })
      .catch((err) => console.error("Error loading map:", err))
  }, [])

  useEffect(() => {
    if (!worldData) return

    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    const width = (canvas.width = canvas.offsetWidth)
    const height = (canvas.height = canvas.offsetHeight)

    const projection = d3
      .geoMercator()
      .scale(width / (2 * Math.PI))
      .translate([width / 2, height / 2])

    const path = d3.geoPath(projection, context)

    let currentTransform = d3.zoomIdentity

    const oceanLabels = [
      { name: "PACIFIC OCEAN", coords: [-160, 0] },
      { name: "ATLANTIC OCEAN", coords: [-30, 15] },
      { name: "INDIAN OCEAN", coords: [75, -15] },
      { name: "ARCTIC OCEAN", coords: [0, 75] },
    ]

    const continentLabels = [
      { name: "NORTH AMERICA", coords: [-100, 45] },
      { name: "SOUTH AMERICA", coords: [-60, -15] },
      { name: "EUROPE", coords: [15, 52] },
      { name: "AFRICA", coords: [20, 5] },
      { name: "ASIA", coords: [90, 45] },
      { name: "AUSTRALIA", coords: [135, -25] },
    ]

    const draw = () => {
      context.clearRect(0, 0, width, height)
      context.save()

      context.translate(currentTransform.x, currentTransform.y)
      context.scale(currentTransform.k, currentTransform.k)

      context.fillStyle = "#0a1929"
      context.fillRect(-width * 2, -height * 2, width * 5, height * 5)

      context.fillStyle = "#1a2f3f"
      context.strokeStyle = "#2a4a5f"
      context.lineWidth = 0.5 / currentTransform.k

      worldData.features.forEach((feature) => {
        context.beginPath()
        path(feature)
        context.fill()
        context.stroke()
      })

      drawCasesCircles(context, projection, currentTransform.k)

      const k = currentTransform.k

      if (k < 2) {
        drawLabels(context, oceanLabels, projection, k, "#3a5a7a", 14, 0.7, "italic")
        drawLabels(context, continentLabels, projection, k, "#e0e0e0", 13, 0.9, "bold")
      } else {
        drawCountryLabels(context, projection, k)
      }

      context.restore()
    }

    const drawCasesCircles = (ctx, proj, zoom) => {
      if (!totalCasesPerCountry || totalCasesPerCountry.length === 0) return

      const maxCases = Math.max(...totalCasesPerCountry.map((c) => c.total_cases || 0))

      totalCasesPerCountry.forEach((countryData) => {
        if (!countryData.total_cases || countryData.total_cases === 0) return

        const feature = worldData.features.find((f) => {
          const name = f.properties.name || f.properties.NAME || f.properties.admin || f.properties.ADMIN || ""
          return name.toLowerCase() === countryData.country.toLowerCase()
        })

        if (feature && feature.properties.centroid) {
          const coords = proj(feature.properties.centroid)

          if (
            coords &&
            coords[0] >= -width &&
            coords[0] <= width * 2 &&
            coords[1] >= -height &&
            coords[1] <= height * 2
          ) {
            const baseRadius = Math.sqrt(countryData.total_cases / maxCases) * 40
            const radius = Math.max(3, baseRadius / zoom)

            ctx.shadowColor = "rgba(255, 0, 0, 0.8)"
            ctx.shadowBlur = 10 / zoom
            ctx.fillStyle = "rgba(255, 0, 0, 0.6)"
            ctx.beginPath()
            ctx.arc(coords[0], coords[1], radius, 0, 2 * Math.PI)
            ctx.fill()

            ctx.strokeStyle = "rgba(255, 100, 100, 0.8)"
            ctx.lineWidth = 1 / zoom
            ctx.stroke()
            ctx.shadowBlur = 0
          }
        }
      })
    }

    const drawCountryLabels = (ctx, proj, zoom) => {
      const minArea = 1000 / (zoom * zoom)

      ctx.font = `${10 / zoom}px Arial`
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.globalAlpha = Math.min(1, (zoom - 1.5) / 1)

      worldData.features.forEach((feature) => {
        const area = d3.geoArea(feature) * 1000000

        if (area > minArea && feature.properties.centroid) {
          const coords = proj(feature.properties.centroid)

          if (coords && coords[0] >= 0 && coords[0] <= width && coords[1] >= 0 && coords[1] <= height) {
            const name =
              feature.properties.name ||
              feature.properties.NAME ||
              feature.properties.admin ||
              feature.properties.ADMIN ||
              ""

            if (name) {
              ctx.shadowColor = "rgba(0, 0, 0, 0.8)"
              ctx.shadowBlur = 3 / zoom
              ctx.fillText(name, coords[0], coords[1])
              ctx.shadowBlur = 0
            }
          }
        }
      })

      ctx.globalAlpha = 1
    }

    const drawLabels = (ctx, labels, proj, zoom, color, fontSize, minZoom, fontWeight = "normal") => {
      if (zoom < minZoom) return

      ctx.font = `${fontWeight} ${fontSize / zoom}px Arial`
      ctx.fillStyle = color
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.globalAlpha = Math.min(1, (zoom - minZoom + 0.5) / 0.7)

      labels.forEach((label) => {
        const coords = proj(label.coords)
        if (coords) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)"
          ctx.shadowBlur = 3 / zoom
          ctx.fillText(label.name, coords[0], coords[1])
          ctx.shadowBlur = 0
        }
      })

      ctx.globalAlpha = 1
    }

    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        currentTransform = event.transform
        setZoomLevel(event.transform.k)
        draw()
      })

    d3.select(canvas).call(zoom)

    draw()

    const handleResize = () => {
      const newWidth = canvas.offsetWidth
      const newHeight = canvas.offsetHeight
      canvas.width = newWidth
      canvas.height = newHeight
      projection.scale(newWidth / (2 * Math.PI)).translate([newWidth / 2, newHeight / 2])
      draw()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [worldData, totalCasesPerCountry])

  const handleZoomIn = () => {
    const canvas = canvasRef.current
    d3.select(canvas).transition().duration(300).call(d3.zoom().scaleBy, 1.3)
  }

  const handleZoomOut = () => {
    const canvas = canvasRef.current
    d3.select(canvas).transition().duration(300).call(d3.zoom().scaleBy, 0.77)
  }

  return (
    <>
      <div className="dashboard-grid">
        <div className="left-panel">
          <div className="stat-box">
            <h3 className="stat-label">Total Confirmed</h3>
            <p className="stat-value red-text">
              {casesLoading
                ? "Loading..."
                : casesError
                  ? casesError
                  : selectedCountry
                    ? totalCasesPerCountry
                        ?.find((data) => data.country === selectedCountry)
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
              {totalCasesPerCountry.map((countryData) => (
                <div
                  key={countryData.country}
                  className={`country-item ${selectedCountry === countryData.country ? "selected" : ""}`}
                  onClick={() => handleCountryClick(countryData.country)}
                >
                  <span className="country-cases red-text">{countryData.total_cases?.toLocaleString() || "N/A"}</span>
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
            <button className="view-toggle-btn" title="Bookmark">
              …
            </button>
            <button className="view-toggle-btn" title="List view">
              …
            </button>
            <button className="view-toggle-btn" title="Grid view">
              …
            </button>
          </div>

          <canvas ref={canvasRef} className="map-container" />

          <div className="zoom-controls">
            <button className="zoom-btn" onClick={handleZoomIn} title="Zoom in">
              +
            </button>
            <button className="zoom-btn" onClick={handleZoomOut} title="Zoom out">
              −
            </button>
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
                  {deathsLoading
                    ? "Loading..."
                    : deathsError
                      ? deathsError
                      : selectedCountry
                        ? totalDeathsPerCountry
                            ?.find((data) => data.country === selectedCountry)
                            ?.total_deaths?.toLocaleString() || "No data available"
                        : totalDeaths !== null && totalDeaths !== undefined
                          ? totalDeaths.toLocaleString()
                          : "No data available"}
                </p>
              </div>

              <div className="country-list-container">
                <div className="country-list">
                  {totalDeathsPerCountry.map((countryData) => (
                    <div key={countryData.country} className="country-item">
                      <span className="country-deaths white-text">
                        {countryData.total_deaths?.toLocaleString() || "N/A"}
                      </span>{" "}
                      <span className="country-name-small">deaths</span>
                      <br />
                      <span className="country-name">{countryData.country}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="right-stat-panel">
              <div className="stat-box">
                <h3 className="stat-label">Total Recovered</h3>
                <p className="stat-value green-text">
                  {recoveredLoading
                    ? "Loading..."
                    : recoveredError
                      ? recoveredError
                      : totalRecovered !== null && totalRecovered !== undefined
                        ? totalRecovered.toLocaleString()
                        : "No data available"}
                </p>
              </div>

              <div className="country-list-container">
                <div className="country-list">
                  {recoveredLoading ? (
                    <p>Loading...</p>
                  ) : recoveredError ? (
                    <p>{recoveredError}</p>
                  ) : totalRecoveredPerCountry.length > 0 ? (
                    totalRecoveredPerCountry.map((countryData) => (
                      <div key={countryData.country} className="country-item">
                        <span className="country-recovered green-text">
                          {countryData.total_recovered?.toLocaleString() || "N/A"}
                        </span>{" "}
                        <span className="country-name-small">recovered</span>
                        <br />
                        <span className="country-name">{countryData.country}</span>
                      </div>
                    ))
                  ) : (
                    <p>No data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="chart-panel">
            <div className="chart-container">
              {chartLoading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
                  <p style={{ color: "#999" }}>Loading chart data...</p>
                </div>
              ) : chartError ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
                  <p style={{ color: "#ff6b6b" }}>{chartError}</p>
                </div>
              ) : (
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
  )
}

export default Dashboard
