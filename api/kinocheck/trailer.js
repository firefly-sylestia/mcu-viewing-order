/**
 * Kinocheck Trailer API Proxy
 * 
 * GET /api/kinocheck/trailer?title=Avengers&year=2012&tmdbId=24428
 * 
 * Searches Kinocheck for official trailers and returns YouTube video IDs.
 * Uses server-side environment variable KINOCHECK_API_KEY for authentication.
 * Returns cached results on the server with Cache-Control headers.
 */

const KINOCHECK_BASE = 'https://api.kinocheck.com';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.KINOCHECK_API_KEY;
  const title = (req.query.title || '').toString().trim();
  const year = (req.query.year || '').toString().trim();
  const tmdbId = (req.query.tmdbId || '').toString().trim();

  if (!title && !tmdbId) {
    return res.status(400).json({ error: 'Missing title or tmdbId parameter' });
  }

  const headers = {
    'accept': 'application/json',
  };

  // Add API key if available (optional for low-volume free tier)
  if (apiKey) {
    headers['X-Api-Key'] = apiKey;
    headers['X-Api-Host'] = 'api.kinocheck.com';
  }

  try {
    let results = [];

    // Strategy 1: If we have a TMDB ID, try searching by movie/show ID first
    if (tmdbId) {
      // Try movie endpoint
      const movieRes = await fetch(`${KINOCHECK_BASE}/movies?tmdb_id=${tmdbId}&language=en`, { headers });
      if (movieRes.ok) {
        const movieData = await movieRes.json();
        if (movieData?.trailers?.length) {
          results = movieData.trailers
            .filter(t => t.youtube_video_id)
            .map(t => ({
              youtubeId: t.youtube_video_id,
              title: t.title || 'Official Trailer',
              type: t.type || 'trailer',
              language: t.language || 'en',
            }));
        }
      }

      // If no results from movie, try shows endpoint
      if (!results.length) {
        const showRes = await fetch(`${KINOCHECK_BASE}/shows?tmdb_id=${tmdbId}&language=en`, { headers });
        if (showRes.ok) {
          const showData = await showRes.json();
          if (showData?.trailers?.length) {
            results = showData.trailers
              .filter(t => t.youtube_video_id)
              .map(t => ({
                youtubeId: t.youtube_video_id,
                title: t.title || 'Official Trailer',
                type: t.type || 'trailer',
                language: t.language || 'en',
              }));
          }
        }
      }
    }

    // Strategy 2: Search the trailers endpoint by title
    if (!results.length && title) {
      const searchQuery = title.replace(/\s+/g, '+');
      const trailersRes = await fetch(
        `${KINOCHECK_BASE}/trailers?search=${encodeURIComponent(searchQuery)}&language=en&limit=5`,
        { headers }
      );

      if (trailersRes.ok) {
        const trailersData = await trailersRes.json();
        if (trailersData?.data?.length) {
          // Filter to best matches — prefer exact title match
          const titleLower = title.toLowerCase();
          const allResults = trailersData.data
            .filter(t => t.youtube_video_id)
            .map(t => ({
              youtubeId: t.youtube_video_id,
              title: t.title || 'Trailer',
              type: t.type || 'trailer',
              language: t.language || 'en',
              movieTitle: t.resource?.title || '',
            }));

          // Score matches: exact title > partial title > everything else
          const scored = allResults.map(r => ({
            ...r,
            score: r.movieTitle?.toLowerCase() === titleLower ? 100
                  : r.movieTitle?.toLowerCase()?.includes(titleLower) ? 50
                  : 0,
          })).sort((a, b) => b.score - a.score);

          results = scored.slice(0, 5);

          // If year filter provided, boost year-matching results
          if (year) {
            const yearMatches = scored.filter(r => {
              if (!r.movieTitle) return false;
              return r.movieTitle.toLowerCase().includes(year);
            });
            if (yearMatches.length) {
              // Put year matches first
              results = [...yearMatches, ...scored.filter(r => !yearMatches.includes(r))].slice(0, 5);
            }
          }
        }
      }
    }

    // Set caching headers — trailers don't change often
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

    if (results.length === 0) {
      return res.status(200).json({ trailers: [], source: 'kinocheck', note: 'No trailers found' });
    }

    // Return the best trailer as primary, plus all options
    const primary = results[0];
    return res.status(200).json({
      trailers: results,
      primary: {
        youtubeId: primary.youtubeId,
        label: primary.title,
        type: primary.type,
      },
      source: 'kinocheck',
    });
  } catch (error) {
    console.error('[kinocheck] Trailer fetch error:', error.message);
    return res.status(500).json({ error: 'Kinocheck API unavailable', trailers: [] });
  }
}
