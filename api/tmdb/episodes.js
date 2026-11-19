export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: 'TMDB is not configured' });
  const tmdbId = String(req.query.tmdbId || '').trim();
  const season = String(req.query.season || '').trim();
  if (!/^\\d+$/.test(tmdbId) || !/^\\d+$/.test(season)) return res.status(400).json({ error: 'Valid TMDB ID and season are required.' });
  try {
    const response = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?language=en-US`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' }
    });
    if (!response.ok) return res.status(response.status).json({ error: 'TMDB episode lookup failed.' });
    const data = await response.json();
    const episodes = (data.episodes || [])
      .filter(ep => Number.isInteger(Number(ep.episode_number)) && Number(ep.episode_number) > 0)
      .map(ep => ({
        episode_number: Number(ep.episode_number), episode: Number(ep.episode_number),
        name: ep.name || `Episode ${ep.episode_number}`, title: ep.name || `Episode ${ep.episode_number}`,
        overview: ep.overview || '', still: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null,
        air_date: ep.air_date || null, runtime: ep.runtime || null
      }));
    return res.status(200).json({ tmdbId, season: Number(season), episodes });
  } catch { return res.status(500).json({ error: 'Failed to fetch season episodes.' }); }
}
