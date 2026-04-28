'use client';

import React, { useMemo } from 'react';
import { usePreCalculatedData } from '../../hooks/usePreCalculatedData';

const fmtForce = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const METRIC_CONFIG = {
  cases:         { label: 'Total Cases',    color: '#e17055', bg: '#fff5f2', getValue: s => s?.totalCases,     getSub: s => s?.todayCases > 0 ? `+${fmtForce(s.todayCases)} today` : undefined },
  deaths:        { label: 'Deaths',         color: '#636e72', bg: '#f8f8f8', getValue: s => s?.totalDeaths,    getSub: () => undefined },
  recovered:     { label: 'Total Recovered',color: '#00b894', bg: '#f0fff8', getValue: s => s?.totalRecovered, getSub: () => undefined },
  active:        { label: 'Active Cases',   color: '#6c5ce7', bg: '#f5f3ff', getValue: s => s?.totalActive,    getSub: () => undefined },
  recovery_rate: { label: 'Recovery Rate',  color: '#00b894', bg: '#f0fff8', isFormatted: true,
    getValue: s => s?.totalCases ? `${((s.totalRecovered / s.totalCases) * 100).toFixed(2)}%` : '—',
    getSub: () => undefined },
  today: { label: 'New Today', color: '#6c5ce7', bg: '#f5f3ff', formatPrefix: '+',
    getValue: s => s?.todayCases > 0 ? s.todayCases : null,
    getSub: () => undefined },
};

/**
 * KPIWidget — paramétrable
 * Props: metric, country, dateString, label, compact
 */
const KPIWidget = ({ metric = 'cases', country = null, dateString = null, label = null, compact = false }) => {
  const { preCalculatedIndex } = usePreCalculatedData();

  const stats = useMemo(() => {
    if (!preCalculatedIndex?.isReady) return null;
    const date = dateString || preCalculatedIndex.dates[preCalculatedIndex.dates.length - 1];
    if (country) {
      const sorted = preCalculatedIndex.sortedIndex[date];
      if (!sorted) return null;
      const cases     = sorted.casesPerCountry.find(c => c.country === country)?.total_cases || 0;
      const deaths    = sorted.deathsPerCountry.find(c => c.country === country)?.total_deaths || 0;
      const recovered = sorted.recoveredPerCountry.find(c => c.country === country)?.total_recovered || 0;
      const active    = Math.max(0, cases - deaths - recovered);
      const prevDate   = preCalculatedIndex.dates[preCalculatedIndex.dates.indexOf(date) - 1];
      const prevSorted = prevDate ? preCalculatedIndex.sortedIndex[prevDate] : null;
      const prevCases  = prevSorted?.casesPerCountry.find(c => c.country === country)?.total_cases || 0;
      const todayCases = prevSorted ? Math.max(0, cases - prevCases) : 0;
      return { totalCases: cases, totalDeaths: deaths, totalRecovered: recovered, totalActive: active, todayCases };
    } else {
      const totals = preCalculatedIndex.totalsIndex[date];
      if (!totals) return null;
      const totalCases     = totals.totalCases     || 0;
      const totalDeaths    = totals.totalDeaths    || 0;
      const totalRecovered = totals.totalRecovered || 0;
      const totalActive    = Math.max(0, totalCases - totalDeaths - totalRecovered);
      const prevDate   = preCalculatedIndex.dates[preCalculatedIndex.dates.indexOf(date) - 1];
      const prevTotals = prevDate ? preCalculatedIndex.totalsIndex[prevDate] : null;
      const todayCases = prevTotals ? Math.max(0, totalCases - (prevTotals.totalCases || 0)) : 0;
      return { totalCases, totalDeaths, totalRecovered, totalActive, todayCases };
    }
  }, [preCalculatedIndex, dateString, country]);

  const config = METRIC_CONFIG[metric] || METRIC_CONFIG.cases;
  const displayLabel = label || (country ? `${country} — ${config.label}` : config.label);
  const rawValue = config.getValue(stats);
  const displayValue = config.isFormatted ? (rawValue ?? '—') : rawValue != null ? `${config.formatPrefix || ''}${fmtForce(rawValue)}` : '—';
  const sub = config.getSub(stats);

  if (!preCalculatedIndex?.isReady) return (
    <div style={{ background: '#f8f8f8', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
      <style>{`@keyframes nd-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ width: 60, height: 20, background: '#e0e0e0', borderRadius: 4, animation: 'nd-pulse 1.2s ease infinite' }} />
    </div>
  );

  return (
    <div style={{ background: config.bg, borderRadius: compact ? 10 : 14, padding: compact ? '10px 12px' : '16px 18px', display: 'flex', flexDirection: 'column', gap: 5, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', height: '100%', boxSizing: 'border-box', minWidth: 0 }}>
      <span style={{ fontSize: compact ? 18 : 22, fontWeight: 800, color: config.color, fontFamily: 'monospace', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayValue}</span>
      <span style={{ fontSize: compact ? 10 : 12, color: '#555', fontWeight: 600, lineHeight: 1.3 }}>{displayLabel}</span>
      {sub && <span style={{ fontSize: 10, color: '#00b894', fontWeight: 500 }}>{sub}</span>}
      {country && <span style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>🌍 {country}</span>}
    </div>
  );
};

export default KPIWidget;