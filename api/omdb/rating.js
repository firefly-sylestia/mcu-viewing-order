// Returns null for 'not found', a data object on success, or a string error code.
async function omdbLookup(params) {
  const r = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
  if (!r.ok) return 'http_error';
  const data = await r.json();
  if (data.Response === 'False') {
    if (data.Error === 'Request limit reached!') return 'rate_limited';
    return null;
  }
  return data;
}

function extractRating(data) {
  const tomato = (data?.Ratings || []).find(r => r.Source === 'Rotten Tomatoes');
  const meta = (data?.Ratings || []).find(r => r.Source === 'Metacritic');
  return {
    rating: data?.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '',
    tomatoRating: tomato?.Value && tomato.Value !== 'N/A' ? tomato.Value : '',
    metaRating: meta?.Value && meta.Value !== 'N/A' ? meta.Value : '',
    released: data?.Released && data.Released !== 'N/A' ? data.Released : '',
    source: 'omdb',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.OMDB_API_KEY || '2c971c17';
  const title = (req.query.title || '').toString().trim();
  const year = (req.query.year || '').toString().trim();
  const imdbId = (req.query.imdbId || '').toString().trim();
  if (!title && !imdbId) return res.status(400).json({ error: 'Missing title or imdbId' });

  // Helper: try one lookup path, returns data on success or falsy on not-found/error
  const tryLookup = async (params) => {
    const result = await omdbLookup(params);
    if (result === 'rate_limited') return 'rate_limited';
    if (result && typeof result === 'object') return result;
    return null;
  };

  let result;

  // 1. IMDb ID lookup (most reliable)
  if (imdbId) {
    const params = new URLSearchParams({ apikey: key, i: imdbId });
    result = await tryLookup(params);
    if (result === 'rate_limited') return res.status(429).json({ error: 'Rate limited' });
    if (result) return res.status(200).json(extractRating(result));
  }

  // 2. Full title + year
  const fullParams = new URLSearchParams({ apikey: key, t: title });
  if (year) fullParams.set('y', year);
  result = await tryLookup(fullParams);
  if (result === 'rate_limited') return res.status(429).json({ error: 'Rate limited' });
  if (result) return res.status(200).json(extractRating(result));

  // 3. Fallback: first 2-3 words (for truncated titles like 'I Am Groot S1' → 'I Am Groot')
  const words = title.split(/\s+/);
  const shortened = words.length > 3 ? words.slice(0, 3).join(' ') : words.length > 2 ? words.slice(0, 2).join(' ') : null;
  if (shortened && shortened !== title) {
    const fallbackParams = new URLSearchParams({ apikey: key, t: shortened });
    if (year) fallbackParams.set('y', year);
    result = await tryLookup(fallbackParams);
    if (result === 'rate_limited') return res.status(429).json({ error: 'Rate limited' });
    if (result) return res.status(200).json(extractRating(result));
  }

  // 4. No ratings found — return empty
  return res.status(200).json({ rating: '', tomatoRating: '', metaRating: '', released: '', source: 'omdb' });
}
