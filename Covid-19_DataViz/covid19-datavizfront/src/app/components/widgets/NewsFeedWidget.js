'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

const FALLBACK_MILESTONES = [
  { date: '2019-12-31', title: 'WHO informed of pneumonia cluster of unknown cause in Wuhan, China', source: 'WHO', url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/situation-reports' },
  { date: '2020-01-22', title: 'First confirmed COVID-19 cases outside China', source: 'WHO', url: 'https://www.who.int/csr/don/17-january-2020-novel-coronavirus-japan-ex-china/en/' },
  { date: '2020-03-11', title: 'WHO officially characterises COVID-19 as a pandemic', source: 'WHO', url: 'https://www.who.int/director-general/speeches/detail/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020' },
  { date: '2020-03-17', title: 'France enters strict national lockdown', source: 'Santé Publique France', url: 'https://www.santepubliquefrance.fr/dossiers/coronavirus-covid-19' },
  { date: '2020-12-14', title: 'First COVID-19 vaccinations begin in the United States', source: 'CDC', url: 'https://www.cdc.gov/museum/timeline/covid19.html' },
  { date: '2021-11-26', title: 'Omicron variant designated Variant of Concern by WHO', source: 'WHO', url: 'https://www.who.int/news/item/26-11-2021-classification-of-omicron-(b.1.1.529)-sars-cov-2-variant-of-concern' },
  { date: '2022-02-03', title: 'France records 500K daily cases at Omicron peak', source: 'Santé Publique France', url: 'https://www.santepubliquefrance.fr/dossiers/coronavirus-covid-19' },
  { date: '2022-07-01', title: 'BA.5 Omicron subvariant drives new global wave', source: 'Nature', url: 'https://www.nature.com/articles/d41586-022-01882-3' },
  { date: '2023-01-05', title: 'China reports surge after lifting zero-COVID policy', source: 'Reuters', url: 'https://www.reuters.com/world/china' },
  { date: '2023-03-09', title: 'WHO declares COVID-19 no longer a global health emergency', source: 'WHO', url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019' },
];

/**
 * NewsFeedWidget — paramétrable
 * Props: dateObj (Date), currentDateStr (string)
 */
const NewsFeedWidget = ({ dateObj = null, currentDateStr = 'Mar 9, 2023' }) => {
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
      setArticles(data.articles.map(a => ({ date: a.publishedAt?.split('T')[0] || iso, title: a.title, source: a.source?.name || 'GNews', url: a.url })));
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{`@keyframes nd-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ padding: '4px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#aaa', fontStyle: 'italic' }}>{source === 'gnews' ? 'GNews API · live' : 'WHO · CDC · milestones'}</span>
        {loading && <span style={{ width: 8, height: 8, border: '1.5px solid #d0c8ff', borderTopColor: '#6c5ce7', borderRadius: '50%', display: 'inline-block', animation: 'nd-spin 0.7s linear infinite' }} />}
      </div>
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {!loading && articles.length === 0 && <div style={{ color: '#999', textAlign: 'center', padding: 20, fontSize: 12 }}>No news for this period</div>}
        {articles.map((item, i) => (
          <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', padding: '10px 12px', borderBottom: '1px solid #f0f0f0', textDecoration: 'none', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontSize: 10, color: '#6c5ce7', marginBottom: 2, display: 'flex', gap: 6 }}>
              <span>{item.date}</span><span style={{ color: '#ddd' }}>·</span>
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