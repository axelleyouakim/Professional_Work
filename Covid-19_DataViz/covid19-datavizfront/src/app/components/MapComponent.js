'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import { useWorldAtlas } from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

// ─── Retourne le plus grand polygone d'un feature (comme Feature GeoJSON) ────
const getLargestPolygon = (feature) => {
  if (!feature.geometry) return feature;
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') return feature;
  if (type === 'MultiPolygon') {
    let largestArea = -Infinity;
    let largestCoords = null;
    coordinates.forEach((polygonCoords) => {
      const poly = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: polygonCoords },
        properties: feature.properties,
      };
      const area = d3.geoArea(poly);
      if (area > largestArea) {
        largestArea = area;
        largestCoords = polygonCoords;
      }
    });
    if (largestCoords) {
      return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: largestCoords },
        properties: feature.properties,
      };
    }
  }
  return feature;
};

// ─── Centroïde du plus grand polygone ────────────────────────────────────────
const getLargestPolygonCentroid = (feature) => {
  return d3.geoCentroid(getLargestPolygon(feature));
};

const MapComponent = ({ casesData, selectedCountry, onCountryClick }) => {
  const canvasRef     = useRef(null);
  const zoomRef       = useRef(null);
  const transformRef  = useRef(d3.zoomIdentity);
  const countriesRef  = useRef(null);
  const projectionRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredCountry, setHoveredCountry] = useState(null);

  const worldAtlasQuery = useWorldAtlas();

  // ─── Zoom basé sur le cercle (centroïde) + bounds du PLUS GRAND polygone ──
  const computeFitTransform = useCallback((feature, width, height, projection) => {
    // On travaille UNIQUEMENT sur le plus grand polygone
    // → ignore la Guyane française, l'Alaska, les îles lointaines etc.
    const mainPolygon = getLargestPolygon(feature);

    // Centroïde du polygone principal = centre visuel = position du cercle
    const centroid = d3.geoCentroid(mainPolygon);
    const [cx, cy] = projection(centroid);

    // Bounds pixel du polygone principal uniquement
    const tempPath = d3.geoPath(projection);
    const [[bx0, by0], [bx1, by1]] = tempPath.bounds(mainPolygon);

    // Distance max entre le centroïde et chaque bord
    const distLeft   = Math.abs(cx - bx0);
    const distRight  = Math.abs(bx1 - cx);
    const distTop    = Math.abs(cy - by0);
    const distBottom = Math.abs(by1 - cy);

    const halfW = Math.max(distLeft, distRight, 1);
    const halfH = Math.max(distTop, distBottom, 1);

    // Scale exact : le bord le plus éloigné du centroïde touche le bord du canvas
    const scale = Math.min(
      (width  / 2) / halfW,
      (height / 2) / halfH,
      8
    );

    // Le centroïde se retrouve exactement au centre du canvas
    return d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-cx, -cy);
  }, []);

  // ─── Zoom vers un pays ─────────────────────────────────────────────────────
  const zoomToCountry = useCallback((countryName) => {
    const canvas     = canvasRef.current;
    const zoom       = zoomRef.current;
    const countries  = countriesRef.current;
    const projection = projectionRef.current;
    if (!canvas || !zoom || !countries || !projection || !countryName) return;

    const feature = countries.features.find((f) => {
      const name =
        f.properties.name  ||
        f.properties.NAME  ||
        f.properties.admin ||
        f.properties.ADMIN || '';
      return name.toLowerCase() === countryName.toLowerCase();
    });

    if (!feature) {
      console.warn(`⚠️ zoomToCountry: feature not found for "${countryName}"`);
      return;
    }

    try {
      const newTransform = computeFitTransform(feature, canvas.width, canvas.height, projection);
      d3.select(canvas)
        .transition()
        .duration(750)
        .call(zoom.transform, newTransform);
    } catch (e) {
      console.error('zoomToCountry error:', e);
    }
  }, [computeFitTransform]);

  // ─── Retour vue globale ────────────────────────────────────────────────────
  const zoomToGlobal = useCallback(() => {
    const canvas = canvasRef.current;
    const zoom   = zoomRef.current;
    if (!canvas || !zoom) return;
    d3.select(canvas)
      .transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  }, []);

  // ─── Déclencher zoom quand selectedCountry change ─────────────────────────
  useEffect(() => {
    if (selectedCountry) {
      zoomToCountry(selectedCountry);
    } else {
      zoomToGlobal();
    }
  }, [selectedCountry, zoomToCountry, zoomToGlobal]);

  // ─── Setup principal du canvas ─────────────────────────────────────────────
  useEffect(() => {
    if (!worldAtlasQuery.data || !canvasRef.current) return;

    const topology = worldAtlasQuery.data;
    const canvas   = canvasRef.current;
    const context  = canvas.getContext('2d');
    const width    = (canvas.width  = canvas.offsetWidth);
    const height   = (canvas.height = canvas.offsetHeight);

    const countries = topojson.feature(topology, topology.objects.countries);

    // Centroïde sur le plus grand polygone pour chaque pays
    countries.features.forEach((feature) => {
      feature.properties.centroid = getLargestPolygonCentroid(feature);
    });
    countriesRef.current = countries;

    const projection = d3
      .geoMercator()
      .scale(width / (2 * Math.PI))
      .translate([width / 2, height / 2]);
    projectionRef.current = projection;

    const path = d3.geoPath(projection, context);

    const oceanLabels = [
      { name: 'PACIFIC OCEAN',  coords: [-160,  0] },
      { name: 'ATLANTIC OCEAN', coords: [ -30, 15] },
      { name: 'INDIAN OCEAN',   coords: [  75,-15] },
      { name: 'ARCTIC OCEAN',   coords: [   0, 75] },
    ];
    const continentLabels = [
      { name: 'NORTH AMERICA', coords: [-100, 45] },
      { name: 'SOUTH AMERICA', coords: [ -60,-15] },
      { name: 'EUROPE',        coords: [  15, 52] },
      { name: 'AFRICA',        coords: [  20,  5] },
      { name: 'ASIA',          coords: [  90, 45] },
      { name: 'AUSTRALIA',     coords: [ 135,-25] },
    ];

    // ─── draw ────────────────────────────────────────────────────────────────
    const draw = () => {
      const t = transformRef.current;
      context.clearRect(0, 0, width, height);
      context.save();

      context.translate(t.x, t.y);
      context.scale(t.k, t.k);

      context.fillStyle = '#0a1929';
      context.fillRect(-width * 2, -height * 2, width * 5, height * 5);

      countries.features.forEach((feature) => {
        const name =
          feature.properties.name  ||
          feature.properties.NAME  ||
          feature.properties.admin ||
          feature.properties.ADMIN || '';
        const isSelected = selectedCountry && name.toLowerCase() === selectedCountry.toLowerCase();
        const isHovered  = hoveredCountry  && name.toLowerCase() === hoveredCountry.toLowerCase();

        context.fillStyle   = isSelected ? '#2a4a7f' : '#1a2f3f';
        context.strokeStyle = isSelected ? '#5a8aff' : isHovered ? '#4a6a8f' : '#2a4a5f';
        context.lineWidth   = (isSelected ? 1.5 : 0.5) / t.k;

        context.beginPath();
        path(feature);
        context.fill();
        context.stroke();
      });

      drawCasesCircles(context, projection, t.k, countries);

      if (t.k < 2) {
        drawLabels(context, oceanLabels,     projection, t.k, '#3a5a7a', 14, 0.7, 'italic');
        drawLabels(context, continentLabels, projection, t.k, '#e0e0e0', 13, 0.9, 'bold');
      } else {
        drawCountryLabels(context, projection, t.k, countries);
      }

      context.restore();
    };

    // ─── drawCasesCircles ────────────────────────────────────────────────────
    const drawCasesCircles = (ctx, proj, zoom, worldData) => {
      if (!casesData || casesData.length === 0) return;
      const maxCases = Math.max(...casesData.map((c) => c.total_cases || 0));
      // Si maxCases = 0 (avant COVID), pas de cercles à dessiner
      if (maxCases === 0) return;

      casesData.forEach((countryData) => {
        if (!countryData.total_cases || countryData.total_cases === 0) return;
        const feature = worldData.features.find((f) => {
          const n =
            f.properties.name  ||
            f.properties.NAME  ||
            f.properties.admin ||
            f.properties.ADMIN || '';
          return n.toLowerCase() === countryData.country.toLowerCase();
        });

        if (feature && feature.properties.centroid) {
          const coords = proj(feature.properties.centroid);
          if (
            coords &&
            coords[0] >= -width    && coords[0] <= width * 2 &&
            coords[1] >= -height   && coords[1] <= height * 2
          ) {
            const baseRadius = Math.sqrt(countryData.total_cases / maxCases) * 40;
            const radius     = Math.max(3, baseRadius / zoom);
            const isSelected =
              selectedCountry &&
              countryData.country.toLowerCase() === selectedCountry.toLowerCase();

            ctx.shadowColor = isSelected ? 'rgba(255,255,0,0.8)' : 'rgba(255,0,0,0.8)';
            ctx.shadowBlur  = (isSelected ? 15 : 10) / zoom;
            ctx.fillStyle   = isSelected ? 'rgba(255,255,0,0.7)' : 'rgba(255,0,0,0.6)';
            ctx.beginPath();
            ctx.arc(coords[0], coords[1], radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = isSelected ? 'rgba(255,255,100,1)' : 'rgba(255,100,100,0.8)';
            ctx.lineWidth   = (isSelected ? 2 : 1) / zoom;
            ctx.stroke();
            ctx.shadowBlur  = 0;
          }
        }
      });
    };

    // ─── drawCountryLabels ───────────────────────────────────────────────────
    const drawCountryLabels = (ctx, proj, zoom, worldData) => {
      const minArea = 1000 / (zoom * zoom);
      ctx.font         = `${10 / zoom}px Arial`;
      ctx.fillStyle    = '#ffffff';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha  = Math.min(1, (zoom - 1.5) / 1);

      worldData.features.forEach((feature) => {
        const area = d3.geoArea(feature) * 1_000_000;
        if (area > minArea && feature.properties.centroid) {
          const coords = proj(feature.properties.centroid);
          if (coords && coords[0] >= 0 && coords[0] <= width && coords[1] >= 0 && coords[1] <= height) {
            const name =
              feature.properties.name  ||
              feature.properties.NAME  ||
              feature.properties.admin ||
              feature.properties.ADMIN || '';
            if (name) {
              ctx.shadowColor = 'rgba(0,0,0,0.8)';
              ctx.shadowBlur  = 3 / zoom;
              ctx.fillText(name, coords[0], coords[1]);
              ctx.shadowBlur  = 0;
            }
          }
        }
      });
      ctx.globalAlpha = 1;
    };

    // ─── drawLabels ──────────────────────────────────────────────────────────
    const drawLabels = (ctx, labels, proj, zoom, color, fontSize, minZoom, fontWeight = 'normal') => {
      if (zoom < minZoom) return;
      ctx.font         = `${fontWeight} ${fontSize / zoom}px Arial`;
      ctx.fillStyle    = color;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha  = Math.min(1, (zoom - minZoom + 0.5) / 0.7);
      labels.forEach((label) => {
        const coords = proj(label.coords);
        if (coords) {
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur  = 3 / zoom;
          ctx.fillText(label.name, coords[0], coords[1]);
          ctx.shadowBlur  = 0;
        }
      });
      ctx.globalAlpha = 1;
    };

    // ─── findClickedCountry ──────────────────────────────────────────────────
    const findClickedCountry = (x, y) => {
      if (casesData && casesData.length > 0) {
        const maxCases = Math.max(...casesData.map((c) => c.total_cases || 0));
        if (maxCases > 0) {
          for (const countryData of casesData) {
            if (!countryData.total_cases) continue;
            const feature = countries.features.find((f) => {
              const n =
                f.properties.name  ||
                f.properties.NAME  ||
                f.properties.admin ||
                f.properties.ADMIN || '';
              return n.toLowerCase() === countryData.country.toLowerCase();
            });
            if (feature && feature.properties.centroid) {
              const coords = projection(feature.properties.centroid);
              if (coords) {
                const baseRadius = Math.sqrt(countryData.total_cases / maxCases) * 40;
                const radius     = Math.max(3, baseRadius / transformRef.current.k);
                if (Math.hypot(x - coords[0], y - coords[1]) <= radius) return countryData.country;
              }
            }
          }
        }
      }

      const point = projection.invert([x, y]);
      if (point) {
        for (const feature of countries.features) {
          const name =
            feature.properties.name  ||
            feature.properties.NAME  ||
            feature.properties.admin ||
            feature.properties.ADMIN || '';
          if (name && d3.geoContains(feature, point)) return name;
        }
      }
      return null;
    };

    // ─── Event handlers ──────────────────────────────────────────────────────
    const handleCanvasClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = canvas.getBoundingClientRect();
      const t    = transformRef.current;
      const x    = (event.clientX - rect.left - t.x) / t.k;
      const y    = (event.clientY - rect.top  - t.y) / t.k;
      const clicked = findClickedCountry(x, y);
      if (clicked && onCountryClick) onCountryClick(clicked);
    };

    const handleCanvasMove = (event) => {
      const rect    = canvas.getBoundingClientRect();
      const t       = transformRef.current;
      const x       = (event.clientX - rect.left - t.x) / t.k;
      const y       = (event.clientY - rect.top  - t.y) / t.k;
      const country = findClickedCountry(x, y);
      if (country !== hoveredCountry) {
        setHoveredCountry(country);
        canvas.style.cursor = country ? 'pointer' : 'default';
      }
    };

    // ─── D3 zoom ─────────────────────────────────────────────────────────────
    const zoom = d3
      .zoom()
      .filter((event) => event.type === 'wheel')
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        setZoomLevel(event.transform.k);
        draw();
      });

    zoomRef.current = zoom;
    d3.select(canvas).call(zoom);

    canvas.addEventListener('click',     handleCanvasClick, true);
    canvas.addEventListener('mousemove', handleCanvasMove);

    draw();
    canvas._draw = draw;

    const handleResize = () => {
      const newWidth  = canvas.offsetWidth;
      const newHeight = canvas.offsetHeight;
      canvas.width  = newWidth;
      canvas.height = newHeight;
      projection
        .scale(newWidth / (2 * Math.PI))
        .translate([newWidth / 2, newHeight / 2]);
      draw();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click',     handleCanvasClick, true);
      canvas.removeEventListener('mousemove', handleCanvasMove);
      delete canvas._draw;
    };
  }, [worldAtlasQuery.data, casesData, selectedCountry, hoveredCountry, onCountryClick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas._draw) canvas._draw();
  }, [selectedCountry]);

  const handleZoomIn = () => {
    const canvas = canvasRef.current;
    const zoom   = zoomRef.current;
    if (canvas && zoom) d3.select(canvas).transition().duration(300).call(zoom.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current;
    const zoom   = zoomRef.current;
    if (canvas && zoom) d3.select(canvas).transition().duration(300).call(zoom.scaleBy, 0.77);
  };

  return (
    <QueryStateWrapper
      query={worldAtlasQuery}
      loadingMessage="Loading world map..."
      errorMessage="Failed to load world map"
    >
      {() => (
        <div className="map-panel">
          <div className="view-toggle-buttons">
            <button className="view-toggle-btn" title="Bookmark">⋯</button>
            <button className="view-toggle-btn" title="List view">☰</button>
            <button className="view-toggle-btn" title="Grid view">⊞</button>
          </div>

          {hoveredCountry && (
            <div style={{
              position: 'absolute', top: '60px', left: '20px',
              background: 'rgba(0,0,0,0.8)', color: '#fff',
              padding: '5px 10px', borderRadius: '4px',
              fontSize: '12px', zIndex: 1000, pointerEvents: 'none',
            }}>
              {hoveredCountry} — cliquez pour sélectionner
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="map-container"
            style={{ touchAction: 'none' }}
          />

          <div className="zoom-controls">
            <button className="zoom-btn" onClick={handleZoomIn}  title="Zoom in">+</button>
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
              <strong>Lancet Inf Dis</strong> Article: <a href="#">Here</a>. Mobile Version:{' '}
              <a href="#">Here</a>. Visualization: <a href="#">JHU CSSE</a>. Automation Support:{' '}
              <a href="#">Esri Living Atlas team</a> and <a href="#">JHU APL</a>.{' '}
              <a href="#">Contact Us</a>. <a href="#">FAQ</a>.<br />
              Data sources: WHO, CDC, ECDC, NHC, DXY, 1point3acres, Worldometers.info, BNO, state and
              national government health departments, and local media reports. Read more in{' '}
              <a href="#">this blog</a>.<br />
              Downloadable database: GitHub: <a href="#">Here</a>. Feature layer:{' '}
              <a href="#">Here</a>.
            </div>
          </div>
        </div>
      )}
    </QueryStateWrapper>
  );
};

export default MapComponent;