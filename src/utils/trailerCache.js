/**
 * Trailer Cache — client-side localStorage cache for Kinocheck trailer results.
 * 
 * Keyed by `${title}::${year}` with a 7-day expiry.
 * Once fetched, results are cached and reused until expired.
 */

const CACHE_PREFIX = 'trailer_cache_';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const cacheKey = (title, year) => {
  const slug = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${CACHE_PREFIX}${slug}::${year || 'any'}`;
};

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.timestamp) return null;
    if (Date.now() - entry.timestamp > EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
};

const writeCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch { /* quota exceeded — silently skip */ }
};

/**
 * Get cached trailer data for a title.
 * Returns null if not cached or expired.
 */
export const getTrailerCache = (title, year) => {
  return readCache(cacheKey(title, year));
};

/**
 * Store trailer data in cache.
 */
export const setTrailerCache = (title, year, data) => {
  writeCache(cacheKey(title, year), data);
};

/**
 * Fetch trailer from Kinocheck API proxy, with client-side caching.
 * Returns { youtubeId, label, type, options } or null if not found.
 */
export const fetchTrailerFromApi = async (title, year, tmdbId) => {
  // Check client cache first
  const cached = getTrailerCache(title, year);
  if (cached) return cached;

  try {
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (year) params.set('year', String(year));
    if (tmdbId) params.set('tmdbId', String(tmdbId));

    const res = await fetch(`/api/kinocheck/trailer?${params.toString()}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.trailers?.length && !data.primary) return null;

    const result = {
      youtubeId: data.primary?.youtubeId || data.trailers?.[0]?.youtubeId,
      label: data.primary?.label || 'Official Trailer',
      type: data.primary?.type || 'trailer',
      options: (data.trailers || []).map(t => ({
        youtubeId: t.youtubeId,
        label: t.title,
        type: t.type,
      })),
      source: 'kinocheck',
    };

    // Cache the result
    setTrailerCache(title, year, result);
    return result;
  } catch {
    return null;
  }
};
