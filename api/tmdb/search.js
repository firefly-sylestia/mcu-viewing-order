export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const token = process.env.TMDB_READ_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NWVkYTQ4Y2Y1ODAzZjIyMzA0ZmQyMWY0ZjA2YTM1ZSIsIm5iZiI6MTc3ODY4NTg2My42ODcsInN1YiI6IjZhMDQ5N2E3N2IyZDk3NzQ2MDM3N2E1OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.XTD8e-B7awrTVIJd5WtD3vZ5FnWjE8sWkSjgYIeauAA';

  const query = (req.query.q || '').toString().trim();
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query too short', results: [] });
  }

  try {
    const params = new URLSearchParams({
      query,
      include_adult: 'false',
      language: 'en-US',
      page: '1'
    });

    const response = await fetch(`https://api.themoviedb.org/3/search/multi?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TMDB request failed', results: [] });
    }

    const data = await response.json();
    
    // Filter results: only movies and TV shows with posters
    const results = (data.results || [])
      .filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
      .map(item => ({
        id: item.id,
        title: item.media_type === 'tv' ? item.name : item.title,
        type: item.media_type,
        poster: `https://image.tmdb.org/t/p/w342${item.poster_path}`,
        backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
        year: item.media_type === 'tv' 
          ? (item.first_air_date || '').slice(0, 4)
          : (item.release_date || '').slice(0, 4),
        rating: item.vote_average ? Number(item.vote_average).toFixed(1) : null,
        overview: item.overview || null,
      }))
      .slice(0, 10); // Limit to 10 results

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Internal server error', results: [] });
  }
}
