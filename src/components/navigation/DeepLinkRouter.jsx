import { useEffect, useRef } from 'react';

export const ROUTE_FALLBACK = '/home';
export const SEARCH_ROUTE = '/search';
export const COLLECTION_ROUTE = '/collection';
export const SERIES_ROUTE = '/series';
export const UNIVERSE_ROUTES = new Set(['marvel', 'mcu', 'dc']);

export const slugifyRouteValue = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const compactRouteSlug = (value) => slugifyRouteValue(value).replace(/-/g, '');

export const normalizeUniverseRoute = (value = '') => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'dc') return 'dc';
  if (normalized === 'marvel' || normalized === 'mcu') return 'mcu';
  return null;
};

export const universeRoutePath = (universe = 'mcu') => (universe === 'dc' ? '/dc' : '/marvel');

export const titleRoutePath = (item, universe = 'mcu') => {
  const base = universeRoutePath(universe);
  const type = item?.type === 'series' ? 'series' : 'movie';
  return `${base}/${type}/${slugifyRouteValue(item?.title) || item?.id || ''}`;
};

export const searchRoutePath = (query = '', type = '', universe = 'mcu') => {
  const params = new URLSearchParams();
  const trimmedQuery = String(query || '').trim();
  if (trimmedQuery) params.set('q', trimmedQuery);
  if (type) params.set('type', type);
  const qs = params.toString();
  return `${universeRoutePath(universe)}${SEARCH_ROUTE}${qs ? `?${qs}` : ''}`;
};

export const phaseRoutePath = (phaseId = 0, universe = 'mcu') => `${universeRoutePath(universe)}/phase${phaseId ? `/${phaseId}` : ''}`;
export const collectionRoutePath = (collectionId = '', universe = 'mcu') => `${universeRoutePath(universe)}${COLLECTION_ROUTE}/${slugifyRouteValue(collectionId)}`;

export const routeItemMatchesSlug = (item, rawSlug) => {
  const slug = slugifyRouteValue(decodeURIComponent(String(rawSlug || '')));
  if (!item || !slug) return false;
  const titleSlug = slugifyRouteValue(item.title);
  const compactSlugValue = compactRouteSlug(slug);
  const compactTitle = compactRouteSlug(item.title);
  return String(item.id) === slug
    || titleSlug === slug
    || compactTitle === compactSlugValue
    || titleSlug.includes(slug)
    || compactTitle.includes(compactSlugValue);
};

export const parseDeepLinkRoute = (path = '/', queryString = '') => {
  const cleanPath = `/${String(path || '').split('?')[0].split('#')[0].replace(/^\/+/, '')}`.replace(/\/+$/, '') || ROUTE_FALLBACK;
  const params = new URLSearchParams(String(queryString || '').replace(/^\?/, ''));
  const rawParts = cleanPath.split('/').filter(Boolean);
  const first = rawParts[0] || 'home';
  const universe = normalizeUniverseRoute(first);
  const parts = universe ? rawParts.slice(1) : rawParts;
  const primary = parts[0] || (universe ? 'home' : first);

  return {
    cleanPath,
    params,
    rawParts,
    parts,
    primary,
    universe,
    query: params.get('q') || '',
    type: params.get('type') || null,
  };
};

export function DeepLinkRouteSync({ applyRoute }) {
  const latestApplyRouteRef = useRef(applyRoute);

  useEffect(() => {
    latestApplyRouteRef.current = applyRoute;
  }, [applyRoute]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    latestApplyRouteRef.current?.(window.location.pathname, window.location.search);
    const onPopState = () => latestApplyRouteRef.current?.(window.location.pathname, window.location.search);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return null;
}
