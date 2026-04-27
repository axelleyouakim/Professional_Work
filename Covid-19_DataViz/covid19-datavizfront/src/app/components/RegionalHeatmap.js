'use client';

import React, { useState, useMemo } from 'react';
import { useUSAStates, useFranceRegions } from '../hooks/useDiseaseData';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

// Interpolation blanc → orange → rouge selon intensité 0..1
const heatColor = (intensity) => {
  const i = Math.max(0, Math.min(1, intensity));
  if (i < 0.5) {
    const t = i * 2;
    const g = Math.round(255 - t * (255 - 140));
    return `rgb(255,${g},${Math.round(255 - t * 255)})`;
  }
  const t = (i - 0.5) * 2;
  return `rgb(255,${Math.round(140 - t * 140)},0)`;
};

// ─── USA State Abbreviations ──────────────────────────────────────────────────
const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS',
  'Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA',
  'Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT',
  'Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM',
  'New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK',
  'Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
  'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
  'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
  'District Of Columbia':'DC','Puerto Rico':'PR',
};

// Grille cartographique USA (row, col)
const USA_GRID = {
  'AK':[0,0],'ME':[0,10],
  'WA':[1,0],'MT':[1,2],'ND':[1,3],'MN':[1,4],'WI':[1,5],'MI':[1,7],'NY':[1,8],'VT':[1,9],'NH':[1,10],
  'OR':[2,0],'ID':[2,1],'WY':[2,2],'SD':[2,3],'IA':[2,4],'IL':[2,6],'IN':[2,6],'OH':[2,7],'PA':[2,8],'NJ':[2,9],'CT':[2,10],'RI':[2,11],
  'CA':[3,0],'NV':[3,1],'CO':[3,2],'NE':[3,3],'MO':[3,4],'KY':[3,6],'WV':[3,7],'VA':[3,8],'MD':[3,9],'DE':[3,10],
  'AZ':[4,1],'UT':[4,2],'KS':[4,3],'OK':[4,4],'AR':[4,5],'TN':[4,5],'MS':[4,6],'AL':[4,7],'GA':[4,9],'SC':[4,10],'NC':[4,8],
  'NM':[5,2],'TX':[5,3],'LA':[5,5],'FL':[5,8],
  'HI':[6,1],'PR':[6,10],
};

// ─── France regions — grille + labels ────────────────────────────────────────
const FRANCE_REGIONS = {
  'ile-de-france':             { label: 'Île-de-France',    abbr: 'IDF', col: 5, row: 3 },
  'auvergne-rhone-alpes':      { label: 'Auvergne-RA',      abbr: 'ARA', col: 5, row: 5 },
  'hauts-de-france':           { label: 'Hauts-de-Fr.',     abbr: 'HDF', col: 4, row: 1 },
  'nouvelle-aquitaine':        { label: 'Nouv. Aquitaine',  abbr: 'NAQ', col: 3, row: 5 },
  'occitanie':                 { label: 'Occitanie',        abbr: 'OCC', col: 4, row: 6 },
  'grand-est':                 { label: 'Grand Est',        abbr: 'GES', col: 7, row: 2 },
  'pays-de-la-loire':          { label: 'Pays de la Loire', abbr: 'PDL', col: 2, row: 4 },
  'normandie':                 { label: 'Normandie',        abbr: 'NOR', col: 3, row: 2 },
  'bretagne':                  { label: 'Bretagne',         abbr: 'BRE', col: 1, row: 3 },
  'bourgogne-franche-comte':   { label: 'Bourgogne-FC',     abbr: 'BFC', col: 6, row: 4 },
  'centre-val-de-loire':       { label: 'Centre-VdL',       abbr: 'CVL', col: 4, row: 4 },
  'provence-alpes-cote-dazur': { label: 'PACA',             abbr: 'PAC', col: 6, row: 6 },
  'corse':                     { label: 'Corse',            abbr: 'COR', col: 8, row: 7 },
  'martinique':                { label: 'Martinique',       abbr: 'MRT', col: 0, row: 7 },
  'guadeloupe':                { label: 'Guadeloupe',       abbr: 'GLP', col: 0, row: 6 },
  'guyane':                    { label: 'Guyane',           abbr: 'GUY', col: 0, row: 8 },
  'la reunion':                { label: 'La Réunion',       abbr: 'REU', col: 0, row: 9 },
  'mayotte':                   { label: 'Mayotte',          abbr: 'MYT', col: 0, row: 10 },
};

// ─── Tile Heatmap générique ───────────────────────────────────────────────────
const TileHeatmap = ({ items, isLoading, metric = 'cases' }) => {
  const [tooltip, setTooltip] = useState(null);
  const maxVal = useMemo(() => Math.max(...items.map(i => i[metric] || 0), 1), [items, metric]);

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:140, color:'#999', fontSize:12 }}>
      Loading regional data...
    </div>
  );
  if (!items || items.length === 0) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:100, color:'#bbb', fontSize:12 }}>
      No regional data available
    </div>
  );

  const maxRow = Math.max(...items.map(i => i.row), 0);
  const maxCol = Math.max(...items.map(i => i.col), 0);
  const CELL = 36, GAP = 3;

  return (
    <div style={{ position:'relative' }}>
      <div style={{ position:'relative', width:(maxCol+1)*(CELL+GAP), height:(maxRow+1)*(CELL+GAP), margin:'0 auto' }}>
        {items.map((item) => {
          const intensity  = (item[metric] || 0) / maxVal;
          const bg         = heatColor(intensity);
          const textColor  = intensity > 0.45 ? '#fff' : '#333';
          const isHovered  = tooltip?.key === item.key;
          return (
            <div key={item.key}
              onMouseEnter={() => setTooltip(item)}
              onMouseLeave={() => setTooltip(null)}
              style={{
                position:'absolute',
                left: item.col * (CELL+GAP),
                top:  item.row * (CELL+GAP),
                width: CELL, height: CELL,
                background: bg,
                borderRadius: 6,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                cursor:'pointer',
                boxShadow: isHovered ? '0 0 0 2px #6c5ce7, 0 4px 12px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.12)',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.1s, box-shadow 0.1s',
                zIndex: isHovered ? 10 : 1,
              }}
            >
              <span style={{ fontSize:9, fontWeight:800, color:textColor, lineHeight:1 }}>{item.abbr}</span>
              <span style={{ fontSize:7, color:textColor, opacity:0.9, lineHeight:1.3, textAlign:'center', padding:'0 2px' }}>
                {fmtNum(item[metric])}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position:'absolute', top:0, right:0, background:'#fff', border:'1px solid #e0e0ff', borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 16px rgba(108,92,231,0.15)', zIndex:20, minWidth:160, pointerEvents:'none' }}>
          <div style={{ fontWeight:700, color:'#333', fontSize:13, marginBottom:6 }}>{tooltip.label}</div>
          <div style={{ fontSize:11, color:'#e17055' }}>Cases: <strong>{fmtNum(tooltip.cases)}</strong></div>
          <div style={{ fontSize:11, color:'#636e72' }}>Deaths: <strong>{fmtNum(tooltip.deaths)}</strong></div>
          {tooltip.active != null && (
            <div style={{ fontSize:11, color:'#6c5ce7' }}>Active: <strong>{fmtNum(tooltip.active)}</strong></div>
          )}
        </div>
      )}

      {/* Légende */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, justifyContent:'center' }}>
        <span style={{ fontSize:9, color:'#aaa' }}>Low</span>
        <div style={{ width:80, height:8, borderRadius:4, background:'linear-gradient(to right,#fff0e0,#ff8c00,#ff0000)', border:'1px solid #eee' }} />
        <span style={{ fontSize:9, color:'#aaa' }}>High</span>
      </div>
    </div>
  );
};

// ─── USA Heatmap ──────────────────────────────────────────────────────────────
const USAHeatmap = () => {
  const { data, isLoading } = useUSAStates();
  const [metric, setMetric] = useState('cases');

  const items = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data
      .map(s => {
        if (!s || typeof s.state !== 'string') return null;
        const abbr = STATE_ABBR[s.state] || s.state.slice(0,2).toUpperCase();
        const pos  = USA_GRID[abbr];
        if (!pos) return null;
        return {
          key:    abbr,
          abbr,
          label:  s.state,
          cases:  s.cases  || 0,
          deaths: s.deaths || 0,
          active: s.active || 0,
          row:    pos[0],
          col:    pos[1],
        };
      })
      .filter(Boolean);
  }, [data]);

  return (
    <div>
      <div style={{ display:'flex', gap:4, marginBottom:8, justifyContent:'flex-end' }}>
        {['cases','deaths','active'].map(m => (
          <button key={m} onClick={() => setMetric(m)} style={{ padding:'3px 8px', borderRadius:5, fontSize:10, fontWeight:600, cursor:'pointer', border:`1px solid ${metric===m?'#6c5ce7':'#eee'}`, background:metric===m?'#6c5ce7':'#f8f8f8', color:metric===m?'#fff':'#666' }}>
            {m}
          </button>
        ))}
      </div>
      <TileHeatmap items={items} isLoading={isLoading} metric={metric} />
    </div>
  );
};

// ─── France Heatmap ───────────────────────────────────────────────────────────
const FranceHeatmap = () => {
  const { data, isLoading } = useFranceRegions();
  const [metric, setMetric] = useState('cases');

  const items = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data
      .map(r => {
        // Vérification défensive stricte
        if (!r || typeof r.province !== 'string' || r.province.trim() === '') return null;
        const key     = r.province.toLowerCase().trim();
        const regInfo = FRANCE_REGIONS[key];
        if (!regInfo) return null;
        return {
          key,
          abbr:   regInfo.abbr,
          label:  regInfo.label,
          cases:  typeof r.cases  === 'number' ? r.cases  : 0,
          deaths: typeof r.deaths === 'number' ? r.deaths : 0,
          row:    regInfo.row,
          col:    regInfo.col,
        };
      })
      .filter(Boolean);
  }, [data]);

  return (
    <div>
      <div style={{ display:'flex', gap:4, marginBottom:8, justifyContent:'flex-end' }}>
        {['cases','deaths'].map(m => (
          <button key={m} onClick={() => setMetric(m)} style={{ padding:'3px 8px', borderRadius:5, fontSize:10, fontWeight:600, cursor:'pointer', border:`1px solid ${metric===m?'#6c5ce7':'#eee'}`, background:metric===m?'#6c5ce7':'#f8f8f8', color:metric===m?'#fff':'#666' }}>
            {m}
          </button>
        ))}
      </div>
      <div style={{ fontSize:9, color:'#aaa', marginBottom:6, fontStyle:'italic', textAlign:'right' }}>
        Source: Santé Publique France · données cumulatives
      </div>
      <TileHeatmap items={items} isLoading={isLoading} metric={metric} />
    </div>
  );
};

// ─── RegionalHeatmap — composant principal exporté ────────────────────────────
const RegionalHeatmap = () => {
  const [selectedCountry, setSelectedCountry] = useState('USA');

  return (
    <div style={{ padding:'8px 12px 12px' }}>
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        {[['USA','🇺🇸'],['France','🇫🇷']].map(([c, flag]) => (
          <button key={c} onClick={() => setSelectedCountry(c)} style={{
            padding:'4px 12px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
            border:`1px solid ${selectedCountry===c?'#6c5ce7':'#e0e0ff'}`,
            background: selectedCountry===c ? '#6c5ce7' : '#fff',
            color: selectedCountry===c ? '#fff' : '#555',
            transition:'all 0.15s',
          }}>{flag} {c}</button>
        ))}
      </div>
      {selectedCountry === 'USA'    && <USAHeatmap    />}
      {selectedCountry === 'France' && <FranceHeatmap />}
    </div>
  );
};

export default RegionalHeatmap;