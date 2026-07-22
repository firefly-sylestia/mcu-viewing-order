import { readStorageJSON, safeLocalStorageSetItem, removeStorageValue } from './cacheStorage';

const CACHE_PREFIX = 'media_cache_';
const EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Generate cache key for media item
 */
export const cacheKey = (id) => {
  if (!id) return null;
  return `${CACHE_PREFIX}${id}`;
};

/**
 * Check if cache entry is still valid
 */
const isCacheValid = (cached) => {
  if (!cached || !cached.timestamp) return false;
  const age = Date.now() - cached.timestamp;
  return age < EXPIRY_MS;
};

/**
 * Get media data from cache
 */
export const getFromCache = (id) => {
  const key = cacheKey(id);
  if (!key) return null;
  
  const cached = readStorageJSON(key, null);
  if (!cached) return null;
  
  if (!isCacheValid(cached)) {
    removeStorageValue(key);
    return null;
  }
  
  return cached.data || null;
};

/**
 * Store media data in cache with timestamp
 */
export const setCache = (id, data) => {
  const key = cacheKey(id);
  if (!key || !data) return false;
  
  try {
    const cacheEntry = {
      timestamp: Date.now(),
      data,
    };
    return safeLocalStorageSetItem(key, JSON.stringify(cacheEntry));
  } catch (err) {
    console.error('[v0] Error setting media cache:', err);
    return false;
  }
};

/**
 * Batch fetch missing media metadata
 * Returns array of items that need fetching + array of fetched results
 */
export const batchFetchMissingMetadata = async (items, getMetadata) => {
  if (!items || items.length === 0) return { missing: [], fetched: [] };
  
  // Check which items need metadata
  const missing = items.filter(item => {
    const cached = getFromCache(item.id);
    return !cached && !item.poster;
  });
  
  if (missing.length === 0) return { missing: [], fetched: [] };
  
  // Batch into groups of 3-5 items
  const batchSize = 4;
  const fetched = [];
  
  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    
    try {
      const results = await Promise.allSettled(
        batch.map(item =>
          getMetadata(item).then(data => ({
            itemId: item.id,
            success: true,
            data,
          }))
        )
      );
      
      // Store successful results in cache
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.success) {
          setCache(result.value.itemId, result.value.data);
          fetched.push({
            id: result.value.itemId,
            metadata: result.value.data,
          });
        }
      });
    } catch (err) {
      console.error('[v0] Error in batch fetch:', err);
    }
    
    // Add small delay between batches to avoid rate limiting
    if (i + batchSize < missing.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return { missing, fetched };
};

/**
 * Enrich item with cached metadata if available
 */
export const enrichItemWithCache = (item) => {
  const cached = getFromCache(item.id);
  if (!cached) return item;
  
  return {
    ...item,
    poster: cached.poster || item.poster,
    backdrop: cached.backdrop || item.backdrop,
    description: cached.overview || item.description,
    rating: cached.rating || item.rating,
    year: cached.releaseDate ? cached.releaseDate.slice(0, 4) : item.year,
  };
};

/**
 * Clear all expired cache entries
 */
export const clearExpiredCache = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  const keys = Object.keys(window.localStorage);
  let cleared = 0;
  
  keys.forEach(key => {
    if (!key.startsWith(CACHE_PREFIX)) return;
    
    const cached = readStorageJSON(key, null);
    if (!isCacheValid(cached)) {
      removeStorageValue(key);
      cleared++;
    }
  });
  
  if (cleared > 0) {
    console.log(`[v0] Cleared ${cleared} expired cache entries`);
  }
};
