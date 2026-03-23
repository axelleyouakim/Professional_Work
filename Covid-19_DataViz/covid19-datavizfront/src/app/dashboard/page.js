'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useGlobalStats, useFourCountriesStats, useCountryForPie } from '../hooks/useDiseaseData';
import ChartComponent from '../components/ChartComponent';
import TimelineSlider from '../components/TimelineSlider';
import CountryList from '../components/CountryList';
import { usePreCalculatedData } from '../hooks/usePreCalculatedData';
import './dashboard.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtForce = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const FLAG = { France: '🇫🇷', USA: '🇺🇸', China: '🇨🇳', Spain: '🇪🇸' };
const PIE_COLORS = ['#e17055', '#00b894', '#fdcb6e', '#74b9ff'];

// ─── RadialStat ───────────────────────────────────────────────────────────────
const RadialStat = ({ label, value, color, pct }) => {
  const r = 38, circ = 2 * Math.PI * r;
  const safePct = isFinite(pct) && pct > 0 ? Math.min(pct, 100) : 0;
  const dash = (safePct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>{fmtForce(value)}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', lineHeight: 1 }}>{safePct}%</span>
        </div>
      </div>
      <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{label}</span>
    </div>
  );
};

// ─── KPI Box ──────────────────────────────────────────────────────────────────
const KPIBox = ({ label, value, sub, color, bg }) => (
  <div style={{ background: bg || '#fff', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 5, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
    <span style={{ fontSize: 22, fontWeight: 800, color: color || '#333', fontFamily: 'monospace', lineHeight: 1 }}>{value}</span>
    <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{label}</span>
    {sub && <span style={{ fontSize: 10, color: '#00b894', fontWeight: 500 }}>{sub}</span>}
  </div>
);

// ─── Country Row (table 4 pays) ───────────────────────────────────────────────
const CountryRow = ({ country, cases, deaths, recovered, active }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr', padding: '9px 16px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: 12, transition: 'background 0.1s' }}
    onMouseEnter={e => e.currentTarget.style.background = '#f8f8ff'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <span style={{ fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 15 }}>{FLAG[country]}</span>{country}
    </span>
    <span style={{ color: '#e17055', fontFamily: 'monospace', textAlign: 'right', fontWeight: 600 }}>{fmtForce(cases)}</span>
    <span style={{ color: '#636e72', fontFamily: 'monospace', textAlign: 'right' }}>{fmtForce(deaths)}</span>
    <span style={{ color: '#00b894', fontFamily: 'monospace', textAlign: 'right' }}>{fmtForce(recovered)}</span>
    <span style={{ color: '#6c5ce7', fontFamily: 'monospace', textAlign: 'right' }}>{active > 0 ? fmtForce(active) : '—'}</span>
  </div>
);

// ─── Country View Banner ──────────────────────────────────────────────────────
const CountryViewBanner = ({ country, stats, onBack }) => (
  <div style={{ background: 'linear-gradient(135deg, #6c5ce7, #3d2fa0)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>🌍 {country}</div>
      <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Cases: <strong style={{ color: '#ff6b6b' }}>{fmtForce(stats?.total_cases)}</strong></span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Deaths: <strong style={{ color: '#fff' }}>{fmtForce(stats?.total_deaths)}</strong></span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Recovered: <strong style={{ color: '#00b894' }}>{fmtForce(stats?.total_recovered)}</strong></span>
      </div>
    </div>
    <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
      ← Global View
    </button>
  </div>
);

// ─── News Feed ────────────────────────────────────────────────────────────────
const NEWS_ITEMS = [
  { date: '2023-03-09', title: 'WHO declares COVID-19 no longer a global health emergency', source: 'WHO', url: 'https://www.aljazeera.com/news/2023/5/5/covid-no-longer-global-health-emergency-who-says' },
  { date: '2023-01-05', title: 'China reports surge after lifting zero-COVID policy', source: 'Reuters', url: 'https://www.reuters.com/world/china/chinas-covid-spike-not-due-lifting-restrictions-who-director-2022-12-14/' },
  { date: '2022-10-14', title: 'Bivalent boosters authorized in US, France and Spain', source: 'CDC', url: 'https://www.cdc.gov/covid/vaccines/index.html' },
  { date: '2022-07-01', title: 'BA.5 Omicron subvariant drives new global wave', source: 'Nature', url: 'https://www.nature.com/articles/d41586-022-01882-3' },
  { date: '2022-02-03', title: 'France records 500K daily cases at Omicron peak', source: 'SPF', url: 'https://www.santepubliquefrance.fr/dossiers/coronavirus-covid-19' },
  { date: '2021-12-01', title: 'Omicron variant detected in multiple countries', source: 'ECDC', url: 'https://www.ecdc.europa.eu/en/covid-19/variants-concern' },
  { date: '2021-06-21', title: 'Delta variant becomes dominant in UK and Spain', source: 'Reuters', url: 'https://www.reuters.com/world/uk/delta-variant-now-dominant-strain-uk-2021-06-07/' },
  { date: '2021-03-11', title: 'One year since WHO declared COVID-19 a pandemic', source: 'WHO', url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019' },
  { date: '2020-12-14', title: 'First COVID-19 vaccinations begin in the United States', source: 'CDC', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2020-04-03', title: 'France enters strict lockdown, cases surpass 50K', source: 'Le Monde', url: 'https://www.lemonde.fr/planete/article/2020/03/17/coronavirus-la-france-en-confinement_6033364_3244.html' },
  { date: '2020-01-22', title: 'First COVID-19 cases confirmed outside of China', source: 'WHO', url: 'https://www.who.int/csr/don/17-january-2020-novel-coronavirus-japan-ex-china/en/' },
];

const NewsFeed = ({ currentDateStr }) => {
  const filtered = useMemo(() => {
    const cutoff = new Date(currentDateStr);
    if (isNaN(cutoff)) return NEWS_ITEMS;
    return NEWS_ITEMS.filter(item => new Date(item.date) <= cutoff);
  }, [currentDateStr]);

  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {filtered.length === 0 && <div style={{ color: '#999', textAlign: 'center', padding: 20, fontSize: 12 }}>No news for this period</div>}
      {filtered.map((item, i) => (
        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', padding: '10px 16px', borderBottom: '1px solid #f0f0f0', textDecoration: 'none', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ fontSize: 10, color: '#6c5ce7', marginBottom: 2, display: 'flex', gap: 8 }}>
            <span>{item.date}</span><span style={{ color: '#ddd' }}>·</span>
            <span style={{ color: '#999' }}>{item.source}</span>
            <span style={{ marginLeft: 'auto', color: '#bbb', fontSize: 9 }}>↗</span>
          </div>
          <div style={{ fontSize: 12, color: '#333', lineHeight: 1.45 }}>{item.title}</div>
        </a>
      ))}
    </div>
  );
};

// ─── Calendar interactif ──────────────────────────────────────────────────────
const CalendarWidget = ({ currentDateStr, onDateSelect }) => {
  const base = new Date(currentDateStr);
  const baseValid = isNaN(base) ? new Date(2023, 2, 9) : base;
  const [offset, setOffset] = useState(0);

  const viewDate = new Date(baseValid.getFullYear(), baseValid.getMonth() + offset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const highlightDay = offset === 0 ? baseValid.getDate() : null;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const minDate = new Date(2019, 10, 1);
  const maxDate = new Date(2023, 2, 9);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isOutOfRange = (d) => {
    if (!d) return false;
    const dt = new Date(year, month, d);
    return dt < minDate || dt > maxDate;
  };

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={() => setOffset(o => o - 1)} style={{ background: 'none', border: '1px solid #e0e0ff', borderRadius: 6, cursor: 'pointer', fontSize: 16, color: '#6c5ce7', padding: '2px 8px', lineHeight: 1 }}>‹</button>
        <span style={{ fontWeight: 700, color: '#333', fontSize: 13 }}>{monthName}</span>
        <button onClick={() => setOffset(o => o + 1)} style={{ background: 'none', border: '1px solid #e0e0ff', borderRadius: 6, cursor: 'pointer', fontSize: 16, color: '#6c5ce7', padding: '2px 8px', lineHeight: 1 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, textAlign: 'center' }}>
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d, i) => (
          <div key={i} style={{ fontSize: 9, color: '#aaa', padding: '2px 0', fontWeight: 700 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const oor = isOutOfRange(d);
          const isSel = d === highlightDay;
          return (
            <div key={i}
              onClick={() => { if (d && !oor && onDateSelect) onDateSelect(new Date(year, month, d)); }}
              style={{ fontSize: 12, padding: '5px 2px', borderRadius: 6, color: isSel ? '#fff' : oor ? '#ddd' : '#333', background: isSel ? '#6c5ce7' : 'transparent', fontWeight: isSel ? 700 : 400, cursor: d && !oor ? 'pointer' : 'default', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (d && !oor && !isSel) e.currentTarget.style.background = '#f0eeff'; }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
            >{d || ''}</div>
          );
        })}
      </div>
      <div style={{ fontSize: 9, color: '#aaa', textAlign: 'center', marginTop: 8 }}>Click a date to filter · Nov 2019 – Mar 2023</div>
    </div>
  );
};

// ─── Pie chart ────────────────────────────────────────────────────────────────
const StatusPieChart = ({ data, title }) => {
  if (!data) return <div style={{ color: '#999', textAlign: 'center', padding: 24, fontSize: 12 }}>Loading...</div>;
  const pop = data.population || 0;
  const cases = data.cases || 0;
  const pieData = [
    { name: 'Dead',     value: data.deaths    || 0 },
    { name: 'Healed',   value: data.recovered || 0 },
    { name: 'Infected', value: data.active    || 0 },
    { name: 'Healthy',  value: pop > 0 ? Math.max(0, pop - cases) : 0 },
  ].filter(d => d.value > 0);

  if (pieData.length === 0) return <div style={{ color: '#999', textAlign: 'center', padding: 24, fontSize: 12 }}>No data</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px 10px' }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginBottom: 2 }}>{FLAG[title]} {title} — {fmtForce(cases)} total</div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" isAnimationActive={false}>
            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eee', fontSize: 11, borderRadius: 8 }} formatter={(v, n) => [fmtForce(v), n]} />
          <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod]   = useState(null);
  const [pieCountry, setPieCountry]           = useState('USA');
  const [externalSliderIndex, setExternalSliderIndex] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [searchTerm, setSearchTerm]           = useState('');

  // ── Data hooks ────────────────────────────────────────────────────────────
  const globalStats        = useGlobalStats();
  const fourCountries      = useFourCountriesStats();
  const { preCalculatedIndex } = usePreCalculatedData();
  const pieData            = useCountryForPie(pieCountry, fourCountries.data);

  // ── Données pour CountryList depuis preCalculatedIndex à la date du slider ─
  const countryDate = selectedPeriod?.dateString || null;

  const casesPerCountry = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return [];
    const date = countryDate || preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
    return preCalculatedIndex.sortedIndex[date]?.casesPerCountry || [];
  }, [preCalculatedIndex, countryDate]);

  // ── Stats du pays sélectionné à la date du slider ────────────────────────
  const selectedCountryStats = useMemo(() => {
    if (!selectedCountry || !preCalculatedIndex?.isReady) return null;
    const date = countryDate || preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
    const sorted = preCalculatedIndex.sortedIndex[date];
    if (!sorted) return null;
    const cases     = sorted.casesPerCountry.find(c => c.country === selectedCountry)?.total_cases || 0;
    const deaths    = sorted.deathsPerCountry.find(c => c.country === selectedCountry)?.total_deaths || 0;
    const recovered = sorted.recoveredPerCountry.find(c => c.country === selectedCountry)?.total_recovered || 0;
    return { total_cases: cases, total_deaths: deaths, total_recovered: recovered };
  }, [selectedCountry, preCalculatedIndex, countryDate]);

  // ── Chart timeline ────────────────────────────────────────────────────────
  const chartTimelineData = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return null;
    const { globalChartFull, dateToGlobalChartIdx, countryChartFull } = preCalculatedIndex;

    if (selectedPeriod?.hasData === false) {
      const safeDate = globalChartFull?.[0]?.date || '1/22/20';
      return [{ date: safeDate, cases: 0 }];
    }

    const endIdx = selectedPeriod?.dateString
      ? (dateToGlobalChartIdx[selectedPeriod.dateString] ?? globalChartFull.length - 1) + 1
      : globalChartFull.length;

    // Country view → chart du pays sélectionné
    if (selectedCountry && countryChartFull[selectedCountry]) {
      return countryChartFull[selectedCountry].slice(0, endIdx);
    }

    return globalChartFull.slice(0, endIdx);
  }, [preCalculatedIndex, selectedPeriod, selectedCountry]);

  const currentDateStr = selectedPeriod?.displayDate || 'Mar 9, 2023';
  const g = globalStats.data;
  const countries = fourCountries.data || [];
  const totalForPct = g?.cases || 1;
  const activePct = Math.min(100, Math.round(((g?.active    || 0) / totalForPct) * 100));
  const recovPct  = Math.min(100, Math.round(((g?.recovered || 0) / totalForPct) * 100));
  const deathPct  = Math.min(100, Math.round(((g?.deaths    || 0) / totalForPct) * 100));

  const handlePeriodChange = useCallback(p => setSelectedPeriod(p), []);

  const handleCountryClick = useCallback((country) => {
    setSelectedCountry(country);
  }, []);

  const handleBackToGlobal = useCallback(() => {
    setSelectedCountry(null);
  }, []);

  const handleCalendarDateSelect = useCallback((dateObj) => {
    if (!preCalculatedIndex?.isReady) return;
    const firstDataDate = new Date(2020, 0, 22);
    const hasData = dateObj >= firstDataDate;
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const y = dateObj.getFullYear() % 100;
    const dateString = `${m}/${d}/${y}`;
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const diffDays = Math.round((dateObj - new Date(2019, 10, 1)) / 86400000);
    setExternalSliderIndex(Math.max(0, diffDays));
    setSelectedPeriod({ dateString, dateObj, displayDate, hasData });
  }, [preCalculatedIndex]);

  return (
    <div className="nd-page">

      {/* ── Sidebar violette ── */}
      <aside className="nd-sidebar">
        <div className="nd-logo">
          <div className="nd-logo-icon">🦠</div>
          <span>Covid-19</span>
        </div>
        <nav className="nd-nav">
          <a href="/"          className="nd-nav-item" title="Global Map">🗺</a>
          <a href="/dashboard" className="nd-nav-item nd-nav-active" title="Dashboard">📊</a>
          <a href="/compare"   className="nd-nav-item" title="Compare">⚖️</a>
          <a href="/table"     className="nd-nav-item" title="Table">📋</a>
        </nav>
        <div className="nd-nav-bottom">
          <a href="/" className="nd-nav-item" title="Back to main">🔙</a>
        </div>
      </aside>

      {/* ── Liste pays (gauche) ── */}
      <aside className="nd-country-panel">
        <div style={{ padding: '12px 10px 8px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 8 }}>
            Confirmed Cases by Country
          </div>
          <input
            type="text"
            placeholder="Search country..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e0e0ff', fontSize: 11, outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CountryList
            type="cases"
            countriesData={casesPerCountry}
            searchTerm={searchTerm}
            selectedCountry={selectedCountry}
            onCountryClick={handleCountryClick}
            colorClass="red-text"
            isLoading={!preCalculatedIndex?.isReady}
          />
        </div>
      </aside>

      {/* ── Main centre ── */}
      <main className="nd-main">

        {/* Topbar */}
        <div className="nd-topbar">
          <div className="nd-search">
            <span>🔍</span>
            <span style={{ color: '#aaa', fontSize: 13 }}>Search country or region...</span>
          </div>
          <div className="nd-date-badge">🕐 {currentDateStr}</div>
        </div>

        {/* Country View Banner — visible seulement si pays sélectionné */}
        {selectedCountry && (
          <CountryViewBanner
            country={selectedCountry}
            stats={selectedCountryStats}
            onBack={handleBackToGlobal}
          />
        )}

        {/* Banner global — visible seulement si pas de pays sélectionné */}
        {!selectedCountry && (
          <div className="nd-banner">
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Covid-19 Update</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>JHU CSSE dataset · disease.sh API · Nov 2019 → Mar 2023</div>
            </div>
            <div style={{ fontSize: 52, opacity: 0.2 }}>🦠</div>
          </div>
        )}

        {/* Chart — global ou pays selon sélection */}
        <div className="nd-panel nd-chart-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 6px' }}>
            <span style={{ fontWeight: 700, color: '#333', fontSize: 13 }}>
              📈 {selectedCountry ? `${selectedCountry} — Cases Timeline` : 'Global Cases Over Time'}
            </span>
            <span style={{ fontSize: 10, color: '#6c5ce7', fontWeight: 600 }}>JHU CSSE</span>
          </div>
          <div style={{ padding: '0 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
            <TimelineSlider onPeriodChange={handlePeriodChange} externalIndex={externalSliderIndex} />
          </div>
          <ChartComponent
            period={null}
            selectedCountry={selectedCountry}
            timelineData={chartTimelineData}
          />
        </div>

        {/* Bottom : Global Status + KPIs */}
        <div className="nd-bottom-row">
          <div className="nd-radials-panel">
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>Global Status</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '18px 12px 14px' }}>
              <RadialStat label="Affected"  value={g?.active}    color="#a29bfe" pct={activePct} />
              <RadialStat label="Recovery"  value={g?.recovered} color="#00cec9" pct={recovPct}  />
              <RadialStat label="Death"     value={g?.deaths}    color="#74b9ff" pct={deathPct}  />
            </div>
          </div>
          <div className="nd-kpi-grid">
            <KPIBox label="Total Cases"   value={fmtForce(g?.cases)}  color="#e17055" bg="#fff5f2" sub={g?.todayCases ? `+${fmtForce(g.todayCases)} today` : undefined} />
            <KPIBox label="Today"         value={g?.todayCases ? `+${fmtForce(g.todayCases)}` : '—'} color="#6c5ce7" bg="#f5f3ff" />
            <KPIBox label="Deaths"        value={fmtForce(g?.deaths)} color="#636e72" bg="#f8f8f8" />
            <KPIBox label="Recovery Rate" value={g?.cases ? `${((g.recovered / g.cases) * 100).toFixed(2)}%` : '—'} color="#00b894" bg="#f0fff8" />
          </div>
        </div>

      </main>

      {/* ── Panneau droit ── */}
      <aside className="nd-right">

        {/* Pie chart */}
        <div className="nd-panel nd-right-panel">
          <div className="nd-panel-title">🥧 Dead · Healed · Infected · Healthy</div>
          <div style={{ display: 'flex', gap: 4, padding: '7px 10px', flexWrap: 'wrap' }}>
            {['France','USA','China','Spain'].map(c => (
              <button key={c} onClick={() => setPieCountry(c)} style={{ padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: `1px solid ${pieCountry===c?'#6c5ce7':'#eee'}`, background: pieCountry===c?'#6c5ce7':'#f8f8f8', color: pieCountry===c?'#fff':'#666', transition: 'all 0.15s' }}>
                {FLAG[c]} {c}
              </button>
            ))}
          </div>
          <StatusPieChart data={pieData} title={pieCountry} />
        </div>

        {/* Calendar */}
        <div className="nd-panel nd-right-panel">
          <div className="nd-panel-title">📅 Calendar</div>
          <CalendarWidget currentDateStr={currentDateStr} onDateSelect={handleCalendarDateSelect} />
        </div>

        {/* Table 4 pays */}
        <div className="nd-panel nd-right-panel">
          <div className="nd-panel-title">🌍 France · USA · China · Spain</div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr', padding: '6px 16px', borderBottom: '1px solid #f0f0f0' }}>
            {['Country','Cases','Deaths','Rec.','Active'].map(h => (
              <span key={h} style={{ fontSize: 9, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', textAlign: h!=='Country'?'right':'left' }}>{h}</span>
            ))}
          </div>
          {fourCountries.isLoading && <div style={{ color: '#999', textAlign: 'center', padding: 14, fontSize: 12 }}>Loading...</div>}
          {countries.map(c => <CountryRow key={c.country} country={c.country} cases={c.cases} deaths={c.deaths} recovered={c.recovered} active={c.active} />)}
        </div>

        {/* News feed */}
        <div className="nd-panel nd-news-panel">
          <div className="nd-panel-title">📰 News Feed · up to {currentDateStr}</div>
          <NewsFeed currentDateStr={currentDateStr} />
        </div>

      </aside>
    </div>
  );
}