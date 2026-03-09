'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import { useWorldAtlas } from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

// ─── Mapping API name → TopoJSON name (world-atlas countries-50m) ─────────────
// Les noms API (JHU nettoyés) ne correspondent pas toujours aux noms TopoJSON
const API_TO_GEO = {
  'US':                        'United States of America',
  'Korea, South':              'South Korea',
  'Korea, North':              'North Korea',
  'Congo (Kinshasa)':          'Dem. Rep. Congo',
  'Congo (Brazzaville)':       'Congo',
  "Cote d'Ivoire":             "Côte d'Ivoire",
  'Czechia':                   'Czech Republic',
  'North Macedonia':           'Macedonia',
  'UAE':                       'United Arab Emirates',
  'Taiwan*':                   'Taiwan',
  'West Bank and Gaza':        'Palestine',
  'Eswatini':                  'Swaziland',
  'East Timor':                'Timor-Leste',
  'Myanmar':                   'Myanmar',
  'Vatican City':              'Vatican',
  'São Tomé and Príncipe':     'São Tomé and Príncipe',
  'Cape Verde':                'Cabo Verde',
  'MS Zaandam (ship)':         null,
  'Diamond Princess (ship)':   null,
};

// Résout le nom API → nom TopoJSON pour le lookup dans l'index geo
const resolveGeoName = (apiName) => {
  if (apiName in API_TO_GEO) return API_TO_GEO[apiName]; // null = pas de pays
  return apiName;
};

// Retourne le plus grand polygone d'un MultiPolygon (évite les îles éloignées)
const getLargestPolygon = (f) => {
  if (!f.geometry) return f;
  if (f.geometry.type === 'Polygon') return f;
  if (f.geometry.type === 'MultiPolygon') {
    let best = -Infinity, bestCoords = null;
    f.geometry.coordinates.forEach(coords => {
      const area = d3.geoArea({ type:'Feature', geometry:{type:'Polygon',coordinates:coords}, properties:f.properties });
      if (area > best) { best = area; bestCoords = coords; }
    });
    if (bestCoords) return { type:'Feature', geometry:{type:'Polygon',coordinates:bestCoords}, properties:f.properties };
  }
  return f;
};

const getName = (f) => f.properties.name || f.properties.NAME || f.properties.admin || f.properties.ADMIN || '';

const MapComponent = ({ casesData, selectedCountry, onCountryClick }) => {
  const canvasRef    = useRef(null);
  const zoomRef      = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);
  const drawRef      = useRef(null);
  const rafRef       = useRef(null);

  const featureIndexRef  = useRef({}); // geoNameLower → feature
  const countriesRef     = useRef(null);
  const projectionRef    = useRef(null);

  const casesDataRef       = useRef(casesData);
  const selectedCountryRef = useRef(selectedCountry);
  const hoveredCountryRef  = useRef(null);
  const onCountryClickRef  = useRef(onCountryClick);

  casesDataRef.current       = casesData;
  selectedCountryRef.current = selectedCountry;
  onCountryClickRef.current  = onCountryClick;

  const [hoveredCountry, setHoveredCountry] = useState(null);
  const worldAtlasQuery = useWorldAtlas();

  const scheduleDraw = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; drawRef.current?.(); });
  }, []);

  useEffect(() => { scheduleDraw(); }, [casesData, selectedCountry, hoveredCountry, scheduleDraw]);

  const computeFit = useCallback((feature, W, H, proj) => {
    const main = getLargestPolygon(feature);
    const [cx, cy] = proj(d3.geoCentroid(main));
    const [[x0,y0],[x1,y1]] = d3.geoPath(proj).bounds(main);
    const hw = Math.max(Math.abs(cx-x0), Math.abs(x1-cx), 1);
    const hh = Math.max(Math.abs(cy-y0), Math.abs(y1-cy), 1);
    const s  = Math.min((W/2)/hw, (H/2)/hh, 8);
    return d3.zoomIdentity.translate(W/2, H/2).scale(s).translate(-cx, -cy);
  }, []);

  const zoomToCountry = useCallback((name) => {
    const canvas = canvasRef.current, zoom = zoomRef.current, proj = projectionRef.current;
    if (!canvas || !zoom || !proj || !name) return;
    // Résoudre le nom API → nom geo pour le zoom
    const geoName = resolveGeoName(name);
    if (!geoName) return;
    const feature = featureIndexRef.current[geoName.toLowerCase()];
    if (!feature) return;
    try { d3.select(canvas).transition().duration(750).call(zoom.transform, computeFit(feature, canvas.width, canvas.height, proj)); }
    catch(e) {}
  }, [computeFit]);

  const zoomToGlobal = useCallback(() => {
    const c = canvasRef.current, z = zoomRef.current;
    if (c && z) d3.select(c).transition().duration(750).call(z.transform, d3.zoomIdentity);
  }, []);

  useEffect(() => {
    if (selectedCountry) zoomToCountry(selectedCountry);
    else zoomToGlobal();
  }, [selectedCountry, zoomToCountry, zoomToGlobal]);

  // Setup D3 : UNE SEULE FOIS
  useEffect(() => {
    if (!worldAtlasQuery.data || !canvasRef.current) return;

    const canvas  = canvasRef.current;
    const ctx     = canvas.getContext('2d');
    const W       = (canvas.width  = canvas.offsetWidth);
    const H       = (canvas.height = canvas.offsetHeight);

    const countries = topojson.feature(worldAtlasQuery.data, worldAtlasQuery.data.objects.countries);

    // Index par nom geo (O(1) lookup) + centroïde sur le PLUS GRAND polygone
    const idx = {};
    countries.features.forEach(f => {
      const name = getName(f);
      // ✅ Centroïde calculé sur le plus grand polygone → jamais dans l'eau
      const mainPoly = getLargestPolygon(f);
      f.properties.centroid = d3.geoCentroid(mainPoly);
      if (name) idx[name.toLowerCase()] = f;
    });
    featureIndexRef.current = idx;
    countriesRef.current    = countries;

    const proj = d3.geoMercator().scale(W / (2*Math.PI)).translate([W/2, H/2]);
    projectionRef.current = proj;
    const geoPath = d3.geoPath(proj, ctx);

    const oceanLbls = [
      {name:'PACIFIC OCEAN', coords:[-160,0]}, {name:'ATLANTIC OCEAN', coords:[-30,15]},
      {name:'INDIAN OCEAN',  coords:[75,-15]}, {name:'ARCTIC OCEAN',   coords:[0,75]},
    ];
    const contLbls = [
      {name:'NORTH AMERICA',coords:[-100,45]},{name:'SOUTH AMERICA',coords:[-60,-15]},
      {name:'EUROPE',coords:[15,52]},{name:'AFRICA',coords:[20,5]},
      {name:'ASIA',coords:[90,45]},{name:'AUSTRALIA',coords:[135,-25]},
    ];

    const draw = () => {
      const t   = transformRef.current;
      const cas = casesDataRef.current;
      const sel = selectedCountryRef.current?.toLowerCase();
      const hov = hoveredCountryRef.current?.toLowerCase();

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);
      ctx.fillStyle = '#0a1929';
      ctx.fillRect(-W*2, -H*2, W*5, H*5);

      // Pays
      countries.features.forEach(f => {
        const nl = getName(f).toLowerCase();
        const isSel = sel && nl === sel;
        const isHov = hov && nl === hov;
        ctx.fillStyle   = isSel ? '#2a4a7f' : '#1a2f3f';
        ctx.strokeStyle = isSel ? '#5a8aff' : isHov ? '#4a6a8f' : '#2a4a5f';
        ctx.lineWidth   = (isSel ? 1.5 : 0.5) / t.k;
        ctx.beginPath(); geoPath(f); ctx.fill(); ctx.stroke();
      });

      // ✅ Cercles — lookup via API_TO_GEO pour trouver le bon feature
      if (cas?.length > 0) {
        let max = 0;
        for (let i = 0; i < cas.length; i++) if (cas[i].total_cases > max) max = cas[i].total_cases;
        if (max > 0) {
          for (const cd of cas) {
            if (!cd.total_cases) continue;
            // Résoudre le nom API → nom geo
            const geoName = resolveGeoName(cd.country);
            if (!geoName) continue; // ships etc.
            const f = idx[geoName.toLowerCase()] || idx[cd.country.toLowerCase()];
            if (!f?.properties.centroid) continue;
            const [px,py] = proj(f.properties.centroid);
            if (px < -W || px > W*2 || py < -H || py > H*2) continue;
            const r     = Math.max(3, Math.sqrt(cd.total_cases/max)*40/t.k);
            const isSel = sel && (geoName.toLowerCase() === sel || cd.country.toLowerCase() === sel);
            ctx.shadowColor = isSel ? 'rgba(255,255,0,.8)' : 'rgba(255,0,0,.8)';
            ctx.shadowBlur  = (isSel ? 15 : 10) / t.k;
            ctx.fillStyle   = isSel ? 'rgba(255,255,0,.7)' : 'rgba(255,0,0,.6)';
            ctx.beginPath(); ctx.arc(px, py, r, 0, 2*Math.PI); ctx.fill();
            ctx.strokeStyle = isSel ? 'rgba(255,255,100,1)' : 'rgba(255,100,100,.8)';
            ctx.lineWidth   = (isSel ? 2 : 1) / t.k;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Labels
      if (t.k < 2) {
        [[oceanLbls,'#3a5a7a',14,.7,'italic'],[contLbls,'#e0e0e0',13,.9,'bold']].forEach(([lbs,col,fs,mz,fw]) => {
          if (t.k < mz) return;
          ctx.font=`${fw} ${fs/t.k}px Arial`; ctx.fillStyle=col; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.globalAlpha=Math.min(1,(t.k-mz+.5)/.7);
          lbs.forEach(l => { const c=proj(l.coords); if(c){ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=3/t.k;ctx.fillText(l.name,c[0],c[1]);ctx.shadowBlur=0;} });
          ctx.globalAlpha=1;
        });
      } else {
        const minArea = 1000/(t.k*t.k);
        ctx.font=`${10/t.k}px Arial`; ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.globalAlpha=Math.min(1,(t.k-1.5)/1);
        countries.features.forEach(f => {
          if (d3.geoArea(f)*1e6 > minArea && f.properties.centroid) {
            const c = proj(f.properties.centroid);
            if (c && c[0]>=0 && c[0]<=W && c[1]>=0 && c[1]<=H) {
              const n=getName(f); if(n){ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=3/t.k;ctx.fillText(n,c[0],c[1]);ctx.shadowBlur=0;}
            }
          }
        });
        ctx.globalAlpha=1;
      }
      ctx.restore();
    };

    drawRef.current = draw;

    const hitTest = (x, y) => {
      const cas = casesDataRef.current;
      if (cas?.length > 0) {
        let max = 0;
        for (const cd of cas) if (cd.total_cases > max) max = cd.total_cases;
        if (max > 0) {
          const k = transformRef.current.k;
          for (const cd of cas) {
            if (!cd.total_cases) continue;
            const geoName = resolveGeoName(cd.country);
            if (!geoName) continue;
            const f = idx[geoName.toLowerCase()] || idx[cd.country.toLowerCase()];
            if (!f?.properties.centroid) continue;
            const [px,py] = proj(f.properties.centroid);
            if (Math.hypot(x-px, y-py) <= Math.max(3, Math.sqrt(cd.total_cases/max)*40/k))
              return getName(f);
          }
        }
      }
      const pt = proj.invert([x, y]);
      if (pt) for (const f of countries.features) if (d3.geoContains(f, pt)) return getName(f);
      return null;
    };

    const onClick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const r=canvas.getBoundingClientRect(), t=transformRef.current;
      const hit = hitTest((e.clientX-r.left-t.x)/t.k, (e.clientY-r.top-t.y)/t.k);
      if (hit && onCountryClickRef.current) onCountryClickRef.current(hit);
    };
    const onMove = (e) => {
      const r=canvas.getBoundingClientRect(), t=transformRef.current;
      const country = hitTest((e.clientX-r.left-t.x)/t.k, (e.clientY-r.top-t.y)/t.k);
      if (country !== hoveredCountryRef.current) {
        hoveredCountryRef.current = country;
        setHoveredCountry(country);
        canvas.style.cursor = country ? 'pointer' : 'default';
      }
    };

    const zoom = d3.zoom().filter(e=>e.type==='wheel').scaleExtent([1,8])
      .on('zoom', (e) => {
        transformRef.current = e.transform;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => { rafRef.current=null; draw(); });
      });
    zoomRef.current = zoom;
    d3.select(canvas).call(zoom);
    canvas.addEventListener('click', onClick, true);
    canvas.addEventListener('mousemove', onMove);
    draw();

    const onResize = () => {
      canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight;
      proj.scale(canvas.width/(2*Math.PI)).translate([canvas.width/2,canvas.height/2]);
      draw();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('click', onClick, true);
      canvas.removeEventListener('mousemove', onMove);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current=null; }
      drawRef.current=null;
    };
  }, [worldAtlasQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleZoomIn  = () => { const c=canvasRef.current,z=zoomRef.current; if(c&&z) d3.select(c).transition().duration(300).call(z.scaleBy,1.3); };
  const handleZoomOut = () => { const c=canvasRef.current,z=zoomRef.current; if(c&&z) d3.select(c).transition().duration(300).call(z.scaleBy,.77); };

  return (
    <QueryStateWrapper query={worldAtlasQuery} loadingMessage="Loading world map..." errorMessage="Failed to load world map">
      {() => (
        <div className="map-panel">
          <div className="view-toggle-buttons">
            <button className="view-toggle-btn">⋯</button>
            <button className="view-toggle-btn">☰</button>
            <button className="view-toggle-btn">⊞</button>
          </div>
          {hoveredCountry && (
            <div style={{position:'absolute',top:'60px',left:'20px',background:'rgba(0,0,0,.8)',color:'#fff',padding:'5px 10px',borderRadius:'4px',fontSize:'12px',zIndex:1000,pointerEvents:'none'}}>
              {hoveredCountry} — click to select
            </div>
          )}
          <canvas ref={canvasRef} className="map-container" style={{touchAction:'none'}} />
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={handleZoomIn}>+</button>
            <button className="zoom-btn" onClick={handleZoomOut}>−</button>
          </div>
          <div className="map-tabs">
            <button className="map-tab active">Cumulative Confirmed Cases</button>
            <button className="map-tab">Active Cases</button>
          </div>
          <div className="info-bar">
            <div className="info-section">
              <span className="info-label">{casesData?.length||0}</span>
              <span className="info-sublabel">countries/regions</span>
            </div>
            <div className="info-text">
              Visualization: <a href="#">JHU CSSE</a>. Data: WHO, CDC, ECDC, NHC, DXY, Worldometers.info, BNO, state/national health departments.
            </div>
          </div>
        </div>
      )}
    </QueryStateWrapper>
  );
};

export default React.memo(MapComponent);