'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { usePreCalculatedData } from '../../hooks/usePreCalculatedData';
import TimelineSlider from '../../components/TimelineSlider';
import KPIWidget        from '../../components/widgets/KPIWidget';
import ChartWidget      from '../../components/widgets/ChartWidget';
import PieChartWidget   from '../../components/widgets/PieChartWidget';
import NewsFeedWidget   from '../../components/widgets/NewsFeedWidget';
import CalendarWidget   from '../../components/widgets/CalendarWidget';
import ComparisonWidget from '../../components/widgets/ComparisonWidget';
import RegionalHeatmap  from '../../components/RegionalHeatmap';
import './bento.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
const COLS = 12;

// ─── rowHeight = 70px
// Hauteurs complémentaires — garantit ZÉRO GAP vertical :
//
//   KPI  (h:2) = 140px  ┐
//   Pie  (h:3) = 210px  ┘ = h:5 = Chart / Heatmap / News
//
//   → 2 widgets empilés à gauche = 1 grand widget à droite → ligne parfaite
//
const ROW_HEIGHT = 70;

// ─── Bin-packing : première case libre pour un widget w×h ─────────────────────
const findNextPosition = (layout, newW, newH, cols = COLS) => {
  if (!layout.length) return { x: 0, y: 0, w: newW };
  const maxY = Math.max(...layout.map(i => i.y + i.h), 0);

  for (let row = 0; row <= maxY; row++) {
    const blocked = new Set();
    for (const item of layout) {
      if (item.y < row + newH && item.y + item.h > row)
        for (let c = item.x; c < item.x + item.w; c++) blocked.add(c);
    }
    let run = 0, startX = 0;
    for (let c = 0; c < cols; c++) {
      if (!blocked.has(c)) {
        if (run === 0) startX = c;
        run++;
        if (run >= newW) {
          // Compte les cols libres totales depuis startX
          let freeTotal = 0;
          for (let fc = startX; fc < cols; fc++) {
            if (!blocked.has(fc)) freeTotal++;
            else break;
          }
          // Remplit toujours toute la place disponible
          return { x: startX, y: row, w: freeTotal };
        }
      } else { run = 0; }
    }
  }
  // Aucune place → nouvelle ligne, pleine largeur
  return { x: 0, y: maxY, w: cols };
};

// ─── Catalogue ────────────────────────────────────────────────────────────────
//
//  Règle anti-gap — toutes les hauteurs sont des multiples de l'unité de base :
//
//    h:2 (KPI)  +  h:3 (Pie / Calendar)  =  h:5 (Chart / Heatmap / News)
//
//  Exemples de rangées parfaites :
//    KPI(3,2) + Chart(9,5)          → puis Pie(3,3) sous KPI → zéro gap
//    Heatmap(6,5) + News(6,5)       → ligne parfaite
//    KPI×4 (3,2) = 12 cols          → ligne parfaite
//    Timeline(12,3) / Comp(12,6)    → pleine largeur
//
const CATALOGUE = [
  {
    type: 'kpi', icon: '📊', label: 'KPI',
    desc: 'Key metric — cases, deaths, recovery…',
    defaultW: 3, defaultH: 2,
    params: [
      { key: 'metric',  label: 'Metric',  type: 'select', options: ['cases','deaths','recovered','active','recovery_rate','today'], default: 'cases' },
      { key: 'country', label: 'Country', type: 'select', options: ['(Global)','France','US','China','Spain','Brazil','India','Italy','Germany','United Kingdom'], default: '(Global)' },
    ],
  },
  {
    type: 'chart', icon: '📈', label: 'Chart',
    desc: 'Cases timeline over time',
    defaultW: 9, defaultH: 5,   // h:5 = KPI(2) + Pie(3)
    params: [
      { key: 'country', label: 'Country', type: 'select', options: ['(Global)','France','US','China','Spain','Brazil','India','Italy','Germany','United Kingdom'], default: '(Global)' },
    ],
  },
  {
    type: 'pie', icon: '🥧', label: 'Pie Chart',
    desc: 'Dead · Healed · Infected · Healthy',
    defaultW: 3, defaultH: 3,   // h:3 — empilé sous KPI(h:2) = h:5 = Chart
    params: [
      { key: 'country', label: 'Country', type: 'select', options: ['USA','France','China','Spain'], default: 'USA' },
    ],
  },
  {
    type: 'heatmap', icon: '🗺️', label: 'Heatmap',
    desc: 'Regional heatmap — USA or France',
    defaultW: 6, defaultH: 5,   // h:5 — paire avec News(h:5)
    params: [
      { key: 'country', label: 'Country', type: 'select', options: ['USA','France'], default: 'USA' },
    ],
  },
  {
    type: 'news', icon: '📰', label: 'News Feed',
    desc: 'COVID news synced with timeline',
    defaultW: 6, defaultH: 5,   // h:5 — paire avec Heatmap(h:5)
    params: [
      { key: 'country', label: 'Country', type: 'select', options: ['(Global)','France','US'], default: '(Global)' },
    ],
  },
  {
    type: 'calendar', icon: '📅', label: 'Calendar',
    desc: 'Date picker — filters all widgets',
    defaultW: 3, defaultH: 3,   // h:3 — même que Pie
    params: [],
  },
  {
    type: 'comparison', icon: '⚖️', label: 'Comparison',
    desc: 'Compare multiple countries',
    defaultW: 12, defaultH: 6,
    params: [
      { key: 'countries', label: 'Default countries', type: 'text', default: 'US,France,China,Spain,Brazil,India' },
    ],
  },
  {
    type: 'timeline', icon: '⏱️', label: 'Timeline',
    desc: 'Date slider — controls all widgets',
    defaultW: 12, defaultH: 3,
    minW: 6, minH: 2,
    params: [],
  },
];

// ─── Render contenu widget ────────────────────────────────────────────────────
const renderWidgetContent = (
  type, params, dateString, dateObj, currentDateStr,
  onDateSelect, onPeriodChange, externalSliderIndex,
) => {
  const country = params.country === '(Global)' ? null : (params.country || null);
  switch (type) {
    case 'kpi':
      return <KPIWidget metric={params.metric || 'cases'} country={country} dateString={dateString} />;
    case 'chart':
      return <ChartWidget country={country} dateString={dateString} theme="dark" />;
    case 'pie':
      return <PieChartWidget country={params.country || 'USA'} />;
    case 'heatmap':
      return <RegionalHeatmap defaultCountry={params.country || 'USA'} />;
    case 'news':
      return <NewsFeedWidget dateObj={dateObj} currentDateStr={currentDateStr} country={country} />;
    case 'calendar':
      return <CalendarWidget currentDateStr={currentDateStr} onDateSelect={onDateSelect} />;
    case 'comparison': {
      const defaultCountries = (params.countries || 'US,France,China,Spain,Brazil,India')
        .split(',').map(s => s.trim()).filter(Boolean);
      return <ComparisonWidget defaultCountries={defaultCountries} dateString={dateString} />;
    }
    case 'timeline':
      return (
        <div style={{ padding: '4px 8px', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TimelineSlider onPeriodChange={onPeriodChange} externalIndex={externalSliderIndex} />
          </div>
        </div>
      );
    default:
      return <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Unknown widget</div>;
  }
};

// ─── Param Editor ─────────────────────────────────────────────────────────────
const ParamEditor = ({ catalogItem, params, onChange, onClose }) => (
  <div
    onMouseDown={e => e.stopPropagation()}
    style={{
      position: 'absolute', top: 36, right: 0, zIndex: 50,
      background: '#1e2640', border: '1px solid #4a5568',
      borderRadius: 12, padding: 14, minWidth: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}
  >
    <div style={{ fontWeight: 700, fontSize: 12, color: '#e2e8f0', marginBottom: 10 }}>
      ⚙️ Configure — {catalogItem.label}
    </div>
    {catalogItem.params.map(p => (
      <div key={p.key} style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: '#718096', fontWeight: 700, display: 'block', marginBottom: 4 }}>
          {p.label}
        </label>
        {p.type === 'select' ? (
          <select
            value={params[p.key] ?? p.default}
            onChange={e => onChange(p.key, e.target.value)}
            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid #4a5568', background: '#111827', color: '#e2e8f0', fontSize: 11, outline: 'none' }}
          >
            {p.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={params[p.key] ?? p.default}
            onChange={e => onChange(p.key, e.target.value)}
            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid #4a5568', background: '#111827', color: '#e2e8f0', fontSize: 11, outline: 'none' }}
          />
        )}
      </div>
    ))}
    <button onClick={onClose} style={{ width: '100%', padding: '6px', borderRadius: 7, border: 'none', background: '#6c5ce7', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
      Done
    </button>
  </div>
);

// ─── Widget Card ──────────────────────────────────────────────────────────────
const WidgetCard = ({
  widget, catalogItem,
  dateString, dateObj, currentDateStr,
  onDateSelect, onRemove, onParamChange,
  onPeriodChange, externalSliderIndex,
}) => {
  const [showParams, setShowParams] = useState(false);
  return (
    <div className="bento-widget">
      <div className="bento-widget-header bento-drag-handle">
        <span style={{ fontSize: 13 }}>{catalogItem.icon}</span>
        <span className="bento-widget-title">{catalogItem.label}</span>
        {Object.entries(widget.params).map(([k, v]) => v && v !== '(Global)' && (
          <span key={k} style={{ fontSize: 9, background: 'rgba(108,92,231,0.25)', color: '#a78bfa', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{v}</span>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, position: 'relative' }}>
          {catalogItem.params.length > 0 && (
            <button className="bento-widget-btn" onClick={e => { e.stopPropagation(); setShowParams(p => !p); }} title="Configure">⚙️</button>
          )}
          <button className="bento-widget-btn bento-widget-close" onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove">×</button>
          {showParams && (
            <ParamEditor
              catalogItem={catalogItem}
              params={widget.params}
              onChange={(key, val) => onParamChange(widget.id, key, val)}
              onClose={() => setShowParams(false)}
            />
          )}
        </div>
      </div>
      <div className="bento-widget-content">
        {renderWidgetContent(widget.type, widget.params, dateString, dateObj, currentDateStr, onDateSelect, onPeriodChange, externalSliderIndex)}
      </div>
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
export default function BentoPage() {
  const [selectedPeriod, setSelectedPeriod]           = useState(null);
  const [externalSliderIndex, setExternalSliderIndex] = useState(null);
  const [widgets, setWidgets]                         = useState([]);
  const [layouts, setLayouts]                         = useState({ lg: [] });
  const [sidebarSearch, setSidebarSearch]             = useState('');
  const counterRef                                    = useRef(0);

  const { preCalculatedIndex } = usePreCalculatedData();

  const currentDateStr = selectedPeriod?.displayDate || 'Mar 9, 2023';
  const currentDateObj = selectedPeriod?.dateObj     || new Date(2023, 2, 9);
  const dateString     = selectedPeriod?.dateString  || null;

  const handlePeriodChange = useCallback(p => setSelectedPeriod(p), []);

  const handleCalendarDateSelect = useCallback((dateObj) => {
    if (!preCalculatedIndex?.isReady) return;
    const m = dateObj.getMonth() + 1, d = dateObj.getDate(), y = dateObj.getFullYear() % 100;
    const ds = `${m}/${d}/${y}`;
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const diffDays    = Math.round((dateObj - new Date(2019, 10, 1)) / 86400000);
    setExternalSliderIndex(Math.max(0, diffDays));
    setSelectedPeriod({ dateString: ds, dateObj, displayDate, hasData: dateObj >= new Date(2020, 0, 22) });
  }, [preCalculatedIndex]);

  const addWidget = useCallback((catalogItem) => {
    const id = `${catalogItem.type}_${counterRef.current++}`;
    const defaultParams = {};
    catalogItem.params.forEach(p => { defaultParams[p.key] = p.default; });
    setWidgets(prev => [...prev, { id, type: catalogItem.type, params: defaultParams }]);
    setLayouts(prev => {
      const currentLg = prev.lg || [];
      const { x, y, w } = findNextPosition(currentLg, catalogItem.defaultW, catalogItem.defaultH);
      return {
        ...prev,
        lg: [...currentLg, {
          i: id, x, y, w,
          h: catalogItem.defaultH,
          minW: catalogItem.minW || 2,
          minH: catalogItem.minH || 2,
        }],
      };
    });
  }, []);

  const removeWidget = useCallback((id) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    setLayouts(prev => ({ ...prev, lg: (prev.lg || []).filter(l => l.i !== id) }));
  }, []);

  const handleParamChange = useCallback((widgetId, key, val) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, params: { ...w.params, [key]: val } } : w));
  }, []);

  const filteredCatalogue = useMemo(() => {
    if (!sidebarSearch.trim()) return CATALOGUE;
    const q = sidebarSearch.toLowerCase();
    return CATALOGUE.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  }, [sidebarSearch]);

  const getCatalogItem = (type) => CATALOGUE.find(c => c.type === type);
  const hasTimelineWidget = widgets.some(w => w.type === 'timeline');

  return (
    <div className="bento-page">
      <aside className="bento-sidebar">
        <div className="bento-sidebar-header">
          <div className="bento-logo-icon">🦠</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: 4, letterSpacing: '0.08em' }}>COMPONENTS</div>
          <input type="text" placeholder="Search..." value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} className="bento-sidebar-search" />
        </div>
        <div className="bento-catalogue">
          {filteredCatalogue.map(item => (
            <div key={item.type} className="bento-catalogue-item" onClick={() => addWidget(item)}>
              <span className="bento-catalogue-icon">{item.icon}</span>
              <div className="bento-catalogue-info">
                <span className="bento-catalogue-label">{item.label}</span>
                <span className="bento-catalogue-desc">{item.desc}</span>
              </div>
              <span className="bento-catalogue-add">＋</span>
            </div>
          ))}
        </div>
        <div className="bento-sidebar-nav">
          <a href="/"          className="bento-nav-item" title="Global Map">🗺</a>
          <a href="/dashboard" className="bento-nav-item" title="Dashboard">📊</a>
          <a href="/compare"   className="bento-nav-item" title="Compare">⚖️</a>
          <a href="/table"     className="bento-nav-item" title="Table">📋</a>
        </div>
      </aside>

      <div className="bento-main">
        <div className="bento-topbar">
          {!hasTimelineWidget ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <TimelineSlider onPeriodChange={handlePeriodChange} externalIndex={externalSliderIndex} />
            </div>
          ) : (
            <div style={{ flex: 1, fontSize: 11, color: '#a78bfa', fontStyle: 'italic', fontWeight: 600 }}>
              ⏱️ Timeline widget active in grid — drag it anywhere
            </div>
          )}
          <div className="bento-date-badge">🕐 {currentDateStr}</div>
          <a href="/dashboard" className="bento-back-btn">← Dashboard</a>
        </div>

        {widgets.length === 0 && (
          <div className="bento-empty">
            <div className="bento-empty-icon">🧩</div>
            <div className="bento-empty-title">Your composable dashboard is empty</div>
            <div className="bento-empty-desc">
              Click any component in the left sidebar to add it here.<br />
              Each component is independently parameterizable.
            </div>
          </div>
        )}

        {widgets.length > 0 && (
          <div className="bento-grid-container">
            <ResponsiveGridLayout
              className="bento-grid"
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768 }}
              cols={{ lg: COLS, md: 10, sm: 6 }}
              rowHeight={ROW_HEIGHT}
              draggableHandle=".bento-drag-handle"
              draggableCancel=".bento-widget-btn, .timeline-slider, .timeline-btn, .timeline-controls"
              onLayoutChange={(_, allLayouts) => setLayouts(allLayouts)}
              compactType="vertical"
              preventCollision={false}
              isResizable
              isDraggable
              margin={[10, 10]}
              containerPadding={[0, 0]}
            >
              {widgets.map(widget => {
                const catalogItem = getCatalogItem(widget.type);
                if (!catalogItem) return null;
                return (
                  <div key={widget.id}>
                    <WidgetCard
                      widget={widget}
                      catalogItem={catalogItem}
                      dateString={dateString}
                      dateObj={currentDateObj}
                      currentDateStr={currentDateStr}
                      onDateSelect={handleCalendarDateSelect}
                      onRemove={() => removeWidget(widget.id)}
                      onParamChange={handleParamChange}
                      onPeriodChange={handlePeriodChange}
                      externalSliderIndex={externalSliderIndex}
                    />
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          </div>
        )}
      </div>
    </div>
  );
}