export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.TMDB_READ_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NWVkYTQ4Y2Y1ODAzZjIyMzA0ZmQyMWY0ZjA2YTM1ZSIsIm5iZiI6MTc3ODY4NTg2My42ODcsInN1YiI6IjZhMDQ5N2E3N2IyZDk3NzQ2MDM3N2E1OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.XTD8e-B7awrTVIJd5WtD3vZ5FnWjE8sWkSjgYIeauAA';

  const tmdbId = (req.query.tmdbId || '').toString().trim();
  const season = parseInt((req.query.season || '1').toString(), 10);
  if (!tmdbId) return res.status(400).json({ error: 'Missing tmdbId' });

  try {
    const seasonRes = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?language=en-US`,
      { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } }
    );
    if (!seasonRes.ok) return res.status(seasonRes.status).json({ error: 'TMDB season lookup failed' });
    
    const data = await seasonRes.json();
    const episodes = (data.episodes || []).map(ep => ({
      episode: ep.episode_number,
      title: ep.name || `Episode ${ep.episode_number}`,
      overview: ep.overview || '',
      runtime: ep.runtime || 0,
      airDate: ep.air_date || '',
    }));

    return res.status(200).json({
      tmdbId,
      season,
      name: data.name || `Season ${season}`,
      episodeCount: episodes.length,
      episodes,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch episodes' });
  }
}
