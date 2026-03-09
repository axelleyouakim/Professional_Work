'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import { useWorldAtlas } from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

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

const resolveGeoName = (apiName) => {
  if (apiName in API_TO_GEO) return API_TO_GEO[apiName];
  return apiName;
};

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
  // ✅ DEUX canvas superposés :
  // bgCanvasRef  → pays/frontières/labels (statique, redessiné seulement au zoom/resize/sélection)
  // fgCanvasRef  → cercles seulement      (dynamique, redessiné à chaque slider)
  const bgCanvasRef  = useRef(null);
  const fgCanvasRef  = useRef(null);
  const zoomRef      = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);
  const drawBgRef    = useRef(null); // dessine pays + labels
  const drawFgRef    = useRef(null); // dessine cercles seulement
  const rafRef       = useRef(null);

  const featureIndexRef = useRef({});
  const projectionRef   = useRef(null);

  const casesDataRef       = useRef(casesData);
  const selectedCountryRef = useRef(selectedCountry);
  const hoveredCountryRef  = useRef(null);
  const onCountryClickRef  = useRef(onCountryClick);

  casesDataRef.current       = casesData;
  selectedCountryRef.current = selectedCountry;
  onCountryClickRef.current  = onCountryClick;

  const [hoveredCountry, setHoveredCountry] = useState(null);
  const worldAtlasQuery = useWorldAtlas();

  // ✅ scheduleFg : redessine SEULEMENT les cercles (slider → ~5ms au lieu de 195ms)
  const scheduleFg = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawFgRef.current?.();
    });
  }, []);

  // ✅ scheduleBg : redessine les pays + cercles (zoom, hover, sélection, resize)
  const scheduleBoth = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawBgRef.current?.();
      drawFgRef.current?.();
    });
  }, []);

  // casesData change (slider) → seulement fg
  useEffect(() => { scheduleFg(); }, [casesData, scheduleFg]);

  // selectedCountry ou hover change → bg + fg (couleur pays change)
  useEffect(() => { scheduleBoth(); }, [selectedCountry, hoveredCountry, scheduleBoth]);

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
    const canvas = bgCanvasRef.current, zoom = zoomRef.current, proj = projectionRef.current;
    if (!canvas || !zoom || !proj || !name) return;
    const geoName = resolveGeoName(name);
    if (!geoName) return;
    const feature = featureIndexRef.current[geoName.toLowerCase()];
    if (!feature) return;
    try { d3.select(fgCanvasRef.current).transition().duration(750).call(zoom.transform, computeFit(feature, canvas.width, canvas.height, proj)); }
    catch(e) {}
  }, [computeFit]);

  const zoomToGlobal = useCallback(() => {
    const c = fgCanvasRef.current, z = zoomRef.current;
    if (c && z) d3.select(c).transition().duration(750).call(z.transform, d3.zoomIdentity);
  }, []);

  useEffect(() => {
    if (selectedCountry) zoomToCountry(selectedCountry);
    else zoomToGlobal();
  }, [selectedCountry, zoomToCountry, zoomToGlobal]);

  // Setup D3 : UNE SEULE FOIS
  useEffect(() => {
    if (!worldAtlasQuery.data || !bgCanvasRef.current || !fgCanvasRef.current) return;

    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    const bgCtx    = bgCanvas.getContext('2d');
    const fgCtx    = fgCanvas.getContext('2d');

    const W = (bgCanvas.width = fgCanvas.width = bgCanvas.offsetWidth);
    const H = (bgCanvas.height = fgCanvas.height = bgCanvas.offsetHeight);

    const countries = topojson.feature(worldAtlasQuery.data, worldAtlasQuery.data.objects.countries);

    const idx = {};
    countries.features.forEach(f => {
      const name = getName(f);
      const mainPoly = getLargestPolygon(f);
      f.properties.centroid = d3.geoCentroid(mainPoly);
      if (name) idx[name.toLowerCase()] = f;
    });
    featureIndexRef.current = idx;

    const proj = d3.geoMercator().scale(W / (2*Math.PI)).translate([W/2, H/2]);
    projectionRef.current = proj;
    const geoPath = d3.geoPath(proj, bgCtx);

    const oceanLbls = [
      {name:'PACIFIC OCEAN', coords:[-160,0]}, {name:'ATLANTIC OCEAN', coords:[-30,15]},
      {name:'INDIAN OCEAN',  coords:[75,-15]}, {name:'ARCTIC OCEAN',   coords:[0,75]},
    ];
    const contLbls = [
      {name:'NORTH AMERICA',coords:[-100,45]},{name:'SOUTH AMERICA',coords:[-60,-15]},
      {name:'EUROPE',coords:[15,52]},{name:'AFRICA',coords:[20,5]},
      {name:'ASIA',coords:[90,45]},{name:'AUSTRALIA',coords:[135,-25]},
    ];

    // ✅ drawBg : pays + labels SEULEMENT
    // Appelé au zoom, resize, hover, sélection pays — PAS au slider
    const drawBg = () => {
      const t   = transformRef.current;
      const sel = selectedCountryRef.current?.toLowerCase();
      const hov = hoveredCountryRef.current?.toLowerCase();

      bgCtx.clearRect(0, 0, W, H);
      bgCtx.save();
      bgCtx.translate(t.x, t.y);
      bgCtx.scale(t.k, t.k);
      bgCtx.fillStyle = '#0a1929';
      bgCtx.fillRect(-W*2, -H*2, W*5, H*5);

      countries.features.forEach(f => {
        const nl = getName(f).toLowerCase();
        const isSel = sel && nl === sel;
        const isHov = hov && nl === hov;
        bgCtx.fillStyle   = isSel ? '#2a4a7f' : '#1a2f3f';
        bgCtx.strokeStyle = isSel ? '#5a8aff' : isHov ? '#4a6a8f' : '#2a4a5f';
        bgCtx.lineWidth   = (isSel ? 1.5 : 0.5) / t.k;
        bgCtx.beginPath(); geoPath(f); bgCtx.fill(); bgCtx.stroke();
      });

      if (t.k < 2) {
        [[oceanLbls,'#3a5a7a',14,.7,'italic'],[contLbls,'#e0e0e0',13,.9,'bold']].forEach(([lbs,col,fs,mz,fw]) => {
          if (t.k < mz) return;
          bgCtx.font=`${fw} ${fs/t.k}px Arial`; bgCtx.fillStyle=col; bgCtx.textAlign='center'; bgCtx.textBaseline='middle';
          bgCtx.globalAlpha=Math.min(1,(t.k-mz+.5)/.7);
          lbs.forEach(l => { const c=proj(l.coords); if(c){bgCtx.shadowColor='rgba(0,0,0,.8)';bgCtx.shadowBlur=3/t.k;bgCtx.fillText(l.name,c[0],c[1]);bgCtx.shadowBlur=0;} });
          bgCtx.globalAlpha=1;
        });
      } else {
        const minArea = 1000/(t.k*t.k);
        bgCtx.font=`${10/t.k}px Arial`; bgCtx.fillStyle='#fff'; bgCtx.textAlign='center'; bgCtx.textBaseline='middle';
        bgCtx.globalAlpha=Math.min(1,(t.k-1.5)/1);
        countries.features.forEach(f => {
          if (d3.geoArea(f)*1e6 > minArea && f.properties.centroid) {
            const c = proj(f.properties.centroid);
            if (c && c[0]>=0 && c[0]<=W && c[1]>=0 && c[1]<=H) {
              const n=getName(f); if(n){bgCtx.shadowColor='rgba(0,0,0,.8)';bgCtx.shadowBlur=3/t.k;bgCtx.fillText(n,c[0],c[1]);bgCtx.shadowBlur=0;}
            }
          }
        });
        bgCtx.globalAlpha=1;
      }
      bgCtx.restore();
    };

    // ✅ drawFg : cercles SEULEMENT — appelé à CHAQUE position du slider
    // ~5ms au lieu de 195ms car pas de geoPath des pays
    const drawFg = () => {
      const t   = transformRef.current;
      const cas = casesDataRef.current;
      const sel = selectedCountryRef.current?.toLowerCase();

      fgCtx.clearRect(0, 0, W, H);
      if (!cas?.length) return;

      let max = 0;
      for (let i = 0; i < cas.length; i++) if (cas[i].total_cases > max) max = cas[i].total_cases;
      if (!max) return;

      fgCtx.save();
      fgCtx.translate(t.x, t.y);
      fgCtx.scale(t.k, t.k);

      for (const cd of cas) {
        if (!cd.total_cases) continue;
        const geoName = resolveGeoName(cd.country);
        if (!geoName) continue;
        const f = idx[geoName.toLowerCase()] || idx[cd.country.toLowerCase()];
        if (!f?.properties.centroid) continue;
        const [px,py] = proj(f.properties.centroid);
        if (px < -W || px > W*2 || py < -H || py > H*2) continue;
        const r     = Math.max(3, Math.sqrt(cd.total_cases/max)*40/t.k);
        const isSel = sel && (geoName.toLowerCase() === sel || cd.country.toLowerCase() === sel);
        fgCtx.shadowColor = isSel ? 'rgba(255,255,0,.8)' : 'rgba(255,0,0,.8)';
        fgCtx.shadowBlur  = (isSel ? 15 : 10) / t.k;
        fgCtx.fillStyle   = isSel ? 'rgba(255,255,0,.7)' : 'rgba(255,0,0,.6)';
        fgCtx.beginPath(); fgCtx.arc(px, py, r, 0, 2*Math.PI); fgCtx.fill();
        fgCtx.strokeStyle = isSel ? 'rgba(255,255,100,1)' : 'rgba(255,100,100,.8)';
        fgCtx.lineWidth   = (isSel ? 2 : 1) / t.k;
        fgCtx.stroke();
        fgCtx.shadowBlur = 0;
      }
      fgCtx.restore();
    };

    drawBgRef.current = drawBg;
    drawFgRef.current = drawFg;

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
      const r=fgCanvas.getBoundingClientRect(), t=transformRef.current;
      const hit = hitTest((e.clientX-r.left-t.x)/t.k, (e.clientY-r.top-t.y)/t.k);
      if (hit && onCountryClickRef.current) onCountryClickRef.current(hit);
    };

    const onMove = (e) => {
      const r=fgCanvas.getBoundingClientRect(), t=transformRef.current;
      const country = hitTest((e.clientX-r.left-t.x)/t.k, (e.clientY-r.top-t.y)/t.k);
      if (country !== hoveredCountryRef.current) {
        hoveredCountryRef.current = country;
        setHoveredCountry(country);
        fgCanvas.style.cursor = country ? 'pointer' : 'default';
      }
    };

    // Zoom appliqué sur fgCanvas (celui du dessus, qui reçoit les events)
    const zoom = d3.zoom().filter(e=>e.type==='wheel').scaleExtent([1,8])
      .on('zoom', (e) => {
        transformRef.current = e.transform;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          drawBg();
          drawFg();
        });
      });
    zoomRef.current = zoom;
    d3.select(fgCanvas).call(zoom);
    fgCanvas.addEventListener('click', onClick, true);
    fgCanvas.addEventListener('mousemove', onMove);

    drawBg();
    drawFg();

    const onResize = () => {
      const nW = bgCanvas.offsetWidth;
      const nH = bgCanvas.offsetHeight;
      bgCanvas.width = fgCanvas.width = nW;
      bgCanvas.height = fgCanvas.height = nH;
      proj.scale(nW/(2*Math.PI)).translate([nW/2,nH/2]);
      drawBg();
      drawFg();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      fgCanvas.removeEventListener('click', onClick, true);
      fgCanvas.removeEventListener('mousemove', onMove);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current=null; }
      drawBgRef.current = null;
      drawFgRef.current = null;
    };
  }, [worldAtlasQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleZoomIn  = () => { const c=fgCanvasRef.current,z=zoomRef.current; if(c&&z) d3.select(c).transition().duration(300).call(z.scaleBy,1.3); };
  const handleZoomOut = () => { const c=fgCanvasRef.current,z=zoomRef.current; if(c&&z) d3.select(c).transition().duration(300).call(z.scaleBy,.77); };

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
          {/* ✅ bg canvas : pays statiques, en dessous */}
          <canvas ref={bgCanvasRef} className="map-container" style={{position:'absolute',top:0,left:0,touchAction:'none',pointerEvents:'none'}} />
          {/* ✅ fg canvas : cercles dynamiques + events, au dessus */}
          <canvas ref={fgCanvasRef} className="map-container" style={{position:'absolute',top:0,left:0,touchAction:'none'}} />
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