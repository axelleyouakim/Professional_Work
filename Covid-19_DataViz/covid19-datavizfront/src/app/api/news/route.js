export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  const center = from && to
    ? new Date((new Date(from).getTime() + new Date(to).getTime()) / 2)
    : new Date('2023-03-09');

  const year  = center.getFullYear();
  const month = center.toLocaleString('en-US', { month: 'long' });
  const query = `COVID-19 pandemic ${month} ${year}`;

  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=5&origin=*`;
    const res  = await fetch(url, { headers: { 'User-Agent': 'Covid19DataViz/1.0 (student project)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hits  = data?.query?.search || [];
    if (!hits.length) throw new Error('No results');

    const articles = hits.slice(0, 3).map(h => ({
      title:       h.title,
      source:      { name: 'Wikipedia' },
      url:         `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, '_'))}`,
      publishedAt: center.toISOString(),
      description: h.snippet?.replace(/<[^>]+>/g, '') + '...',
    }));

    return Response.json({ articles });
  } catch (e) {
    return Response.json({ articles: [], error: e.message }, { status: 500 });
  }
}