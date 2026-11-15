export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.TMDB_READ_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NWVkYTQ4Y2Y1ODAzZjIyMzA0ZmQyMWY0ZjA2YTM1ZSIsIm5iZiI6MTc3ODY4NTg2My42ODcsInN1YiI6IjZhMDQ5N2E3N2IyZDk3NzQ2MDM3N2E1OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.XTD8e-B7awrTVIJd5WtD3vZ5FnWjE8sWkSjgYIeauAA';
  const tmdbId = String(req.query.tmdbId || '').trim();
  if (!/^\d+$/.test(tmdbId)) return res.status(400).json({ error: 'A valid TMDB ID is required.' });
  try {
    const response = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?language=en-US`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' }
    });
    if (!response.ok) return res.status(response.status).json({ error: 'TMDB series lookup failed.' });
    const data = await response.json();
    const seasons = (data.seasons || []).map(season => ({
      season_number: season.season_number,
      name: season.name || (season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`),
      episode_count: season.episode_count || 0
    }));
    return res.status(200).json({ tmdbId, seasons });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch available seasons.' });
  }
}
