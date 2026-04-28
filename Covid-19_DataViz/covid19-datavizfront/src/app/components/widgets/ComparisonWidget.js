'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { usePreCalculatedData } from '../../hooks/usePreCalculatedData';

const fmtForce = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const COLORS = ['#ff6b6b','#4ecdc4','#45b7d1','#f9ca24','#6c5ce7','#a8e063','#fd79a8','#e17055'];

/**
 * ComparisonWidget — paramétrable
 * Props: defaultCountries, dateString
 */
const ComparisonWidget = ({ defaultCountries = ['US','France','China','Spain','Brazil','India'], dateString = null }) => {
  const { preCalculatedIndex } = usePreCalculatedData();
  const [selectedCountries, setSelectedCountries] = useState(defaultCountries);
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const allCountries = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return [];
    return preCalculatedIndex.countryNames.sort();
  }, [preCalculatedIndex]);

  const handleSearch = useCallback((q) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const query = q.toLowerCase().trim();
    setSearchResults(
      allCountries.filter(c => !selectedCountries.includes(c) && c.toLowerCase().includes(query))
        .sort((a, b) => {
          const aL = a.toLowerCase(), bL = b.toLowerCase();
          if (aL === query && bL !== query) return -1;
          if (bL === query && aL !== query) return 1;
          if (aL.startsWith(query) && !bL.startsWith(query)) return -1;
          if (bL.startsWith(query) && !aL.startsWith(query)) return 1;
          return a.localeCompare(b);
        }).slice(0, 6)
    );
  }, [allCountries, selectedCountries]);

  const addCountry    = useCallback((c) => { if (selectedCountries.length >= 8) return; setSelectedCountries(p => [...p, c]); setSearch(''); setSearchResults([]); }, [selectedCountries]);
  const removeCountry = useCallback((c) => setSelectedCountries(p => p.filter(x => x !== c)), []);

  const tableData = useMemo(() => {
    if (!preCalculatedIndex?.isReady || selectedCountries.length === 0) return [];
    const date   = dateString || preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
    const sorted = preCalculatedIndex.sortedIndex[date];
    if (!sorted) return [];
    return selectedCountries.map((country, idx) => {
      const cases     = sorted.casesPerCountry.find(c => c.country === country)?.total_cases || 0;
      const deaths    = sorted.deathsPerCountry.find(c => c.country === country)?.total_deaths || 0;
      const recovered = sorted.recoveredPerCountry.find(c => c.country === country)?.total_recovered || 0;
      return { country, cases, deaths, recovered, color: COLORS[idx % COLORS.length],
        mortality: cases > 0 ? ((deaths / cases) * 100).toFixed(2) : '—',
        recovery:  cases > 0 ? ((recovered / cases) * 100).toFixed(2) : '—' };
    }).sort((a, b) => b.cases - a.cases);
  }, [preCalculatedIndex, selectedCountries, dateString]);

  if (!preCalculatedIndex?.isReady) return <div style={{ color: '#999', textAlign: 'center', padding: 20, fontSize: 12 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4, height: '100%' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <input type="text" placeholder="Add country..." value={search} onChange={e => handleSearch(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e0e0ff', fontSize: 12, outline: 'none' }} />
        {searchResults.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e0e0ff', borderRadius: 8, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {searchResults.map(c => (
              <div key={c} onClick={() => addCountry(c)}
                style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 11, borderBottom: '1px solid #f0f0f0' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{c}</div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
        {selectedCountries.map((c, i) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, border: `1px solid ${COLORS[i % COLORS.length]}`, fontSize: 10, fontWeight: 600, color: COLORS[i % COLORS.length] }}>
            {c}<span onClick={() => removeCountry(c)} style={{ cursor: 'pointer', opacity: 0.7, fontSize: 12, lineHeight: 1 }}>×</span>
          </div>
        ))}
      </div>
      <div style={{ overflowX: 'auto', flex: 1, minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f8f8ff' }}>
              {['Country','Cases','Deaths','Recovered','Mortality','Recovery'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Country' ? 'left' : 'right', color: '#666', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map(row => (
              <tr key={row.country}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f8ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0, display: 'inline-block' }} />{row.country}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#e17055', fontFamily: 'monospace', fontWeight: 600 }}>{fmtForce(row.cases)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#636e72', fontFamily: 'monospace' }}>{fmtForce(row.deaths)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#00b894', fontFamily: 'monospace' }}>{fmtForce(row.recovered)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#fdcb6e', fontWeight: 600 }}>{row.mortality !== '—' ? `${row.mortality}%` : '—'}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6c5ce7', fontWeight: 600 }}>{row.recovery !== '—' ? `${row.recovery}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonWidget;