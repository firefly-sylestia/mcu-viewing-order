export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const title = (req.query.title || '').toString().trim();
  const year = (req.query.year || '').toString().trim();
  if (!title) return res.status(400).json({ error: 'Missing title' });

  const params = new URLSearchParams({ query_term: title, limit: '5', sort_by: 'seeds', order_by: 'desc' });
  if (year) params.set('query_term', `${title} ${year}`);

  try {
    const r = await fetch(`https://yts.mx/api/v2/list_movies.json?${params.toString()}`);
    if (!r.ok) return res.status(r.status).json({ error: 'YTS API unavailable' });

    const data = await r.json();
    if (data.status !== 'ok' || !data.data?.movies?.length) {
      return res.status(200).json({ torrents: [] });
    }

    const movie = data.data.movies[0];
    const magnetBase = `magnet:?xt=urn:btih:`;
    const trackers = [
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://tracker.openbittorrent.com:80',
      'udp://tracker.coppersurfer.tk:6969/announce',
      'udp://tracker.leechers-paradise.org:6969/announce',
      'udp://9.rarbg.to:2710/announce',
      'udp://tracker.internetwarriors.net:1337/announce',
    ].map(t => `&tr=${encodeURIComponent(t)}`).join('');

    const torrents = (movie.torrents || []).map(t => ({
      quality: t.quality,
      size: t.size,
      seeds: t.seeds || 0,
      peers: t.peers || 0,
      hash: t.hash,
      magnet: `${magnetBase}${t.hash}&dn=${encodeURIComponent(movie.title_long || movie.title)}${trackers}`,
    }));

    return res.status(200).json({
      title: movie.title_long || movie.title,
      year: movie.year,
      torrents,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch torrents' });
  }
}
