/**
 * Trailer Cache — client-side localStorage cache for Kinocheck trailer results.
 * 
 * Keyed by `${title}::${year}` with a 7-day expiry.
 * Once fetched, results are cached and reused until expired.
 * 
 * Fetch strategy:
 * 1. Check client cache (7-day expiry)
 * 2. Try serverless API proxy (/api/kinocheck/trailer)
 * 3. If proxy fails (dev mode), call Kinocheck directly from client
 * 4. Cache any successful result
 */

const CACHE_PREFIX = 'trailer_cache_';
const EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year (trailer YouTube IDs are stable) // 7 days
const KINOCHECK_BASE = 'https://api.kinocheck.com';

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
 * Normalize Kinocheck API response (any format) into our standard shape.
 * 
 * Kinocheck /trailers returns: {"0": {...}, "1": {...}, _metadata: {...}}
 * Kinocheck /movies returns: {trailers: [{...}]}
 * Our serverless function returns: {trailers: [...], primary: {...}, source: 'kinocheck'}
 */
const normalizeKinocheckResponse = (data) => {
  if (!data) return null;

  // Already our serverless format? Return as-is
  if (data.primary?.youtubeId && Array.isArray(data.trailers)) {
    return data;
  }

  // Raw Kinocheck /trailers response: numeric-keyed object {"0": {...}, "1": {...}}
  // Filter out _metadata and extract video entries
  const trailerEntries = Object.entries(data)
    .filter(([key, val]) => /^\d+$/.test(key) && val && typeof val === 'object' && val.youtube_video_id)
    .map(([, val]) => val);

  if (trailerEntries.length > 0) {
    return {
      trailers: trailerEntries.map(t => ({
        youtubeId: t.youtube_video_id,
        title: t.title || 'Official Trailer',
        type: t.type || 'trailer',
      })),
      primary: {
        youtubeId: trailerEntries[0].youtube_video_id,
        label: trailerEntries[0].title || 'Official Trailer',
        type: trailerEntries[0].type || 'trailer',
      },
    };
  }

  // Raw Kinocheck /movies or /shows response: { trailers: [...] }
  if (Array.isArray(data.trailers) && data.trailers.length) {
    const videos = data.trailers.filter(t => t.youtube_video_id);
    if (videos.length) {
      return {
        trailers: videos.map(t => ({
          youtubeId: t.youtube_video_id,
          title: t.title || 'Official Trailer',
          type: t.type || 'trailer',
        })),
        primary: {
          youtubeId: videos[0].youtube_video_id,
          label: videos[0].title || 'Official Trailer',
          type: videos[0].type || 'trailer',
        },
      };
    }
  }

  return null;
};

/**
 * Call Kinocheck API directly from the client (dev mode fallback).
 * Free tier: 1000 req/day without API key.
 */
const fetchKinocheckDirect = async (title, year, tmdbId) => {
  const headers = { accept: 'application/json' };

  // Strategy 1: Search by TMDB ID via /movies endpoint
  if (tmdbId) {
    try {
      const res = await fetch(`${KINOCHECK_BASE}/movies?tmdb_id=${tmdbId}&language=en`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.trailers?.length) return normalizeKinocheckResponse(data);
      }
    } catch {}

    // Try /shows endpoint
    try {
      const res = await fetch(`${KINOCHECK_BASE}/shows?tmdb_id=${tmdbId}&language=en`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.trailers?.length) return normalizeKinocheckResponse(data);
      }
    } catch {}
  }

  // Strategy 2: Search by title
  if (title) {
    try {
      const res = await fetch(
        `${KINOCHECK_BASE}/trailers?search=${encodeURIComponent(title)}&language=en&limit=5`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        // normalizeKinocheckResponse handles numeric-keyed, /movies, and serverless formats
        const normalized = normalizeKinocheckResponse(data);
        if (normalized) return normalized;
      }
    } catch {}
  }

  return null;
};

/**
 * Fetch trailer from Kinocheck, with client-side caching.
 * Tries serverless proxy first, falls back to direct Kinocheck API from client.
 * Returns { youtubeId, label, type, options, source } or null if not found.
 */
export const fetchTrailerFromApi = async (title, year, tmdbId) => {
  // Check client cache first
  const cached = getTrailerCache(title, year);
  if (cached) return cached;

  let result = null;

  // Try serverless proxy (works in production on Vercel)
  try {
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (year) params.set('year', String(year));
    if (tmdbId) params.set('tmdbId', String(tmdbId));

    const res = await fetch(`/api/kinocheck/trailer?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      // Try to normalize the response — handles both serverless and proxy formats
      const normalized = normalizeKinocheckResponse(data);
      if (normalized?.primary) {
        result = {
          youtubeId: normalized.primary.youtubeId,
          label: normalized.primary.label || 'Official Trailer',
          type: normalized.primary.type || 'trailer',
          options: (normalized.trailers || []).map(t => ({
            youtubeId: t.youtubeId,
            label: t.title || t.label,
            type: t.type || 'trailer',
          })),
          source: 'kinocheck',
        };
      }
    }
  } catch { /* will fall back to direct call */ }

  // If proxy failed (dev mode without Vercel), try Kinocheck directly from client
  if (!result) {
    try {
      const direct = await fetchKinocheckDirect(title, year, tmdbId);
      if (direct?.primary) {
        result = {
          youtubeId: direct.primary.youtubeId,
          label: direct.primary.label || 'Official Trailer',
          type: direct.primary.type || 'trailer',
          options: (direct.trailers || []).map(t => ({
            youtubeId: t.youtubeId,
            label: t.title || t.label,
            type: t.type || 'trailer',
          })),
          source: 'kinocheck-direct',
        };
      }
    } catch { /* will fall through to TRAILER_DATA fallback */ }
  }

  // Cache the result
  if (result) {
    setTrailerCache(title, year, result);
  }

  return result;
};
