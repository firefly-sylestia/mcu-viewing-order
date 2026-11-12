const SHELL_CACHE = 'incursion-shell-v3';
const IMAGE_CACHE = 'incursion-images-v1';
self.addEventListener('install', event => {
  event.waitUntil((async () => { const cache = await caches.open(SHELL_CACHE); await cache.addAll(['/', '/manifest.webmanifest', '/mcu-icon.jpg']); await self.skipWaiting(); })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => { const keys = await caches.keys(); await Promise.all(keys.filter(key => key.startsWith('incursion-') && ![SHELL_CACHE, IMAGE_CACHE].includes(key)).map(key => caches.delete(key))); await self.clients.claim(); })());
});
async function trimImageCache(cache, maxEntries = 180) { const keys = await cache.keys(); if (keys.length > maxEntries) await Promise.all(keys.slice(0, keys.length - maxEntries).map(key => cache.delete(key))); }
self.addEventListener('fetch', event => {
  const request = event.request; if (request.method !== 'GET') return;
  const url = new URL(request.url); const sameOrigin = url.origin === self.location.origin;
  if (request.mode === 'navigate' && sameOrigin) { event.respondWith((async () => { const cache = await caches.open(SHELL_CACHE); try { const response = await fetch(request); if (response.ok) await cache.put('/', response.clone()); return response; } catch { return (await cache.match('/')) || Response.error(); } })()); return; }
  const staticAsset = sameOrigin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/logos/') || /\\.(svg|png|webp|avif|woff2?|ttf|css|js)$/.test(url.pathname));
  const imageRequest = request.destination === 'image';
  if (staticAsset || imageRequest) event.respondWith((async () => { const cache = await caches.open(imageRequest ? IMAGE_CACHE : SHELL_CACHE); const cached = await cache.match(request); if (cached) return cached; try { const response = await fetch(request); if (response && (response.ok || response.type === 'opaque')) { await cache.put(request, response.clone()); if (imageRequest) await trimImageCache(cache); } return response; } catch { return cached || Response.error(); } })());
});
