const clean = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
async function fromTvMaze(title) {
  if (!title) return [];
  const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`);
  if (!response.ok) return [];
  const results = await response.json();
  const wanted = clean(title);
  const ranked = (results || []).map(row => ({ show: row.show, score: clean(row.show?.name) === wanted ? 2 : clean(row.show?.name).includes(wanted) || wanted.includes(clean(row.show?.name)) ? 1 : 0 })).sort((a,b)=>b.score-a.score);
  const match = ranked.find(row => row.score > 0)?.show || (ranked.length === 1 ? ranked[0].show : null);
  if (!match?.id) return [];
  const episodesResponse = await fetch(`https://api.tvmaze.com/shows/${match.id}/episodes?specials=1`);
  if (!episodesResponse.ok) return [];
  const episodes = await episodesResponse.json();
  const counts = new Map();
  (episodes || []).forEach(ep => counts.set(Number(ep.season), (counts.get(Number(ep.season)) || 0) + 1));
  return [...counts.entries()].sort((a,b)=>a[0]-b[0]).map(([season_number, episode_count]) => ({ season_number, episode_count, name: season_number === 0 ? 'Specials' : `Season ${season_number}`, source: 'tvmaze' }));
}
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const tmdbId = String(req.query.tmdbId || '').trim();
  const title = String(req.query.title || '').trim();
  if (!/^\\d+$/.test(tmdbId) && !title) return res.status(400).json({ error: 'A TMDB ID or series title is required.' });
  try {
    let seasons = [];
    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    if (/^\\d+$/.test(tmdbId) && token) {
      try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}?language=en-US`, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } });
        if (response.ok) {
          const data = await response.json();
          seasons = (data.seasons || []).map(season => ({ season_number: Number(season.season_number), name: season.name || (Number(season.season_number) === 0 ? 'Specials' : `Season ${season.season_number}`), episode_count: Number(season.episode_count) || 0, source: 'tmdb' }));
        }
      } catch {}
    }
    if (!seasons.length && title) seasons = await fromTvMaze(title);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ tmdbId: tmdbId || null, title: title || null, source: seasons[0]?.source || null, seasons });
  } catch { return res.status(500).json({ error: 'Failed to fetch available seasons.', seasons: [] }); }
}
