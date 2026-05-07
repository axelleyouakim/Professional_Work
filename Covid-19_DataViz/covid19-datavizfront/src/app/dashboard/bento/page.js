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

// ─── Catalogue complet des widgets disponibles ────────────────────────────────
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
    defaultW: 6, defaultH: 4,
    params: [
      { key: 'country', label: 'Country', type: 'select', options: ['(Global)','France','US','China','Spain','Brazil','India','Italy','Germany','United Kingdom'], default: '(Global)' },
    ],
  },
  {
    type: 'pie', icon: '🥧', label: 'Pie Chart',
    desc: 'Dead · Healed · Infected · Healthy',
    defaultW: 4, defaultH: 4,
    params: [
      { key: 'country', label: 'Country', type: 'select', options: ['USA','France','China','Spain'], default: 'USA' },
    ],
  },
  {
    type: 'heatmap', icon: '🗺️', label: 'Heatmap',
    desc: 'Regional heatmap — USA or France',
    defaultW: 6, defaultH: 5,
    params: [
      { key: 'country', label: 'Country', type: 'select', options: ['USA','France'], default: 'USA' },
    ],
  },
  {
    type: 'news', icon: '📰', label: 'News Feed',
    desc: 'COVID news synced with timeline',
    defaultW: 4, defaultH: 4,
    params: [],
  },
  {
    type: 'calendar', icon: '📅', label: 'Calendar',
    desc: 'Date picker — filters all widgets',
    defaultW: 3, defaultH: 4,
    params: [],
  },
  {
    type: 'comparison', icon: '⚖️', label: 'Comparison',
    desc: 'Compare multiple countries',
    defaultW: 8, defaultH: 5,
    params: [
      { key: 'countries', label: 'Default countries', type: 'text', default: 'US,France,China,Spain,Brazil,India' },
    ],
  },
];

// ─── Render d'un widget selon type + params ───────────────────────────────────
const renderWidgetContent = (type, params, dateString, dateObj, currentDateStr, onDateSelect) => {
  const country = params.country === '(Global)' ? null : (params.country || null);

  switch (type) {
    case 'kpi':
      return <KPIWidget metric={params.metric || 'cases'} country={country} dateString={dateString} />;
    case 'chart':
      return <ChartWidget country={country} dateString={dateString} theme="light" />;
    case 'pie':
      return <PieChartWidget country={params.country || 'USA'} />;
    case 'heatmap':
      return <RegionalHeatmap defaultCountry={params.country || 'USA'} />;
    case 'news':
      return <NewsFeedWidget dateObj={dateObj} currentDateStr={currentDateStr} />;
    case 'calendar':
      return <CalendarWidget currentDateStr={currentDateStr} onDateSelect={onDateSelect} />;
    case 'comparison': {
      const defaultCountries = (params.countries || 'US,France,China,Spain,Brazil,India')
        .split(',').map(s => s.trim()).filter(Boolean);
      return <ComparisonWidget defaultCountries={defaultCountries} dateString={dateString} />;
    }
    default:
      return <div style={{ padding: 16, color: '#999', fontSize: 12 }}>Unknown widget</div>;
  }
};

// ─── Param Editor (panneau de configuration du widget) ───────────────────────
const ParamEditor = ({ catalogItem, params, onChange, onClose }) => (
  // FIX 1 : onMouseDown stop propagation empêche react-grid-layout de capturer
  // le clic et de fermer/déplacer le dropdown pendant qu'on interagit
  <div
    onMouseDown={e => e.stopPropagation()}
    style={{
      position: 'absolute', top: 36, right: 0, zIndex: 50,
      background: '#fff', border: '1px solid #e0e0ff',
      borderRadius: 12, padding: 14, minWidth: 200,
      boxShadow: '0 8px 24px rgba(108,92,231,0.15)',
    }}
  >
    <div style={{ fontWeight: 700, fontSize: 12, color: '#333', marginBottom: 10 }}>
      ⚙️ Configure — {catalogItem.label}
    </div>
    {catalogItem.params.map(p => (
      <div key={p.key} style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: '#666', fontWeight: 700, display: 'block', marginBottom: 4 }}>
          {p.label}
        </label>
        {p.type === 'select' ? (
          <select
            value={params[p.key] ?? p.default}
            onChange={e => onChange(p.key, e.target.value)}
            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid #e0e0ff', fontSize: 11, outline: 'none' }}
          >
            {p.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={params[p.key] ?? p.default}
            onChange={e => onChange(p.key, e.target.value)}
            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid #e0e0ff', fontSize: 11, outline: 'none' }}
          />
        )}
      </div>
    ))}
    <button onClick={onClose} style={{ width: '100%', padding: '6px', borderRadius: 7, border: 'none', background: '#6c5ce7', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
      Done
    </button>
  </div>
);

// ─── Widget Card (wrapper avec header drag + config) ─────────────────────────
const WidgetCard = ({ widget, catalogItem, dateString, dateObj, currentDateStr, onDateSelect, onRemove, onParamChange }) => {
  const [showParams, setShowParams] = useState(false);

  return (
    <div className="bento-widget">
      {/* Header — drag handle */}
      <div className="bento-widget-header bento-drag-handle">
        <span style={{ fontSize: 13 }}>{catalogItem.icon}</span>
        <span className="bento-widget-title">{catalogItem.label}</span>
        {/* Paramètres du widget affichés dans le header */}
        {Object.entries(widget.params).map(([k, v]) => v && v !== '(Global)' && (
          <span key={k} style={{ fontSize: 9, background: 'rgba(108,92,231,0.12)', color: '#6c5ce7', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
            {v}
          </span>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, position: 'relative' }}>
          {/* Bouton config si le widget a des params */}
          {catalogItem.params.length > 0 && (
            <button
              className="bento-widget-btn"
              onClick={e => { e.stopPropagation(); setShowParams(p => !p); }}
              title="Configure"
            >⚙️</button>
          )}
          {/* FIX 2 : bouton × — stopPropagation pour ne pas déclencher le drag */}
          <button
            className="bento-widget-btn bento-widget-close"
            onClick={e => { e.stopPropagation(); onRemove(); }}
            title="Remove"
          >×</button>

          {/* Param editor dropdown */}
          {showParams && (
            <ParamEditor
              catalogItem={catalogItem}
              params={widget.params}
              onChange={(key, val) => { onParamChange(widget.id, key, val); }}
              onClose={() => setShowParams(false)}
            />
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="bento-widget-content">
        {renderWidgetContent(widget.type, widget.params, dateString, dateObj, currentDateStr, onDateSelect)}
      </div>
    </div>
  );
};

// ─── Page principale /dashboard/bento ────────────────────────────────────────
export default function BentoPage() {
  const [selectedPeriod, setSelectedPeriod]         = useState(null);
  const [externalSliderIndex, setExternalSliderIndex] = useState(null);
  const [widgets, setWidgets]                       = useState([]);
  const [layouts, setLayouts]                       = useState({ lg: [] });
  const [sidebarSearch, setSidebarSearch]           = useState('');
  const counterRef                                  = useRef(0);

  const { preCalculatedIndex } = usePreCalculatedData();

  const currentDateStr = selectedPeriod?.displayDate || 'Mar 9, 2023';
  const currentDateObj = selectedPeriod?.dateObj     || new Date(2023, 2, 9);
  const dateString     = selectedPeriod?.dateString  || null;

  const handlePeriodChange = useCallback(p => setSelectedPeriod(p), []);

  const handleCalendarDateSelect = useCallback((dateObj) => {
    if (!preCalculatedIndex?.isReady) return;
    const firstDataDate = new Date(2020, 0, 22);
    const hasData = dateObj >= firstDataDate;
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const y = dateObj.getFullYear() % 100;
    const ds = `${m}/${d}/${y}`;
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const diffDays = Math.round((dateObj - new Date(2019, 10, 1)) / 86400000);
    setExternalSliderIndex(Math.max(0, diffDays));
    setSelectedPeriod({ dateString: ds, dateObj, displayDate, hasData });
  }, [preCalculatedIndex]);

  // Ajouter un widget depuis la sidebar
  const addWidget = useCallback((catalogItem) => {
    const id = `${catalogItem.type}_${counterRef.current++}`;
    // Params par défaut
    const defaultParams = {};
    catalogItem.params.forEach(p => { defaultParams[p.key] = p.default; });

    setWidgets(prev => [...prev, { id, type: catalogItem.type, params: defaultParams }]);
    setLayouts(prev => ({
      ...prev,
      lg: [...(prev.lg || []), {
        i: id, x: 0, y: Infinity,
        w: catalogItem.defaultW,
        h: catalogItem.defaultH,
        minW: 2, minH: 2,
      }],
    }));
  }, []);

  // Supprimer un widget
  const removeWidget = useCallback((id) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    setLayouts(prev => ({ ...prev, lg: (prev.lg || []).filter(l => l.i !== id) }));
  }, []);

  // Modifier un param
  const handleParamChange = useCallback((widgetId, key, val) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, params: { ...w.params, [key]: val } } : w));
  }, []);

  const filteredCatalogue = useMemo(() => {
    if (!sidebarSearch.trim()) return CATALOGUE;
    const q = sidebarSearch.toLowerCase();
    return CATALOGUE.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  }, [sidebarSearch]);

  const getCatalogItem = (type) => CATALOGUE.find(c => c.type === type);

  return (
    <div className="bento-page">

      {/* ── Sidebar gauche — liste des composants ─────────────────────────── */}
      <aside className="bento-sidebar">
        <div className="bento-sidebar-header">
          <div className="bento-logo-icon">🦠</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginTop: 4 }}>COMPONENTS</div>
          <input
            type="text"
            placeholder="Search..."
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
            className="bento-sidebar-search"
          />
        </div>

        <div className="bento-catalogue">
          {filteredCatalogue.map(item => (
            <div
              key={item.type}
              className="bento-catalogue-item"
              onClick={() => addWidget(item)}
              title={`Add ${item.label}`}
            >
              <span className="bento-catalogue-icon">{item.icon}</span>
              <div className="bento-catalogue-info">
                <span className="bento-catalogue-label">{item.label}</span>
                <span className="bento-catalogue-desc">{item.desc}</span>
              </div>
              <span className="bento-catalogue-add">＋</span>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="bento-sidebar-nav">
          <a href="/"          className="bento-nav-item" title="Global Map">🗺</a>
          <a href="/dashboard" className="bento-nav-item" title="Dashboard">📊</a>
          <a href="/compare"   className="bento-nav-item" title="Compare">⚖️</a>
          <a href="/table"     className="bento-nav-item" title="Table">📋</a>
        </div>
      </aside>

      {/* ── Zone principale ────────────────────────────────────────────────── */}
      <div className="bento-main">

        {/* Topbar avec slider */}
        <div className="bento-topbar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <TimelineSlider onPeriodChange={handlePeriodChange} externalIndex={externalSliderIndex} />
          </div>
          <div className="bento-date-badge">🕐 {currentDateStr}</div>
          <a href="/dashboard" className="bento-back-btn" title="Back to classic dashboard">← Dashboard</a>
        </div>

        {/* Zone vide — invite à ajouter des composants */}
        {widgets.length === 0 && (
          <div className="bento-empty">
            <div className="bento-empty-icon">🧩</div>
            <div className="bento-empty-title">Your composable dashboard is empty</div>
            <div className="bento-empty-desc">Click any component in the left sidebar to add it here.<br/>Each component is independently parameterizable.</div>
          </div>
        )}

        {/* Bento grid */}
        {widgets.length > 0 && (
          <div className="bento-grid-container">
            <ResponsiveGridLayout
              className="bento-grid"
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768 }}
              cols={{ lg: 12, md: 10, sm: 6 }}
              rowHeight={80}
              draggableHandle=".bento-drag-handle"
              draggableCancel=".bento-widget-btn"
              onLayoutChange={(layout, allLayouts) => setLayouts(allLayouts)}
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