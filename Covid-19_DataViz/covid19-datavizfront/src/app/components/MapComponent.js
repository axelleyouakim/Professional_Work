'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import { useWorldAtlas } from '../hooks/useCovidData';
import QueryStateWrapper from './QueryStateWrapper';
import './Dashboard.css';

const API_TO_GEO = {
  'US':                              'United States of America',
  'Korea, South':                    'South Korea',
  'Korea, North':                    'North Korea',
  'Congo (Kinshasa)':                'Dem. Rep. Congo',
  'Congo (Brazzaville)':             'Congo',
  "Cote d'Ivoire":                   "Côte d'Ivoire",
  'Czechia':                         'Czechia',
  'North Macedonia':                 'Macedonia',
  'UAE':                             'United Arab Emirates',
  'Taiwan*':                         'Taiwan',
  'West Bank and Gaza':              'Palestine',
  'Eswatini':                        'eSwatini',
  'East Timor':                      'Timor-Leste',
  'Myanmar':                         'Myanmar',
  'Burma':                           'Myanmar',
  'Vatican City':                    'Vatican',
  'São Tomé and Príncipe':           'São Tomé and Principe',
  'Sao Tome and Principe':           'São Tomé and Principe',
  'Cape Verde':                      'Cabo Verde',
  'South Sudan':                     'S. Sudan',
  'Central African Republic':        'Central African Rep.',
  'Dominican Republic':              'Dominican Rep.',
  'Equatorial Guinea':               'Eq. Guinea',
  'Bosnia and Herzegovina':          'Bosnia and Herz.',
  'Solomon Islands':                 'Solomon Is.',
  'Antigua and Barbuda':             'Antigua and Barb.',
  'Saint Kitts and Nevis':           'St. Kitts and Nevis',
  'Saint Vincent and the Grenadines':'St. Vin. and Gren.',
  'Saint Lucia':                     'Saint Lucia',
  'Virgin Islands':                  'U.S. Virgin Is.',
  'Northern Mariana Islands':        'N. Mariana Is.',
  'MS Zaandam (ship)':               null,
  'Diamond Princess (ship)':         null,
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

const ANTIMERIDIAN_COUNTRIES = {
  'russia':    { center: [100, 65],  scale: 2.5 },
  'us':        { center: [-100, 40], scale: 3.5 },
  'united states of america': { center: [-100, 40], scale: 3.5 },
  'fiji':      { center: [178, -18], scale: 8   },
  'kiribati':  { center: [-168, 0],  scale: 6   },
  'new zealand': { center: [172, -42], scale: 5 },
};

const MIN_HIT_PX = 12;

const LABEL_EXCLUDE = new Set([
  'Siachen Glacier','Somaliland','N. Cyprus','W. Sahara','Antarctica',
  'Ashmore and Cartier Is.','Br. Indian Ocean Ter.','Heard I. and McDonald Is.',
  'Fr. S. Antarctic Lands','S. Geo. and the Is.','Indian Ocean Ter.',
  'Faeroe Is.','Greenland','Falkland Is.','New Caledonia','Fr. Polynesia',
  'Guernsey','Jersey','Isle of Man','Pitcairn Is.','Wallis and Futuna Is.',
  'Cook Is.','Niue','Norfolk Island','Curaçao','Sint Maarten',
  'St-Barthélemy','St-Martin','St. Pierre and Miquelon','Turks and Caicos Is.',
  'Cayman Is.','Anguilla','Bermuda','British Virgin Is.','Macao','Åland',
]);

const GRID_N = 36;

const buildSpatialGrid = (features) => {
  const grid = Array.from({ length: GRID_N * GRID_N }, () => []);
  const lngToCol = (lng) => Math.floor((lng + 180) / 360 * GRID_N);
  const latToRow = (lat) => Math.floor((85 - lat) / 170 * GRID_N);
  features.forEach(f => {
    if (!f.geometry) return;
    try {
      const [[x0, y0], [x1, y1]] = d3.geoBounds(f);
      const col0 = Math.max(0, lngToCol(x0));
      const col1 = Math.min(GRID_N - 1, lngToCol(x1));
      const row0 = Math.max(0, latToRow(y1));
      const row1 = Math.min(GRID_N - 1, latToRow(y0));
      for (let r = row0; r <= row1; r++) {
        for (let c = col0; c <= col1; c++) {
          grid[r * GRID_N + c].push(f);
        }
      }
    } catch (_) {}
  });
  return {
    grid,
    getCandidates: (lng, lat) => {
      const col = Math.max(0, Math.min(GRID_N - 1, lngToCol(lng)));
      const row = Math.max(0, Math.min(GRID_N - 1, latToRow(lat)));
      return grid[row * GRID_N + col];
    },
  };
};

const MapComponent = ({ casesData, selectedCountry, onCountryClick }) => {
  const bgCanvasRef  = useRef(null);
  const fgCanvasRef  = useRef(null);
  const zoomRef      = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);
  const drawBgRef    = useRef(null);
  const drawFgRef    = useRef(null);
  const rafRef       = useRef(null);
  const hoverRafRef  = useRef(null);

  const featureIndexRef   = useRef({});
  const projectionRef     = useRef(null);
  const bubbleCacheRef    = useRef([]);
  const allFeaturesRef    = useRef([]);
  const spatialGridRef    = useRef(null);
  const globalMaxCasesRef = useRef(0);

  const casesDataRef       = useRef(casesData);
  const selectedCountryRef = useRef(selectedCountry);
  const hoveredCountryRef  = useRef(null);
  const onCountryClickRef  = useRef(onCountryClick);
  const moveThrottleRef    = useRef({ lastMs: 0, trailingId: null });

  casesDataRef.current       = casesData;
  selectedCountryRef.current = selectedCountry;
  onCountryClickRef.current  = onCountryClick;

  const [hoveredLabel, setHoveredLabel] = useState(null);
  const worldAtlasQuery = useWorldAtlas();

  const scheduleFg = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawFgRef.current?.();
    });
  }, []);

  const scheduleBoth = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawBgRef.current?.();
      drawFgRef.current?.();
    });
  }, []);

  useEffect(() => {
    if (casesData?.length) {
      for (let i = 0; i < casesData.length; i++) {
        if (casesData[i].total_cases > globalMaxCasesRef.current) {
          globalMaxCasesRef.current = casesData[i].total_cases;
        }
      }
    }
    scheduleFg();
  }, [casesData, scheduleFg]);

  useEffect(() => { scheduleBoth(); }, [selectedCountry, scheduleBoth]);

  const computeFit = useCallback((feature, W, H, proj) => {
    const name = getName(feature).toLowerCase();
    const anti = ANTIMERIDIAN_COUNTRIES[name];
    if (anti) {
      const [cx, cy] = proj(anti.center);
      return d3.zoomIdentity.translate(W/2, H/2).scale(anti.scale).translate(-cx, -cy);
    }
    const main = getLargestPolygon(feature);
    const [cx, cy] = proj(d3.geoCentroid(main));
    const [[x0, y0], [x1, y1]] = d3.geoPath(proj).bounds(main);
    const hw = Math.max(Math.abs(cx - x0), Math.abs(x1 - cx), 1);
    const hh = Math.max(Math.abs(cy - y0), Math.abs(y1 - cy), 1);
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
    try {
      d3.select(fgCanvasRef.current)
        .transition().duration(750)
        .call(zoom.transform, computeFit(feature, canvas.width, canvas.height, proj));
    } catch(e) {}
  }, [computeFit]);

  const zoomToGlobal = useCallback(() => {
    const c = fgCanvasRef.current, z = zoomRef.current;
    if (c && z) d3.select(c).transition().duration(750).call(z.transform, d3.zoomIdentity);
  }, []);

  useEffect(() => {
    if (selectedCountry) zoomToCountry(selectedCountry);
    else zoomToGlobal();
  }, [selectedCountry, zoomToCountry, zoomToGlobal]);

  useEffect(() => {
    if (!worldAtlasQuery.data || !bgCanvasRef.current || !fgCanvasRef.current) return;

    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    const bgCtx    = bgCanvas.getContext('2d');
    const fgCtx    = fgCanvas.getContext('2d');

    const W = (bgCanvas.width = fgCanvas.width = bgCanvas.offsetWidth);
    const H = (bgCanvas.height = fgCanvas.height = bgCanvas.offsetHeight);

    const countries = topojson.feature(worldAtlasQuery.data, worldAtlasQuery.data.objects.countries);
    allFeaturesRef.current = countries.features;

    const idx = {};
    countries.features.forEach(f => {
      const name = getName(f);
      const mainPoly = getLargestPolygon(f);
      f.properties.centroid = d3.geoCentroid(mainPoly);
      if (name) idx[name.toLowerCase()] = f;
    });
    featureIndexRef.current = idx;

    spatialGridRef.current = buildSpatialGrid(countries.features);

    const proj = d3.geoMercator().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);
    projectionRef.current = proj;
    const geoPath = d3.geoPath(proj, bgCtx);

    const oceanLbls = [
      {name:'PACIFIC OCEAN', coords:[-160,0]},
      {name:'ATLANTIC OCEAN', coords:[-35,10]},
      {name:'INDIAN OCEAN',  coords:[75,-25]},
      {name:'ARCTIC OCEAN',  coords:[0,82]},
    ];
    const contLbls = [
      {name:'NORTH AMERICA',coords:[-100,45]},{name:'SOUTH AMERICA',coords:[-60,-15]},
      {name:'EUROPE',coords:[15,52]},{name:'AFRICA',coords:[20,5]},
      {name:'ASIA',coords:[90,45]},{name:'AUSTRALIA',coords:[135,-25]},
    ];

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
        bgCtx.fillStyle   = isSel ? '#2a4a7f' : isHov ? '#1e3a50' : '#1a2f3f';
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
              const n = getName(f);
              if (n && !LABEL_EXCLUDE.has(n)) {
                bgCtx.shadowColor='rgba(0,0,0,.8)'; bgCtx.shadowBlur=3/t.k;
                bgCtx.fillText(n, c[0], c[1]);
                bgCtx.shadowBlur=0;
              }
            }
          }
        });
        bgCtx.globalAlpha=1;
      }
      bgCtx.restore();
    };

    const drawFg = () => {
      const t   = transformRef.current;
      const cas = casesDataRef.current;
      const sel = selectedCountryRef.current?.toLowerCase();

      fgCtx.clearRect(0, 0, W, H);
      if (!cas?.length) return;

      const max = globalMaxCasesRef.current;
      if (!max) return;

      for (let i = 0; i < cas.length; i++) {
        if (cas[i].total_cases > globalMaxCasesRef.current) {
          globalMaxCasesRef.current = cas[i].total_cases;
        }
      }

      fgCtx.save();
      fgCtx.beginPath();
      fgCtx.rect(0, 0, W, H);
      fgCtx.clip();

      fgCtx.translate(t.x, t.y);
      fgCtx.scale(t.k, t.k);

      const cache = [];

      for (const cd of cas) {
        if (!cd.total_cases) continue;
        const geoName = resolveGeoName(cd.country);
        if (!geoName) continue;
        const f = idx[geoName.toLowerCase()] || idx[cd.country.toLowerCase()];
        if (!f?.properties.centroid) continue;
        const [px, py] = proj(f.properties.centroid);
        if (px < -W || px > W*2 || py < -H || py > H*2) continue;

        const ratio = Math.sqrt(cd.total_cases / globalMaxCasesRef.current);
        const r = ratio * 40 / t.k;
        if (r < 0.5 / t.k) continue;

        const isSel = sel && (geoName.toLowerCase() === sel || cd.country.toLowerCase() === sel);
        cache.push({ px, py, r, name: getName(f) });

        fgCtx.shadowColor = isSel ? 'rgba(255,255,0,.8)' : 'rgba(255,0,0,.8)';
        fgCtx.shadowBlur  = (isSel ? 15 : 10) / t.k;
        fgCtx.fillStyle   = isSel ? 'rgba(255,255,0,.7)' : 'rgba(255,0,0,.6)';
        fgCtx.beginPath(); fgCtx.arc(px, py, r, 0, 2*Math.PI); fgCtx.fill();
        fgCtx.strokeStyle = isSel ? 'rgba(255,255,100,1)' : 'rgba(255,100,100,.8)';
        fgCtx.lineWidth   = (isSel ? 2 : 1) / t.k;
        fgCtx.stroke();
        fgCtx.shadowBlur = 0;
      }

      bubbleCacheRef.current = cache;
      fgCtx.restore();
    };

    drawBgRef.current = drawBg;
    drawFgRef.current = drawFg;

    const pickCanvas  = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    pickCanvas.width  = W * dpr;
    pickCanvas.height = H * dpr;
    const pickCtx = pickCanvas.getContext('2d', { willReadFrequently: true });
    pickCtx.imageSmoothingEnabled = false;
    pickCtx.scale(dpr, dpr);

    const pickColors = {};
    const pickIndex  = {};

    const drawPickCanvas = () => {
      const t = transformRef.current;
      pickCtx.clearRect(0, 0, W, H);
      pickCtx.save();
      pickCtx.translate(t.x, t.y);
      pickCtx.scale(t.k, t.k);
      pickCtx.imageSmoothingEnabled = false;
      const pickPath = d3.geoPath(proj, pickCtx);

      countries.features.forEach((f, i) => {
        const name = getName(f);
        if (!name) return;
        if (!pickColors[name]) {
          const id = (i + 1) * 10;
          const r = id & 0xff;
          const g = (id >> 8) & 0xff;
          const b = (id >> 16) & 0xff;
          pickColors[name] = [r, g, b];
          pickIndex[`${r},${g},${b}`] = name;
        }
        const [r, g, b] = pickColors[name];
        const color = `rgb(${r},${g},${b})`;
        pickCtx.fillStyle = color;
        pickCtx.strokeStyle = color;
        pickCtx.lineWidth = 2 / t.k;
        pickCtx.beginPath();
        pickPath(f);
        pickCtx.fill();
        pickCtx.stroke();
      });

      const smallCountries = countries.features
        .filter(f => {
          const name = getName(f);
          if (!name || !pickColors[name] || !f.properties.centroid) return false;
          return d3.geoArea(f) * 1e6 <= 50000;
        })
        .sort((a, b) => d3.geoArea(b) - d3.geoArea(a));

      const minHitWorld = 8 / t.k;
      smallCountries.forEach(f => {
        const name = getName(f);
        const [r, g, b] = pickColors[name];
        const [cx, cy] = proj(f.properties.centroid);
        pickCtx.fillStyle = `rgb(${r},${g},${b})`;
        pickCtx.beginPath();
        pickCtx.arc(cx, cy, minHitWorld, 0, 2 * Math.PI);
        pickCtx.fill();
      });

      pickCtx.restore();
    };

    drawPickCanvas();

    const hitTest = (screenX, screenY) => {
      const dpr = window.devicePixelRatio || 1;
      const ix = Math.round(screenX * dpr);
      const iy = Math.round(screenY * dpr);
      const PW = pickCanvas.width;
      const PH = pickCanvas.height;
      if (ix < 0 || ix >= PW || iy < 0 || iy >= PH) return null;

      const radius = Math.round(5 * dpr);
      const x0 = Math.max(0, ix - radius);
      const y0 = Math.max(0, iy - radius);
      const x1 = Math.min(PW - 1, ix + radius);
      const y1 = Math.min(PH - 1, iy + radius);
      const imgData = pickCtx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1).data;

      const cx = ix - x0, cy = iy - y0;
      const w = x1 - x0 + 1;
      const ci = (cy * w + cx) * 4;
      if (imgData[ci + 3] > 0) {
        const key = `${imgData[ci]},${imgData[ci+1]},${imgData[ci+2]}`;
        const name = pickIndex[key];
        if (name) return name;
      }

      const votes = {};
      let bestKey = null, bestCount = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        if (imgData[i + 3] === 0) continue;
        const key = `${imgData[i]},${imgData[i+1]},${imgData[i+2]}`;
        if (!pickIndex[key]) continue;
        votes[key] = (votes[key] || 0) + 1;
        if (votes[key] > bestCount) { bestCount = votes[key]; bestKey = key; }
      }
      return bestKey ? (pickIndex[bestKey] || null) : null;
    };

    const onClick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const [mx, my] = d3.pointer(e, fgCanvasRef.current);
      const hit = hitTest(mx, my);
      if (hit && onCountryClickRef.current) onCountryClickRef.current(hit);
    };

    const HOVER_MS = 16;

    const processMove = (e) => {
      const canvas = fgCanvasRef.current;
      if (!canvas) return;
      const [mx, my] = d3.pointer(e, canvas);
      const country = hitTest(mx, my);

      if (country === hoveredCountryRef.current) return;

      hoveredCountryRef.current = country;
      canvas.style.cursor = country ? 'pointer' : 'default';
      setHoveredLabel(country);

      if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;
        drawBg();
      });
    };

    const onMove = (e) => {
      const now = Date.now();
      const s   = moveThrottleRef.current;
      if (s.trailingId !== null) { clearTimeout(s.trailingId); s.trailingId = null; }
      if (now - s.lastMs >= HOVER_MS) {
        s.lastMs = now;
        processMove(e);
      } else {
        const captured = e;
        s.trailingId = setTimeout(() => {
          s.trailingId = null;
          s.lastMs = Date.now();
          processMove(captured);
        }, HOVER_MS - (now - s.lastMs));
      }
    };

    const zoom = d3.zoom().filter(e => e.type === 'wheel').scaleExtent([1, 8])
      .on('zoom', (e) => {
        transformRef.current = e.transform;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          drawBg();
          drawFg();
          drawPickCanvas();
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
      const dpr2 = window.devicePixelRatio || 1;
      bgCanvas.width = fgCanvas.width = nW;
      bgCanvas.height = fgCanvas.height = nH;
      pickCanvas.width = nW * dpr2;
      pickCanvas.height = nH * dpr2;
      pickCtx.imageSmoothingEnabled = false;
      pickCtx.scale(dpr2, dpr2);
      proj.scale(nW/(2*Math.PI)).translate([nW/2,nH/2]);
      drawBg();
      drawFg();
      drawPickCanvas();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      fgCanvas.removeEventListener('click', onClick, true);
      fgCanvas.removeEventListener('mousemove', onMove);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (hoverRafRef.current) { cancelAnimationFrame(hoverRafRef.current); hoverRafRef.current = null; }
      const s = moveThrottleRef.current;
      if (s.trailingId !== null) { clearTimeout(s.trailingId); s.trailingId = null; }
      drawBgRef.current = null;
      drawFgRef.current = null;
    };
  }, [worldAtlasQuery.data]);

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
          {hoveredLabel && (
            <div style={{position:'absolute',top:'60px',left:'20px',background:'rgba(0,0,0,.8)',color:'#fff',padding:'5px 10px',borderRadius:'4px',fontSize:'12px',zIndex:1000,pointerEvents:'none'}}>
              {hoveredLabel} — click to select
            </div>
          )}
          <canvas ref={bgCanvasRef} className="map-container" style={{position:'absolute',top:0,left:0,touchAction:'none',pointerEvents:'none'}} />
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