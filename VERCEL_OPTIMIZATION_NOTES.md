# Vercel routing and performance implementation notes

This project is a Vite single-page application deployed on Vercel. The production setup focuses on fast first loads, reliable deep links, and browser-native navigation.

## Implemented

- **SPA deep links**: `/home`, `/search`, `/phase`, `/phase/:id`, `/settings`, `/analytics`, and `/movie/:slug` are rewritten to `index.html` on Vercel so refreshes and direct visits work.
- **Back-button exit behavior**: returning to `/home` now uses `history.replaceState`, so the home screen does not add another in-app history entry. Browser back from home can leave the app instead of bouncing through an extra `/home` entry.
- **Immutable asset caching**: hashed Vite assets and poster files receive long-lived cache headers.
- **Fresh app shell**: `index.html` is explicitly revalidated so users can pick up new deployments without stale HTML.
- **Security/consistency headers**: Vercel response headers include content-type sniffing protection, frame protection, referrer policy, and a conservative permissions policy.
- **Build chunking**: React, Capacitor, Vercel telemetry, icon, and vendor code are split into separate chunks to improve browser caching and reduce main-thread parse spikes.
- **Vercel Speed Insights**: the app keeps the existing `@vercel/speed-insights/react` integration for real-user Core Web Vitals.

## Follow-up opportunities

- Enable Vercel Web Analytics in the Vercel dashboard and add `@vercel/analytics/react` when package installation is available in the build environment.
- Audit image formats over time and prefer AVIF/WebP for new local posters when quality is acceptable.
- Use Vercel dashboard Speed Insights after production traffic to identify routes with elevated TTFB, CLS, or INP.
