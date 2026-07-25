const image = (path, size) => path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.TMDB_READ_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NWVkYTQ4Y2Y1ODAzZjIyMzA0ZmQyMWY0ZjA2YTM1ZSIsIm5iZiI6MTc3ODY4NTg2My42ODcsInN1YiI6IjZhMDQ5N2E3N2IyZDk3NzQ2MDM3N2E1OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.XTD8e-B7awrTVIJd5WtD3vZ5FnWjE8sWkSjgYIeauAA';
  if (!token) return res.status(503).json({ error: 'TMDB is not configured', results: [] });

  const query = String(req.query.q || '').trim();
  if (query.length < 2) return res.status(400).json({ error: 'Query too short', results: [] });
  const headers = { Authorization: `Bearer ${token}`, accept: 'application/json' };

  try {
    const params = new URLSearchParams({ query, include_adult: 'false', language: 'en-US', page: '1' });
    const response = await fetch(`https://api.themoviedb.org/3/search/multi?${params}`, { headers });
    if (!response.ok) return res.status(response.status).json({ error: 'TMDB request failed', results: [] });
    const data = await response.json();
    const matches = (data.results || [])
      .filter(item => ['movie', 'tv'].includes(item.media_type) && item.poster_path)
      .slice(0, 10);

    const results = await Promise.all(matches.map(async item => {
      let detail = item;
      try {
        const detailResponse = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}?language=en-US`, { headers });
        if (detailResponse.ok) detail = { ...item, ...(await detailResponse.json()) };
      } catch {}
      const runtime = item.media_type === 'tv' ? detail.episode_run_time?.[0] : detail.runtime;
      return {
        id: item.id,
        title: item.media_type === 'tv' ? item.name : item.title,
        type: item.media_type,
        poster: image(item.poster_path, 'w342'),
        backdrop: image(item.backdrop_path, 'w780'),
        year: (item.media_type === 'tv' ? item.first_air_date : item.release_date || '').slice(0, 4),
        rating: item.vote_average ? Number(item.vote_average).toFixed(1) : null,
        voteCount: item.vote_count || 0,
        overview: item.overview || detail.overview || null,
        runtime: runtime || null,
        genres: (detail.genres || []).map(genre => genre.name),
        numberOfSeasons: detail.number_of_seasons || null,
        numberOfEpisodes: detail.number_of_episodes || null,
      };
    }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ results });
  } catch (error) {
    console.error('[v0] TMDB search error:', error);
    return res.status(500).json({ error: 'Internal server error', results: [] });
  }
}
