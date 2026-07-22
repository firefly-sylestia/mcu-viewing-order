import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, Home, Bookmark, Play, UserRound, X, ArrowLeft, Star, BarChart3, Check, Clock, ListFilter, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Calendar, Timer, Sparkles, LogIn, LogOut, Cloud, Download, Camera } from 'lucide-react';
import { RAW } from './data/mcuData';
import { DC_RAW } from './data/dcData';
import { XMEN_RAW } from './data/xmenData';
import { getTrailerByTitle, trailerEmbedUrl } from './data/trailerData';
import { STORY_BRIDGES } from './data/connections';
import { fetchTrailerFromApi } from './utils/trailerCache';
import ProfilePage from './components/ProfilePage';
import AuthModal from './components/AuthModal';
import { useAuth } from './hooks/useAuth';
import { useCloudSync } from './hooks/useCloudSync';
import { configured as firebaseReady } from './firebase';
import { getFromCache, setCache, clearExpiredCache } from './utils/mediaCache';
import { buildDownloadUrl, buildPlayerUrl } from './utils/mediaProviders';
import './index.css';

const STORAGE_KEY = 'cinematic-viewing-ui-state-v2';
const VALID_HASHES = ['home', 'list', 'analytics', 'watch', 'profile', 'detail'];
const parseHash = () => {
  const raw = window.location.hash.replace('#', '');
  const slash = raw.indexOf('/');
  const section = slash > -1 ? raw.slice(0, slash) : raw;
  // Handle search query: #list?q=thor
  const qMark = section.indexOf('?');
  const cleanSection = qMark > -1 ? section.slice(0, qMark) : section;
  const searchQuery = qMark > -1 ? new URLSearchParams(section.slice(qMark)).get('q') || '' : '';
  const rawSlug = slash > -1 ? raw.slice(slash + 1) : null;
  const slug = rawSlug ? rawSlug.split('?')[0] : null;
  return { section: VALID_HASHES.includes(cleanSection) ? cleanSection : null, slug, searchQuery };
};

const STATUS = ['unwatched', 'watching', 'watched', 'dropped'];
const STATUS_LABELS = { unwatched: 'Unwatched', watching: 'Watching', watched: 'Watched', dropped: 'Dropped' };
const marvelPalette = ['#641220', '#85182a', '#a11d33', '#b21e35', '#bd1f36', '#da1e37'];
const dcPalette = ['#061226', '#08204a', '#0b3a78', '#0d4f9c', '#1367c8', '#2f80ed'];
const xmenPalette = ['#6a6a7a', '#828294', '#9a9aa8', '#b0b0ba', '#c4c4cc', '#d8d8de'];

const runtimeLabel = (minutes = 0, type = 'film') => {
  if (!minutes) return type === 'series' ? 'Series' : 'TBA';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
};

const watchTimeLabel = (item) => {
  const ms = item.watchedDuration || 0;
  if (ms < 30000) return 'Just started';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m watched`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m ? `${m}m` : ''} watched`;
};

const elapsedPctLabel = (item) => {
  const ms = item.watchedDuration || 0;
  if (ms < 30000) return 'Started';
  const mins = Math.floor(ms / 60000);
  const total = item.runtime || 120;
  const pct = Math.min(Math.round((mins / total) * 100), 99);
  return `${pct}%`;
};

const slugifyPosterName = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const lightenHex = (hex, ratio) => {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const mix = (v) => Math.round(v * ratio + 255 * (1 - ratio));
  return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

const metadataCacheKey = (item) => item?.tmdbId ? `${item.tmdbId}:${item.season || 0}` : null;

const mediaKey = (item) => item?.external
  ? `tmdb:${item.mediaType || (item.type === 'series' ? 'tv' : 'movie')}:${item.tmdbId}`
  : String(item?.id);

const isShieldRoadmapPart = (item) => item?.tmdbId === 1403 && item?.type === 'series';
const isCatalogVisible = (item) => !isShieldRoadmapPart(item) || item.id === 106;

const posterFromManifest = (item, manifest) => {
  const value = manifest?.byId?.[String(item.id)] || manifest?.byTitle?.[item.title];
  if (!value) return '';
  return value.startsWith('http') ? value : `/posters/${value}`;
};

const getRoadmap = (item, items) => {
  if (!item || !items?.length) return null;
  const siblings = items
    .filter(candidate => item.seriesGroup
      ? candidate.seriesGroup === item.seriesGroup
      : item.tmdbId && item.type === 'series' && candidate.tmdbId === item.tmdbId && candidate.type === 'series')
    .sort((a, b) => a.order - b.order);
  if (siblings.length < 2) return null;
  const segments = [];
  const sequence = [];
  siblings.forEach((part, index) => {
    segments.push({ type: 'part', item: part, isActive: part.id === item.id });
    sequence.push(part);
    const next = siblings[index + 1];
    if (!next) return;
    const bridgeDef = STORY_BRIDGES.find(
      b => b.sourceId === part.id && b.targetId === next.id
    );
    const validBridgeIds = new Set(bridgeDef?.bridges?.map(b => b.id) || []);
    const interstitials = items
      .filter(candidate => validBridgeIds.has(candidate.id))
      .filter(candidate => {
        // Don't show bridge items that are already in the natural timeline between
        // source and target — the user already watches them in chronological order.
        return !(candidate.order > part.order && candidate.order < next.order);
      })
      .map(candidate => ({
        ...candidate,
        connectionNote: bridgeDef.bridges.find(b => b.id === candidate.id)?.note || null
      }))
      .sort((a, b) => a.order - b.order);
    if (interstitials.length) {
      segments.push({ type: 'interstitials', items: interstitials });
      sequence.push(...interstitials);
    }
  });
  const currentIndex = sequence.findIndex(candidate => candidate.id === item.id);
  return {
    segments,
    siblings,
    complete: siblings.filter(part => part.userStatus === 'watched').length,
    nextInSequence: sequence.slice(Math.max(currentIndex + 1, 0)).filter(candidate => candidate.userStatus !== 'watched' && candidate.userStatus !== 'dropped'),
  };
};

const readSavedState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const enhance = (item, universe) => ({
  ...item,
  universe,
  runtime: item.runtime || (item.type === 'series' ? (item.episodes || 6) * 42 : 125 + (item.id % 42)),
  rating: item.rating || null,
  genres: item.type === 'series' ? ['Series', 'Action', 'Drama'] : ['Action', item.phase >= 4 ? 'Adventure' : 'Sci-fi', item.essential ? 'Essential' : 'Canon'],
  poster: item.poster || '',
  accent: universe === 'dc' ? dcPalette[(item.phase - 1) % dcPalette.length] : universe === 'xmen' ? xmenPalette[(item.phase - 1) % xmenPalette.length] : marvelPalette[(item.phase - 1) % marvelPalette.length],
});

export default function App() {
  const saved = useMemo(readSavedState, []);
  const [universe, setUniverse] = useState(saved.universe || 'marvel');
  const [query, setQuery] = useState(saved.query || '');
  const [externalSearchResults, setExternalSearchResults] = useState([]);
  const [externalSearchLoading, setExternalSearchLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [genre, setGenre] = useState(saved.genre || 'All');
  const [rating, setRating] = useState(saved.rating || 0);
  const [ageRatingFilter, setAgeRatingFilter] = useState(saved.ageRatingFilter || 'All');
  const [sortBy, setSortBy] = useState(saved.sortBy || 'order');
  const [sortDirection, setSortDirection] = useState(saved.sortDirection || 'desc');
  const [typeFilter, setTypeFilter] = useState(saved.typeFilter || 'All');
  const [heroIndex, setHeroIndex] = useState(saved.heroIndex || 0);
  const [section, setSection] = useState(parseHash().section || saved.section || 'home');
  const [actions, setActions] = useState(saved.actions || {});
  const [posterMap, setPosterMap] = useState({});
  const [trailer, setTrailer] = useState(null);
  const [watchItem, setWatchItem] = useState(saved.watchItem || null);
  const [profileName, setProfileName] = useState(saved.profileName || '');
  const [authOpen, setAuthOpen] = useState(false);
  const { user, login, signup, googleSignIn, anonymousSignIn, logout: authLogout, resetPassword, configured } = useAuth();
  const { pushToCloud, pushBeforeLogout, lastSynced, syncing, conflict, resolveUseRemote, resolveKeepLocal, toast } = useCloudSync(user, actions, profileName, setActions, setProfileName, watchItem, setWatchItem);

  // Guard against stale watchItem from a different universe on reload
  const safeWatchItem = watchItem && watchItem.item?.universe === universe ? watchItem : null;

  // Auto-start watching from item-level deep link (e.g. #watch/iron-man) on mount
  useEffect(() => {
    const { section: s, slug, searchQuery: sq } = parseHash();
    if (sq) setQuery(sq);
    if (s === 'watch' && slug && allItems.length && !watchItem) {
      const found = allItems.find(i => slugifyPosterName(i.title) === slug);
      if (found) handleStartWatch(found, found.tmdbId || null, found.type === 'series' ? 'tv' : 'movie');
    }
    if (s === 'detail' && slug && allItems.length) {
      const found = allItems.find(i => slugifyPosterName(i.title) === slug);
      if (found) setSelected(found);
    }
  }, []);

  const allItems = useMemo(() => [...RAW.map(item => enhance(item, 'marvel')), ...DC_RAW.map(item => enhance(item, 'dc')), ...XMEN_RAW.map(item => enhance(item, 'xmen'))], []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ universe, query, genre, rating, ageRatingFilter, sortBy, sortDirection, typeFilter, actions, section, watchItem, profileName, heroIndex }));
  }, [universe, query, genre, rating, ageRatingFilter, sortBy, sortDirection, typeFilter, actions, section, watchItem, profileName, heroIndex]);

  const initialRender = useRef(true);
  useEffect(() => {
    const hashed = parseHash().section;
    if (hashed !== section) {
      const target = section === 'watch' && safeWatchItem
        ? `#watch/${slugifyPosterName(safeWatchItem.item.title)}`
        : `#${section}`;
      if (initialRender.current) {
        window.history.replaceState(null, '', target);
        initialRender.current = false;
      } else {
        window.history.pushState(null, '', target);
      }
    }
  }, [section, safeWatchItem]);

  // Sync search query into URL silently (no history entry per keystroke)
  useEffect(() => {
    if (section === 'list' && !initialRender.current) {
      const q = query ? `?q=${encodeURIComponent(query)}` : '';
      const currentHash = window.location.hash.replace(/\?.*/, '');
      window.history.replaceState(null, '', `${currentHash}${q}`);
    }
  }, [query, section]);

  useEffect(() => {
    const onHashChange = () => {
      const { section: s, slug, searchQuery: sq } = parseHash();
      if (s) setSection(s);
      if (sq) setQuery(sq);
      if (s === 'watch' && slug && allItems.length) {
        const found = allItems.find(i => slugifyPosterName(i.title) === slug);
        if (found) handleStartWatch(found, found.tmdbId || null, found.type === 'series' ? 'tv' : 'movie');
      }
      if (s === 'detail' && slug && allItems.length) {
        const found = allItems.find(i => slugifyPosterName(i.title) === slug);
        if (found) setSelected(found);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    fetch('/posters/posters.json', { cache: 'force-cache' })
      .then(response => response.ok ? response.json() : {})
      .then(data => setPosterMap(data || {}))
      .catch(() => setPosterMap({}));
  }, []);

  // Shared enrichment: adds user state from actions to any item
  const enrichItem = useCallback((item) => {
    // Check cache first, then posterMap, then local poster
    let poster = item.poster;
    let rating = item.rating;
    
    // Always check cache for rating + poster metadata
    let imdbRating = null;
    let tomatoRating = null;
    let metaRating = null;
    let voteCount = null;
    if (item.tmdbId) {
      const cached = getFromCache(metadataCacheKey(item));
      if (cached) {
        if (!poster && cached.poster) poster = cached.poster;
        if (cached.rating) rating = cached.rating;
        if (cached.imdbRating) imdbRating = cached.imdbRating;
        if (cached.tomatoRating) tomatoRating = cached.tomatoRating;
        if (cached.metaRating) metaRating = cached.metaRating;
        if (cached.voteCount) voteCount = cached.voteCount;
      }
    }
    
    if (!poster) poster = posterFromManifest(item, posterMap);

    const key = mediaKey(item);
    const action = actions[key] || actions[item.id] || {};
    const mapRating = posterMap?.ratings?.[String(item.id)];
    if (mapRating) rating = mapRating;

    return {
      ...item,
      poster,
      userStatus: action.status || 'unwatched',
      bookmarked: Boolean(action.bookmarked),
      watchStartedAt: action.watchStartedAt || null,
      watchedDuration: action.watchedDuration || 0,
      watchedEpisodes: action.watchedEpisodes || [],
      rating,
      imdbRating,
      tomatoRating,
      metaRating,
      voteCount,
    };
  }, [actions, posterMap]);

  const activeItems = useMemo(() => {
    const sorted = allItems
      .filter(item => item.universe === universe)
      .filter(isCatalogVisible)
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
      .filter(item => genre === 'All' || item.genres.includes(genre) || item.type === genre.toLowerCase())
      .filter(item => Number(item.rating) >= rating)
      .filter(item => ageRatingFilter === 'All' || (item.ageRating || (item.type === 'series' ? 'TV-14' : 'PG-13')) === ageRatingFilter)
      .filter(item => typeFilter === 'All' || (typeFilter === 'Movies' ? item.type === 'film' : item.type === 'series'))
      .map(enrichItem);
    sorted.sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'year') return (a.year - b.year) * (sortDirection === 'asc' ? 1 : -1);
      if (sortBy === 'title') return a.title.localeCompare(b.title) * (sortDirection === 'asc' ? 1 : -1);
      if (sortBy === 'rating') return ((Number(b.rating) || 0) - (Number(a.rating) || 0)) * dir;
      if (sortBy === 'imdb') return ((Number(b.imdbRating) || 0) - (Number(a.imdbRating) || 0)) * dir;
      if (sortBy === 'tomato') return ((parseInt(b.tomatoRating) || 0) - (parseInt(a.tomatoRating) || 0)) * dir;
      if (sortBy === 'meta') return ((parseInt(b.metaRating) || 0) - (parseInt(a.metaRating) || 0)) * dir;
      if (sortBy === 'popularity') return ((Number(b.voteCount) || 0) - (Number(a.voteCount) || 0)) * dir;
      return (a.order - b.order) * (sortDirection === 'asc' ? 1 : -1);
    });
    return sorted;
  }, [allItems, universe, query, genre, rating, ageRatingFilter, sortBy, enrichItem]);

  // Unfiltered items (no search/filter) for WatchPage/WatchBrowse suggestions
  const roadmapItems = useMemo(() => {
    const sorted = allItems.filter(item => item.universe === universe).map(enrichItem);
    sorted.sort((a, b) => a.order - b.order);
    return sorted;
  }, [allItems, universe, enrichItem]);

  const unfilteredItems = useMemo(
    () => roadmapItems.filter(isCatalogVisible),
    [roadmapItems],
  );

  const failedRef = useRef(new Set());

  // Keep a ref of all known titles/TMDB IDs for deduplication
  const knownItemsRef = useRef({ titles: new Set(), tmdbIds: new Set() });
  useEffect(() => {
    const titles = new Set(allItems.map(i => i.title.toLowerCase()));
    const tmdbIds = new Set(allItems.filter(i => i.tmdbId).map(i => i.tmdbId));
    knownItemsRef.current = { titles, tmdbIds };
  }, [allItems]);

  // Fetch external search results with debounce (300ms)
  useEffect(() => {
    if (!query || query.length < 2) {
      setExternalSearchResults([]);
      setExternalSearchLoading(false);
      return;
    }

    setExternalSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          // Filter out results already in our database to avoid duplicates
          const { titles, tmdbIds } = knownItemsRef.current;
          const filtered = (data.results || []).filter(r => {
            const titleMatch = r.title?.toLowerCase();
            return !titles.has(titleMatch) && !tmdbIds.has(r.id);
          });
          setExternalSearchResults(filtered);
        } else {
          setExternalSearchResults([]);
        }
      } catch (error) {
        console.error('External search error:', error);
        setExternalSearchResults([]);
      } finally {
        setExternalSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Clear expired cache entries and failed items on mount to retry posters
  useEffect(() => {
    clearExpiredCache();
    failedRef.current.clear(); // Retry failed items on remount
  }, []);

  useEffect(() => {
    const missing = activeItems.filter(item => {
      const cached = item.tmdbId ? getFromCache(metadataCacheKey(item)) : null;
      return !item.poster && !cached && !posterFromManifest(item, posterMap) && !failedRef.current.has(item.id);
    }).slice(0, 6);
    
    if (!missing.length) return;
    let cancelled = false;
    const batchSize = 4;
    
    const fetchBatch = async (startIndex) => {
      if (cancelled || startIndex >= missing.length) return;
      const batch = missing.slice(startIndex, startIndex + batchSize);
      
      const results = await Promise.allSettled(batch.map(async (item) => {
        // Prefer description endpoint for comprehensive metadata
        const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
        if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
        params.set('mediaType', item.type === 'series' ? 'tv' : 'movie');
        if (item.season) params.set('season', String(item.season));
        
        try {
          const response = await fetch(`/api/tmdb/description?${params.toString()}`);
          if (!response.ok) {
            console.warn(`[v0] Description endpoint failed for ${item.title}: ${response.status}`);
            return null;
          }
          
          const data = await response.json();
          // If description finds a result with poster, return it
          if (data.success && data.poster) {
            return data;
          }
          
          // Fallback: search directly using search/multi endpoint which is great for TV series
          console.log(`[v0] Fallback search for ${item.title} (no poster from description)`);
          const searchParams = new URLSearchParams({ q: item.title });
          const searchResponse = await fetch(`/api/tmdb/search?${searchParams.toString()}`);
          
          if (!searchResponse.ok) {
            console.warn(`[v0] Search fallback failed for ${item.title}`);
            return null;
          }
          
          const searchData = await searchResponse.json();
          const results = searchData.results || [];
          
          if (results.length > 0) {
            const result = results[0]; // Take first result (already sorted by relevance)
            console.log(`[v0] Found poster via search fallback for ${item.title}`);
            return {
              success: true,
              poster: result.poster,
              backdrop: result.backdrop,
              overview: result.overview,
              rating: result.rating,
              releaseDate: result.year,
              mediaType: result.type,
            };
          }
          
          return null;
        } catch (err) {
          console.error(`[v0] Poster fetch error for ${item.title}:`, err.message);
          return null;
        }
      }));
      
      if (!cancelled) {
        const updates = {};
        const failed = [];
        
        results.forEach((result, i) => {
          const item = batch[i];
          if (result.status === 'fulfilled' && result.value && !result.value.error) {
            const data = result.value;
            if (data.success && data.poster) {
              updates[item.id] = data.poster;
              if (data.rating) updates[`rating_${item.id}`] = Number(data.rating);
              
              // Cache the metadata - use provided tmdbId or item's tmdbId
              const cacheKey = metadataCacheKey({ tmdbId: data.tmdbId || item.tmdbId, season: item.season });
              if (cacheKey) {
                const existing = getFromCache(cacheKey) || {};
                const hadImdb = !!existing.imdbRating;
                setCache(cacheKey, {
                  ...existing,
                  poster: data.poster,
                  backdrop: data.backdrop,
                  overview: data.overview,
                  rating: data.rating,
                  voteCount: data.voteCount || existing.voteCount || 0,
                  releaseDate: data.releaseDate,
                  mediaType: data.mediaType,
                });
              
              console.log(`[v0] Successfully fetched poster for ${item.title}`);
              
              // Fire-and-forget: fetch IMDb rating from OMDb (only if not already cached)
              if (!hadImdb) {
                fetch(`/api/omdb/rating?title=${encodeURIComponent(item.title)}&year=${item.year}`)
                  .then(r => r.json())
                  .then(omdb => {
                    if (omdb.rating) {
                      const cur = getFromCache(cacheKey) || {};
                      setCache(cacheKey, { ...cur, imdbRating: omdb.rating, tomatoRating: omdb.tomatoRating || cur.tomatoRating, metaRating: omdb.metaRating || cur.metaRating });
                    }
                  })
                  .catch(() => {});
              }
              }
            } else {
              console.warn(`[v0] No poster found for ${item.title} (error: ${data.error || 'no poster_path'})`);
              failed.push(item.id);
            }
          } else {
            console.warn(`[v0] Poster fetch failed for ${item.title} (status: ${result.status})`);
            failed.push(item.id);
          }
        });
        
        failed.forEach(id => failedRef.current.add(id));
        if (Object.keys(updates).length) setPosterMap(prev => ({ ...prev, ...updates }));
        fetchBatch(startIndex + batchSize);
      }
    };
    
    fetchBatch(0);
    return () => { cancelled = true; };
  }, [activeItems, posterMap]);

  // Fetch OMDb ratings (IMDb, Rotten Tomatoes, Metacritic) for ALL items
  const omdbFetchedRef = useRef(new Set());
  useEffect(() => {
    const needRatings = activeItems.filter(item => {
      if (!item.tmdbId) return false;
      const ck = metadataCacheKey(item);
      if (!ck) return false;
      if (omdbFetchedRef.current.has(ck)) return false;
      const cached = getFromCache(ck);
      return !cached || (!cached.imdbRating && !cached.tomatoRating && !cached.metaRating);
    }).slice(0, 8);
    if (!needRatings.length) return;
    let cancelled = false;
    const fetchOmdbBatch = async (idx) => {
      if (cancelled || idx >= needRatings.length) return;
      const batch = needRatings.slice(idx, idx + 3);
      await Promise.allSettled(batch.map(async (item) => {
        const ck = metadataCacheKey(item);
        omdbFetchedRef.current.add(ck);
        try {
          const r = await fetch(`/api/omdb/rating?title=${encodeURIComponent(item.title)}&year=${item.year}`);
          if (!r.ok) return;
          const omdb = await r.json();
          if (omdb.rating || omdb.tomatoRating || omdb.metaRating) {
            const cur = getFromCache(ck) || {};
            setCache(ck, { ...cur, imdbRating: omdb.rating || cur.imdbRating, tomatoRating: omdb.tomatoRating || cur.tomatoRating, metaRating: omdb.metaRating || cur.metaRating });
          }
        } catch {}
      }));
      if (!cancelled) setTimeout(() => fetchOmdbBatch(idx + 3), 200);
    };
    fetchOmdbBatch(0);
    return () => { cancelled = true; };
  }, [activeItems]);

  const heroItems = activeItems.slice(0, 6);
  const featured = heroItems[heroIndex % Math.max(heroItems.length, 1)] || activeItems[0];
  const genres = ['All', 'Action', 'Adventure', 'Drama', 'Sci-fi', 'Essential', 'Series'];
  const externalTrackedItems = useMemo(() => Object.entries(actions)
    .filter(([key, action]) => key.startsWith('tmdb:') && action.media && action.media.universe === universe)
    .map(([, action]) => enrichItem({ ...action.media, external: true })), [actions, enrichItem, universe]);
  const analyticsItems = useMemo(() => [...activeItems, ...externalTrackedItems], [activeItems, externalTrackedItems]);

  const stats = useMemo(() => {
    const total = analyticsItems.length || 1;
    const watched = analyticsItems.filter(item => item.userStatus === 'watched').length;
    const watching = analyticsItems.filter(item => item.userStatus === 'watching').length;
    const dropped = analyticsItems.filter(item => item.userStatus === 'dropped').length;
    const bookmarked = analyticsItems.filter(item => item.bookmarked).length;
    const watchedMinutes = analyticsItems.filter(item => item.userStatus === 'watched').reduce((sum, i) => sum + (i.runtime || 0), 0);
    const watchedHours = Math.floor(watchedMinutes / 60);
    const watchedTime = watchedHours >= 1 ? `${watchedHours}h ${watchedMinutes % 60}m` : `${watchedMinutes}m`;
    const watchedByOrder = activeItems.filter(item => item.userStatus === 'watched').map(i => i.order).sort((a, b) => a - b);
    let streak = 0, best = 0;
    for (let i = 0; i < watchedByOrder.length; i++) {
      if (i === 0 || watchedByOrder[i] === watchedByOrder[i - 1] + 1) streak++;
      else streak = 1;
      if (streak > best) best = streak;
    }
    return { total, watched, watching, dropped, bookmarked, percent: Math.round((watched / total) * 100), watchedMinutes, watchedTime, streak: best };
  }, [activeItems, analyticsItems]);

  const updateAction = (item, patch) => setActions(prev => {
    const key = mediaKey(item);
    const media = item.external ? {
      id: item.id,
      external: true,
      title: item.title,
      type: item.type,
      mediaType: item.mediaType,
      tmdbId: item.tmdbId,
      poster: item.poster,
      backdrop: item.backdrop,
      year: item.year,
      rating: item.rating,
      runtime: item.runtime,
      genres: item.genres || [],
      desc: item.desc || item.overview,
      universe: item.universe,
      accent: item.accent,
    } : prev[key]?.media;
    return { ...prev, [key]: { ...(prev[key] || prev[item.id] || {}), ...(media ? { media } : {}), ...patch } };
  });
  const cycleStatus = (item) => {
    const current = actions[mediaKey(item)]?.status || actions[item.id]?.status || 'unwatched';
    updateAction(item, { status: STATUS[(STATUS.indexOf(current) + 1) % STATUS.length] });
  };
  const setStatus = (item, status) => updateAction(item, { status });
  const toggleWatched = (item) => setStatus(item, item.userStatus === 'watched' ? 'unwatched' : 'watched');
  const toggleBookmark = (item) => updateAction(item, { bookmarked: !(actions[mediaKey(item)]?.bookmarked || actions[item.id]?.bookmarked) });
  const selectItem = (item) => {
    setSelected(item);
    if (item) window.history.replaceState(null, '', `#detail/${slugifyPosterName(item.title)}`);
    else window.history.replaceState(null, '', `#${section}`);
  };
  const selectedItem = selected ? activeItems.find(item => item.id === selected.id) || selected : null;
  const nextUp = activeItems.find(item => item.userStatus !== 'watched' && item.userStatus !== 'dropped') || activeItems[0];
  const playTrailer = async (item) => {
    // 1. Kinocheck API with client-side cache (primary, most accurate)
    const kinocheck = await fetchTrailerFromApi(item.title, item.year, item.tmdbId);
    
    // 2. Fallback: hardcoded TRAILER_DATA
    const match = !kinocheck?.youtubeId ? getTrailerByTitle(item.title) : null;
    const youtubeId = kinocheck?.youtubeId || match?.primary?.youtubeId || match?.youtubeId;
    const options = kinocheck?.options || match?.options;

    // 3. Play or YouTube search
    if (youtubeId) {
      setTrailer({ title: item.title, url: trailerEmbedUrl(youtubeId), options });
    } else {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} official trailer`)}`, '_blank', 'noopener');
    }
  };
  const resetFilters = () => { setQuery(''); setGenre('All'); setRating(0); setAgeRatingFilter('All'); setTypeFilter('All'); setSortBy('order'); setSortDirection('desc'); };
  const handleStartWatch = (item, tmdbId, mediaType) => {
    setWatchItem({ item, tmdbId, mediaType });
    setStatus(item, 'watching');
    updateAction(item, { watchStartedAt: Date.now() });
    setSelected(null);
    setSection('watch');
    window.history.replaceState(null, '', `#watch/${slugifyPosterName(item.title)}`);
  };

  // Handle playing external search results (not in database)
  const onPlayExternal = (externalResult) => {
    // Create a temporary item object for external results
    const tempItem = {
      id: `tmdb-${externalResult.type}-${externalResult.id}`,
      external: true,
      title: externalResult.title,
      type: externalResult.type === 'tv' ? 'series' : 'film',
      poster: externalResult.poster,
      backdrop: externalResult.backdrop,
      year: externalResult.year,
      rating: externalResult.rating,
      overview: externalResult.overview,
      desc: externalResult.overview,
      genres: externalResult.genres || [],
      runtime: externalResult.runtime || (externalResult.type === 'tv' ? 45 : 120),
      tmdbId: externalResult.id,
      mediaType: externalResult.type,
      universe: universe, // Assign to current universe for context
      bookmarked: false,
      userStatus: 'unwatched',
    };
    
    updateAction(tempItem, { status: 'watching', watchStartedAt: Date.now() });
    setWatchItem({ item: tempItem, tmdbId: externalResult.id, mediaType: externalResult.type });
    setSelected(null);
    setSection('watch');
    window.history.replaceState(null, '', `#watch/${slugifyPosterName(externalResult.title)}`);
  };

  const universeName = universe === 'marvel' ? 'MCU' : universe === 'xmen' ? 'X-Men' : 'DC';
  const universeAccent = universe === 'marvel' ? '#da1e37' : universe === 'xmen' ? '#a0a0ac' : '#2f80ed';
  const profileInitial = (profileName?.trim()?.[0] || (universe === 'marvel' ? 'M' : universe === 'xmen' ? 'X' : 'D')).toUpperCase();

  return (
    <main className={`movie-site universe-${universe}`} style={{ '--brand-accent': universeAccent, '--accent': universeAccent, '--theme-accent': universeAccent }}>
      <div className="site-glow" />
      <header className="site-header">
        <button className="brand" onClick={() => { setQuery(''); setSection('home'); setWatchItem(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label={`Go to ${universeName} Viewing Order home`}><span>{universeName}</span><b>{universeName} Viewing Order</b></button>
        <div className="universe-tabs" role="tablist" aria-label="Universe">
          <button className={universe === 'marvel' ? 'active' : ''} onClick={() => { setUniverse('marvel'); setHeroIndex(0); }}>Marvel</button>
          <button className={universe === 'dc' ? 'active' : ''} onClick={() => { setUniverse('dc'); setHeroIndex(0); }}>DC</button>
          <button className={universe === 'xmen' ? 'active' : ''} onClick={() => { setUniverse('xmen'); setHeroIndex(0); }}>X-Men</button>
        </div>
        <div className="header-search">
          <Search size={18} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${universe === 'marvel' ? 'Marvel' : universe === 'xmen' ? 'X-Men' : 'DC'} titles & TMDB…`} />
          {query && <button className="search-clear" onClick={() => setQuery('')}><X size={16} /></button>}
          <button className="header-filter-btn" onClick={() => setFiltersOpen(true)} aria-label="Open filters"><SlidersHorizontal size={18} /></button>
        </div>
        <button className="header-auth-btn" onClick={() => { if (user) { setSection('profile'); } else { setAuthOpen(true); } }} title={user ? 'View profile' : 'Sign in'}>
          {user ? (
            <span className="header-user-badge">
              <Cloud size={13} />
              <span className="header-user-name" aria-hidden="true">{profileInitial}</span>
            </span>
          ) : (
            <span className="header-signin-badge">
              <LogIn size={15} />
              <span>Sign in</span>
            </span>
          )}
        </button>
      </header>

      {section === 'home' && <>
        <section className="hero-layout">
          <TopCarousel items={heroItems} featured={featured} heroIndex={heroIndex} setHeroIndex={setHeroIndex} setSelected={selectItem} />
        </section>
        <SuggestionStrip nextUp={nextUp} stats={stats} setSelected={selectItem} playTrailer={playTrailer} />
        <MovieRail title="Up next" items={activeItems.filter(i => i.userStatus === 'unwatched').slice(0, 10)} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} scrollable variant="upnext" />
        <MovieRail title="Essential picks" items={activeItems.filter(i => i.essential)} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} paginated gridControls />
        <MovieRail title="Recently watched" items={activeItems.filter(i => i.userStatus === 'watched').slice(-24).reverse()} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} empty="Mark titles as watched to see them here." scrollable variant="upnext" />
        {activeItems.filter(i => i.userStatus === 'watching').length > 0 && <ContinueWatching items={activeItems.filter(i => i.userStatus === 'watching')} setSelected={selectItem} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} onResume={handleStartWatch} />}
        {externalTrackedItems.length > 0 && (
          <MovieRail
            title="Your TMDB"
            items={externalTrackedItems}
            setSelected={selectItem}
            cycleStatus={cycleStatus}
            setStatus={setStatus}
            toggleBookmark={toggleBookmark}
            playTrailer={playTrailer}
            scrollable
            variant="upnext"
          />
        )}
        {externalSearchResults.length > 0 && (
          <section className="rail-card web-rail upnext-rail-card">
            <div className="section-title"><h2>Also Found</h2><button>{externalSearchResults.length} on TMDB</button></div>
            <div className="movie-grid web-grid rail-scroll upnext-grid">
              {externalSearchResults.map(result => {
                const actionKey = `tmdb:${result.type}:${result.id}`;
                const action = actions[actionKey] || {};
                const extItem = {
                  id: `tmdb-${result.type}-${result.id}`,
                  external: true,
                  title: result.title,
                  type: result.type === 'tv' ? 'series' : 'film',
                  poster: result.poster,
                  backdrop: result.backdrop,
                  year: result.year,
                  rating: result.rating,
                  overview: result.overview,
                  desc: result.overview,
                  genres: result.genres || [],
                  runtime: result.runtime || (result.type === 'tv' ? 45 : 120),
                  tmdbId: result.id,
                  mediaType: result.type,
                  universe: 'tmdb',
                  accent: '#4a5568',
                  userStatus: action.status || 'unwatched',
                  bookmarked: Boolean(action.bookmarked),
                };
                return (
                  <article key={extItem.id} className="movie-card" style={{ '--accent': '#4a5568' }}>
                    <button className="poster-button" onClick={() => onPlayExternal(result)}>
                      <PosterArt item={extItem} />
                    </button>
                    <div className="card-body">
                      <button className="title-button" onClick={() => onPlayExternal(result)}>{result.title}</button>
                      <span>{result.year || 'TBA'} · {result.type === 'tv' ? 'Series' : 'Movie'}{result.runtime ? ` · ${runtimeLabel(result.runtime, result.type === 'tv' ? 'series' : 'film')}` : ''}</span>
                    </div>
                    <div className="card-actions">
                      <button onClick={() => onPlayExternal(result)} className="trailer-chip"><Play size={16} fill="currentColor" /><span>Watch</span></button>
                      <StatusSelect item={extItem} setStatus={setStatus} compact />
                      <button onClick={() => toggleBookmark(extItem)} className={`bookmark-chip ${extItem.bookmarked ? 'saved' : ''}`}><Bookmark size={18} fill={extItem.bookmarked ? 'currentColor' : 'none'} /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {externalSearchLoading && (
          <p className="empty-state">Searching TMDB…</p>
        )}
      </>}

      {section === 'list' && <ListSection items={activeItems} externalResults={externalSearchResults} externalLoading={externalSearchLoading} query={query} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} onPlayExternal={onPlayExternal} />}
      {section === 'analytics' && <><AnalyticsPanel stats={stats} large /><MovieRail title="In progress" items={activeItems.filter(i => i.userStatus === 'watching')} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} /></>}
            {section === 'profile' && <ProfilePage stats={stats} activeItems={activeItems} universe={universe} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} profileName={profileName} setProfileName={setProfileName} user={user} configured={configured} onLogin={() => setAuthOpen(true)} onLogout={async () => { await pushBeforeLogout(); authLogout(); setWatchItem(null); }} lastSynced={lastSynced} syncing={syncing} onSync={pushToCloud} conflict={conflict} onResolveRemote={resolveUseRemote} onResolveLocal={resolveKeepLocal} syncToast={toast} />}
      {section === 'watch' && safeWatchItem && <WatchPage watchItem={safeWatchItem} activeItems={roadmapItems} onBack={() => { setWatchItem(null); window.history.replaceState(null, '', '#watch'); }} setStatus={setStatus} toggleBookmark={toggleBookmark} onStartWatch={handleStartWatch} updateAction={updateAction} />}
      {section === 'watch' && !safeWatchItem && <WatchBrowse activeItems={activeItems} externalResults={externalSearchResults} externalLoading={externalSearchLoading} actions={actions} query={query} onStartWatch={handleStartWatch} onPlayExternal={onPlayExternal} setSelected={selectItem} setStatus={setStatus} toggleBookmark={toggleBookmark} />}

      <nav className="bottom-nav" aria-label="Primary">
        <button className={section === 'home' ? 'active' : ''} onClick={() => { setSection('home'); setWatchItem(null); }}><Home size={22} /><span>Home</span></button>
        <button className={section === 'list' ? 'active' : ''} onClick={() => { setSection('list'); }}><ListFilter size={22} /><span>List</span></button>
        <button className={section === 'analytics' ? 'active' : ''} onClick={() => { setSection('analytics'); }}><BarChart3 size={22} /><span>Stats</span></button>
        <button className={section === 'watch' ? 'active' : ''} onClick={() => { setSection('watch'); }}><Play size={22} /><span>Watch</span></button>
        <button className={section === 'profile' ? 'active' : ''} onClick={() => { setSection('profile'); }}><UserRound size={22} /><span>Profile</span></button>
      </nav>

      {selectedItem && <DetailView item={selectedItem} onClose={() => selectItem(null)} setStatus={setStatus} toggleBookmark={toggleBookmark} onStartWatch={handleStartWatch} activeItems={roadmapItems} />}
      {trailer && <TrailerModal trailer={trailer} onClose={() => setTrailer(null)} />}
      {filtersOpen && <Filters genre={genre} setGenre={setGenre} rating={rating} setRating={setRating} ageRatingFilter={ageRatingFilter} setAgeRatingFilter={setAgeRatingFilter} sortBy={sortBy} setSortBy={setSortBy} sortDirection={sortDirection} setSortDirection={setSortDirection} typeFilter={typeFilter} setTypeFilter={setTypeFilter} genres={genres} count={activeItems.length} onClose={() => setFiltersOpen(false)} />}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onLogin={login} onSignup={signup} onGoogleSignIn={googleSignIn} onAnonymousSignIn={anonymousSignIn} onResetPassword={resetPassword} />}
      <Footer />
    </main>
  );
}

function TopCarousel({ items, featured, heroIndex, setHeroIndex, setSelected }) {
  const [paused, setPaused] = useState(false);
  const [inlineTrailer, setInlineTrailer] = useState(null);
  const touchStartX = useRef(null);
  const didSwipe = useRef(false);
  const move = (dir) => {
    setInlineTrailer(null);
    setHeroIndex((heroIndex + dir + items.length) % Math.max(items.length, 1));
  };
  const handleTouchStart = (event) => { touchStartX.current = event.touches[0]?.clientX ?? null; didSwipe.current = false; };
  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    didSwipe.current = Math.abs(distance) > 42;
    if (didSwipe.current) move(distance < 0 ? 1 : -1);
  };
  const selectPoster = (item, rawIndex, offset) => {
    if (didSwipe.current) { didSwipe.current = false; return; }
    setInlineTrailer(null);
    offset ? setHeroIndex(rawIndex) : setSelected(item);
  };

  useEffect(() => {
    if (paused || inlineTrailer || items.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setTimeout(() => setHeroIndex((heroIndex + 1) % items.length), 3000);
    return () => window.clearTimeout(timer);
  }, [heroIndex, inlineTrailer, items.length, paused, setHeroIndex]);

  const showTrailer = async () => {
    const kc = await fetchTrailerFromApi(featured.title, featured.year, featured.tmdbId);
    const match = !kc?.youtubeId ? getTrailerByTitle(featured.title) : null;
    const id = kc?.youtubeId || match?.primary?.youtubeId || match?.youtubeId;
    if (id) {
      setInlineTrailer(`${trailerEmbedUrl(id)}&autoplay=1`);
    } else {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${featured.title} official trailer`)}`, '_blank', 'noopener');
    }
  };

  return <section className="top-carousel" style={{ '--accent': featured?.accent || '#9a4a4a' }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    {featured?.poster && <img key={featured.id} className="carousel-backdrop" src={featured.poster} alt="" aria-hidden="true" width="300" height="450" referrerPolicy="no-referrer" />}
    <div className="carousel-backdrop-shade" aria-hidden="true" />
    <div className="feature-heading"><div><p className="eyebrow">{featured?.universe === 'marvel' ? 'Marvel Cinematic Universe' : featured?.universe === 'xmen' ? 'X-Men Universe' : 'DC Universe'} · Featured</p><h2>Top movies</h2></div><button className="feature-detail" onClick={() => setSelected(featured)}>View details</button></div>
    <div className="feature-stage">
      <div className="poster-stack smooth-stack">
        {inlineTrailer ? <div className="inline-trailer"><iframe src={inlineTrailer} title={`${featured.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /><button onClick={() => setInlineTrailer(null)} aria-label="Close trailer"><X size={20} /></button></div> : items.map((item, rawIndex) => { const offset = (rawIndex - heroIndex + items.length) % items.length; if (offset > 2) return null; return <button key={item.id} aria-label={offset ? `Show ${item.title}` : `View ${item.title} details`} className={`stack-poster poster-${offset}`} onClick={() => selectPoster(item, rawIndex, offset)} style={{ '--accent': item.accent }}><PosterArt item={item} loading="eager" fetchPriority={offset === 0 ? 'high' : 'auto'} /></button>; })}
      </div>
      <div className="feature-copy">
        <div className="feature-kicker"><span>{featured?.year}</span><span>{runtimeLabel(featured?.runtime, featured?.type)}</span><span>{featured?.rating} rating</span></div>
        <h1>{featured?.title}</h1>
        <p>{featured?.desc || `Follow ${featured?.title} in the complete ${featured?.universe === 'marvel' ? 'Marvel Cinematic Universe' : 'DC Universe'} viewing order.`}</p>
        <div className="feature-footer"><button className="feature-play" onClick={showTrailer}><Play size={18} fill="currentColor" /> Watch trailer</button><div className="chips">{featured?.genres.slice(0, 3).map(g => <span key={g}>{g}</span>)}</div></div>
      </div>
    </div>
    <div className="carousel-nav"><button onClick={() => move(-1)} aria-label="Previous title"><ChevronLeft /></button><div className="dots">{items.map((item, index) => <button key={item.id} aria-label={`Show ${item.title}`} className={item.id === featured?.id ? 'active' : ''} onClick={() => { setHeroIndex(index); setInlineTrailer(null); }} />)}</div><button onClick={() => move(1)} aria-label="Next title"><ChevronRight /></button></div>
  </section>;
}

function PosterArt({ item, loading: loadingProp = 'lazy', fetchPriority: fetchPriorityProp = 'auto' }) {
  return item.poster ? <>
    <img src={item.poster} alt={`${item.title} poster`} width="300" height="450" loading={loadingProp} fetchPriority={fetchPriorityProp} referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.removeAttribute('hidden'); }} />
    <FallbackPoster item={item} hidden />
  </> : <FallbackPoster item={item} />;
}
function FallbackPoster({ item, hidden = false }) { return <div className="fallback-poster" hidden={hidden}><strong>{item.title}</strong><span>{item.year}</span></div>; }

function MovieRail({ title, items, setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer, empty, scrollable, paginated, gridControls = false, variant = 'default' }) {
  const pageSize = 12;
  const [page, setPage] = useState(1);
  const [gridDensity, setGridDensity] = useState(2);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = paginated ? items.slice((currentPage - 1) * pageSize, currentPage * pageSize) : items;
  useEffect(() => { setPage(1); }, [items.length]);

  return <section className={`rail-card web-rail ${variant === 'upnext' ? 'upnext-rail-card' : ''}`}>
    <div className="section-title"><h2>{title}</h2><div className="section-title-actions"><span>{items.length} titles</span>{gridControls && <div className="rail-density-toggle" role="group" aria-label={`${title} grid columns`}>{[2, 3].map(count => <button key={count} className={gridDensity === count ? 'active' : ''} onClick={() => setGridDensity(count)}>{count}</button>)}</div>}</div></div>
    {items.length
      ? <>
          <div className={`${scrollable ? 'movie-grid web-grid rail-scroll' : 'movie-grid web-grid'} grid-${gridDensity}${variant === 'upnext' ? ' upnext-grid' : ''}`}>
            {visibleItems.map(item => <MovieCard key={item.id} item={item} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />)}
          </div>
          {paginated && pageCount > 1 && <nav className="pagination" aria-label={`${title} pages`}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft size={18} /></button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => <button key={n} className={currentPage === n ? 'active' : ''} aria-current={currentPage === n ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
            <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount} aria-label="Next page"><ChevronRight size={18} /></button>
          </nav>}
        </>
      : <p className="empty-state">{empty || 'No titles match these filters.'}</p>}
  </section>;
}

function MovieCard({ item, setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer }) {
  return <article className="movie-card" style={{ '--accent': item.accent }}>
    <button className="poster-button" onClick={() => setSelected(item)}>
      <PosterArt item={item} />
    </button>
    <div className="card-body"><button className="title-button" onClick={() => setSelected(item)}>{item.title}</button><span>{item.year} · {runtimeLabel(item.runtime, item.type)}{item.userStatus === 'watching' && item.watchedDuration > 30000 ? ` · ${watchTimeLabel(item)}` : ''}</span></div>
    <div className="card-actions"><button onClick={() => playTrailer(item)} className="trailer-chip" aria-label={`Play ${item.title} trailer`}><Play size={16} fill="currentColor" /><span>Trailer</span></button><StatusSelect item={item} setStatus={setStatus} compact /><button onClick={() => toggleBookmark(item)} className={`bookmark-chip ${item.bookmarked ? 'saved' : ''}`} aria-label={item.bookmarked ? 'Remove bookmark' : 'Bookmark title'}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
  </article>;
}

function ListSection({ items, externalResults = [], externalLoading = false, query = '', setSelected, setStatus, toggleBookmark, playTrailer, onPlayExternal }) {
  const pageSize = 12;
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstItem = (currentPage - 1) * pageSize;
  const visibleItems = items.slice(firstItem, firstItem + pageSize);
  useEffect(() => { setPage(1); }, [items.length]);
  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <section className={`list-section ${viewMode === 'grid' ? 'is-grid-view' : 'is-list-view'}`}>
    <div className="list-heading"><div><p className="eyebrow">Every story, in order</p><h2>Complete viewing list</h2><p className="list-intro">Track every chapter, update your progress, and keep the next story within reach.</p></div><div className="list-summary"><strong>{items.length}</strong><span>titles</span></div></div>
    <div className="list-results-bar"><span>Showing {items.length ? firstItem + 1 : 0}–{Math.min(firstItem + pageSize, items.length)} of {items.length}</span><div className="list-view-toggle" role="group" aria-label="List view mode"><span>Page {currentPage} of {pageCount}</span><button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button><button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button></div></div>
    {viewMode === 'grid' ? <div className="movie-grid web-grid list-card-grid">{visibleItems.map(item => <MovieCard key={item.id} item={item} setSelected={setSelected} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />)}</div> : <div className="list-grid">{visibleItems.map((item, index) => <article className="list-row" key={item.id} style={{ '--accent': item.accent }} onClick={() => setSelected(item)} role="button" tabIndex={0} aria-label={`View ${item.title} details`} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(item); } }}>
      <span className="list-index">{String(firstItem + index + 1).padStart(2, '0')}</span>
      <div className="list-poster"><img src={item.poster} alt={`${item.title} poster`} width="82" height="108" loading="lazy" /></div>
      <div className="list-copy"><div className="list-title-line"><strong>{item.title}</strong>{item.essential && <span>Essential</span>}{item.rating && <span className="list-rating"><Star size={11} fill="currentColor" />{Number(item.rating).toFixed(1)}</span>}{item.imdbRating && <span className="list-rating list-rating-imdb">★{item.imdbRating}</span>}{item.tomatoRating && <span className={`list-rating list-rating-tomato ${getTomatoTier(item.tomatoRating).cls}`}>{getTomatoTier(item.tomatoRating).emoji}{item.tomatoRating}</span>}{item.metaRating && <span className="list-rating list-rating-meta">{item.metaRating}</span>}</div><span>{item.year} · {item.type} · {runtimeLabel(item.runtime, item.type)}</span><p>{item.desc || `${item.title} in the complete ${item.universe === 'marvel' ? 'MCU' : 'DC'} story timeline.`}</p><div className="list-tags">{(item.genres || []).slice(0,3).map(g => <span key={g}>{g}</span>)}</div></div>
      <div className="list-actions" onClick={e => e.stopPropagation()}><button className="list-trailer" onClick={() => playTrailer(item)} aria-label={`Play ${item.title} trailer`}><Play size={16} fill="currentColor" /><span>Trailer</span></button><StatusSelect item={item} setStatus={setStatus} /><button className={`list-bookmark ${item.bookmarked ? 'saved' : ''}`} onClick={() => toggleBookmark(item)} aria-label={item.bookmarked ? 'Remove bookmark' : 'Bookmark title'}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
    </article>)}</div>}
    {pageCount > 1 && <nav className="pagination" aria-label="Viewing list pages"><button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft size={18} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map(pageNumber => <button key={pageNumber} className={currentPage === pageNumber ? 'active' : ''} aria-current={currentPage === pageNumber ? 'page' : undefined} onClick={() => goToPage(pageNumber)}>{pageNumber}</button>)}<button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Next page"><ChevronRight size={18} /></button></nav>}
    
    {externalResults.length > 0 && (
      <div className="external-results">
        <div className="external-header">
          <h3>{items.length > 0 ? 'Also Found' : 'Search Results'}</h3>
          <p className="external-subtitle">{items.length > 0 ? 'Other matches in TMDB' : 'Not in database - Play directly'}</p>
        </div>
        <div className="external-grid">
          {externalResults.map(result => (
            <div key={result.id} className="external-result-card" onClick={() => onPlayExternal(result)}>
              <div className="external-poster">
                <img src={result.poster} alt={result.title} loading="lazy" />
                <div className="external-badge">{items.length > 0 ? 'TMDB' : 'New'}</div>
                <button className="external-play-btn" onClick={(e) => { e.stopPropagation(); onPlayExternal(result); }} aria-label={`Play ${result.title}`}>
                  <Play size={24} fill="white" />
                </button>
              </div>
              <div className="external-info">
                <h4>{result.title}</h4>
                <p className="external-meta">{result.year || 'Date TBA'} · {result.type === 'tv' ? 'Series' : 'Movie'}{result.runtime ? ` · ${runtimeLabel(result.runtime, result.type === 'tv' ? 'series' : 'film')}` : ''}</p>
                {result.overview && <p className="external-overview">{result.overview}</p>}
                {result.rating && <p className="external-rating"><Star size={14} fill="currentColor" /> {result.rating}{result.voteCount ? ` · ${result.voteCount.toLocaleString()} ratings` : ''}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
    {items.length === 0 && externalResults.length === 0 && query && !externalLoading && (
      <div className="no-results">
        <p>No results found for "{query}"</p>
      </div>
    )}
  </section>;
}


const STATUS_META = {
  unwatched: { detail: 'Not started', icon: RotateCcw },
  watching: { detail: 'In progress', icon: Clock },
  watched: { detail: 'Completed', icon: Check },
  dropped: { detail: 'Stopped', icon: X },
};

function StatusSelect({ item, setStatus, compact = false }) {
  const [open, setOpen] = React.useState(false);
  const ref = useRef(null);
  const triggerLabel = compact && item.userStatus === 'unwatched' ? 'Unseen' : STATUS_LABELS[item.userStatus];
  React.useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  return <div className={`status-select ${item.userStatus} ${compact ? 'compact' : ''} ${open ? 'open' : ''}`} ref={ref}>
    <button className="status-trigger" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}>
      <span className="status-label">{triggerLabel}</span>
    </button>
    {open && <div className="status-dropdown" role="listbox" aria-label={`Set status for ${item.title}`}>
      <p className="status-menu-title">Viewing status</p>
      {STATUS.map(status => <button key={status} className={`status-option ${status} ${item.userStatus === status ? 'active' : ''}`} role="option" aria-selected={item.userStatus === status} onClick={() => { setStatus(item, status); setOpen(false); }}>
        <span className="status-option-copy"><strong>{STATUS_LABELS[status]}</strong><small>{STATUS_META[status].detail}</small></span>
      </button>)}
    </div>}
  </div>;
}

/* ── Server Dropdown ─────────────────────────────────────────────────────────── */
function ServerDropdown({ server, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const SERVERS = { videasy: 'Videasy', moviepire: 'MoviePire' };
  return (
    <div className={`custom-dropdown server-dropdown ${open ? 'open' : ''}`} ref={ref}>
      <button className="custom-dropdown-trigger" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{SERVERS[server] || server}</span>
        <ChevronDown size={14} className="dropdown-chevron" />
      </button>
      {open && (
        <div className="custom-dropdown-menu" role="listbox" aria-label="Select server">
          {Object.entries(SERVERS).map(([key, label]) => (
            <button
              key={key}
              className={`custom-dropdown-option ${server === key ? 'active' : ''}`}
              role="option"
              aria-selected={server === key}
              onClick={() => { onSelect(key); setOpen(false); }}
            >
              <span className="option-label">{label}</span>
              {server === key && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Episode Dropdown ───────────────────────────────────────────────────────── */
function EpisodeDropdown({ episodes, selected, onSelect, season }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  if (!episodes.length) {
    return (
      <div className="custom-dropdown episode-dropdown disabled">
        <button className="custom-dropdown-trigger" disabled>
          <span>No episodes</span>
          <ChevronDown size={14} className="dropdown-chevron" />
        </button>
      </div>
    );
  }
  return (
    <div className={`custom-dropdown episode-dropdown ${open ? 'open' : ''}`} ref={ref}>
      <button className="custom-dropdown-trigger" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label="Select episode to download">
        <span>S{season} E{selected}</span>
        <ChevronDown size={14} className="dropdown-chevron" />
      </button>
      {open && (
        <div className="custom-dropdown-menu episode-menu" role="listbox" aria-label="Select episode">
          {episodes.map(ep => (
            <button
              key={ep.episode}
              className={`custom-dropdown-option ${selected === ep.episode ? 'active' : ''}`}
              role="option"
              aria-selected={selected === ep.episode}
              onClick={() => { onSelect(ep.episode); setOpen(false); }}
            >
              <span className="option-label">
                <span className="ep-num">E{String(ep.episode).padStart(2, '0')}</span>
                <span className="ep-title">{ep.title || `Episode ${ep.episode}`}</span>
              </span>
              {selected === ep.episode && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Rating Chips (DetailView) ──────────────────────────────────────────────── */
const getTomatoTier = (rating) => {
  const pct = parseInt(rating) || 0;
  if (pct >= 75) return { emoji: '🍅', cls: 'certified-fresh', label: 'Certified Fresh' };
  if (pct >= 60) return { emoji: '🍅', cls: 'fresh', label: 'Fresh' };
  return { emoji: '💀', cls: 'rotten', label: 'Rotten' };
};

function RatingChips({ item }) {
  const tmdb = item.rating?.toFixed ? item.rating.toFixed(1) : (item.rating ?? null);
  const imdb = item.imdbRating;
  const tomato = item.tomatoRating;
  const meta = item.metaRating;
  return (
    <>
      {tmdb && <span className="detail-rating tmdb-rating"><Star size={15} fill="currentColor" /> {tmdb}<small>TMDB</small></span>}
      {imdb && <span className="detail-rating imdb-rating">★ {imdb}<small>IMDb</small></span>}
      {tomato && (() => { const t = getTomatoTier(tomato); return <span className={`detail-rating tomato-rating ${t.cls}`}>{t.emoji} {tomato}<small>{t.label}</small></span>; })()}
      {meta && <span className="detail-rating meta-rating">M {meta}<small>Meta</small></span>}
      {!tmdb && !imdb && !tomato && !meta && <span className="detail-rating"><Star size={15} fill="currentColor" /> N/A</span>}
    </>
  );
}

function SuggestionStrip({ nextUp, stats, setSelected, playTrailer }) {
  if (!nextUp) return null;
  return <section className="suggestion-strip" style={{ '--accent': nextUp.accent }}>
    <div><p className="eyebrow">Smart suggestion</p><h2>Next up: {nextUp.title}</h2><span>{stats.percent}% complete · {stats.watched} watched · {stats.bookmarked} saved</span></div>
    <div className="suggestion-actions"><button onClick={() => playTrailer(nextUp)}><Play size={16} fill="currentColor" /> Trailer</button><button onClick={() => setSelected(nextUp)}>Details</button></div>
  </section>;
}

function AnalyticsPanel({ stats, large = false }) {
  return <section className={`analytics-panel ${large ? 'large' : ''}`}><div><p className="eyebrow">Analytics</p><h2>{stats.percent}% complete</h2><div className="progress"><span style={{ width: `${stats.percent}%` }} /></div></div><div className="stat-grid"><div><b>{stats.total}</b><span>Total</span></div><div><b>{stats.watched}</b><span>Watched</span></div><div><b>{stats.watching}</b><span>Watching</span></div><div><b>{stats.dropped}</b><span>Dropped</span></div><div><b>{stats.bookmarked}</b><span>Saved</span></div><div><b>{stats.watchedTime}</b><span>Watch Time</span></div></div></section>;
}

function DetailView({ item, onClose, setStatus, toggleBookmark, onStartWatch, activeItems }) {
  const [inlineTrailer, setInlineTrailer] = useState(null);
  const [isTrailerExpanded, setIsTrailerExpanded] = useState(false);
  const showTrailer = async () => {
    const kc = await fetchTrailerFromApi(item.title, item.year, item.tmdbId);
    const match = !kc?.youtubeId ? getTrailerByTitle(item.title) : null;
    const id = kc?.youtubeId || match?.primary?.youtubeId || match?.youtubeId;
    if (id) {
      setInlineTrailer(`${trailerEmbedUrl(id)}&autoplay=1`);
      setIsTrailerExpanded(true);
    } else {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} official trailer`)}`, '_blank', 'noopener');
    }
  };
  const closeTrailer = () => {
    setIsTrailerExpanded(false);
    setTimeout(() => setInlineTrailer(null), 400);
  };
  const [watchLoading, setWatchLoading] = useState(false);
  const [downloadEpisodes, setDownloadEpisodes] = useState([]);
  const [downloadEpisode, setDownloadEpisode] = useState(item.epStart || 1);

  useEffect(() => {
    if (item.type !== 'series' || !item.tmdbId) return;
    const season = item.season || 1;
    fetch(`/api/tmdb/episodes?tmdbId=${item.tmdbId}&season=${season}`, { cache: 'force-cache' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        const available = (data?.episodes || []).filter(episode => !item.epStart || (episode.episode >= item.epStart && episode.episode <= (item.epEnd || Infinity)));
        setDownloadEpisodes(available);
        if (available.length) setDownloadEpisode(available[0].episode);
      })
      .catch(() => setDownloadEpisodes([]));
  }, [item.tmdbId, item.type, item.season, item.epStart, item.epEnd]);

  const handleDownloadClick = () => {
    const url = buildDownloadUrl({
      mediaType: item.type === 'series' ? 'tv' : 'movie',
      tmdbId: item.tmdbId,
      season: item.season || 1,
      episode: item.type === 'series' ? downloadEpisode : undefined,
    });
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const [snapping, setSnapping] = useState(false);
  const [snapError, setSnapError] = useState(null);
  const snapCard = async () => {
    if (snapping) return;
    setSnapping(true);
    setSnapError(null);
    try {
      const scale = 2;
      const W = 1040, H = 780, R = 28;
      const pad = 52, gap = 48, posterW = 300, posterH = 450;
      const contentX = pad + posterW + gap;
      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // ── Card background ──
      ctx.fillStyle = '#111419';
      ctx.beginPath(); ctx.roundRect(0, 0, W, H, R); ctx.fill();

      // ── Poster backdrop — rich dark gradient only (matching CSS shade)
      const shade = ctx.createLinearGradient(W * 0.3, 0, W, H);
      shade.addColorStop(0, 'rgba(10,12,17,0.92)');
      shade.addColorStop(0.5, 'rgba(10,12,17,0.95)');
      shade.addColorStop(1, 'rgba(10,12,17,0.98)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, H);

      // Load poster via fetch+blob to avoid CORS tainting
      let bgImg = null;
      if (item.poster) {
        try {
          const resp = await fetch(item.poster);
          if (resp.ok) {
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            bgImg = await new Promise((resolve) => {
              const i = new Image();
              i.onload = () => resolve(i);
              i.onerror = () => resolve(null);
              i.src = blobUrl;
            });
            URL.revokeObjectURL(blobUrl);
          }
        } catch { /* poster failed silently */ }
      }

      // ── Poster ──
      const px = pad, py = pad;
      // Soft shadow matching CSS box-shadow: 0 24px 60px rgba(0,0,0,.5)
      [3, 2, 1].forEach(layer => {
        ctx.fillStyle = `rgba(0,0,0,${0.12 * layer})`;
        ctx.beginPath(); ctx.roundRect(px + 6 * layer, py + 8 * layer, posterW, posterH, 22); ctx.fill();
      });
      if (bgImg) {
        ctx.save();
        ctx.beginPath(); ctx.roundRect(px, py, posterW, posterH, 22); ctx.clip();
        const iw = bgImg.naturalWidth || bgImg.width, ih = bgImg.naturalHeight || bgImg.height;
        const s = Math.max(posterW / iw, posterH / ih);
        const sw = posterW / s, sh = posterH / s;
        ctx.drawImage(bgImg, (iw - sw) / 2, (ih - sh) / 2, sw, sh, px, py, posterW, posterH);
        ctx.restore();
      } else {
        // Fallback poster area
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.beginPath(); ctx.roundRect(px, py, posterW, posterH, 22); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.roundRect(px, py, posterW, posterH, 22); ctx.stroke();
      }

      const a = item.accent || '#da1e37';

      // ── Kicker ──
      const uLabel = (item.universe === 'marvel' ? 'Marvel Cinematic Universe' : item.universe === 'xmen' ? 'X-Men Universe' : 'DC Universe').toUpperCase();
      const orderLabel = '#' + String(item.order || item.id).padStart(2, '0');
      ctx.font = '900 11px Inter, sans-serif';
      // Lighten accent matching CSS color-mix(in srgb, var(--brand-accent) 72%, #ffffff)
      const kickerAccent = lightenHex(item.accent || '#da1e37', 0.72);
      ctx.fillStyle = kickerAccent;
      ctx.fillText(uLabel, contentX, pad + 16);
      const orderW = ctx.measureText(orderLabel).width;
      ctx.fillText(orderLabel, W - pad - orderW, pad + 16);
      ctx.globalAlpha = 1;

      // ── Title ──
      ctx.fillStyle = '#fff';
      const title = item.title || '';
      let titleSize = 62;
      while (titleSize > 32) {
        ctx.font = `900 ${titleSize}px Inter, sans-serif`;
        if (ctx.measureText(title).width <= (W - contentX - pad)) break;
        titleSize -= 2;
      }
      const titleLines = [];
      let rem = title;
      while (rem && titleLines.length < 2) {
        let cut = rem.length;
        while (cut > 0 && ctx.measureText(rem.slice(0, cut)).width > (W - contentX - pad)) cut--;
        if (cut === 0) cut = rem.length;
        titleLines.push(rem.slice(0, cut));
        rem = rem.slice(cut).trim();
      }
      titleLines.forEach((line, i) => {
        ctx.fillText(line, contentX, pad + 54 + i * (titleSize * 0.96));
      });

      // ── Rating chips ──
      let chipX = contentX, chipY = pad + 54 + titleLines.length * (titleSize * 0.96) + 22;
      const drawChip = (label, sub, color, emoji = '') => {
        const text = emoji ? `${emoji} ${label}` : label;
        ctx.font = 'bold 11px Inter, sans-serif';
        const tw = ctx.measureText(text).width + 8;
        ctx.font = '9px Inter, sans-serif';
        const sw = ctx.measureText(sub).width;
        const cw = Math.max(tw, sw) + 20, ch = 44;
        if (chipX + cw > W - pad) { chipX = contentX; chipY += 56; }
        // Chip bg
        ctx.fillStyle = 'rgba(255,255,255,0.045)';
        ctx.beginPath(); ctx.roundRect(chipX, chipY, cw, ch, 16); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(chipX, chipY, cw, ch, 16); ctx.stroke();
        // Value
        ctx.fillStyle = color;
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(text, chipX + 10, chipY + 18);
        // Sub-label
        ctx.fillStyle = '#777d86';
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText(sub, chipX + 10, chipY + 34);
        chipX += cw + 7;
      };
      const drawGenreChip = (g) => {
        ctx.font = '11px Inter, sans-serif';
        const cw = ctx.measureText(g).width + 20, ch = 44;
        if (chipX + cw > W - pad) { chipX = contentX; chipY += 56; }
        ctx.fillStyle = 'rgba(255,255,255,0.045)';
        ctx.beginPath(); ctx.roundRect(chipX, chipY, cw, ch, 16); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.roundRect(chipX, chipY, cw, ch, 16); ctx.stroke();
        ctx.fillStyle = '#b4b8bf';
        ctx.fillText(g, chipX + 10, chipY + 28);
        chipX += cw + 7;
      };
      if (item.rating) drawChip(Number(item.rating).toFixed(1), 'TMDB', '#f2c94c', '★');
      if (item.imdbRating) drawChip(item.imdbRating, 'IMDb', '#f5c518');
      if (item.tomatoRating) {
        const t = getTomatoTier(item.tomatoRating);
        drawChip(item.tomatoRating, t.label, t.cls === 'certified-fresh' ? '#4ade80' : t.cls === 'fresh' ? '#e74c3c' : '#22c55e', t.emoji);
      }
      if (item.metaRating) drawChip(item.metaRating, 'Meta', '#f59e0b', 'M');
      (item.genres || []).slice(0, 3).forEach(g => drawGenreChip(g));

      // ── Description ──
      const descY = chipY + 68;
      ctx.fillStyle = '#a3a8b0';
      const desc = item.desc || `Follow ${item.title} in the complete ${item.universe === 'marvel' ? 'Marvel Cinematic Universe' : item.universe === 'xmen' ? 'X-Men Universe' : 'DC Universe'} viewing order.`;
      let descSize = 15;
      ctx.font = `${descSize}px Inter, sans-serif`;
      const descWords = desc.split(' ');
      let descLine = '', dy = descY, maxDescW = W - contentX - pad, lh = Math.round(descSize * 1.65);
      const descMaxY = H - pad - 130;
      for (const w of descWords) {
        const test = descLine ? descLine + ' ' + w : w;
        if (ctx.measureText(test).width > maxDescW) {
          ctx.fillText(descLine, contentX, dy);
          descLine = w;
          dy += lh;
          if (dy > descMaxY) break;
        } else { descLine = test; }
      }
      if (descLine && dy <= descMaxY) {
        if (dy + lh > descMaxY) descLine = descLine.replace(/[\s,.!?]+$/, '') + '…';
        ctx.fillText(descLine, contentX, dy);
      }

      // Track actual last rendered line Y (if loop broke, dy was incremented past limit)
      let descBottom = dy > descMaxY && descLine ? dy - lh : dy;

      // ── Facts grid ──
      const maxFactsY = H - pad - 120;
      const factsY = Math.min(Math.max(descBottom + 24, posterH + pad + 16), maxFactsY);
      const facts = [
        { icon: '🗓', label: 'RELEASE YEAR', value: String(item.year) },
        { icon: '⏱', label: 'RUNTIME', value: runtimeLabel(item.runtime, item.type) },
        { icon: '✨', label: 'FORMAT', value: item.type === 'series' ? 'Series' : 'Film' },
      ];
      const factW = (W - pad * 2 - 16) / 3;
      facts.forEach((f, i) => {
        const fx = pad + i * (factW + 8), fy = factsY, fh = 84;
        ctx.fillStyle = 'rgba(255,255,255,0.045)';
        ctx.beginPath(); ctx.roundRect(fx, fy, factW, fh, 15); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.roundRect(fx, fy, factW, fh, 15); ctx.stroke();
        ctx.fillStyle = a;
        ctx.font = '18px Inter, sans-serif';
        ctx.fillText(f.icon, fx + 14, fy + 38);
        ctx.fillStyle = '#777d86';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(f.label, fx + 14, fy + 58);
        ctx.fillStyle = '#f1f2f4';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(f.value, fx + 14, fy + 76);
      });

      // ── Footer ──
      const footY = H - pad - 20;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(pad, footY - 10, W - pad * 2, 1);
      ctx.fillStyle = '#555';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(`${uLabel.replace(/ .*/, '')} Viewing Order`, pad, footY + 10);
      ctx.fillStyle = a;
      ctx.beginPath(); ctx.arc(W - pad - 10, footY + 4, 6, 0, Math.PI * 2); ctx.fill();

      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slugifyPosterName(item.title)}-card.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Snap failed:', err);
      setSnapError('Failed');
      setTimeout(() => setSnapError(null), 2500);
    } finally {
      setSnapping(false);
    }
  };

  const handleWatchOnVideasy = async (item) => {
    if (watchLoading) return;
    setWatchLoading(true);
    try {
      const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
      if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
      params.set('mediaType', item.type === 'series' ? 'tv' : 'movie');
      const res = await fetch(`/api/tmdb/description?${params.toString()}`);
      if (!res.ok) throw new Error('TMDB lookup failed');
      const data = await res.json();
      if (!data.success || !data.tmdbId) throw new Error('No TMDB ID found');
      const mediaType = data.mediaType;
      onStartWatch(item, data.tmdbId, mediaType);
    } catch {
      // fallback: use item's tmdbId and type
      onStartWatch(item, item.tmdbId || null, item.type === 'series' ? 'tv' : 'movie');
    } finally {
      setWatchLoading(false);
    }
  };
  const modalRef = React.useRef(null);
  React.useEffect(() => {
    if (isTrailerExpanded && modalRef.current) modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isTrailerExpanded]);

  const itemRoadmap = useMemo(() => getRoadmap(item, activeItems), [activeItems, item]);

  return <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" style={{ '--accent': item.accent }}>
      {item.poster && <div className="detail-bg" aria-hidden="true"><img className="detail-backdrop" src={item.poster} alt="" /><div className="detail-backdrop-shade" /></div>}
      <button className="detail-close" onClick={onClose} aria-label="Close details"><X size={21} /></button>
      <div className="detail-modal-scroll" ref={modalRef}>
      <div className={`detail-layout${isTrailerExpanded ? ' has-trailer' : ''}`}>
        <div className="detail-media">
          <div className={`detail-poster${isTrailerExpanded ? ' is-expanded' : ''}`}>
            {inlineTrailer
              ? <div className="detail-inline-trailer"><iframe src={inlineTrailer} title={`${item.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /><button onClick={closeTrailer} aria-label="Close trailer"><X size={20} /></button></div>
              : <PosterArt item={item} />}
          </div>
          {!isTrailerExpanded && <button className="detail-trailer" onClick={showTrailer}><Play size={18} fill="currentColor" /> Watch trailer</button>}
        </div>
        <div className="detail-content">
          <div className="detail-kicker"><span>{item.universe === 'marvel' ? 'Marvel Cinematic Universe' : item.universe === 'xmen' ? 'X-Men Universe' : 'DC Universe'}</span><span>#{String(item.order || item.id).padStart(2, '0')}</span></div>
          <h1 id="detail-title">{item.title}</h1>
          <div className="detail-chips"><RatingChips item={item} />{(item.genres || []).slice(0,3).map(g => <span key={g}>{g}</span>)}</div>
          <p className="detail-description">{item.desc || `Follow ${item.title} in the complete ${item.universe === 'marvel' ? 'Marvel Cinematic Universe' : 'DC Universe'} viewing order.`}</p>
          <div className="detail-facts"><div><Calendar size={18} /><span>Release year</span><strong>{item.year}</strong></div><div><Timer size={18} /><span>Runtime</span><strong>{runtimeLabel(item.runtime, item.type)}</strong></div><div><Sparkles size={18} /><span>Format</span><strong>{item.type}</strong></div>{item.userStatus === 'watching' && item.watchedDuration > 30000 && <div><Clock size={18} /><span>Watched</span><strong>{watchTimeLabel(item)}</strong></div>}</div>
          <div className="detail-progress-actions"><StatusSelect item={item} setStatus={setStatus} /><button className={`detail-bookmark ${item.bookmarked ? 'saved' : ''}`} onClick={() => toggleBookmark(item)} aria-label={item.bookmarked ? 'Remove bookmark' : 'Save title'}><Bookmark size={19} fill={item.bookmarked ? 'currentColor' : 'none'} /></button><button className="detail-videasy" onClick={() => handleWatchOnVideasy(item)} disabled={watchLoading} aria-label={`Watch ${item.title} on Videasy`}><Play size={18} fill="currentColor" /><span>{watchLoading ? 'Loading...' : 'Watch Now'}</span></button></div><div className="detail-download-row">{item.type === 'series' && <EpisodeDropdown episodes={downloadEpisodes} selected={downloadEpisode} onSelect={setDownloadEpisode} season={item.season || 1} />}<button className="detail-download" onClick={handleDownloadClick} disabled={!item.tmdbId || (item.type === 'series' && !downloadEpisodes.length)} aria-label={`Download ${item.title}${item.type === 'series' ? ` episode ${downloadEpisode}` : ''}`}><Download size={18} /><span>Download</span></button><button className={`detail-snap${snapError ? ' snap-failed' : ''}`} onClick={snapCard} disabled={snapping} aria-label={`Snapshot ${item.title} as shareable card`}><Camera size={17} /><span>{snapping ? '…' : snapError || 'Snap'}</span></button></div>
          {itemRoadmap && (
            <div className="detail-roadmap">
              <div className="section-title"><h2>Viewing Roadmap</h2><button>{itemRoadmap.siblings.length} Parts</button></div>
              <div className="roadmap-timeline">
                {itemRoadmap.segments.map((seg, idx) => {
                  if (seg.type === 'part') {
                    const partNum = itemRoadmap.segments.filter((s, i) => s.type === 'part' && i <= idx).length;
                    return (
                      <div key={seg.item.id} className={`roadmap-part ${seg.isActive ? 'active' : ''} ${seg.item.userStatus === 'watched' ? 'watched' : ''}`} style={{ '--accent': seg.item.accent, cursor: 'default' }}>
                        <span className="roadmap-part-dot" />
                        <div className="roadmap-part-poster">
                          {seg.item.poster ? <img src={seg.item.poster} alt={seg.item.title} loading="lazy" /> : <FallbackPoster item={seg.item} />}
                        </div>
                        <div className="roadmap-part-info">
                          <span className="roadmap-part-badge">{seg.item.userStatus === 'watched' ? 'Watched' : seg.isActive ? 'Now playing' : `Part ${partNum}`}{seg.item.season ? ` · Season ${seg.item.season}` : ''}</span>
                          <span className="roadmap-part-name">{seg.item.title.replace(/^Agents of SHIELD S\d+ /, '')}</span>
                          <span className="roadmap-part-meta">{seg.item.year} · {runtimeLabel(seg.item.runtime, seg.item.type)}</span>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={`int-${idx}`} className="roadmap-interstitial">
                        <div className="roadmap-inter-header">
                          <ChevronRight size={14} className="chevron" />
                          <span>connected stories</span>
                          <ChevronRight size={14} className="chevron" />
                        </div>
                        <div className="roadmap-inter-items">
                          {seg.items.map(intItem => (
                            <div key={intItem.id} className="roadmap-inter-card" style={{ '--accent': intItem.accent, cursor: 'default' }}>
                              <div className="roadmap-inter-poster">                              {intItem.poster ? <img src={intItem.poster} alt={intItem.title} loading="lazy" /> : <FallbackPoster item={intItem} />}
                            </div>
                            <span className="roadmap-inter-title">{intItem.title}</span>
                            {intItem.connectionNote && (
                              <p className="connection-note"><Sparkles size={11} /><span>{intItem.connectionNote}</span></p>
                            )}
                              {intItem.connectionNote && (
                                <p className="connection-note"><Sparkles size={11} /><span>{intItem.connectionNote}</span></p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );}
                  })}
                </div>
              </div>
            )}
          </div>
      </div>
      </div>
    </article>
  </div>;
}
function TrailerModal({ trailer, onClose }) {
  return <aside className="trailer-modal"><div><button className="trailer-close" onClick={onClose}><X /></button><h2>{trailer.title} trailer</h2><iframe src={trailer.url} title={`${trailer.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></aside>;
}

function ContinueWatching({ items, setSelected, setStatus, toggleBookmark, playTrailer, onResume }) {
  const handleResume = async (item) => {
    const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
    if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
    const res = await fetch(`/api/tmdb/poster?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.tmdbId) { onResume(item, data.tmdbId, data.mediaType === 'tv' ? 'tv' : 'movie'); return; }
    }
    onResume(item, item.tmdbId || null, item.type === 'series' ? 'tv' : 'movie');
  };
  return (
    <section className="rail-card web-rail upnext-rail-card">
      <div className="section-title"><h2>Continue Watching</h2><button>{items.length} in progress</button></div>
      <div className="movie-grid web-grid rail-scroll upnext-grid">
        {items.map(item => (
          <article key={item.id} className="movie-card continue-card" style={{ '--accent': item.accent }}>
            <button className="poster-button" onClick={() => handleResume(item)}>
              <PosterArt item={item} />
              <div className="continue-overlay"><Play size={28} fill="currentColor" /></div>
            </button>
            <div className="card-body">
              <button className="title-button" onClick={() => setSelected(item)}>{item.title}</button>
              <span>{elapsedPctLabel(item)} complete</span>
            </div>
            <div className="card-actions">
              <button onClick={() => handleResume(item)} className="trailer-chip"><Play size={16} fill="currentColor" /><span>Resume</span></button>
              <StatusSelect item={item} setStatus={setStatus} compact />
              <button onClick={() => toggleBookmark(item)} className={`bookmark-chip ${item.bookmarked ? 'saved' : ''}`}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WatchBrowse({ activeItems, externalResults = [], externalLoading = false, actions = {}, query = '', onStartWatch, onPlayExternal, setSelected, setStatus, toggleBookmark }) {
  const pageSize = 12;
  const [upNextPage, setUpNextPage] = useState(1);
  const inProgress = activeItems.filter(i => i.userStatus === 'watching');
  const allUpNext = activeItems.filter(i => i.userStatus === 'unwatched');
  const upNextPageCount = Math.max(1, Math.ceil(allUpNext.length / pageSize));
  const currentUpNextPage = Math.min(upNextPage, upNextPageCount);
  const upNext = allUpNext.slice((currentUpNextPage - 1) * pageSize, currentUpNextPage * pageSize);
  const watched = activeItems.filter(i => i.userStatus === 'watched').length;
  const total = activeItems.length || 1;
  const pct = Math.round((watched / total) * 100);
  useEffect(() => { setUpNextPage(1); }, [allUpNext.length]);
  const handleResume = async (item) => {
    const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
    if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
    const res = await fetch(`/api/tmdb/poster?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.tmdbId) { onStartWatch(item, data.tmdbId, data.mediaType === 'tv' ? 'tv' : 'movie'); return; }
    }
    onStartWatch(item, item.tmdbId || null, item.type === 'series' ? 'tv' : 'movie');
  };

  const renderRatingBadges = (item) => (
    <div className="wb-rating-badges">
      {item.rating && <span className="wb-rating-badge wb-tmdb"><Star size={10} fill="currentColor" />{Number(item.rating).toFixed(1)}</span>}
      {item.imdbRating && <span className="wb-rating-badge wb-imdb">★{item.imdbRating}</span>}
      {item.tomatoRating && (() => { const t = getTomatoTier(item.tomatoRating); return <span className={`wb-rating-badge wb-tomato ${t.cls}`}>{t.emoji}{item.tomatoRating}</span>; })()}
      {item.metaRating && <span className="wb-rating-badge wb-meta">M{item.metaRating}</span>}
    </div>
  );

  return (
    <section className="watch-browse">
      <div className="wb-hero">
        <div className="wb-hero-bg" />
        <div className="wb-hero-content">
          <div className="wb-hero-icon-ring">
            <Play size={36} fill="currentColor" className="wb-hero-play" />
          </div>
          <h1>Ready to watch?</h1>
          <p>Pick up where you left off or discover your next story.</p>
          <div className="wb-hero-stats">
            <div className="wb-stat">
              <span className="wb-stat-value">{watched}</span>
              <span className="wb-stat-label">Watched</span>
            </div>
            <div className="wb-stat-divider" />
            <div className="wb-stat">
              <span className="wb-stat-value">{pct}%</span>
              <span className="wb-stat-label">Complete</span>
            </div>
            <div className="wb-stat-divider" />
            <div className="wb-stat">
              <span className="wb-stat-value">{allUpNext.length}</span>
              <span className="wb-stat-label">Remaining</span>
            </div>
          </div>
          {query && (
            <div className="wb-search-chip">
              <Search size={14} />
              <span>"{query}"</span>
              <span className="wb-search-chip-count">{externalLoading ? 'searching…' : `${activeItems.length + externalResults.length} results`}</span>
            </div>
          )}
        </div>
      </div>

      {inProgress.length > 0 && (
        <section className="wb-section">
          <div className="wb-section-head">
            <h2>Continue Watching</h2>
            <span className="wb-section-count">{inProgress.length} in progress</span>
          </div>
          <div className="wb-scroll">
            {inProgress.map(item => (
              <article key={item.id} className="wb-card wb-continue-card" style={{ '--accent': item.accent }}>
                <button className="wb-card-media" onClick={() => handleResume(item)}>
                  <PosterArt item={item} />
                  <div className="wb-continue-overlay">
                    <div className="wb-progress-ring">
                      <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" /><circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${Math.min((parseInt(elapsedPctLabel(item)) || 0), 99) * 0.94} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" /></svg>
                      <Play size={16} fill="currentColor" />
                    </div>
                  </div>
                </button>
                <div className="wb-card-info">
                  <button className="wb-card-title" onClick={() => setSelected(item)}>{item.title}</button>
                  <div className="wb-card-meta">
                    <span>{elapsedPctLabel(item)} complete</span>
                    {renderRatingBadges(item)}
                  </div>
                </div>
                <div className="wb-card-actions">
                  <button onClick={() => handleResume(item)} className="wb-action-btn wb-action-primary"><Play size={14} fill="currentColor" /> Resume</button>
                  <StatusSelect item={item} setStatus={setStatus} compact />
                  <button onClick={() => toggleBookmark(item)} className={`wb-action-btn wb-action-icon ${item.bookmarked ? 'saved' : ''}`} aria-label={item.bookmarked ? 'Remove bookmark' : 'Bookmark'}><Bookmark size={16} fill={item.bookmarked ? 'currentColor' : 'none'} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {allUpNext.length > 0 && (
        <section className="wb-section">            <div className="wb-section-head">
            <h2>Start Watching</h2>
            <span className="wb-section-count">{allUpNext.length} available</span>
          </div>
          <div className="wb-grid">
            {upNext.map(item => (
              <article key={item.id} className="wb-card" style={{ '--accent': item.accent }}>
                <button className="wb-card-media" onClick={() => setSelected(item)}>
                  <PosterArt item={item} />
                  <div className="wb-card-overlay">
                    <button className="wb-play-btn" onClick={(e) => { e.stopPropagation(); handleResume(item); }} aria-label={`Watch ${item.title}`}>
                      <Play size={20} fill="currentColor" />
                    </button>
                  </div>
                </button>
                <div className="wb-card-info">
                  <button className="wb-card-title" onClick={() => setSelected(item)}>{item.title}</button>
                  <div className="wb-card-meta">
                    <span>{item.year} · {runtimeLabel(item.runtime, item.type)}</span>
                    {renderRatingBadges(item)}
                  </div>
                </div>
                <div className="wb-card-actions">
                  <button onClick={() => handleResume(item)} className="wb-action-btn wb-action-primary"><Play size={14} fill="currentColor" /> Watch</button>
                  <button onClick={() => toggleBookmark(item)} className={`wb-action-btn wb-action-save ${item.bookmarked ? 'saved' : ''}`}><Bookmark size={14} fill={item.bookmarked ? 'currentColor' : 'none'} /> {item.bookmarked ? 'Saved' : 'Save'}</button>
                </div>
              </article>
            ))}
          </div>
          {upNextPageCount > 1 && <nav className="pagination" aria-label="Start watching pages"><button onClick={() => setUpNextPage(p => Math.max(1, p - 1))} disabled={currentUpNextPage === 1} aria-label="Previous page"><ChevronLeft size={18} /></button>{Array.from({ length: upNextPageCount }, (_, i) => i + 1).map(n => <button key={n} className={currentUpNextPage === n ? 'active' : ''} aria-current={currentUpNextPage === n ? 'page' : undefined} onClick={() => setUpNextPage(n)}>{n}</button>)}<button onClick={() => setUpNextPage(p => Math.min(upNextPageCount, p + 1))} disabled={currentUpNextPage === upNextPageCount} aria-label="Next page"><ChevronRight size={18} /></button></nav>}
        </section>
      )}

      {externalResults.length > 0 && (
        <section className="wb-section">
          <div className="wb-section-head">
            <h2>TMDB Results</h2>
            <span className="wb-section-count">{externalResults.length} found</span>
          </div>
          <div className="wb-grid">
            {externalResults.map(result => {
              const actionKey = `tmdb:${result.type}:${result.id}`;
              const action = actions[actionKey] || {};
              const extItem = {
                id: `tmdb-${result.type}-${result.id}`,
                external: true,
                title: result.title,
                type: result.type === 'tv' ? 'series' : 'film',
                poster: result.poster,
                backdrop: result.backdrop,
                year: result.year,
                rating: result.rating,
                overview: result.overview,
                desc: result.overview,
                genres: result.genres || [],
                runtime: result.runtime || (result.type === 'tv' ? 45 : 120),
                tmdbId: result.id,
                mediaType: result.type,
                universe: 'tmdb',
                accent: '#4a5568',
                userStatus: action.status || 'unwatched',
                bookmarked: Boolean(action.bookmarked),
                _raw: result,
              };
              return (
                <article key={extItem.id} className="wb-card" style={{ '--accent': '#4a5568' }}>
                  <button className="wb-card-media" onClick={() => onPlayExternal(result)}>
                    <PosterArt item={extItem} />
                    <div className="wb-card-overlay">
                      <button className="wb-play-btn" onClick={(e) => { e.stopPropagation(); onPlayExternal(result); }} aria-label={`Watch ${result.title}`}>
                        <Play size={20} fill="currentColor" />
                      </button>
                    </div>
                  </button>
                  <div className="wb-card-info">
                    <button className="wb-card-title" onClick={() => onPlayExternal(result)}>{result.title}</button>
                    <div className="wb-card-meta">
                      <span>{result.year || 'Date TBA'} · {result.type === 'tv' ? 'Series' : 'Movie'}</span>
                      {result.rating && <span className="wb-rating-badge wb-tmdb"><Star size={10} fill="currentColor" />{result.rating}</span>}
                    </div>
                  </div>
                  <div className="wb-card-actions">
                    <button onClick={() => onPlayExternal(result)} className="wb-action-btn wb-action-primary"><Play size={14} fill="currentColor" /> Watch</button>
                    <StatusSelect item={extItem} setStatus={setStatus} compact />
                    <button onClick={() => toggleBookmark(extItem)} className={`wb-action-btn wb-action-icon ${extItem.bookmarked ? 'saved' : ''}`} aria-label={extItem.bookmarked ? 'Remove bookmark' : 'Bookmark title'}><Bookmark size={16} fill={extItem.bookmarked ? 'currentColor' : 'none'} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {inProgress.length === 0 && allUpNext.length === 0 && externalResults.length === 0 && !externalLoading && (
        <div className="wb-empty">
          <div className="wb-empty-icon"><Play size={32} /></div>
          <h2>Nothing to watch yet</h2>
          <p>Search above to find movies & shows in TMDB.</p>
        </div>
      )}
      {externalLoading && (
        <div className="wb-empty">
          <div className="wb-empty-icon"><Sparkles size={32} /></div>
          <p>Searching TMDB...</p>
        </div>
      )}
    </section>
  );
}

function WatchPage({ watchItem, activeItems, onBack, setStatus, toggleBookmark, onStartWatch, updateAction }) {
  const { item, tmdbId, mediaType } = watchItem;
  const [switching, setSwitching] = useState(false);
  const [toast, setToast] = useState('');
  const [contextExpanded, setContextExpanded] = useState(false);
  const [selectedServer, setSelectedServer] = useState('videasy'); // 'videasy' or 'moviepire'
  const currentItem = activeItems.find(i => i.id === item.id) || item;
  const isSeries = currentItem.type === 'series' && currentItem.tmdbId;
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(currentItem.epStart || 1);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const watchedEpisodes = currentItem.watchedEpisodes || [];

  const toggleEpisode = (epNum) => {
    const next = watchedEpisodes.includes(epNum)
      ? watchedEpisodes.filter(e => e !== epNum)
      : [...watchedEpisodes, epNum].sort((a, b) => a - b);
    updateAction(currentItem, { watchedEpisodes: next });
  };

  const episodeRangeTotal = currentItem.epEnd ? (currentItem.epEnd - (currentItem.epStart || 1) + 1) : episodes.length;
  const watchedInRange = watchedEpisodes.filter(episode => episode >= (currentItem.epStart || 1) && episode <= (currentItem.epEnd || Infinity));
  const allEpisodesWatched = episodeRangeTotal > 0 && watchedInRange.length >= episodeRangeTotal;

  useEffect(() => { setSelectedEpisode(currentItem.epStart || 1); setContextExpanded(false); }, [currentItem.id, currentItem.epStart]);

  useEffect(() => {
    if (!isSeries) { setEpisodes([]); return; }
    setEpisodeLoading(true);
    let cancelled = false;
    const season = currentItem.season || 1;
    fetch(`/api/tmdb/episodes?tmdbId=${currentItem.tmdbId}&season=${season}`, { cache: 'force-cache' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        if (data?.episodes) {
          const filtered = currentItem.epStart
            ? data.episodes.filter(ep => ep.episode >= (currentItem.epStart || 1) && ep.episode <= (currentItem.epEnd || 999))
            : data.episodes;
          setEpisodes(filtered);
          if (filtered.length) setSelectedEpisode(prev => filtered.find(e => e.episode === prev) ? prev : filtered[0].episode);
        }
        setEpisodeLoading(false);
      })
      .catch(() => { if (!cancelled) setEpisodeLoading(false); });
    return () => { cancelled = true; };
  }, [currentItem.tmdbId, currentItem.season, currentItem.epStart, currentItem.epEnd, isSeries]);

  const playerUrl = useMemo(() => buildPlayerUrl({
    provider: selectedServer,
    mediaType: currentItem.type === 'series' ? 'tv' : 'movie',
    tmdbId: currentItem.tmdbId || tmdbId,
    title: item.title,
    season: currentItem.season || 1,
    episode: isSeries ? selectedEpisode : undefined,
    progressSeconds: Math.floor((currentItem.watchedDuration || 0) / 1000),
  }), [selectedServer, currentItem.type, currentItem.tmdbId, currentItem.season, currentItem.watchedDuration, tmdbId, item.title, isSeries, selectedEpisode]);
  const roadmapInfo = useMemo(() => getRoadmap(currentItem, activeItems), [activeItems, currentItem]);

  const contextItems = useMemo(() => {
    const currentOrder = currentItem.order || currentItem.id;
    return activeItems.filter(i => {
      if (contextExpanded) return true;
      return Math.abs(i.order - currentOrder) <= 2;
    }).sort((a, b) => a.order - b.order);
  }, [activeItems, currentItem.order, currentItem.id, contextExpanded]);

  const upNext = roadmapInfo 
    ? roadmapInfo.nextInSequence.slice(0, 12)
    : (() => {
        // Smart suggestions: items after current in timeline order first, then upcoming
        const after = activeItems.filter(i => i.order > currentItem.order && i.id !== currentItem.id && i.userStatus !== 'watched' && i.userStatus !== 'dropped');
        const upcoming = activeItems.filter(i => i.id !== currentItem.id && i.userStatus !== 'watched' && i.userStatus !== 'dropped');
        // Deduplicate: prefer items after current, fill with upcoming
        const seen = new Set();
        const result = [];
        for (const i of after) { if (!seen.has(i.id) && i.userStatus !== 'dropped') { seen.add(i.id); result.push(i); } }
        for (const i of upcoming) { if (!seen.has(i.id)) { seen.add(i.id); result.push(i); } }
        return result.slice(0, 12);
      })();
  const totalMs = (item.runtime || 120) * 60 * 1000;
  const initialElapsed = Math.min(currentItem.watchedDuration || 0, totalMs);
  const [elapsed, setElapsed] = useState(initialElapsed);
  const elapsedRef = useRef(elapsed);
  const progress = Math.min((elapsed / totalMs) * 100, 100);
  const isComplete = progress >= 90;

  const itemRef = useRef(item);
  const updateActionRef = useRef(updateAction);
  const setStatusRef = useRef(setStatus);

  useEffect(() => { itemRef.current = item; }, [item]);
  useEffect(() => { updateActionRef.current = updateAction; }, [updateAction]);
  useEffect(() => { setStatusRef.current = setStatus; }, [setStatus]);

  const handleBack = useCallback(() => {
    updateActionRef.current(itemRef.current, { watchedDuration: elapsedRef.current, watchStartedAt: null });
    onBack();
  }, [onBack]);

  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') handleBack(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleBack]);

  useEffect(() => {
    setElapsed(Math.min(currentItem.watchedDuration || 0, totalMs));
    const interval = setInterval(() => setElapsed(prev => prev + 1000), 1000);
    return () => clearInterval(interval);
  }, [currentItem.id, totalMs]);

  useEffect(() => {
    const save = setInterval(() => {
      updateActionRef.current(itemRef.current, { watchedDuration: elapsedRef.current });
    }, 15000);
    return () => {
      clearInterval(save);
      updateActionRef.current(itemRef.current, { watchedDuration: elapsedRef.current, watchStartedAt: null });
    };
  }, []);

  useEffect(() => {
    if (isComplete && currentItem.userStatus === 'watching') {
      setStatusRef.current(currentItem, 'watched');
    }
  }, [isComplete, currentItem.userStatus, currentItem.id]);

  useEffect(() => {
    if (isSeries && allEpisodesWatched && currentItem.userStatus === 'watching') {
      setStatusRef.current(currentItem, 'watched');
    }
  }, [isSeries, allEpisodesWatched, currentItem.userStatus, currentItem.id]);

  const handleSwitchItem = async (rec) => {
    if (switching) return;
    updateAction(item, { watchedDuration: elapsedRef.current, watchStartedAt: null });
    if (rec.tmdbId) {
      onStartWatch(rec, rec.tmdbId, rec.type === 'series' ? 'tv' : 'movie');
      return;
    }
    setSwitching(true);
    try {
      const params = new URLSearchParams({ title: rec.title, year: String(rec.year || '') });
      const res = await fetch(`/api/tmdb/poster?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tmdbId) { onStartWatch(rec, data.tmdbId, data.mediaType === 'tv' ? 'tv' : 'movie'); return; }
      }
    } catch {}
    onStartWatch(rec, rec.tmdbId || null, rec.type === 'series' ? 'tv' : 'movie');
    setSwitching(false);
  };
  return (
    <section className="watch-page" style={{ '--accent': currentItem.accent }}>
      <header className="watch-header">
        <button onClick={handleBack} aria-label="Back to browsing"><ChevronLeft size={22} /> <span>Back</span></button>
        <div>
          <span className="watch-kicker">{currentItem.universe === 'marvel' ? 'MCU' : 'DC'} · #{String(currentItem.order || currentItem.id).padStart(2, '0')}</span>
          <h1>{currentItem.title}</h1>
        </div>
        <label className="watch-server-select">
          <Cloud size={15} aria-hidden="true" />
          <span>Server</span>
          <ServerDropdown server={selectedServer} onSelect={setSelectedServer} />
        </label>
      </header>
      {toast && <div className="watch-toast">{toast}</div>}
      <div className="watch-player">
        <iframe key={`${selectedServer}-${isSeries ? `ep-${currentItem.tmdbId}-${currentItem.season || 1}-${selectedEpisode}` : currentItem.tmdbId || item.id}`} src={playerUrl} title={`Watch ${item.title}`} frameBorder="0" allowFullScreen allow="encrypted-media" />
      </div>
      <div className="watch-progress-bar"><span style={{ width: `${progress}%` }} /></div>
      {isSeries && episodes.length > 0 && (
        <div className="watch-episode-picker">
          <span className="watch-episode-label">{episodeLoading ? 'Loading...' : `${watchedInRange.length}/${episodeRangeTotal} watched`}</span>
          <div className="watch-episode-list">
            {episodes.map(ep => {
              const isWatched = watchedEpisodes.includes(ep.episode);
              const isSelected = selectedEpisode === ep.episode;
              return <button
                key={ep.episode}
                className={`watch-episode-row ${isWatched ? 'watched' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => { setSelectedEpisode(ep.episode); toggleEpisode(ep.episode); }}
              >
                <span className="watch-ep-num">{String(ep.episode).padStart(2, '0')}</span>
                <span className="watch-ep-title">{ep.title}</span>
                <span className="watch-ep-check">{isWatched ? <Check size={15} /> : <Play size={15} />}</span>
              </button>;
            })}
          </div>
        </div>
      )}
      {roadmapInfo ? (
        <section className="watch-roadmap">
          <div className="section-title"><div><p className="eyebrow">Recommended sequence</p><h2>Viewing roadmap</h2></div><span className="roadmap-summary">{roadmapInfo.complete}/{roadmapInfo.siblings.length} parts watched</span></div>
          <div className="roadmap-timeline">
            {roadmapInfo.segments.map((seg, idx) => {
              if (seg.type === 'part') {
                const partNum = roadmapInfo.segments.filter((s, i) => s.type === 'part' && i <= idx).length;
                return (
                  <button
                    key={seg.item.id}
                    className={`roadmap-part ${seg.isActive ? 'active' : ''} ${seg.item.userStatus === 'watched' ? 'watched' : ''}`}
                    onClick={() => handleSwitchItem(seg.item)}
                    style={{ '--accent': seg.item.accent }}
                  >
                    <span className="roadmap-part-dot" />
                    <div className="roadmap-part-poster">
                      {seg.item.poster ? <img src={seg.item.poster} alt={seg.item.title} loading="lazy" /> : <FallbackPoster item={seg.item} />}
                    </div>
                    <div className="roadmap-part-info">
                      <span className="roadmap-part-badge">{seg.item.userStatus === 'watched' ? 'Watched' : seg.isActive ? 'Now playing' : `Part ${partNum}`}{seg.item.season ? ` · Season ${seg.item.season}` : ''}</span>
                      <span className="roadmap-part-name">{seg.item.title.replace(/^Agents of SHIELD S\d+ /, '')}</span>
                      <span className="roadmap-part-meta">{seg.item.year} · {runtimeLabel(seg.item.runtime, seg.item.type)}</span>
                    </div>
                  </button>
                );
              } else {
                return (
                  <div key={`int-${idx}`} className="roadmap-interstitial">
                    <div className="roadmap-inter-header">
                      <ChevronRight size={14} className="chevron" />
                      <span>connected stories</span>
                      <ChevronRight size={14} className="chevron" />
                    </div>
                    <div className="roadmap-inter-items">
                      {seg.items.map(intItem => (
                        <button
                          key={intItem.id}
                          className="roadmap-inter-card"
                          onClick={() => handleSwitchItem(intItem)}
                          style={{ '--accent': intItem.accent }}
                        >
                          <div className="roadmap-inter-poster">
                            {intItem.poster ? <img src={intItem.poster} alt={intItem.title} loading="lazy" /> : <FallbackPoster item={intItem} />}
                          </div>
                          <span className="roadmap-inter-title">{intItem.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </section>
      ) : (
        <section className="watch-roadmap">
          <div className="section-title"><div><p className="eyebrow">Story context</p><h2>Viewing order</h2></div><span className="roadmap-summary">#{String(currentItem.order || currentItem.id).padStart(2, '0')} of {activeItems.length}</span></div>
          <div className="roadmap-timeline">
            {contextItems.map(item => (
              <button
                key={item.id}
                className={`roadmap-part ${item.id === currentItem.id ? 'active' : ''} ${item.userStatus === 'watched' ? 'watched' : ''}`}
                onClick={() => item.id !== currentItem.id && handleSwitchItem(item)}
                style={{ '--accent': item.accent, cursor: item.id === currentItem.id ? 'default' : 'pointer' }}
              >
                <span className="roadmap-part-dot" />
                <div className="roadmap-part-poster">
                  {item.poster ? <img src={item.poster} alt={item.title} loading="lazy" /> : <FallbackPoster item={item} />}
                </div>
                <div className="roadmap-part-info">
                  <span className="roadmap-part-badge">{item.userStatus === 'watched' ? 'Watched' : item.id === currentItem.id ? 'Now playing' : item.order < currentOrder ? 'Previous' : 'Next'}</span>
                  <span className="roadmap-part-name">{item.title}</span>
                  <span className="roadmap-part-meta">{item.year} · {runtimeLabel(item.runtime, item.type)}</span>
                </div>
              </button>
            ))}
          </div>
          {activeItems.length > 5 && (
            <button className="roadmap-expand-btn" onClick={() => setContextExpanded(!contextExpanded)}>
              {contextExpanded ? 'Show less' : `View full timeline (${activeItems.length} titles)`}
              <ChevronDown size={14} style={{ transform: contextExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
            </button>
          )}
        </section>
      )}
      <div className="watch-info">
        <div className="watch-meta">
          <span>{currentItem.year}</span>
          <span>·</span>
          <span>{runtimeLabel(currentItem.runtime, currentItem.type)}</span>
          <span>·</span>
          <span className="watch-rating"><Star size={14} fill="currentColor" /> {currentItem.rating?.toFixed ? currentItem.rating.toFixed(1) : (currentItem.rating ?? 'N/A')}</span>
        </div>
        <p className="watch-desc">{currentItem.desc || `Watch ${currentItem.title} in the complete ${currentItem.universe === 'marvel' ? 'Marvel Cinematic Universe' : 'DC Universe'} viewing order.`}</p>
        <div className="watch-actions">
          <StatusSelect item={currentItem} setStatus={setStatus} />
          <button onClick={() => toggleBookmark(currentItem)} className={`watch-action-btn ${currentItem.bookmarked ? 'saved' : ''}`} aria-label={currentItem.bookmarked ? 'Remove bookmark' : 'Save title'}><Bookmark size={18} fill={currentItem.bookmarked ? 'currentColor' : 'none'} /></button>
          <span className="watch-age-badge">{currentItem.ageRating || (currentItem.type === 'series' ? 'TV-14' : 'PG-13')}</span>
          {currentItem.userStatus !== 'watched' && <button onClick={() => { setStatus(currentItem, 'watched'); setToast('Marked as watched'); setTimeout(() => setToast(''), 2000); }} className="watch-action-btn mark-watched" aria-label="Mark as Watched"><Check size={18} /><span>Mark Watched</span></button>}
        </div>
      </div>
      {upNext.length > 0 && (
        <div className="watch-upnext">
          <h2>Up Next</h2>
          <div className="watch-upnext-rail">
            {upNext.map(rec => (
              <button key={rec.id} className="watch-rec-card" onClick={() => handleSwitchItem(rec)} style={{ '--accent': rec.accent }}>
                <div className="watch-rec-poster">
                  {rec.poster ? <img src={rec.poster} alt={rec.title} width="200" height="284" loading="lazy" /> : <FallbackPoster item={rec} />}
                </div>
                <span>{rec.title}</span>
                <small>{rec.year}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const AGE_RATINGS = ['PG-13', 'R', 'TV-14', 'TV-PG', 'TV-MA', 'Not Rated'];

function Filters({ genre, setGenre, rating, setRating, ageRatingFilter, setAgeRatingFilter, sortBy, setSortBy, sortDirection, setSortDirection, typeFilter, setTypeFilter, genres, count, onClose }) {
  const SORT_OPTIONS = [
    { value: 'order', label: 'Viewing Order' },
    { value: 'rating', label: 'TMDB Rating' },
    { value: 'imdb', label: 'IMDb Rating' },
    { value: 'tomato', label: 'Rotten Tomatoes' },
    { value: 'meta', label: 'Metacritic' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'year', label: 'Release Year' },
    { value: 'title', label: 'Title A–Z' },
  ];
  const TYPE_OPTIONS = ['All', 'Movies', 'Series'];
  const activeFilters = [genre !== 'All', rating > 0, ageRatingFilter !== 'All', typeFilter !== 'All', sortBy !== 'order'].filter(Boolean).length;
  return <aside className="filter-screen web-filter">
    <div className="filter-head">
      <button className="filter-clear-btn" onClick={() => { setGenre('All'); setRating(0); setAgeRatingFilter('All'); setTypeFilter('All'); setSortBy('order'); setSortDirection('desc'); }} disabled={activeFilters === 0}>Clear All{activeFilters > 0 && <span>{activeFilters}</span>}</button>
      <div className="filter-head-center"><b>Filters & Sorting</b><span>{count} results</span></div>
      <button className="filter-close-btn" onClick={onClose} aria-label="Close filters"><X size={20} /></button>
    </div>

    <div className="filter-body">
      <section className="filter-section">
        <div className="filter-section-header"><h3>Sort by</h3><div className="sort-direction-toggle" role="group" aria-label="Sort direction">
          <button className={sortDirection === 'desc' ? 'active' : ''} onClick={() => setSortDirection('desc')} title="Highest first">↓</button>
          <button className={sortDirection === 'asc' ? 'active' : ''} onClick={() => setSortDirection('asc')} title="Lowest first">↑</button>
        </div></div>
        <div className="filter-sort-grid">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.value} className={`filter-sort-chip ${sortBy === opt.value ? 'selected' : ''}`} onClick={() => setSortBy(opt.value)}>
              {opt.label}
              {sortBy === opt.value && <Check size={14} />}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Type</h3>
        <div className="filter-chip-row">
          {TYPE_OPTIONS.map(t => (
            <button key={t} className={`filter-chip ${typeFilter === t ? 'selected' : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Genre</h3>
        <div className="filter-chip-row">
          {genres.map(g => (
            <button key={g} className={`filter-chip ${genre === g ? 'selected' : ''}`} onClick={() => setGenre(g === genre ? 'All' : g)}>{g}</button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Minimum Rating</h3>
        <div className="filter-chip-row">
          {[{ value: 0, label: 'Any' }, { value: 8, label: '8+' }, { value: 7, label: '7+' }, { value: 6, label: '6+' }].map(r => (
            <button key={r.value} className={`filter-chip ${rating === r.value ? 'selected' : ''}`} onClick={() => setRating(r.value)}>{r.label}</button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Age Rating</h3>
        <div className="filter-chip-row">
          {[{ value: 'All', label: 'All' }, ...AGE_RATINGS.map(r => ({ value: r, label: r }))].map(a => (
            <button key={a.value} className={`filter-chip ${ageRatingFilter === a.value ? 'selected' : ''}`} onClick={() => setAgeRatingFilter(a.value)}>{a.label}</button>
          ))}
        </div>
      </section>
    </div>

    <div className="filter-footer">
      <button className="filter-results-btn" onClick={onClose}>Show {count} results</button>
    </div>
  </aside>;
}

/* ── Footer ──────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-col">
          <h4>Disclaimer</h4>
          <p>This website does not host, store, or distribute any video files, media content, or copyrighted material. All content is provided by third-party services and is the property of their respective owners.</p>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <p>This site operates under the principles of fair use and does not intend to infringe upon any copyrights. If you believe your copyrighted work has been used inappropriately, please contact the respective third-party provider directly. We comply with DMCA and take intellectual property rights seriously.</p>
        </div>
        <div className="footer-col">
          <h4>Data Attribution</h4>
          <p>Movie and series metadata, including posters, ratings, and descriptions, are sourced from <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>&copy; {new Date().getFullYear()} Cinematic Viewing Order. All rights reserved.</span>
        <span>Not affiliated with Marvel, DC, Disney, Warner Bros., or any film studio.</span>
      </div>
    </footer>
  );
}
