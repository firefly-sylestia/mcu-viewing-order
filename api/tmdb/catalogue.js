const image = path => path ? `https://image.tmdb.org/t/p/w500${path}` : null;
const COMPANY_FILTERS = {
  marvel: { with_companies: '420|38679', label: 'Marvel' },
  dc: { with_companies: '128064|9993', label: 'DC' },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed', results: [] });
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: 'TMDB is not configured', results: [] });
  const category = String(req.query.category || 'trending').toLowerCase();
  const page = Math.min(20, Math.max(1, Number(req.query.page) || 1));
  const headers = { Authorization: `Bearer ${token}`, accept: 'application/json' };
  const base = 'https://api.themoviedb.org/3';
  const common = { language: 'en-US', page: String(page), include_adult: 'false' };
  const requests = [];

  if (category === 'trending') {
    requests.push(['mixed', `${base}/trending/all/week`]);
  } else if (category === 'movies' || category === 'tv') {
    requests.push([category === 'tv' ? 'tv' : 'movie', `${base}/${category === 'tv' ? 'tv' : 'movie'}/popular`]);
  } else if (category === 'marvel' || category === 'dc') {
    const company = COMPANY_FILTERS[category];
    requests.push(['movie', `${base}/discover/movie`, { ...common, with_companies: company.with_companies, sort_by: 'popularity.desc' }]);
    requests.push(['tv', `${base}/discover/tv`, { ...common, with_companies: company.with_companies, sort_by: 'popularity.desc' }]);
  } else return res.status(400).json({ error: 'Unknown catalogue category', results: [] });

  try {
    const batches = await Promise.all(requests.map(async ([type, endpoint, extra = common]) => {
      const params = new URLSearchParams(extra);
      const response = await fetch(`${endpoint}?${params}`, { headers });
      if (!response.ok) throw new Error(`TMDB ${type} catalogue request failed`);
      const data = await response.json();
      return (data.results || []).filter(item => ['movie','tv'].includes(type === 'mixed' ? item.media_type : type)).map(item => {
        const mediaType = type === 'mixed' ? item.media_type : type;
        return {
        id: item.id,
        type: mediaType,
        title: mediaType === 'tv' ? item.name : item.title,
        year: String(mediaType === 'tv' ? item.first_air_date || '' : item.release_date || '').slice(0, 4),
        poster: image(item.poster_path),
        backdrop: image(item.backdrop_path),
        rating: item.vote_average ? Number(item.vote_average).toFixed(1) : null,
        overview: item.overview || '',
        voteCount: item.vote_count || 0,
        popularity: item.popularity || 0,
      }; });
    }));
    const results = batches.flat().filter(item => item.poster).sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=43200');
    return res.status(200).json({ results, category, page });
  } catch (error) {
    console.error('[tmdb] catalogue error:', error);
    return res.status(502).json({ error: 'Could not load the catalogue', results: [] });
  }
}
