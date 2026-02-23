'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import TimelineSlider from '../components/TimelineSlider';
import { useAllTimeSeriesData } from '../hooks/useCovidData';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './compare.css';

// ─── Couleurs distinctes pour chaque pays ────────────────────────────────────
const COUNTRY_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24',
  '#6c5ce7', '#a8e063', '#fd79a8', '#e17055',
];

// ─── Mapping pays → code ISO2 pour flagcdn.com ───────────────────────────────
const COUNTRY_TO_ISO2 = {
  'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'Argentina': 'ar',
  'Australia': 'au', 'Austria': 'at', 'Azerbaijan': 'az', 'Bahrain': 'bh',
  'Bangladesh': 'bd', 'Belarus': 'by', 'Belgium': 'be', 'Bolivia': 'bo',
  'Bosnia and Herzegovina': 'ba', 'Brazil': 'br', 'Bulgaria': 'bg',
  'Cambodia': 'kh', 'Canada': 'ca', 'Chile': 'cl', 'China': 'cn',
  'Colombia': 'co', 'Croatia': 'hr', 'Cuba': 'cu', 'Cyprus': 'cy',
  'Czechia': 'cz', 'Czech Republic': 'cz', 'Denmark': 'dk', 'Ecuador': 'ec',
  'Egypt': 'eg', 'Estonia': 'ee', 'Ethiopia': 'et', 'Finland': 'fi',
  'France': 'fr', 'Georgia': 'ge', 'Germany': 'de', 'Ghana': 'gh',
  'Greece': 'gr', 'Guatemala': 'gt', 'Hungary': 'hu', 'India': 'in',
  'Indonesia': 'id', 'Iran': 'ir', 'Iraq': 'iq', 'Ireland': 'ie',
  'Israel': 'il', 'Italy': 'it', 'Japan': 'jp', 'Jordan': 'jo',
  'Kazakhstan': 'kz', 'Kenya': 'ke', 'Kuwait': 'kw', 'Latvia': 'lv',
  'Lebanon': 'lb', 'Libya': 'ly', 'Lithuania': 'lt', 'Luxembourg': 'lu',
  'Malaysia': 'my', 'Mexico': 'mx', 'Moldova': 'md', 'Morocco': 'ma',
  'Netherlands': 'nl', 'New Zealand': 'nz', 'Nigeria': 'ng', 'Norway': 'no',
  'Oman': 'om', 'Pakistan': 'pk', 'Panama': 'pa', 'Paraguay': 'py',
  'Peru': 'pe', 'Philippines': 'ph', 'Poland': 'pl', 'Portugal': 'pt',
  'Qatar': 'qa', 'Romania': 'ro', 'Russia': 'ru', 'Saudi Arabia': 'sa',
  'Serbia': 'rs', 'Singapore': 'sg', 'Slovakia': 'sk', 'Slovenia': 'si',
  'South Africa': 'za', 'Korea, South': 'kr', 'South Korea': 'kr',
  'Spain': 'es', 'Sri Lanka': 'lk', 'Sweden': 'se', 'Switzerland': 'ch',
  'Syria': 'sy', 'Taiwan*': 'tw', 'Taiwan': 'tw', 'Thailand': 'th',
  'Tunisia': 'tn', 'Turkey': 'tr', 'Ukraine': 'ua',
  'United Arab Emirates': 'ae', 'United Kingdom': 'gb', 'US': 'us',
  'United States': 'us', 'Uruguay': 'uy', 'Uzbekistan': 'uz',
  'Venezuela': 've', 'Vietnam': 'vn', 'Yemen': 'ye', 'Zimbabwe': 'zw',
};

const getFlagUrl = (country) => {
  const iso2 = COUNTRY_TO_ISO2[country];
  if (!iso2) return null;
  return `https://flagcdn.com/24x18/${iso2}.png`;
};

const formatNum = (n) => {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const formatYAxis = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v;
};

// ─── Composant drapeau ────────────────────────────────────────────────────────
const Flag = ({ country, size = 24 }) => {
  const url = getFlagUrl(country);
  if (!url) return <span className="flag-fallback">🌐</span>;
  return (
    <img
      src={url}
      alt={country}
      className="country-flag"
      style={{ width: size, height: 'auto' }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ComparePage() {
  const allTimeSeriesData = useAllTimeSeriesData();

  const [selectedCountries, setSelectedCountries] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'table'

  // ─── Liste de tous les pays disponibles ────────────────────────────────────
  const allCountries = useMemo(() => {
    if (!allTimeSeriesData.data?.countries) return [];
    return Object.keys(allTimeSeriesData.data.countries).sort();
  }, [allTimeSeriesData.data]);

  // ─── Recherche de pays ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchInput.toLowerCase();
    const results = allCountries
      .filter(c => c.toLowerCase().includes(q) && !selectedCountries.includes(c))
      .slice(0, 8);
    setSearchResults(results);
  }, [searchInput, allCountries, selectedCountries]);

  const addCountry = useCallback((country) => {
    if (selectedCountries.length >= 8) return;
    setSelectedCountries(prev => [...prev, country]);
    setSearchInput('');
    setSearchResults([]);
  }, [selectedCountries]);

  const removeCountry = useCallback((country) => {
    setSelectedCountries(prev => prev.filter(c => c !== country));
  }, []);

  // ─── Données timeline par pays ─────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!allTimeSeriesData.data || selectedCountries.length === 0) return [];
    const { countries, dates } = allTimeSeriesData.data;
    if (!dates) return [];

    // Filtrer jusqu'à la date du slider
    const targetDate = selectedPeriod?.dateString;
    const filteredDates = targetDate
      ? dates.filter(d => d <= targetDate)
      : dates;

    // Sous-échantillonner pour la perf (1 point par semaine)
    const sampled = filteredDates.filter((_, i) => i % 7 === 0);

    return sampled.map(date => {
      const point = { date };
      selectedCountries.forEach(country => {
        point[country] = countries[country]?.cases[date] || 0;
      });
      return point;
    });
  }, [allTimeSeriesData.data, selectedCountries, selectedPeriod]);

  // ─── Données tableau (snapshot à la date du slider) ────────────────────────
  const tableData = useMemo(() => {
    if (!allTimeSeriesData.data || selectedCountries.length === 0) return [];
    const { countries } = allTimeSeriesData.data;
    const targetDate = selectedPeriod?.dateString;

    // Trouver la dernière date disponible si pas de slider
    const dates = allTimeSeriesData.data.dates || [];
    const refDate = targetDate || dates[dates.length - 1];

    return selectedCountries.map((country, idx) => {
      const data = countries[country];
      if (!data) return { country, cases: 0, deaths: 0, recovered: 0, color: COUNTRY_COLORS[idx] };

      const cases     = data.cases?.[refDate]     || 0;
      const deaths    = data.deaths?.[refDate]    || 0;
      const recovered = data.recovered?.[refDate] || 0;
      const mortality = cases > 0 ? ((deaths / cases) * 100).toFixed(2) : '—';
      const recovery  = cases > 0 ? ((recovered / cases) * 100).toFixed(2) : '—';

      return { country, cases, deaths, recovered, mortality, recovery, color: COUNTRY_COLORS[idx] };
    }).sort((a, b) => b.cases - a.cases);
  }, [allTimeSeriesData.data, selectedCountries, selectedPeriod]);

  // ─── Format date axe X ─────────────────────────────────────────────────────
  const formatXAxis = useCallback((dateStr) => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const month = parseInt(parts[0]);
    const year  = parseInt(parts[2]) + 2000;
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${names[month - 1]} ${year}`;
  }, []);

  const handlePeriodChange = useCallback((period) => {
    setSelectedPeriod(period);
  }, []);

  const isLoading = allTimeSeriesData.isLoading;

  return (
    <div className="compare-page">
      <Header />
      <Navbar />

      <div className="compare-container">
        {/* ─── Titre ─────────────────────────────────────────────────────── */}
        <div className="compare-header">
          <h1 className="compare-title">
            <span className="compare-title-icon">⚖️</span>
            Country Comparison
          </h1>
          <p className="compare-subtitle">
            Compare COVID-19 data across multiple countries — add up to 8 countries
          </p>
        </div>

        {/* ─── Sélecteur de pays ─────────────────────────────────────────── */}
        <div className="country-selector-section">
          <div className="search-wrapper">
            <input
              type="text"
              className="country-search-input"
              placeholder="🔍  Search and add a country..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              disabled={selectedCountries.length >= 8}
            />
            {searchResults.length > 0 && (
              <ul className="search-dropdown">
                {searchResults.map(country => (
                  <li key={country} className="search-dropdown-item" onClick={() => addCountry(country)}>
                    <Flag country={country} size={20} />
                    <span>{country}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pills des pays sélectionnés */}
          <div className="selected-pills">
            {selectedCountries.length === 0 && (
              <span className="pills-placeholder">No countries selected yet — search above to add some</span>
            )}
            {selectedCountries.map((country, idx) => (
              <div
                key={country}
                className="country-pill"
                style={{ borderColor: COUNTRY_COLORS[idx], '--pill-color': COUNTRY_COLORS[idx] }}
              >
                <Flag country={country} size={18} />
                <span className="pill-name">{country}</span>
                <button
                  className="pill-remove"
                  onClick={() => removeCountry(country)}
                  aria-label={`Remove ${country}`}
                >×</button>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Slider timeline ───────────────────────────────────────────── */}
        <div className="compare-slider-section">
          <TimelineSlider onPeriodChange={handlePeriodChange} />
        </div>

        {/* ─── Loading ───────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="compare-loading">
            <div className="spinner" />
            <p>Loading timeline data...</p>
          </div>
        )}

        {/* ─── Empty state ───────────────────────────────────────────────── */}
        {!isLoading && selectedCountries.length === 0 && (
          <div className="compare-empty">
            <div className="compare-empty-icon">🌍</div>
            <h2>Start by adding countries</h2>
            <p>Use the search bar above to add countries you want to compare</p>
          </div>
        )}

        {/* ─── Contenu principal ─────────────────────────────────────────── */}
        {!isLoading && selectedCountries.length > 0 && (
          <>
            {/* Tabs Chart / Table */}
            <div className="compare-tabs">
              <button
                className={`compare-tab ${activeTab === 'chart' ? 'active' : ''}`}
                onClick={() => setActiveTab('chart')}
              >
                📈 Chart
              </button>
              <button
                className={`compare-tab ${activeTab === 'table' ? 'active' : ''}`}
                onClick={() => setActiveTab('table')}
              >
                📋 Data Table
              </button>
            </div>

            {/* ─── Chart multi-lignes ──────────────────────────────────── */}
            {activeTab === 'chart' && (
              <div className="compare-chart-section">
                <h2 className="section-title">
                  Confirmed Cases Over Time
                  {selectedPeriod?.displayDate && (
                    <span className="section-date"> — up to {selectedPeriod.displayDate}</span>
                  )}
                </h2>

                {chartData.length === 0 ? (
                  <div className="compare-no-data">No data for selected period</div>
                ) : (
                  <ResponsiveContainer width="100%" height={420}>
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis
                        dataKey="date"
                        stroke="#4a6a8a"
                        tickFormatter={formatXAxis}
                        interval={Math.floor(chartData.length / 8)}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        tick={{ fontSize: 11, fill: '#7a9abc' }}
                      />
                      <YAxis
                        stroke="#4a6a8a"
                        tickFormatter={formatYAxis}
                        tick={{ fontSize: 11, fill: '#7a9abc' }}
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0a1929',
                          border: '1px solid #1e3a5f',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: '#7a9abc', marginBottom: 6 }}
                        labelFormatter={formatXAxis}
                        formatter={(value, name) => [formatNum(value), name]}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: 20, fontSize: 12 }}
                        formatter={(value) => (
                          <span style={{ color: '#cdd9e5' }}>{value}</span>
                        )}
                      />
                      {selectedCountries.map((country, idx) => (
                        <Line
                          key={country}
                          type="monotone"
                          dataKey={country}
                          stroke={COUNTRY_COLORS[idx]}
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* ─── Tableau comparatif ──────────────────────────────────── */}
            {activeTab === 'table' && (
              <div className="compare-table-section">
                <h2 className="section-title">
                  Snapshot Data
                  {selectedPeriod?.displayDate && (
                    <span className="section-date"> — {selectedPeriod.displayDate}</span>
                  )}
                </h2>

                <div className="compare-table-wrapper">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th>Country</th>
                        <th>Total Cases</th>
                        <th>Total Deaths</th>
                        <th>Total Recovered</th>
                        <th>Mortality Rate</th>
                        <th>Recovery Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map(row => (
                        <tr key={row.country}>
                          <td className="table-country-cell">
                            <span
                              className="table-color-dot"
                              style={{ background: row.color }}
                            />
                            <Flag country={row.country} size={22} />
                            <span className="table-country-name">{row.country}</span>
                          </td>
                          <td className="table-cases">{formatNum(row.cases)}</td>
                          <td className="table-deaths">{formatNum(row.deaths)}</td>
                          <td className="table-recovered">{formatNum(row.recovered)}</td>
                          <td className="table-mortality">
                            {row.mortality !== '—' ? `${row.mortality}%` : '—'}
                          </td>
                          <td className="table-recovery">
                            {row.recovery !== '—' ? `${row.recovery}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards résumé */}
                <div className="compare-cards">
                  {tableData.map(row => (
                    <div
                      key={row.country}
                      className="compare-card"
                      style={{ '--card-color': row.color }}
                    >
                      <div className="card-header">
                        <Flag country={row.country} size={28} />
                        <span className="card-country">{row.country}</span>
                      </div>
                      <div className="card-stats">
                        <div className="card-stat">
                          <span className="card-stat-label">Cases</span>
                          <span className="card-stat-value cases">{formatNum(row.cases)}</span>
                        </div>
                        <div className="card-stat">
                          <span className="card-stat-label">Deaths</span>
                          <span className="card-stat-value deaths">{formatNum(row.deaths)}</span>
                        </div>
                        <div className="card-stat">
                          <span className="card-stat-label">Recovered</span>
                          <span className="card-stat-value recovered">{formatNum(row.recovered)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}