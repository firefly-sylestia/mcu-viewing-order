/**
 * Runtime URL resolution for the web app and the Android/iOS bundle.
 *
 * The Capacitor build serves the compiled app from `https://localhost` (or
 * `file://` on some platforms), so relative requests like `/api/tmdb/search`
 * point at the WebView's own origin and 404 — that is why posters, ratings and
 * trailer lookups never resolved inside the APK. Every serverless call now goes
 * through `apiUrl()`, which targets the deployed backend when the app is running
 * natively and keeps relative paths on the web (Vercel rewrites / local proxy).
 */

const FALLBACK_API_ORIGIN = 'https://mcu-viewing-order.vercel.app';

const envOrigin = (import.meta?.env?.VITE_API_BASE || '').trim().replace(/\/+$/, '');

const detectNativeShell = () => {
  if (typeof window === 'undefined') return false;
  const capacitor = window.Capacitor;
  if (capacitor && typeof capacitor.isNativePlatform === 'function') {
    try {
      return capacitor.isNativePlatform();
    } catch {
      /* fall through to protocol sniffing */
    }
  }
  const { protocol, hostname } = window.location;
  if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:') return true;
  // Capacitor's Android server default: https://localhost
  return protocol === 'https:' && (hostname === 'localhost' || hostname === '127.0.0.1');
};

export const IS_NATIVE_APP = detectNativeShell();

/** Absolute origin used for API calls, or '' for same-origin web requests. */
export const API_ORIGIN = IS_NATIVE_APP ? envOrigin || FALLBACK_API_ORIGIN : envOrigin;

/**
 * Resolve a serverless endpoint (`/api/...`) for the current runtime.
 * Already-absolute URLs are returned untouched.
 */
export const apiUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${suffix}`;
};

/**
 * Resolve a bundled asset (`/posters/posters.json`, `posters/x.jpg`, ...) against
 * the document base so it keeps working under `file://` and nested hash routes.
 */
export const assetUrl = (path) => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (typeof document === 'undefined') return path.replace(/^\//, '');
  try {
    return new URL(path.replace(/^\//, ''), document.baseURI).href;
  } catch {
    return path;
  }
};

/** TMDB image URLs can be requested at a smaller width to load faster on mobile. */
export const posterUrl = (url, width) => {
  if (!url || !width) return url || '';
  if (!/image\.tmdb\.org\/t\/p\//i.test(url)) return url;
  return url.replace(/\/t\/p\/[^/]+\//, `/t/p/w${width}/`);
};

/** A failed network call (offline APK) should not look like "no poster exists". */
export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
