const headers = token => token ? { Authorization: `Bearer ${token}`, accept: 'application/json' } : { accept: 'application/json' };
const clean = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const image = path => path ? `https://image.tmdb.org/t/p/w300${path}` : null;

async function fromTmdb(tmdbId, season, token) {
  if (!tmdbId || !token) return [];
  const response = await fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(season)}?language=en-US`, { headers: headers(token) });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.episodes || []).filter(ep => Number.isInteger(Number(ep.episode_number)) && Number(ep.episode_number) > 0).map(ep => ({
    episode_number: Number(ep.episode_number), episode: Number(ep.episode_number),
    name: ep.name || `Episode ${ep.episode_number}`, title: ep.name || `Episode ${ep.episode_number}`,
    overview: ep.overview || '', still: image(ep.still_path),
    air_date: ep.air_date || null, runtime: ep.runtime || null, source: 'tmdb'
  }));
}

async function fromTvMaze(title, season) {
  if (!title) return [];
  const search = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`);
  if (!search.ok) return [];
  const results = await search.json();
  const wanted = clean(title);
  const ranked = (results || []).map(row => ({ show: row.show, score: clean(row.show?.name) === wanted ? 2 : clean(row.show?.name).includes(wanted) || wanted.includes(clean(row.show?.name)) ? 1 : 0 })).sort((a,b)=>b.score-a.score);
  const match = ranked.find(row => row.score > 0)?.show || (ranked.length === 1 ? ranked[0].show : null);
  if (!match?.id) return [];
  const response = await fetch(`https://api.tvmaze.com/shows/${match.id}/episodes?specials=1`);
  if (!response.ok) return [];
  const rows = await response.json();
  return (rows || []).filter(ep => Number(ep.season) === Number(season) && Number(ep.number) > 0).map(ep => ({
    episode_number: Number(ep.number), episode: Number(ep.number),
    name: ep.name || `Episode ${ep.number}`, title: ep.name || `Episode ${ep.number}`,
    overview: String(ep.summary || '').replace(/<[^>]*>/g, '').trim(),
    still: ep.image?.medium || ep.image?.original || null,
    air_date: ep.airdate || null, runtime: ep.runtime || null, source: 'tvmaze'
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const tmdbId = String(req.query.tmdbId || '').trim();
  const season = String(req.query.season ?? '1').trim();
  const title = String(req.query.title || '').trim();
  if ((!/^\\d+$/.test(tmdbId) && !title) || !/^\\d+$/.test(season)) return res.status(400).json({ error: 'A TMDB ID or series title and a valid season are required.' });
  try {
    let episodes = [];
    let source = '';
    try { episodes = await fromTmdb(tmdbId, season, process.env.TMDB_READ_ACCESS_TOKEN); if (episodes.length) source = 'tmdb'; } catch {}
    if (!episodes.length && title) {
      try { episodes = await fromTvMaze(title, season); if (episodes.length) source = 'tvmaze'; } catch {}
    }
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ tmdbId: tmdbId || null, title: title || null, season: Number(season), source: source || null, episodes });
  } catch { return res.status(500).json({ error: 'Failed to fetch season episodes.', episodes: [] }); }
}
