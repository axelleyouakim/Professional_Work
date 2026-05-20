'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

const ALL_MILESTONES = [
  { date: '2019-12-31', title: 'WHO informed of pneumonia cluster of unknown cause in Wuhan, China', source: 'WHO', country: 'global', url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/situation-reports' },
  { date: '2020-01-22', title: 'First confirmed COVID-19 cases outside China', source: 'WHO', country: 'global', url: 'https://www.who.int/csr/don/17-january-2020-novel-coronavirus-japan-ex-china/en/' },
  { date: '2020-03-11', title: 'WHO officially characterises COVID-19 as a pandemic', source: 'WHO', country: 'global', url: 'https://www.who.int/director-general/speeches/detail/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020' },
  { date: '2021-11-26', title: 'Omicron variant designated Variant of Concern by WHO', source: 'WHO', country: 'global', url: 'https://www.who.int/news/item/26-11-2021-classification-of-omicron-(b.1.1.529)-sars-cov-2-variant-of-concern' },
  { date: '2022-07-01', title: 'BA.5 Omicron subvariant drives new global wave', source: 'Nature', country: 'global', url: 'https://www.nature.com/articles/d41586-022-01882-3' },
  { date: '2023-03-09', title: 'WHO declares COVID-19 no longer a global health emergency', source: 'WHO', country: 'global', url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019' },

  { date: '2020-01-24', title: 'France confirms first COVID-19 cases in Europe', source: 'Santé Publique France', country: 'france', url: 'https://www.santepubliquefrance.fr/dossiers/coronavirus-covid-19' },
  { date: '2020-03-17', title: 'France enters strict national lockdown (confinement)', source: 'Gouvernement.fr', country: 'france', url: 'https://www.gouvernement.fr/info-coronavirus' },
  { date: '2020-05-11', title: 'France begins phased deconfinement', source: 'Gouvernement.fr', country: 'france', url: 'https://www.gouvernement.fr/info-coronavirus' },
  { date: '2020-10-30', title: 'France enters second national lockdown amid second wave', source: 'Santé Publique France', country: 'france', url: 'https://www.santepubliquefrance.fr/dossiers/coronavirus-covid-19' },
  { date: '2021-01-18', title: 'France accelerates vaccination campaign for over-75s', source: 'Ministère de la Santé', country: 'france', url: 'https://solidarites-sante.gouv.fr/grands-dossiers/vaccin-covid-19' },
  { date: '2021-04-03', title: 'France enters third national lockdown', source: 'Gouvernement.fr', country: 'france', url: 'https://www.gouvernement.fr/info-coronavirus' },
  { date: '2021-07-21', title: 'France mandates health pass (pass sanitaire) for public venues', source: 'Gouvernement.fr', country: 'france', url: 'https://www.gouvernement.fr/info-coronavirus/pass-sanitaire' },
  { date: '2022-02-03', title: 'France records 500K daily cases at Omicron peak', source: 'Santé Publique France', country: 'france', url: 'https://www.santepubliquefrance.fr/dossiers/coronavirus-covid-19' },
  { date: '2022-03-14', title: 'France lifts all COVID restrictions including mask mandates', source: 'Gouvernement.fr', country: 'france', url: 'https://www.gouvernement.fr/info-coronavirus' },
  { date: '2023-01-20', title: 'France ends free COVID testing for unvaccinated', source: 'Assurance Maladie', country: 'france', url: 'https://www.ameli.fr/assure/covid-19' },

  { date: '2020-01-21', title: 'First confirmed COVID-19 case in the United States (Washington State)', source: 'CDC', country: 'usa', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2020-03-13', title: 'US declares COVID-19 a national emergency', source: 'White House', country: 'usa', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2020-04-10', title: 'US surpasses 500,000 confirmed COVID-19 cases', source: 'CDC', country: 'usa', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2020-12-14', title: 'First COVID-19 vaccinations begin in the United States', source: 'CDC', country: 'usa', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2021-01-20', title: 'Biden signs executive order mandating masks on federal property', source: 'White House', country: 'usa', url: 'https://www.whitehouse.gov/briefing-room/presidential-actions/' },
  { date: '2021-04-19', title: 'All US adults become eligible for COVID-19 vaccination', source: 'CDC', country: 'usa', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2021-09-09', title: 'Biden announces federal vaccine mandates for large employers', source: 'White House', country: 'usa', url: 'https://www.whitehouse.gov/briefing-room/' },
  { date: '2022-01-13', title: 'US reports 1.3 million daily cases — highest worldwide', source: 'CDC', country: 'usa', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2022-09-19', title: 'Biden declares pandemic "over" in US interview', source: 'CBS News / Reuters', country: 'usa', url: 'https://www.reuters.com/world/us/' },
  { date: '2023-02-09', title: 'Biden signs bill ending national COVID-19 emergency early', source: 'Reuters', country: 'usa', url: 'https://www.reuters.com/world/us/' },
];

const getCountryKey = (country) => {
  if (!country) return 'global';
  const c = country.toLowerCase();
  if (c === 'france') return 'france';
  if (c === 'us' || c === 'usa' || c === 'united states') return 'usa';
  return 'global';
};

const getMilestones = (country) => {
  const key = getCountryKey(country);
  if (key === 'global') return ALL_MILESTONES.filter(m => m.country === 'global');
  return ALL_MILESTONES.filter(m => m.country === key || m.country === 'global');
};

const NewsFeedWidget = ({ dateObj = null, currentDateStr = 'Mar 9, 2023', country = null }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [source, setSource]     = useState('fallback');
  const debounceRef             = useRef(null);
  const lastFetchKey            = useRef(null);
  const hasFetched              = useRef(false);

  const isoDate = useMemo(() => {
    if (!dateObj) return null;
    return dateObj.toISOString().split('T')[0];
  }, [dateObj]);

  const fetchKey = `${isoDate}|${country || 'global'}`;

  const countryFlag = useMemo(() => {
    const key = getCountryKey(country);
    if (key === 'france') return '🇫🇷';
    if (key === 'usa')    return '🇺🇸';
    return '🌍';
  }, [country]);

  const countryLabel = useMemo(() => {
    const key = getCountryKey(country);
    if (key === 'france') return 'France';
    if (key === 'usa')    return 'USA';
    return 'Global';
  }, [country]);

  function loadFallback(iso) {
    const target   = iso ? new Date(iso) : new Date('2023-03-09');
    const pool     = getMilestones(country);
    const sorted   = [...pool].sort((a, b) =>
      Math.abs(new Date(a.date) - target) - Math.abs(new Date(b.date) - target)
    );
    setArticles(sorted.slice(0, 4).sort((a, b) => new Date(b.date) - new Date(a.date)));
    setSource('fallback');
    setLoading(false);
    hasFetched.current = true;
  }

  async function fetchNews(iso) {
    if (fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;
    setLoading(true);

    const center  = new Date(iso);
    const from    = new Date(center); from.setDate(from.getDate() - 7);
    const to      = new Date(center); to.setDate(to.getDate() + 7);
    const fromStr = from.toISOString().split('T')[0];
    const toStr   = to.toISOString().split('T')[0];

    const countryKey = getCountryKey(country);
    const countryQ   = countryKey === 'france' ? '&q=covid+france' : countryKey === 'usa' ? '&q=covid+usa' : '';

    try {
      const res  = await fetch(`/api/news?from=${fromStr}&to=${toStr}${countryQ}`);
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
    } catch {
      loadFallback(iso);
      return;
    }
    setLoading(false);
    hasFetched.current = true;
  }

  useEffect(() => {
    if (!isoDate) return;
    if (fetchKey === lastFetchKey.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchNews(isoDate), 150);
    return () => clearTimeout(debounceRef.current);
  }, [isoDate, country]);

  useEffect(() => {
    if (!isoDate && !hasFetched.current) loadFallback(null);
  }, []);

  useEffect(() => {
    lastFetchKey.current = null;
    hasFetched.current   = false;
    if (isoDate) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchNews(isoDate), 150);
    } else {
      loadFallback(null);
    }
  }, [country]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{`@keyframes nd-spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ padding: '4px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#6c5ce7' }}>
          {countryFlag} {countryLabel}
        </span>
        <span style={{ fontSize: 9, color: '#aaa', fontStyle: 'italic' }}>
          {source === 'gnews' ? 'GNews API · live' : 'WHO · CDC · milestones'}
        </span>
        {loading && (
          <span style={{ width: 8, height: 8, border: '1.5px solid #d0c8ff', borderTopColor: '#6c5ce7', borderRadius: '50%', display: 'inline-block', animation: 'nd-spin 0.7s linear infinite', marginLeft: 6 }} />
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {!loading && articles.length === 0 && (
          <div style={{ color: '#999', textAlign: 'center', padding: 20, fontSize: 12 }}>No news for this period</div>
        )}
        {articles.map((item, i) => (
          <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', padding: '10px 12px', borderBottom: '1px solid #f0f0f0', textDecoration: 'none', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontSize: 10, color: '#6c5ce7', marginBottom: 2, display: 'flex', gap: 6 }}>
              <span>{item.date}</span>
              <span style={{ color: '#ddd' }}>·</span>
              <span style={{ color: '#999' }}>{item.source}</span>
              <span style={{ marginLeft: 'auto', color: '#bbb', fontSize: 9 }}>↗</span>
            </div>
            <div style={{ fontSize: 11, color: '#333', lineHeight: 1.4 }}>{item.title}</div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default NewsFeedWidget;