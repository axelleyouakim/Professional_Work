'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFourCountriesStats, useCountryForPie } from '../../hooks/useDiseaseData';

const fmtForce = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const FLAG = { France: '🇫🇷', USA: '🇺🇸', China: '🇨🇳', Spain: '🇪🇸' };

/**
 * PieChartWidget — paramétrable
 * Props: country ('France' | 'USA' | 'China' | 'Spain')
 */
const PieChartWidget = ({ country = 'USA' }) => {
  const fourCountries = useFourCountriesStats();
  const data = useCountryForPie(country, fourCountries.data);

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#999', fontSize: 12 }}>
      {fourCountries.isLoading ? 'Loading...' : 'No data'}
    </div>
  );

  const pop       = data.population || 0;
  const cases     = data.cases      || 0;
  const deaths    = data.deaths     || 0;
  const recovered = data.recovered  || 0;
  const active    = data.active     || 0;
  const healthy   = pop > 0 ? Math.max(0, pop - cases) : 0;
  const activeNotReported = active === 0 && cases > 0;

  const pieData = [
    { name: 'Dead',    value: deaths    || 0 },
    { name: 'Healed',  value: recovered || 0 },
    { name: activeNotReported ? 'Infected (not reported)' : 'Infected', value: activeNotReported ? Math.max(1, Math.round(cases * 0.001)) : active },
    { name: 'Healthy', value: healthy   || 0 },
  ].filter(d => d.value > 0);

  const colors = activeNotReported
    ? ['#e17055', '#00b894', '#cccccc', '#74b9ff']
    : ['#e17055', '#00b894', '#fdcb6e', '#74b9ff'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px 8px', height: '100%' }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginBottom: 2 }}>
        {FLAG[country]} {country} — {fmtForce(cases)} total
      </div>
      {activeNotReported && (
        <div style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>⚠️ Active cases not reported</div>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" isAnimationActive={false}>
            {pieData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eee', fontSize: 11, borderRadius: 8 }} formatter={(v, n) => [fmtForce(v), n]} />
          <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChartWidget;