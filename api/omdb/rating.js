export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.OMDB_API_KEY || '2c971c17';
  const title = (req.query.title || '').toString().trim();
  const year = (req.query.year || '').toString().trim();
  if (!title) return res.status(400).json({ error: 'Missing title' });

  const params = new URLSearchParams({ apikey: key, t: title });
  if (year) params.set('y', year);

  const r = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
  if (!r.ok) return res.status(r.status).json({ error: 'OMDB request failed' });
  const data = await r.json();

  return res.status(200).json({
    rating: data?.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '',
    released: data?.Released && data.Released !== 'N/A' ? data.Released : '',
    source: 'omdb',
  });
}
