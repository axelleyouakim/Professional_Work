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

const COUNTRY_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24',
  '#6c5ce7', '#a8e063', '#fd79a8', '#e17055',
];

const DISPLAY_NAMES = {
  'Korea, South':               'South Korea',
  'Korea, North':               'North Korea',
  'Taiwan*':                    'Taiwan',
  'Burma':                      'Myanmar',
  "Cote d'Ivoire":              "Côte d'Ivoire",
  'West Bank and Gaza':         'Palestine',
  'Holy See':                   'Vatican',
  'Congo (Kinshasa)':           'DR Congo',
  'Congo (Brazzaville)':        'Congo',
  'Cabo Verde':                 'Cape Verde',
  'Timor-Leste':                'East Timor',
  'Sao Tome and Principe':      'São Tomé & Príncipe',
  'Saint Kitts and Nevis':      'St. Kitts & Nevis',
  'Saint Lucia':                'St. Lucia',
  'Saint Vincent and the Grenadines': 'St. Vincent & the Grenadines',
  'Trinidad and Tobago':        'Trinidad & Tobago',
  'Bosnia and Herzegovina':     'Bosnia & Herzegovina',
  'United Arab Emirates':       'UAE',
};

const COUNTRY_TO_ISO2 = {
  'Afghanistan':'af','Albania':'al','Algeria':'dz','Andorra':'ad','Angola':'ao',
  'Antigua and Barbuda':'ag','Argentina':'ar','Armenia':'am','Australia':'au','Austria':'at',
  'Azerbaijan':'az','Bahamas':'bs','Bahrain':'bh','Bangladesh':'bd','Barbados':'bb',
  'Belarus':'by','Belgium':'be','Belize':'bz','Benin':'bj','Bhutan':'bt',
  'Bolivia':'bo','Bosnia and Herzegovina':'ba','Botswana':'bw','Brazil':'br','Brunei':'bn',
  'Bulgaria':'bg','Burkina Faso':'bf','Burma':'mm','Burundi':'bi','Cabo Verde':'cv',
  'Cambodia':'kh','Cameroon':'cm','Canada':'ca','Central African Republic':'cf','Chad':'td',
  'Chile':'cl','China':'cn','Colombia':'co','Comoros':'km','Congo (Brazzaville)':'cg',
  'Congo (Kinshasa)':'cd','Costa Rica':'cr',"Cote d'Ivoire":'ci','Croatia':'hr','Cuba':'cu',
  'Cyprus':'cy','Czechia':'cz','Denmark':'dk','Djibouti':'dj','Dominica':'dm',
  'Dominican Republic':'do','Ecuador':'ec','Egypt':'eg','El Salvador':'sv',
  'Equatorial Guinea':'gq','Eritrea':'er','Estonia':'ee','Eswatini':'sz','Ethiopia':'et',
  'Fiji':'fj','Finland':'fi','France':'fr','Gabon':'ga','Gambia':'gm','Georgia':'ge',
  'Germany':'de','Ghana':'gh','Greece':'gr','Grenada':'gd','Guatemala':'gt','Guinea':'gn',
  'Guinea-Bissau':'gw','Guyana':'gy','Haiti':'ht','Holy See':'va','Honduras':'hn',
  'Hungary':'hu','Iceland':'is','India':'in','Indonesia':'id','Iran':'ir','Iraq':'iq',
  'Ireland':'ie','Israel':'il','Italy':'it','Jamaica':'jm','Japan':'jp','Jordan':'jo',
  'Kazakhstan':'kz','Kenya':'ke','Kiribati':'ki','Korea, North':'kp','Korea, South':'kr',
  'Kosovo':'xk','Kuwait':'kw','Kyrgyzstan':'kg','Laos':'la','Latvia':'lv','Lebanon':'lb',
  'Lesotho':'ls','Liberia':'lr','Libya':'ly','Liechtenstein':'li','Lithuania':'lt',
  'Luxembourg':'lu','Madagascar':'mg','Malawi':'mw','Malaysia':'my','Maldives':'mv',
  'Mali':'ml','Malta':'mt','Marshall Islands':'mh','Mauritania':'mr','Mauritius':'mu',
  'Mexico':'mx','Micronesia':'fm','Moldova':'md','Monaco':'mc','Mongolia':'mn',
  'Montenegro':'me','Morocco':'ma','Mozambique':'mz','Namibia':'na','Nauru':'nr',
  'Nepal':'np','Netherlands':'nl','New Zealand':'nz','Nicaragua':'ni','Niger':'ne',
  'Nigeria':'ng','North Macedonia':'mk','Norway':'no','Oman':'om','Pakistan':'pk',
  'Palau':'pw','Panama':'pa','Papua New Guinea':'pg','Paraguay':'py','Peru':'pe',
  'Philippines':'ph','Poland':'pl','Portugal':'pt','Qatar':'qa','Romania':'ro',
  'Russia':'ru','Rwanda':'rw','Saint Kitts and Nevis':'kn','Saint Lucia':'lc',
  'Saint Vincent and the Grenadines':'vc','Samoa':'ws','San Marino':'sm',
  'Sao Tome and Principe':'st','Saudi Arabia':'sa','Senegal':'sn','Serbia':'rs',
  'Seychelles':'sc','Sierra Leone':'sl','Singapore':'sg','Slovakia':'sk','Slovenia':'si',
  'Solomon Islands':'sb','Somalia':'so','South Africa':'za','South Sudan':'ss',
  'Spain':'es','Sri Lanka':'lk','Sudan':'sd','Suriname':'sr','Sweden':'se',
  'Switzerland':'ch','Syria':'sy','Taiwan*':'tw','Tajikistan':'tj','Tanzania':'tz',
  'Thailand':'th','Timor-Leste':'tl','Togo':'tg','Tonga':'to',
  'Trinidad and Tobago':'tt','Tunisia':'tn','Turkey':'tr','Turkmenistan':'tm',
  'Tuvalu':'tv','Uganda':'ug','Ukraine':'ua','United Arab Emirates':'ae',
  'United Kingdom':'gb','Uruguay':'uy','US':'us','Uzbekistan':'uz','Vanuatu':'vu',
  'Venezuela':'ve','Vietnam':'vn','West Bank and Gaza':'ps','Western Sahara':'eh',
  'Yemen':'ye','Zambia':'zm','Zimbabwe':'zw',
};

const getDisplayName = (country) => DISPLAY_NAMES[country] || country;
const getFlagUrl = (country) => {
  const iso2 = COUNTRY_TO_ISO2[country];
  return iso2 ? `https://flagcdn.com/20x15/${iso2}.png` : null;
};

const formatNum = (n) => {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const formatYAxis = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v;
};

const FlagImg = ({ country, size = 20 }) => {
  const url = getFlagUrl(country);
  if (!url) return null;
  return (
    <img src={url} alt="" width={size} style={{ height: 'auto', verticalAlign: 'middle', flexShrink: 0 }}
      onError={e => e.target.style.display = 'none'} loading="lazy" />
  );
};

export default function ComparePage() {
  const allTimeSeriesData = useAllTimeSeriesData();

  const [selectedCountries, setSelectedCountries] = useState([]);
  const [searchInput, setSearchInput]             = useState('');
  const [searchResults, setSearchResults]         = useState([]);
  const [selectedPeriod, setSelectedPeriod]       = useState(null);
  const [activeTab, setActiveTab]                 = useState('chart');

  // Liste triée avec noms d'affichage
  const allCountries = useMemo(() => {
    if (!allTimeSeriesData.data?.countries) return [];
    return Object.keys(allTimeSeriesData.data.countries).sort((a, b) =>
      getDisplayName(a).localeCompare(getDisplayName(b))
    );
  }, [allTimeSeriesData.data]);

  useEffect(() => {
    if (!searchInput.trim()) { setSearchResults([]); return; }
    const q = searchInput.toLowerCase();
    setSearchResults(
      allCountries
        .filter(c =>
          !selectedCountries.includes(c) &&
          (c.toLowerCase().includes(q) || getDisplayName(c).toLowerCase().includes(q))
        )
        .slice(0, 8)
    );
  }, [searchInput, allCountries, selectedCountries]);

  const addCountry    = useCallback((country) => {
    if (selectedCountries.length >= 8) return;
    setSelectedCountries(prev => [...prev, country]);
    setSearchInput(''); setSearchResults([]);
  }, [selectedCountries]);

  const removeCountry = useCallback((country) => {
    setSelectedCountries(prev => prev.filter(c => c !== country));
  }, []);

  const chartData = useMemo(() => {
    if (!allTimeSeriesData.data || selectedCountries.length === 0) return [];
    const { countries, dates } = allTimeSeriesData.data;
    if (!dates) return [];
    const target = selectedPeriod?.dateString;
    const filtered = target ? dates.filter(d => d <= target) : dates;
    return filtered.filter((_, i) => i % 7 === 0).map(date => {
      const point = { date };
      selectedCountries.forEach(c => { point[getDisplayName(c)] = countries[c]?.cases[date] || 0; });
      return point;
    });
  }, [allTimeSeriesData.data, selectedCountries, selectedPeriod]);

  const tableData = useMemo(() => {
    if (!allTimeSeriesData.data || selectedCountries.length === 0) return [];
    const { countries, dates } = allTimeSeriesData.data;
    const refDate = selectedPeriod?.dateString || dates?.[dates.length - 1];
    return selectedCountries.map((country, idx) => {
      const d = countries[country];
      if (!d) return { country, cases: 0, deaths: 0, recovered: 0, color: COUNTRY_COLORS[idx] };
      const cases = d.cases?.[refDate] || 0, deaths = d.deaths?.[refDate] || 0, recovered = d.recovered?.[refDate] || 0;
      return {
        country, cases, deaths, recovered, color: COUNTRY_COLORS[idx],
        mortality: cases > 0 ? ((deaths / cases) * 100).toFixed(2) : '—',
        recovery:  cases > 0 ? ((recovered / cases) * 100).toFixed(2) : '—',
      };
    }).sort((a, b) => b.cases - a.cases);
  }, [allTimeSeriesData.data, selectedCountries, selectedPeriod]);

  const formatXAxis = useCallback((dateStr) => {
    const [m,,y] = dateStr.split('/');
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${names[parseInt(m) - 1]} ${parseInt(y) + 2000}`;
  }, []);

  return (
    <div className="compare-page">
      <Header />
      <Navbar />

      <div className="compare-container">
        <div className="compare-header">
          <h1 className="compare-title"><span className="compare-title-icon">⚖️</span>Country Comparison</h1>
          <p className="compare-subtitle">Compare COVID-19 data across multiple countries — add 2 to 8 countries</p>
        </div>

        {/* Sélecteur */}
        <div className="country-selector-section">
          <div className="search-wrapper">
            <input type="text" className="country-search-input" placeholder="🔍  Search and add a country..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)} disabled={selectedCountries.length >= 8} />
            {searchResults.length > 0 && (
              <ul className="search-dropdown">
                {searchResults.map(country => (
                  <li key={country} className="search-dropdown-item" onClick={() => addCountry(country)}>
                    <FlagImg country={country} size={18} />
                    <span>{getDisplayName(country)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="selected-pills">
            {selectedCountries.length === 0 && <span className="pills-placeholder">No countries selected yet — search above to add some</span>}
            {selectedCountries.map((country, idx) => (
              <div key={country} className="country-pill" style={{ borderColor: COUNTRY_COLORS[idx], '--pill-color': COUNTRY_COLORS[idx] }}>
                <FlagImg country={country} size={16} />
                <span className="pill-name">{getDisplayName(country)}</span>
                <button className="pill-remove" onClick={() => removeCountry(country)}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Slider */}
        <div className="compare-slider-section">
          <TimelineSlider onPeriodChange={setSelectedPeriod} />
        </div>

        {allTimeSeriesData.isLoading && (
          <div className="compare-loading"><div className="spinner" /><p>Loading data...</p></div>
        )}

        {!allTimeSeriesData.isLoading && selectedCountries.length === 0 && (
          <div className="compare-empty">
            <div className="compare-empty-icon">🌍</div>
            <h2>Start by adding countries</h2>
            <p>Use the search bar above to add 2–8 countries to compare</p>
          </div>
        )}

        {!allTimeSeriesData.isLoading && selectedCountries.length > 0 && (
          <>
            <div className="compare-tabs">
              <button className={`compare-tab ${activeTab === 'chart' ? 'active' : ''}`} onClick={() => setActiveTab('chart')}>📈 Chart</button>
              <button className={`compare-tab ${activeTab === 'table' ? 'active' : ''}`} onClick={() => setActiveTab('table')}>📋 Data Table</button>
            </div>

            {activeTab === 'chart' && (
              <div className="compare-chart-section">
                <h2 className="section-title">
                  Confirmed Cases Over Time
                  {selectedPeriod?.displayDate && <span className="section-date"> — up to {selectedPeriod.displayDate}</span>}
                </h2>
                {chartData.length === 0 ? (
                  <div className="compare-no-data">No data for selected period</div>
                ) : (
                  <ResponsiveContainer width="100%" height={420}>
                    <LineChart data={chartData} margin={{ top:10, right:30, left:20, bottom:60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis dataKey="date" stroke="#4a6a8a" tickFormatter={formatXAxis}
                        interval={Math.floor(chartData.length / 8)} angle={-45} textAnchor="end"
                        height={70} tick={{ fontSize:11, fill:'#7a9abc' }} />
                      <YAxis stroke="#4a6a8a" tickFormatter={formatYAxis} tick={{ fontSize:11, fill:'#7a9abc' }} width={70} />
                      <Tooltip contentStyle={{ backgroundColor:'#0a1929', border:'1px solid #1e3a5f', borderRadius:'8px', fontSize:'12px' }}
                        labelStyle={{ color:'#7a9abc', marginBottom:6 }} labelFormatter={formatXAxis}
                        formatter={(v, n) => [formatNum(v), n]} />
                      <Legend wrapperStyle={{ paddingTop:20, fontSize:12 }}
                        formatter={v => <span style={{ color:'#cdd9e5' }}>{v}</span>} />
                      {selectedCountries.map((country, idx) => (
                        <Line key={country} type="monotone" dataKey={getDisplayName(country)} stroke={COUNTRY_COLORS[idx]}
                          strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r:5, strokeWidth:0 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {activeTab === 'table' && (
              <div className="compare-table-section">
                <h2 className="section-title">
                  Snapshot Data
                  {selectedPeriod?.displayDate && <span className="section-date"> — {selectedPeriod.displayDate}</span>}
                </h2>
                <div className="compare-table-wrapper">
                  <table className="compare-table">
                    <thead>
                      <tr><th>Country</th><th>Total Cases</th><th>Total Deaths</th><th>Total Recovered</th><th>Mortality</th><th>Recovery</th></tr>
                    </thead>
                    <tbody>
                      {tableData.map(row => (
                        <tr key={row.country}>
                          <td className="table-country-cell">
                            <span className="table-color-dot" style={{ background: row.color }} />
                            <FlagImg country={row.country} size={20} />
                            <span className="table-country-name">{getDisplayName(row.country)}</span>
                          </td>
                          <td className="table-cases">{formatNum(row.cases)}</td>
                          <td className="table-deaths">{formatNum(row.deaths)}</td>
                          <td className="table-recovered">{formatNum(row.recovered)}</td>
                          <td className="table-mortality">{row.mortality !== '—' ? `${row.mortality}%` : '—'}</td>
                          <td className="table-recovery">{row.recovery !== '—' ? `${row.recovery}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="compare-cards">
                  {tableData.map(row => (
                    <div key={row.country} className="compare-card" style={{ '--card-color': row.color }}>
                      <div className="card-header">
                        <FlagImg country={row.country} size={26} />
                        <span className="card-country">{getDisplayName(row.country)}</span>
                      </div>
                      <div className="card-stats">
                        <div className="card-stat"><span className="card-stat-label">Cases</span><span className="card-stat-value cases">{formatNum(row.cases)}</span></div>
                        <div className="card-stat"><span className="card-stat-label">Deaths</span><span className="card-stat-value deaths">{formatNum(row.deaths)}</span></div>
                        <div className="card-stat"><span className="card-stat-label">Recovered</span><span className="card-stat-value recovered">{formatNum(row.recovered)}</span></div>
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