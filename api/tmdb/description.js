export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const token = process.env.TMDB_READ_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NWVkYTQ4Y2Y1ODAzZjIyMzA0ZmQyMWY0ZjA2YTM1ZSIsIm5iZiI6MTc3ODY4NTg2My42ODcsInN1YiI6IjZhMDQ5N2E3N2IyZDk3NzQ2MDM3N2E1OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.XTD8e-B7awrTVIJd5WtD3vZ5FnWjE8sWkSjgYIeauAA';

  const title = (req.query.title || '').toString().trim();
  const year = (req.query.year || '').toString().trim();
  const tmdbId = (req.query.tmdbId || '').toString().trim();
  const requestedMediaType = (req.query.mediaType || '').toString().trim() === 'tv' ? 'tv' : 'movie';

  if (!title && !tmdbId) {
    return res.status(400).json({ error: 'Missing title or tmdbId' });
  }

  let best = null;

  try {
    if (tmdbId) {
      // Fetch directly by TMDB ID
      const detailRes = await fetch(`https://api.themoviedb.org/3/${requestedMediaType}/${tmdbId}?language=en-US`, {
        headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      });
      if (!detailRes.ok) {
        return res.status(detailRes.status).json({ error: 'TMDB id lookup failed' });
      }
      const detail = await detailRes.json();
      best = { ...detail, id: detail.id, media_type: requestedMediaType };
    } else {
      // Search by title and year
      const params = new URLSearchParams({
        query: title,
        include_adult: 'false',
        language: 'en-US',
        page: '1',
      });
      if (year) params.set('year', year);

      const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      });
      if (!searchRes.ok) {
        return res.status(searchRes.status).json({ error: 'TMDB request failed' });
      }
      const data = await searchRes.json();
      const results = (data.results || []).filter(i => i.poster_path || i.still_path);

      if (year) {
        const yearMatches = results.filter(i => {
          const date = i.release_date || i.first_air_date || '';
          return date.startsWith(year);
        });
        if (yearMatches.length > 0) {
          const exactType = yearMatches.find(i => i.media_type === requestedMediaType);
          best = exactType || yearMatches.find(i => i.media_type !== 'person') || yearMatches[0];
        } else {
          best = results.find(i => i.media_type === requestedMediaType) || results.find(i => i.media_type !== 'person') || results[0];
        }
      } else {
        best = results.find(i => i.media_type === requestedMediaType) || results.find(i => i.media_type !== 'person') || results[0];
      }
    }

    if (!best) {
      return res.status(404).json({ error: 'No results found' });
    }

    // Extract poster - prefer poster_path, fallback to still_path for TV
    const posterPath = best.poster_path || best.still_path;
    const poster = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
    const backdrop = best.backdrop_path ? `https://image.tmdb.org/t/p/w780${best.backdrop_path}` : null;

    // Get runtime information
    let runtime = null;
    const mediaType = best.media_type === 'tv' ? 'tv' : 'movie';
    if (mediaType === 'movie') {
      runtime = best.runtime || null;
    } else if (mediaType === 'tv' && best.episode_run_time && best.episode_run_time.length > 0) {
      runtime = best.episode_run_time[0];
    }

    return res.status(200).json({
      success: true,
      poster,
      backdrop,
      title: best.title || best.name || title,
      overview: best.overview || null,
      rating: best.vote_average ? Number(best.vote_average).toFixed(1) : null,
      releaseDate: best.release_date || best.first_air_date || null,
      mediaType: mediaType,
      tmdbId: best.id,
      runtime,
      genres: best.genres || [],
      originalLanguage: best.original_language || null,
      status: best.status || null,
      numberOfSeasons: best.number_of_seasons || null,
      numberOfEpisodes: best.number_of_episodes || null,
    });
  } catch (err) {
    console.error('[v0] TMDB description error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
