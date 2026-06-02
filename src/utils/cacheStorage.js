const CHUNK_PREFIX = '__mcu_chunked__:';
const CHUNK_SIZE = 120_000;

const storageAvailable = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const readStorageValue = (key, fallback = null) => {
  if (!storageAvailable()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  if (!raw.startsWith(CHUNK_PREFIX)) return raw;

  const chunkCount = Number(raw.slice(CHUNK_PREFIX.length));
  if (!Number.isFinite(chunkCount) || chunkCount < 1) return fallback;
  let value = '';
  for (let index = 0; index < chunkCount; index += 1) {
    value += window.localStorage.getItem(`${key}::chunk::${index}`) || '';
  }
  return value || fallback;
};

export const readStorageJSON = (key, fallback = {}) => {
  try {
    const raw = readStorageValue(key, null);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const removeStorageValue = (key) => {
  if (!storageAvailable()) return;
  const raw = window.localStorage.getItem(key);
  if (raw?.startsWith(CHUNK_PREFIX)) {
    const chunkCount = Number(raw.slice(CHUNK_PREFIX.length));
    if (Number.isFinite(chunkCount)) {
      for (let index = 0; index < chunkCount; index += 1) {
        window.localStorage.removeItem(`${key}::chunk::${index}`);
      }
    }
  }
  window.localStorage.removeItem(key);
};

const clearExistingChunks = (key) => {
  if (!storageAvailable()) return;
  const raw = window.localStorage.getItem(key);
  if (!raw?.startsWith(CHUNK_PREFIX)) return;
  const chunkCount = Number(raw.slice(CHUNK_PREFIX.length));
  if (!Number.isFinite(chunkCount)) return;
  for (let index = 0; index < chunkCount; index += 1) {
    window.localStorage.removeItem(`${key}::chunk::${index}`);
  }
};

export const safeLocalStorageSetItem = (key, value) => {
  if (!storageAvailable()) return false;
  try {
    const normalized = String(value ?? '');
    clearExistingChunks(key);
    if (normalized.length > CHUNK_SIZE) {
      const chunks = [];
      for (let index = 0; index < normalized.length; index += CHUNK_SIZE) {
        chunks.push(normalized.slice(index, index + CHUNK_SIZE));
      }
      chunks.forEach((chunk, index) => window.localStorage.setItem(`${key}::chunk::${index}`, chunk));
      window.localStorage.setItem(key, `${CHUNK_PREFIX}${chunks.length}`);
      return true;
    }
    window.localStorage.setItem(key, normalized);
    return true;
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      console.warn(`Storage quota exceeded while writing ${key}.`, err);
      return false;
    }
    throw err;
  }
};

export const scheduleStorageWrite = (() => {
  const queue = new Map();
  let scheduled = false;
  const runWhenIdle = (cb, timeout = 400) => {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      return window.requestIdleCallback(cb, { timeout });
    }
    return setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: true }), 32);
  };
  const flush = () => {
    scheduled = false;
    for (const [key, value] of queue) safeLocalStorageSetItem(key, value);
    queue.clear();
  };
  return (key, value) => {
    queue.set(key, value);
    if (scheduled) return;
    scheduled = true;
    runWhenIdle(flush, 1200);
  };
})();

export const pruneObject = (source = {}, isKeepable = Boolean) => Object.entries(source || {}).reduce((acc, [key, value]) => {
  if (isKeepable(value, key)) acc[key] = value;
  return acc;
}, {});
