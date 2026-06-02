export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.TMDB_READ_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NWVkYTQ4Y2Y1ODAzZjIyMzA0ZmQyMWY0ZjA2YTM1ZSIsIm5iZiI6MTc3ODY4NTg2My42ODcsInN1YiI6IjZhMDQ5N2E3N2IyZDk3NzQ2MDM3N2E1OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.XTD8e-B7awrTVIJd5WtD3vZ5FnWjE8sWkSjgYIeauAA';

  const title = (req.query.title || '').toString().trim();
  const year = (req.query.year || '').toString().trim();
  const tmdbId = (req.query.tmdbId || '').toString().trim();
  const requestedMediaType = (req.query.mediaType || '').toString().trim() === 'tv' ? 'tv' : 'movie';
  if (!title && !tmdbId) return res.status(400).json({ error: 'Missing title or tmdbId' });

  let best = null;
  if (tmdbId) {
    const detailRes = await fetch(`https://api.themoviedb.org/3/${requestedMediaType}/${tmdbId}?language=en-US`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    });
    if (!detailRes.ok) return res.status(detailRes.status).json({ error: 'TMDB id lookup failed' });
    const detail = await detailRes.json();
    best = { ...detail, id: detail.id, media_type: requestedMediaType };
  } else {
    const params = new URLSearchParams({ query: title, include_adult: 'false', language: 'en-US', page: '1' });
    if (year) params.set('year', year);

    const r = await fetch(`https://api.themoviedb.org/3/search/multi?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    });
    if (!r.ok) return res.status(r.status).json({ error: 'TMDB request failed' });
    const data = await r.json();
    best = (data.results || []).find(i => i.poster_path && (i.media_type === 'movie' || i.media_type === 'tv'));
  }
  if (!best?.poster_path) return res.status(404).json({ poster: null });

  let actors = 'N/A';
  if (req.query.details === '1') {
    try {
      const mediaType = best.media_type === 'tv' ? 'tv' : 'movie';
      const creditsRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${best.id}/credits?language=en-US`, {
        headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      });
      if (creditsRes.ok) {
        const credits = await creditsRes.json();
        actors = (credits?.cast || []).slice(0, 5).map(c => c?.name).filter(Boolean).join(', ') || 'N/A';
      }
    } catch {}
  }

  const details = req.query.details === '1' ? {
    Plot: best.overview || 'N/A',
    Year: (best.release_date || best.first_air_date || '').slice(0,4) || 'N/A',
    Released: best.release_date || best.first_air_date || '',
    imdbRating: best.vote_average ? Number(best.vote_average).toFixed(1) : 'N/A',
    Actors: actors,
  } : null;

  return res.status(200).json({
    poster: `https://image.tmdb.org/t/p/w500${best.poster_path}`,
    backdrop: best.backdrop_path ? `https://image.tmdb.org/t/p/w780${best.backdrop_path}` : null,
    source: 'tmdb',
    details,
  });
}
