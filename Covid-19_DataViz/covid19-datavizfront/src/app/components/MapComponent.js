import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import './Dashboard.css';

const MapComponent = ({ casesData }) => {
  const canvasRef = useRef(null);
  const [worldData, setWorldData] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Load map data
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

  // Render map
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
      if (!casesData || casesData.length === 0) return;

      const maxCases = Math.max(...casesData.map((c) => c.total_cases || 0));

      casesData.forEach((countryData) => {
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
  }, [worldData, casesData]);

  const handleZoomIn = () => {
    const canvas = canvasRef.current;
    d3.select(canvas).transition().duration(300).call(d3.zoom().scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current;
    d3.select(canvas).transition().duration(300).call(d3.zoom().scaleBy, 0.77);
  };

  return (
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
          <span className="info-label">{casesData?.length || 0}</span>
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
  );
};

export default MapComponent;