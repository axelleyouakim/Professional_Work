'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import { useWorldAtlas } from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

const getLargestPolygon = (feature) => {
  if (!feature.geometry) return feature;
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') return feature;
  if (type === 'MultiPolygon') {
    let largestArea = -Infinity, largestCoords = null;
    coordinates.forEach((polygonCoords) => {
      const poly = { type: 'Feature', geometry: { type: 'Polygon', coordinates: polygonCoords }, properties: feature.properties };
      const area = d3.geoArea(poly);
      if (area > largestArea) { largestArea = area; largestCoords = polygonCoords; }
    });
    if (largestCoords) return { type: 'Feature', geometry: { type: 'Polygon', coordinates: largestCoords }, properties: feature.properties };
  }
  return feature;
};

const getLargestPolygonCentroid = (feature) => d3.geoCentroid(getLargestPolygon(feature));

const MapComponent = ({ casesData, selectedCountry, onCountryClick }) => {
  const canvasRef      = useRef(null);
  const zoomRef        = useRef(null);
  const transformRef   = useRef(d3.zoomIdentity);
  const countriesRef   = useRef(null);
  const projectionRef  = useRef(null);
  const drawRef        = useRef(null); // ← ref vers la fonction draw

  // ─── Refs pour les props qui changent souvent ─────────────────────────────
  // Ces refs permettent à draw() de toujours lire la dernière valeur
  // SANS être dans les dépendances du useEffect principal
  const casesDataRef        = useRef(casesData);
  const selectedCountryRef  = useRef(selectedCountry);
  const hoveredCountryRef   = useRef(null);
  const onCountryClickRef   = useRef(onCountryClick);

  // Sync des refs à chaque render
  casesDataRef.current       = casesData;
  selectedCountryRef.current = selectedCountry;
  onCountryClickRef.current  = onCountryClick;

  const [hoveredCountry, setHoveredCountry] = useState(null);
  const worldAtlasQuery = useWorldAtlas();

  // ─── Redessiner quand casesData ou selectedCountry changent ──────────────
  // N'utilise PAS useEffect avec dépendances lourdes — juste appel draw()
  useEffect(() => {
    if (drawRef.current) drawRef.current();
  }, [casesData, selectedCountry, hoveredCountry]);

  // ─── Zoom ─────────────────────────────────────────────────────────────────
  const computeFitTransform = useCallback((feature, width, height, projection) => {
    const mainPolygon = getLargestPolygon(feature);
    const centroid = d3.geoCentroid(mainPolygon);
    const [cx, cy] = projection(centroid);
    const tempPath = d3.geoPath(projection);
    const [[bx0, by0], [bx1, by1]] = tempPath.bounds(mainPolygon);
    const halfW = Math.max(Math.abs(cx - bx0), Math.abs(bx1 - cx), 1);
    const halfH = Math.max(Math.abs(cy - by0), Math.abs(by1 - cy), 1);
    const scale = Math.min((width / 2) / halfW, (height / 2) / halfH, 8);
    return d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-cx, -cy);
  }, []);

  const zoomToCountry = useCallback((countryName) => {
    const canvas = canvasRef.current, zoom = zoomRef.current;
    const countries = countriesRef.current, projection = projectionRef.current;
    if (!canvas || !zoom || !countries || !projection || !countryName) return;
    const feature = countries.features.find((f) => {
      const name = f.properties.name || f.properties.NAME || f.properties.admin || f.properties.ADMIN || '';
      return name.toLowerCase() === countryName.toLowerCase();
    });
    if (!feature) return;
    try {
      const t = computeFitTransform(feature, canvas.width, canvas.height, projection);
      d3.select(canvas).transition().duration(750).call(zoom.transform, t);
    } catch (e) { console.error('zoomToCountry error:', e); }
  }, [computeFitTransform]);

  const zoomToGlobal = useCallback(() => {
    const canvas = canvasRef.current, zoom = zoomRef.current;
    if (canvas && zoom) d3.select(canvas).transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  }, []);

  useEffect(() => {
    if (selectedCountry) zoomToCountry(selectedCountry);
    else zoomToGlobal();
  }, [selectedCountry, zoomToCountry, zoomToGlobal]);

  // ─── Setup D3 : UNE SEULE FOIS quand worldAtlas est chargé ───────────────
  // casesData / selectedCountry / hoveredCountry NE SONT PAS dans les deps
  // → le setup ne se recrée jamais au mouvement du slider
  useEffect(() => {
    if (!worldAtlasQuery.data || !canvasRef.current) return;

    const canvas  = canvasRef.current;
    const context = canvas.getContext('2d');
    const width   = (canvas.width  = canvas.offsetWidth);
    const height  = (canvas.height = canvas.offsetHeight);

    const countries = topojson.feature(worldAtlasQuery.data, worldAtlasQuery.data.objects.countries);
    countries.features.forEach((f) => { f.properties.centroid = getLargestPolygonCentroid(f); });
    countriesRef.current = countries;

    const projection = d3.geoMercator().scale(width / (2 * Math.PI)).translate([width / 2, height / 2]);
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

    // ─── draw lit TOUJOURS les dernières valeurs via les refs ────────────────
    const draw = () => {
      const t              = transformRef.current;
      const curCasesData   = casesDataRef.current;
      const curSelected    = selectedCountryRef.current;
      const curHovered     = hoveredCountryRef.current;

      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(t.x, t.y);
      context.scale(t.k, t.k);

      context.fillStyle = '#0a1929';
      context.fillRect(-width * 2, -height * 2, width * 5, height * 5);

      countries.features.forEach((feature) => {
        const name = feature.properties.name || feature.properties.NAME || feature.properties.admin || feature.properties.ADMIN || '';
        const isSelected = curSelected && name.toLowerCase() === curSelected.toLowerCase();
        const isHovered  = curHovered  && name.toLowerCase() === curHovered.toLowerCase();
        context.fillStyle   = isSelected ? '#2a4a7f' : '#1a2f3f';
        context.strokeStyle = isSelected ? '#5a8aff' : isHovered ? '#4a6a8f' : '#2a4a5f';
        context.lineWidth   = (isSelected ? 1.5 : 0.5) / t.k;
        context.beginPath();
        path(feature);
        context.fill();
        context.stroke();
      });

      // Cercles cas
      if (curCasesData && curCasesData.length > 0) {
        const maxCases = Math.max(...curCasesData.map((c) => c.total_cases || 0));
        if (maxCases > 0) {
          curCasesData.forEach((countryData) => {
            if (!countryData.total_cases) return;
            const feature = countries.features.find((f) => {
              const n = f.properties.name || f.properties.NAME || f.properties.admin || f.properties.ADMIN || '';
              return n.toLowerCase() === countryData.country.toLowerCase();
            });
            if (!feature?.properties.centroid) return;
            const coords = projection(feature.properties.centroid);
            if (!coords || coords[0] < -width || coords[0] > width * 2 || coords[1] < -height || coords[1] > height * 2) return;
            const baseRadius = Math.sqrt(countryData.total_cases / maxCases) * 40;
            const radius     = Math.max(3, baseRadius / t.k);
            const isSel      = curSelected && countryData.country.toLowerCase() === curSelected.toLowerCase();
            context.shadowColor = isSel ? 'rgba(255,255,0,0.8)' : 'rgba(255,0,0,0.8)';
            context.shadowBlur  = (isSel ? 15 : 10) / t.k;
            context.fillStyle   = isSel ? 'rgba(255,255,0,0.7)' : 'rgba(255,0,0,0.6)';
            context.beginPath();
            context.arc(coords[0], coords[1], radius, 0, 2 * Math.PI);
            context.fill();
            context.strokeStyle = isSel ? 'rgba(255,255,100,1)' : 'rgba(255,100,100,0.8)';
            context.lineWidth   = (isSel ? 2 : 1) / t.k;
            context.stroke();
            context.shadowBlur = 0;
          });
        }
      }

      // Labels
      if (t.k < 2) {
        [
          [oceanLabels,     '#3a5a7a', 14, 0.7, 'italic'],
          [continentLabels, '#e0e0e0', 13, 0.9, 'bold'],
        ].forEach(([labels, color, fontSize, minZoom, fw]) => {
          if (t.k < minZoom) return;
          context.font         = `${fw} ${fontSize / t.k}px Arial`;
          context.fillStyle    = color;
          context.textAlign    = 'center';
          context.textBaseline = 'middle';
          context.globalAlpha  = Math.min(1, (t.k - minZoom + 0.5) / 0.7);
          labels.forEach((label) => {
            const coords = projection(label.coords);
            if (coords) {
              context.shadowColor = 'rgba(0,0,0,0.8)';
              context.shadowBlur  = 3 / t.k;
              context.fillText(label.name, coords[0], coords[1]);
              context.shadowBlur = 0;
            }
          });
          context.globalAlpha = 1;
        });
      } else {
        // Noms des pays
        const minArea = 1000 / (t.k * t.k);
        context.font         = `${10 / t.k}px Arial`;
        context.fillStyle    = '#ffffff';
        context.textAlign    = 'center';
        context.textBaseline = 'middle';
        context.globalAlpha  = Math.min(1, (t.k - 1.5) / 1);
        countries.features.forEach((feature) => {
          const area = d3.geoArea(feature) * 1_000_000;
          if (area > minArea && feature.properties.centroid) {
            const coords = projection(feature.properties.centroid);
            if (coords && coords[0] >= 0 && coords[0] <= width && coords[1] >= 0 && coords[1] <= height) {
              const name = feature.properties.name || feature.properties.NAME || feature.properties.admin || feature.properties.ADMIN || '';
              if (name) {
                context.shadowColor = 'rgba(0,0,0,0.8)';
                context.shadowBlur  = 3 / t.k;
                context.fillText(name, coords[0], coords[1]);
                context.shadowBlur = 0;
              }
            }
          }
        });
        context.globalAlpha = 1;
      }

      context.restore();
    };

    drawRef.current = draw;

    // ─── findClickedCountry ───────────────────────────────────────────────
    const findClickedCountry = (x, y) => {
      const curCasesData = casesDataRef.current;
      if (curCasesData && curCasesData.length > 0) {
        const maxCases = Math.max(...curCasesData.map((c) => c.total_cases || 0));
        if (maxCases > 0) {
          for (const countryData of curCasesData) {
            if (!countryData.total_cases) continue;
            const feature = countries.features.find((f) => {
              const n = f.properties.name || f.properties.NAME || f.properties.admin || f.properties.ADMIN || '';
              return n.toLowerCase() === countryData.country.toLowerCase();
            });
            if (feature?.properties.centroid) {
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
          const name = feature.properties.name || feature.properties.NAME || feature.properties.admin || feature.properties.ADMIN || '';
          if (name && d3.geoContains(feature, point)) return name;
        }
      }
      return null;
    };

    // ─── Event handlers ───────────────────────────────────────────────────
    const handleCanvasClick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const rect = canvas.getBoundingClientRect();
      const t    = transformRef.current;
      const x    = (e.clientX - rect.left - t.x) / t.k;
      const y    = (e.clientY - rect.top  - t.y) / t.k;
      const clicked = findClickedCountry(x, y);
      if (clicked && onCountryClickRef.current) onCountryClickRef.current(clicked);
    };

    const handleCanvasMove = (e) => {
      const rect    = canvas.getBoundingClientRect();
      const t       = transformRef.current;
      const x       = (e.clientX - rect.left - t.x) / t.k;
      const y       = (e.clientY - rect.top  - t.y) / t.k;
      const country = findClickedCountry(x, y);
      if (country !== hoveredCountryRef.current) {
        hoveredCountryRef.current = country;
        setHoveredCountry(country);
        canvas.style.cursor = country ? 'pointer' : 'default';
      }
    };

    // ─── D3 zoom ──────────────────────────────────────────────────────────
    const zoom = d3.zoom()
      .filter((e) => e.type === 'wheel')
      .scaleExtent([1, 8])
      .on('zoom', (e) => {
        transformRef.current = e.transform;
        draw();
      });

    zoomRef.current = zoom;
    d3.select(canvas).call(zoom);
    canvas.addEventListener('click',     handleCanvasClick, true);
    canvas.addEventListener('mousemove', handleCanvasMove);

    draw();

    const handleResize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      projection.scale(canvas.width / (2 * Math.PI)).translate([canvas.width / 2, canvas.height / 2]);
      draw();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click',     handleCanvasClick, true);
      canvas.removeEventListener('mousemove', handleCanvasMove);
      drawRef.current = null;
    };
  // ✅ UNIQUEMENT worldAtlasQuery.data — jamais casesData/selectedCountry/hoveredCountry
  }, [worldAtlasQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleZoomIn  = () => { const c = canvasRef.current, z = zoomRef.current; if (c && z) d3.select(c).transition().duration(300).call(z.scaleBy, 1.3); };
  const handleZoomOut = () => { const c = canvasRef.current, z = zoomRef.current; if (c && z) d3.select(c).transition().duration(300).call(z.scaleBy, 0.77); };

  return (
    <QueryStateWrapper query={worldAtlasQuery} loadingMessage="Loading world map..." errorMessage="Failed to load world map">
      {() => (
        <div className="map-panel">
          <div className="view-toggle-buttons">
            <button className="view-toggle-btn" title="Bookmark">⋯</button>
            <button className="view-toggle-btn" title="List view">☰</button>
            <button className="view-toggle-btn" title="Grid view">⊞</button>
          </div>

          {hoveredCountry && (
            <div style={{ position: 'absolute', top: '60px', left: '20px', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', zIndex: 1000, pointerEvents: 'none' }}>
              {hoveredCountry} — cliquez pour sélectionner
            </div>
          )}

          <canvas ref={canvasRef} className="map-container" style={{ touchAction: 'none' }} />

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
              <strong>Lancet Inf Dis</strong> Article: <a href="#">Here</a>. Mobile Version: <a href="#">Here</a>. Visualization: <a href="#">JHU CSSE</a>. Automation Support: <a href="#">Esri Living Atlas team</a> and <a href="#">JHU APL</a>. <a href="#">Contact Us</a>. <a href="#">FAQ</a>.<br />
              Data sources: WHO, CDC, ECDC, NHC, DXY, 1point3acres, Worldometers.info, BNO, state and national government health departments, and local media reports.<br />
              Downloadable database: GitHub: <a href="#">Here</a>. Feature layer: <a href="#">Here</a>.
            </div>
          </div>
        </div>
      )}
    </QueryStateWrapper>
  );
};

export default React.memo(MapComponent);