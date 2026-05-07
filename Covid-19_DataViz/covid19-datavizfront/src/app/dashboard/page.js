'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useGlobalStats, useFourCountriesStats, useCountryForPie } from '../hooks/useDiseaseData';
import ChartComponent from '../components/ChartComponent';
import TimelineSlider from '../components/TimelineSlider';
import CountryList from '../components/CountryList';
import RegionalHeatmap from '../components/RegionalHeatmap';
import KPIWidget from '../components/widgets/KPIWidget';
import ChartWidget from '../components/widgets/ChartWidget';
import PieChartWidget from '../components/widgets/PieChartWidget';
import NewsFeedWidget from '../components/widgets/NewsFeedWidget';
import CalendarWidget from '../components/widgets/CalendarWidget';
import ComparisonWidget from '../components/widgets/ComparisonWidget';
import { usePreCalculatedData } from '../hooks/usePreCalculatedData';
import './dashboard.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtForce = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const FLAG = { France: '🇫🇷', USA: '🇺🇸', China: '🇨🇳', Spain: '🇪🇸' };

// ─── Fallback milestones ──────────────────────────────────────────────────────
const FALLBACK_MILESTONES = [
  { date: '2019-12-31', title: 'WHO informed of pneumonia cluster of unknown cause in Wuhan, China', source: 'WHO', url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/situation-reports' },
  { date: '2020-01-11', title: 'China reports first COVID-19 death', source: 'WHO', url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/situation-reports' },
  { date: '2020-01-22', title: 'First confirmed COVID-19 cases outside China (Thailand, Japan, South Korea)', source: 'WHO', url: 'https://www.who.int/csr/don/17-january-2020-novel-coronavirus-japan-ex-china/en/' },
  { date: '2020-01-30', title: 'WHO declares COVID-19 a Public Health Emergency of International Concern (PHEIC)', source: 'WHO', url: 'https://www.who.int/news/item/30-01-2020-statement-on-the-second-meeting-of-the-international-health-regulations-(2005)-emergency-committee-regarding-the-outbreak-of-novel-coronavirus-(2019-ncov)' },
  { date: '2020-02-21', title: 'Italy reports first community transmission in Europe — northern Italy lockdowns begin', source: 'ECDC', url: 'https://www.ecdc.europa.eu/en/covid-19' },
  { date: '2020-03-11', title: 'WHO officially characterises COVID-19 as a pandemic', source: 'WHO', url: 'https://www.who.int/director-general/speeches/detail/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020' },
  { date: '2020-03-17', title: 'France enters strict national lockdown — cases surpass 7,000', source: 'Santé Publique France', url: 'https://www.santepubliquefrance.fr/dossiers/coronavirus-covid-19' },
  { date: '2020-04-02', title: 'Global confirmed cases exceed 1 million — over 50,000 deaths recorded', source: 'JHU CSSE', url: 'https://coronavirus.jhu.edu/map.html' },
  { date: '2020-07-09', title: 'WHO acknowledges evidence of COVID-19 airborne transmission in crowded indoor spaces', source: 'WHO', url: 'https://www.who.int/news-room/questions-and-answers/item/coronavirus-disease-covid-19-how-is-it-transmitted' },
  { date: '2020-09-17', title: 'Europe reports second wave — cases rising faster than March peak in France, Spain, UK', source: 'ECDC', url: 'https://www.ecdc.europa.eu/en/covid-19' },
  { date: '2020-11-09', title: 'Pfizer/BioNTech announce ~90% vaccine efficacy in Phase 3 trials', source: 'FDA / AJMC', url: 'https://www.ajmc.com/view/a-timeline-of-covid19-developments-in-2020' },
  { date: '2020-12-11', title: 'FDA grants Emergency Use Authorization to Pfizer-BioNTech vaccine (16+)', source: 'FDA', url: 'https://www.fda.gov/emergency-preparedness-and-response/coronavirus-disease-2019-covid-19/pfizer-biontech-covid-19-vaccines' },
  { date: '2020-12-14', title: 'First COVID-19 vaccinations begin in the United States — healthcare workers first', source: 'CDC', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2021-02-27', title: 'FDA grants EUA to Johnson & Johnson single-dose COVID-19 vaccine (18+)', source: 'FDA', url: 'https://www.fda.gov/emergency-preparedness-and-response/coronavirus-disease-2019-covid-19/janssen-covid-19-vaccine' },
  { date: '2021-03-11', title: 'One year since WHO declared COVID-19 a pandemic', source: 'WHO', url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019' },
  { date: '2021-06-15', title: 'Delta variant (B.1.617.2) becomes dominant strain in the US and UK', source: 'CDC', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2021-10-06', title: 'WHO publishes first clinical case definition of Post COVID-19 condition (Long COVID)', source: 'WHO', url: 'https://www.who.int/publications/i/item/WHO-2019-nCoV-Post_COVID-19_condition-Clinical_case_definition-2021.1' },
  { date: '2021-11-26', title: 'Omicron variant (B.1.1.529) designated Variant of Concern by WHO', source: 'WHO', url: 'https://www.who.int/news/item/26-11-2021-classification-of-omicron-(b.1.1.529)-sars-cov-2-variant-of-concern' },
  { date: '2021-12-01', title: 'Omicron variant detected in multiple countries — new wave begins', source: 'ECDC', url: 'https://www.ecdc.europa.eu/en/covid-19/variants-concern' },
  { date: '2022-02-03', title: 'France records 500K daily cases at Omicron peak', source: 'Santé Publique France', url: 'https://www.santepubliquefrance.fr/dossiers/coronavirus-covid-19' },
  { date: '2022-07-01', title: 'BA.5 Omicron subvariant drives new global wave across Europe and Americas', source: 'Nature', url: 'https://www.nature.com/articles/d41586-022-01882-3' },
  { date: '2022-10-14', title: 'Bivalent boosters targeting Omicron authorized in US, France and Spain', source: 'CDC', url: 'https://www.cdc.gov/covid/vaccines/index.html' },
  { date: '2023-01-05', title: 'China reports surge after lifting zero-COVID policy', source: 'Reuters', url: 'https://www.reuters.com/world/china/chinas-covid-spike-not-due-lifting-restrictions-who-director-2022-12-14/' },
  { date: '2023-03-09', title: 'WHO declares COVID-19 no longer a global health emergency', source: 'WHO', url: 'https://www.who.int/news/item/05-05-2023-statement-on-the-fifteenth-meeting-of-the-international-health-regulations-(2005)-emergency-committee-regarding-the-coronavirus-disease-(covid-19)-pandemic' },
];

// ─── Widget overlay config ─────────────────────────────────────────────────────
const SIDEBAR_WIDGETS = [
  { id: 'kpi',        icon: '📊', label: 'KPI' },
  { id: 'chart',      icon: '📈', label: 'Chart' },
  { id: 'pie',        icon: '🥧', label: 'Pie' },
  { id: 'heatmap',    icon: '🗺️', label: 'Heatmap' },
  { id: 'news',       icon: '📰', label: 'News' },
  { id: 'calendar',   icon: '📅', label: 'Calendar' },
  { id: 'comparison', icon: '⚖️', label: 'Compare' },
];

// ─── Widget Overlay Panel ─────────────────────────────────────────────────────
const WidgetOverlay = ({ widgetId, onClose, dateString, dateObj, currentDateStr, onDateSelect }) => {
  if (!widgetId) return null;

  const titles = {
    kpi:        '📊 KPI Widgets',
    chart:      '📈 Chart Widget',
    pie:        '🥧 Pie Chart Widget',
    heatmap:    '🗺️ Regional Heatmap',
    news:       '📰 News Feed Widget',
    calendar:   '📅 Calendar Widget',
    comparison: '⚖️ Comparison Widget',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, backdropFilter: 'blur(2px)' }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, left: 64, bottom: 0,
        width: 440, background: '#fff',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        borderRadius: '0 16px 16px 0',
        overflow: 'hidden',
        animation: 'nd-slide-in 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fafafa' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#333' }}>{titles[widgetId]}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {widgetId === 'kpi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Global KPIs — synced with timeline slider</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <KPIWidget metric="cases"         dateString={dateString} />
                <KPIWidget metric="deaths"        dateString={dateString} />
                <KPIWidget metric="recovered"     dateString={dateString} />
                <KPIWidget metric="active"        dateString={dateString} />
                <KPIWidget metric="recovery_rate" dateString={dateString} />
                <KPIWidget metric="today"         dateString={dateString} />
              </div>
              <p style={{ fontSize: 11, color: '#999', marginTop: 8, marginBottom: 4 }}>By country</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <KPIWidget metric="cases" country="France" dateString={dateString} />
                <KPIWidget metric="cases" country="US"     dateString={dateString} />
                <KPIWidget metric="cases" country="China"  dateString={dateString} />
                <KPIWidget metric="cases" country="Spain"  dateString={dateString} />
              </div>
            </div>
          )}

          {widgetId === 'chart' && (
            <div style={{ height: 320 }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Global cases timeline — synced with slider</p>
              <ChartWidget country={null} dateString={dateString} theme="light" />
            </div>
          )}

          {widgetId === 'pie' && (
            <div>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Dead · Healed · Infected · Healthy — via disease.sh</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {['USA','France','China','Spain'].map(c => (
                  <div key={c} style={{ background: '#f8f8ff', borderRadius: 12, padding: 8 }}>
                    <PieChartWidget country={c} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {widgetId === 'heatmap' && (
            <div>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Regional breakdown — USA states & France regions</p>
              <RegionalHeatmap />
            </div>
          )}

          {widgetId === 'news' && (
            <div style={{ height: 500, display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>News feed — synced with slider date</p>
              <div style={{ flex: 1, minHeight: 0, border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
                <NewsFeedWidget dateObj={dateObj} currentDateStr={currentDateStr} />
              </div>
            </div>
          )}

          {widgetId === 'calendar' && (
            <div>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Click a date to filter all data</p>
              <CalendarWidget currentDateStr={currentDateStr} onDateSelect={onDateSelect} />
            </div>
          )}

          {widgetId === 'comparison' && (
            <div style={{ height: 500, display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Compare countries — synced with slider</p>
              <div style={{ flex: 1, minHeight: 0, border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden', padding: 8 }}>
                <ComparisonWidget dateString={dateString} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── News Feed ────────────────────────────────────────────────────────────────
const NewsFeed = ({ currentDateStr, dateObj }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [source, setSource]     = useState('fallback');
  const debounceRef             = useRef(null);
  const lastFetchedDate         = useRef(null);
  const hasFetched              = useRef(false);

  const isoDate = useMemo(() => {
    if (!dateObj) return null;
    return dateObj.toISOString().split('T')[0];
  }, [dateObj]);

  function loadFallback(iso) {
    const target = iso ? new Date(iso) : new Date('2023-03-09');
    const sorted = [...FALLBACK_MILESTONES].sort((a, b) =>
      Math.abs(new Date(a.date) - target) - Math.abs(new Date(b.date) - target)
    );
    setArticles(sorted.slice(0, 3).sort((a, b) => new Date(b.date) - new Date(a.date)));
    setSource('fallback');
  }

  async function fetchNews(iso) {
    if (iso === lastFetchedDate.current) return;
    lastFetchedDate.current = iso;
    setLoading(true);
    const center  = new Date(iso);
    const from    = new Date(center); from.setDate(from.getDate() - 7);
    const to      = new Date(center); to.setDate(to.getDate() + 7);
    const fromStr = from.toISOString().split('T')[0];
    const toStr   = to.toISOString().split('T')[0];
    try {
      const res  = await fetch(`/api/news?from=${fromStr}&to=${toStr}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.articles?.length) throw new Error('No results');
      setArticles(data.articles.map(a => ({
        date:   a.publishedAt?.split('T')[0] || iso,
        title:  a.title,
        source: a.source?.name || 'GNews',
        url:    a.url,
      })));
      setSource('gnews');
    } catch { loadFallback(iso); }
    finally { setLoading(false); hasFetched.current = true; }
  }

  useEffect(() => {
    if (!isoDate) return;
    if (isoDate === lastFetchedDate.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchNews(isoDate), 150);
    return () => clearTimeout(debounceRef.current);
  }, [isoDate]);

  useEffect(() => { if (!isoDate && !hasFetched.current) loadFallback(null); }, []);

  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '4px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#aaa', fontStyle: 'italic' }}>
          {source === 'gnews' ? 'GNews API · live results' : 'WHO · CDC · ECDC · milestones'}
        </span>
        {loading && (
          <span style={{ fontSize: 9, color: '#6c5ce7', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, border: '1.5px solid #d0c8ff', borderTopColor: '#6c5ce7', borderRadius: '50%', display: 'inline-block', animation: 'nd-spin 0.7s linear infinite' }} />
            fetching…
          </span>
        )}
      </div>
      <style>{`@keyframes nd-spin{to{transform:rotate(360deg)}} @keyframes nd-slide-in{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      {!loading && articles.length === 0 && <div style={{ color: '#999', textAlign: 'center', padding: 20, fontSize: 12 }}>No news for this period</div>}
      {articles.map((item, i) => (
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

// ─── Country Row ──────────────────────────────────────────────────────────────
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

// ─── Calendar inline ──────────────────────────────────────────────────────────
const CalendarInline = ({ currentDateStr, onDateSelect }) => {
  const base      = new Date(currentDateStr);
  const baseValid = isNaN(base) ? new Date(2023, 2, 9) : base;
  const [offset, setOffset] = useState(0);
  const viewDate     = new Date(baseValid.getFullYear(), baseValid.getMonth() + offset, 1);
  const year         = viewDate.getFullYear();
  const month        = viewDate.getMonth();
  const highlightDay = offset === 0 ? baseValid.getDate() : null;
  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const monthName    = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const minDate      = new Date(2019, 10, 1);
  const maxDate      = new Date(2023, 2, 9);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const isOutOfRange = (d) => { if (!d) return false; const dt = new Date(year, month, d); return dt < minDate || dt > maxDate; };
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
          const oor = isOutOfRange(d); const isSel = d === highlightDay;
          return (
            <div key={i} onClick={() => { if (d && !oor && onDateSelect) onDateSelect(new Date(year, month, d)); }}
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

// ─── Comparison Table ─────────────────────────────────────────────────────────
const COMPARISON_COLORS = ['#ff6b6b','#4ecdc4','#45b7d1','#f9ca24','#6c5ce7','#a8e063','#fd79a8','#e17055'];
const ComparisonTable = ({ preCalculatedIndex, selectedPeriod }) => {
  const [selectedCountries, setSelectedCountries] = useState(['US','France','China','Spain','Brazil','India']);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const allCountries = useMemo(() => { if (!preCalculatedIndex?.isReady) return []; return preCalculatedIndex.countryNames.sort(); }, [preCalculatedIndex]);
  const handleSearch = useCallback((q) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const query = q.toLowerCase().trim();
    setSearchResults(allCountries.filter(c => !selectedCountries.includes(c) && c.toLowerCase().includes(query)).sort((a, b) => { const aL=a.toLowerCase(),bL=b.toLowerCase(); if(aL===query&&bL!==query)return -1; if(bL===query&&aL!==query)return 1; if(aL.startsWith(query)&&!bL.startsWith(query))return -1; if(bL.startsWith(query)&&!aL.startsWith(query))return 1; return a.localeCompare(b); }).slice(0,8));
  }, [allCountries, selectedCountries]);
  const addCountry = useCallback((c) => { if (selectedCountries.length>=8) return; setSelectedCountries(p=>[...p,c]); setSearch(''); setSearchResults([]); }, [selectedCountries]);
  const removeCountry = useCallback((c) => setSelectedCountries(p=>p.filter(x=>x!==c)), []);
  const tableData = useMemo(() => {
    if (!preCalculatedIndex?.isReady || selectedCountries.length===0) return [];
    const date=selectedPeriod?.dateString||preCalculatedIndex.dates[preCalculatedIndex.dates.length-1];
    const sorted=preCalculatedIndex.sortedIndex[date]; if (!sorted) return [];
    return selectedCountries.map((country,idx) => {
      const cases=sorted.casesPerCountry.find(c=>c.country===country)?.total_cases||0;
      const deaths=sorted.deathsPerCountry.find(c=>c.country===country)?.total_deaths||0;
      const recovered=sorted.recoveredPerCountry.find(c=>c.country===country)?.total_recovered||0;
      return { country, cases, deaths, recovered, color: COMPARISON_COLORS[idx%COMPARISON_COLORS.length], mortality: cases>0?((deaths/cases)*100).toFixed(2):'—', recovery: cases>0?((recovered/cases)*100).toFixed(2):'—' };
    }).sort((a,b)=>b.cases-a.cases);
  }, [preCalculatedIndex, selectedCountries, selectedPeriod]);
  if (!preCalculatedIndex?.isReady) return <div style={{ color:'#999', textAlign:'center', padding:40, fontSize:13 }}>Loading data...</div>;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, padding:4 }}>
      <div style={{ position:'relative' }}>
        <input type="text" placeholder="Add a country to compare..." value={search} onChange={e=>handleSearch(e.target.value)} style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e0e0ff', fontSize:13, outline:'none' }} />
        {searchResults.length>0 && <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e0e0ff', borderRadius:8, zIndex:100, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>{searchResults.map(c=><div key={c} onClick={()=>addCountry(c)} style={{ padding:'8px 14px', cursor:'pointer', fontSize:12, borderBottom:'1px solid #f0f0f0' }} onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{c}</div>)}</div>}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {selectedCountries.map((c,i)=><div key={c} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, border:`1px solid ${COMPARISON_COLORS[i%COMPARISON_COLORS.length]}`, fontSize:11, fontWeight:600, color:COMPARISON_COLORS[i%COMPARISON_COLORS.length] }}>{c}<span onClick={()=>removeCountry(c)} style={{ cursor:'pointer', opacity:0.7, fontSize:13, lineHeight:1 }}>×</span></div>)}
      </div>
      <div style={{ overflowX:'auto', borderRadius:10, border:'1px solid #f0f0f0' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead><tr style={{ background:'#f8f8ff' }}>{['Country','Total Cases','Deaths','Recovered','Mortality %','Recovery %'].map(h=><th key={h} style={{ padding:'10px 14px', textAlign:h==='Country'?'left':'right', color:'#666', fontWeight:700, fontSize:10, textTransform:'uppercase', borderBottom:'1px solid #f0f0f0', whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
          <tbody>{tableData.map(row=><tr key={row.country} style={{ borderBottom:'1px solid #f8f8f8' }} onMouseEnter={e=>e.currentTarget.style.background='#f8f8ff'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><td style={{ padding:'10px 14px', fontWeight:700, color:'#333', display:'flex', alignItems:'center', gap:8 }}><span style={{ width:10, height:10, borderRadius:'50%', background:row.color, flexShrink:0, display:'inline-block' }}/>{row.country}</td><td style={{ padding:'10px 14px', textAlign:'right', color:'#e17055', fontFamily:'monospace', fontWeight:600 }}>{fmtForce(row.cases)}</td><td style={{ padding:'10px 14px', textAlign:'right', color:'#636e72', fontFamily:'monospace' }}>{fmtForce(row.deaths)}</td><td style={{ padding:'10px 14px', textAlign:'right', color:'#00b894', fontFamily:'monospace' }}>{fmtForce(row.recovered)}</td><td style={{ padding:'10px 14px', textAlign:'right', color:'#fdcb6e', fontWeight:600 }}>{row.mortality!=='—'?`${row.mortality}%`:'—'}</td><td style={{ padding:'10px 14px', textAlign:'right', color:'#6c5ce7', fontWeight:600 }}>{row.recovery!=='—'?`${row.recovery}%`:'—'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Status Pie Chart ─────────────────────────────────────────────────────────
const StatusPieChart = ({ data, title }) => {
  if (!data) return <div style={{ color:'#999', textAlign:'center', padding:24, fontSize:12 }}>Loading...</div>;
  const pop=data.population||0, cases=data.cases||0, deaths=data.deaths||0, recovered=data.recovered||0, active=data.active||0;
  const healthy=pop>0?Math.max(0,pop-cases):0;
  const activeNotReported=active===0&&cases>0;
  const pieData=[{ name:'Dead', value:deaths||0 },{ name:'Healed', value:recovered||0 },{ name:activeNotReported?'Infected (not reported)':'Infected', value:activeNotReported?Math.max(1,Math.round(cases*0.001)):active },{ name:'Healthy', value:healthy||0 }].filter(d=>d.value>0);
  const colors=activeNotReported?['#e17055','#00b894','#cccccc','#74b9ff']:['#e17055','#00b894','#fdcb6e','#74b9ff'];
  if (pieData.length===0) return <div style={{ color:'#999', textAlign:'center', padding:24, fontSize:12 }}>No data</div>;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 8px 10px' }}>
      <div style={{ fontSize:11, color:'#555', fontWeight:600, marginBottom:2 }}>{FLAG[title]} {title} — {fmtForce(cases)} total</div>
      {activeNotReported && <div style={{ fontSize:9, color:'#999', marginBottom:4, textAlign:'center' }}>⚠️ Active cases not reported by this country</div>}
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" isAnimationActive={false}>
            {pieData.map((_,i)=><Cell key={i} fill={colors[i]} />)}
          </Pie>
          <Tooltip contentStyle={{ background:'#fff', border:'1px solid #eee', fontSize:11, borderRadius:8 }} formatter={(v,n)=>[fmtForce(v),n]} />
          <Legend iconSize={9} wrapperStyle={{ fontSize:10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod]           = useState(null);
  const [pieCountry, setPieCountry]                   = useState('USA');
  const [externalSliderIndex, setExternalSliderIndex] = useState(null);
  const [selectedCountry, setSelectedCountry]         = useState(null);
  const [searchTerm, setSearchTerm]                   = useState('');
  const [activeTab, setActiveTab]                     = useState('dashboard');
  const [activeWidget, setActiveWidget]               = useState(null); // ← overlay widget

  const globalStats            = useGlobalStats();
  const fourCountries          = useFourCountriesStats();
  const { preCalculatedIndex } = usePreCalculatedData();
  const pieData                = useCountryForPie(pieCountry, fourCountries.data);

  const countryDate = selectedPeriod?.dateString || null;

  const timelineStats = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return null;
    const date   = countryDate || preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
    const totals = preCalculatedIndex.totalsIndex[date];
    if (!totals) return null;
    const totalCases     = totals.totalCases     || 0;
    const totalDeaths    = totals.totalDeaths    || 0;
    const totalRecovered = totals.totalRecovered || 0;
    const totalActive    = Math.max(0, totalCases - totalDeaths - totalRecovered);
    const prevDate       = preCalculatedIndex.dates[preCalculatedIndex.dates.indexOf(date) - 1];
    const prevTotals     = prevDate ? preCalculatedIndex.totalsIndex[prevDate] : null;
    const todayCases     = prevTotals ? Math.max(0, totalCases - (prevTotals.totalCases || 0)) : 0;
    return { totalCases, totalDeaths, totalRecovered, totalActive, todayCases };
  }, [preCalculatedIndex, countryDate]);

  const totalForPct = timelineStats?.totalCases || 1;
  const activePct   = Math.min(100, Math.round(((timelineStats?.totalActive    || 0) / totalForPct) * 100));
  const recovPct    = Math.min(100, Math.round(((timelineStats?.totalRecovered || 0) / totalForPct) * 100));
  const deathPct    = Math.min(100, Math.round(((timelineStats?.totalDeaths    || 0) / totalForPct) * 100));

  const casesPerCountry = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return [];
    const date = countryDate || preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
    const data = preCalculatedIndex.sortedIndex[date]?.casesPerCountry;
    if (data && data.length > 0) return data;
    const lastDate     = preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
    const allCountries = preCalculatedIndex.sortedIndex[lastDate]?.casesPerCountry || [];
    return allCountries.map(c => ({ ...c, total_cases: 0 }));
  }, [preCalculatedIndex, countryDate]);

  const selectedCountryStats = useMemo(() => {
    if (!selectedCountry || !preCalculatedIndex?.isReady) return null;
    const date   = countryDate || preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
    const sorted = preCalculatedIndex.sortedIndex[date];
    if (!sorted) return null;
    const cases     = sorted.casesPerCountry.find(c => c.country === selectedCountry)?.total_cases || 0;
    const deaths    = sorted.deathsPerCountry.find(c => c.country === selectedCountry)?.total_deaths || 0;
    const recovered = sorted.recoveredPerCountry.find(c => c.country === selectedCountry)?.total_recovered || 0;
    return { total_cases: cases, total_deaths: deaths, total_recovered: recovered };
  }, [selectedCountry, preCalculatedIndex, countryDate]);

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
    if (selectedCountry && countryChartFull[selectedCountry])
      return countryChartFull[selectedCountry].slice(0, endIdx);
    return globalChartFull.slice(0, endIdx);
  }, [preCalculatedIndex, selectedPeriod, selectedCountry]);

  const currentDateStr = selectedPeriod?.displayDate || 'Mar 9, 2023';
  const currentDateObj = selectedPeriod?.dateObj     || new Date(2023, 2, 9);
  const countries      = fourCountries.data || [];

  const handlePeriodChange   = useCallback(p => setSelectedPeriod(p), []);
  const handleCountryClick   = useCallback(country => setSelectedCountry(country), []);
  const handleBackToGlobal   = useCallback(() => setSelectedCountry(null), []);
  const handleWidgetClick    = useCallback(id => setActiveWidget(prev => prev === id ? null : id), []);
  const handleWidgetClose    = useCallback(() => setActiveWidget(null), []);

  const handleCalendarDateSelect = useCallback((dateObj) => {
    if (!preCalculatedIndex?.isReady) return;
    const firstDataDate = new Date(2020, 0, 22);
    const hasData       = dateObj >= firstDataDate;
    const m             = dateObj.getMonth() + 1;
    const d             = dateObj.getDate();
    const y             = dateObj.getFullYear() % 100;
    const dateString    = `${m}/${d}/${y}`;
    const displayDate   = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const diffDays      = Math.round((dateObj - new Date(2019, 10, 1)) / 86400000);
    setExternalSliderIndex(Math.max(0, diffDays));
    setSelectedPeriod({ dateString, dateObj, displayDate, hasData });
    setActiveWidget(null);
  }, [preCalculatedIndex]);

  return (
    <div className="nd-page">

      {/* ── Overlay widget panel ─────────────────────────────────────────── */}
      <WidgetOverlay
        widgetId={activeWidget}
        onClose={handleWidgetClose}
        dateString={selectedPeriod?.dateString || null}
        dateObj={currentDateObj}
        currentDateStr={currentDateStr}
        onDateSelect={handleCalendarDateSelect}
      />

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="nd-sidebar">
        <div className="nd-logo">
          <div className="nd-logo-icon">🦠</div>
          <span>Covid-19</span>
        </div>

        {/* Navigation existante */}
        <nav className="nd-nav">
          <a href="/"          className="nd-nav-item" title="Global Map">🗺</a>
          <a href="/dashboard" className="nd-nav-item nd-nav-active" title="Dashboard">📊</a>
          <a href="/compare"   className="nd-nav-item" title="Compare">⚖️</a>
          <a href="/table"     className="nd-nav-item" title="Table">📋</a>
        </nav>

        {/* Séparateur */}
        <div style={{ width: '80%', height: 1, background: 'rgba(255,255,255,0.15)', margin: '4px auto' }} />

        {/* Widgets cliquables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', flex: 1 }}>
          {SIDEBAR_WIDGETS.map(w => (
            <button
              key={w.id}
              onClick={() => handleWidgetClick(w.id)}
              title={w.label}
              style={{
                width: 42, height: 42, borderRadius: 10,
                border: 'none', cursor: 'pointer',
                background: activeWidget === w.id ? 'rgba(255,255,255,0.28)' : 'transparent',
                color: activeWidget === w.id ? '#fff' : 'rgba(255,255,255,0.55)',
                fontSize: 17,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (activeWidget !== w.id) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { if (activeWidget !== w.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
            >
              {w.icon}
              {/* Point actif */}
              {activeWidget === w.id && (
                <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />
              )}
            </button>
          ))}
        </div>

        <div className="nd-nav-bottom">
          <a href="/" className="nd-nav-item" title="Back to main">🔙</a>
        </div>
      </aside>

      {/* ── Le reste du dashboard — IDENTIQUE à avant ────────────────────── */}
      <aside className="nd-country-panel">
        <div style={{ padding: '12px 10px 8px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 8 }}>Confirmed Cases by Country</div>
          <input type="text" placeholder="Search country..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e0e0ff', fontSize: 11, outline: 'none' }} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CountryList
            type="cases"
            countriesData={casesPerCountry}
            searchTerm={searchTerm}
            selectedCountry={selectedCountry}
            onCountryClick={handleCountryClick}
            colorClass="red-text"
            isLoading={!preCalculatedIndex?.isReady && casesPerCountry.length === 0}
          />
        </div>
      </aside>

      <main className="nd-main">
        <div className="nd-topbar">
          <div className="nd-search">
            <span>🔍</span>
            <span style={{ color: '#aaa', fontSize: 13 }}>Search country or region...</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['dashboard','📊 Dashboard'],['comparison','📋 Comparison']].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${activeTab===tab ? '#6c5ce7' : '#e0e0ff'}`,
                background: activeTab===tab ? '#6c5ce7' : '#fff',
                color: activeTab===tab ? '#fff' : '#666',
                transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
          <div className="nd-date-badge">🕐 {currentDateStr}</div>
        </div>

        {activeTab === 'comparison' && (
          <div className="nd-panel" style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <div style={{ fontWeight: 700, color: '#333', fontSize: 14, marginBottom: 14 }}>📋 Country Comparison Table</div>
            <ComparisonTable preCalculatedIndex={preCalculatedIndex} selectedPeriod={selectedPeriod} />
          </div>
        )}

        {activeTab === 'dashboard' && (<>
          {selectedCountry && (
            <CountryViewBanner country={selectedCountry} stats={selectedCountryStats} onBack={handleBackToGlobal} />
          )}
          {!selectedCountry && (
            <div className="nd-banner">
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Covid-19 Update</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>JHU CSSE dataset · disease.sh API · Nov 2019 → Mar 2023</div>
              </div>
              <div style={{ fontSize: 52, opacity: 0.2 }}>🦠</div>
            </div>
          )}
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
              theme="light"
            />
          </div>
          <div className="nd-bottom-row">
            <div className="nd-radials-panel">
              <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>Global Status</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{currentDateStr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '18px 12px 14px' }}>
                <RadialStat label="Affected"  value={timelineStats?.totalActive}    color="#a29bfe" pct={activePct} />
                <RadialStat label="Recovery"  value={timelineStats?.totalRecovered} color="#00cec9" pct={recovPct}  />
                <RadialStat label="Death"     value={timelineStats?.totalDeaths}    color="#74b9ff" pct={deathPct}  />
              </div>
            </div>
            <div className="nd-kpi-grid">
              <KPIWidget metric="cases"         dateString={selectedPeriod?.dateString} />
              <KPIWidget metric="today"         dateString={selectedPeriod?.dateString} />
              <KPIWidget metric="deaths"        dateString={selectedPeriod?.dateString} />
              <KPIWidget metric="recovery_rate" dateString={selectedPeriod?.dateString} />
            </div>
          </div>
        </>)}
      </main>

      <aside className="nd-right">
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
        {/* <div className="nd-panel nd-right-panel">
          <div className="nd-panel-title">🗺️ Regional Heatmap</div>
          <RegionalHeatmap />
        </div> */}
        <div className="nd-panel nd-right-panel">
          <div className="nd-panel-title">📅 Calendar</div>
          <CalendarInline currentDateStr={currentDateStr} onDateSelect={handleCalendarDateSelect} />
        </div>
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
        <div className="nd-panel nd-news-panel">
          <div className="nd-panel-title">📰 News Feed · {currentDateStr}</div>
          <NewsFeed currentDateStr={currentDateStr} dateObj={currentDateObj} />
        </div>
      </aside>
    </div>
  );
}