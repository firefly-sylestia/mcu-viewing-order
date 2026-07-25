async function omdbLookup(params) {
  const r = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
  if (!r.ok) return null;
  const data = await r.json();
  if (data.Response === 'False') return null;
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

  // Prefer IMDb ID lookup when available — much more reliable than title+year search
  if (imdbId) {
    const params = new URLSearchParams({ apikey: key, i: imdbId });
    const data = await omdbLookup(params);
    if (data) return res.status(200).json(extractRating(data));
  }

  // Try full title + year
  const fullParams = new URLSearchParams({ apikey: key, t: title });
  if (year) fullParams.set('y', year);
  let data = await omdbLookup(fullParams);
  if (data) return res.status(200).json(extractRating(data));

  // Fallback: try first 2-3 words of the title in case OMDb has a truncated title
  const words = title.split(/\s+/);
  const shortened = words.length > 3 ? words.slice(0, 3).join(' ') : words.length > 2 ? words.slice(0, 2).join(' ') : null;
  if (shortened && shortened !== title) {
    const fallbackParams = new URLSearchParams({ apikey: key, t: shortened });
    if (year) fallbackParams.set('y', year);
    data = await omdbLookup(fallbackParams);
    if (data) return res.status(200).json(extractRating(data));
  }

  // No results found at all — return empty ratings
  return res.status(200).json({ rating: '', tomatoRating: '', metaRating: '', released: '', source: 'omdb' });
}
