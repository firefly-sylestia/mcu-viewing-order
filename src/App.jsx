import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, House, Bookmark, Play, UserRound, X, ArrowLeft, Star, BarChart3, Check, Clock, ListFilter, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, Timer, Sparkles, LogOut, Cloud, Download, Camera, Info, ShieldAlert, Clapperboard, ArrowUpDown, ExternalLink } from 'lucide-react';
import { RAW } from './data/mcuData';
import { DC_RAW } from './data/dcData';
import { XMEN_RAW } from './data/xmenData';
import { SONY_RAW } from './data/sonyData';
import { getTrailerByTitle, trailerEmbedUrl } from './data/trailerData';
import { STORY_BRIDGES } from './data/connections';
import { STORY_ORDER_OVERRIDES, DOOMSDAY_SECRET_WARS_TITLES, getTitleGuidance } from './data/timelineModes';
import ProfilePage from './components/ProfilePage';
import AuthModal from './components/AuthModal';
import SeoHead from './components/SeoHead';
import NotFoundPage from './components/NotFoundPage';
import { useAuth } from './hooks/useAuth';
import { useCloudSync } from './hooks/useCloudSync';
import { configured as firebaseReady } from './firebase';
import { getFromCache, setCache, clearExpiredCache } from './utils/mediaCache';
import { buildDownloadUrl, buildPlayerUrl } from './utils/mediaProviders';
import { apiUrl, assetUrl, isOffline } from './utils/apiBase';
import { hapticTap, hapticSelect, hapticSuccess, hapticWarning } from './utils/haptics';
import { UNIVERSE_LOGOS } from './constants/logos';
import './index.css';
import './styles/fresh.css';

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
const sonyPalette = ['#16305c', '#1b3f7a', '#1f4f96', '#245fb4', '#2c72cf', '#3b8ae6'];

const NAV_ORDER = ['home', 'list', 'analytics', 'watch', 'profile'];
// The watch page is parked for now: its tab and entry points are hidden, the code stays intact.
const WATCH_ENABLED = false;
const NAV_TAB_META = {
  home: { label: 'Home', Icon: House },
  list: { label: 'List', Icon: ListFilter },
  analytics: { label: 'Stats', Icon: BarChart3 },
  watch: { label: 'Watch', Icon: Play },
  profile: { label: 'Profile', Icon: UserRound },
};
const NAV_VISIBLE = NAV_ORDER.filter((id) => WATCH_ENABLED || id !== 'watch');
const SORT_LABELS = { order: 'Order', phase: 'Phase', rating: 'Rating', imdb: 'IMDb', tomato: 'Tomato', meta: 'Meta', popularity: 'Popular', year: 'Year', title: 'Title', essential: 'Essential' };
const universeFullName = (value) => value === 'marvel' ? 'Marvel Cinematic Universe' : value === 'xmen' ? 'X-Men Universe' : value === 'sony' ? 'Sony Spider-Man Universe' : 'DC Universe';
const universeShortName = (value) => value === 'marvel' ? 'MCU' : value === 'xmen' ? 'X-Men' : value === 'sony' ? 'Sony' : 'DC';
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

const posterFromManifest = (item, manifest) => {
  // These two legacy-series posters are deliberately pinned to their bundled
  // files so stale remote metadata/cache entries cannot hide the local artwork.
  const pinned = {
    134: '134-cloak-and-dagger-s1.jpg',
    143: '143-cloak-and-dagger-s2.jpg',
  }[Number(item?.id)];
  const value = pinned || manifest?.byId?.[String(item.id)] || manifest?.byTitle?.[item.title];
  if (!value) return '';
  return value.startsWith('http') ? value : assetUrl(`/posters/${value}`);
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
  accent: universe === 'dc' ? dcPalette[(item.phase - 1) % dcPalette.length] : universe === 'xmen' ? xmenPalette[(item.phase - 1) % xmenPalette.length] : universe === 'sony' ? sonyPalette[(item.phase - 1) % sonyPalette.length] : marvelPalette[(item.phase - 1) % marvelPalette.length],
});

export default function App() {
  const saved = useMemo(readSavedState, []);
  const [universe, setUniverse] = useState(saved.universe || 'marvel');
  const [query, setQuery] = useState(saved.query || '');
  const [externalSearchResults, setExternalSearchResults] = useState([]);
  const [externalSearchLoading, setExternalSearchLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Interface variant (classic | fresh | control) is chosen in Settings; applied on the root.
  const [uiVariant, setUiVariant] = useState(() => {
    try { return localStorage.getItem('ui-variant') || 'fresh'; } catch { return 'fresh'; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-ui', uiVariant);
  }, [uiVariant]);
  useEffect(() => {
    const onVariant = (event) => setUiVariant(event.detail || 'fresh');
    window.addEventListener('ui-variant-changed', onVariant);
    return () => window.removeEventListener('ui-variant-changed', onVariant);
  }, []);
  const [selected, setSelected] = useState(null);
  const [genre, setGenre] = useState(saved.genre || 'All');
  const [rating, setRating] = useState(saved.rating || 0);
  const [ageRatingFilter, setAgeRatingFilter] = useState(saved.ageRatingFilter || 'All');
  const [sortBy, setSortBy] = useState(saved.sortBy || 'order');
  const [sortDirection, setSortDirection] = useState('asc');
  const [phaseFilter, setPhaseFilter] = useState(saved.phaseFilter || 'All');
  const [phaseMenuOpen, setPhaseMenuOpen] = useState(false);
  const phaseButtonRef = useRef(null);
  const [phaseMenuPosition, setPhaseMenuPosition] = useState({ top: 0, left: 0 });
  const [typeFilter, setTypeFilter] = useState(saved.typeFilter || 'All');
  const [heroIndex, setHeroIndex] = useState(saved.heroIndex || 0);
  const [section, setSection] = useState(parseHash().section || saved.section || 'home');
  const [navHoldIndex, setNavHoldIndex] = useState(null);
  const [navHolding, setNavHolding] = useState(false);
  const navRef = useRef(null);
  const navHoldTimer = useRef(null);
  const navDragRef = useRef(false);
  const navHoldIndexRef = useRef(null);
  const navSwallowClick = useRef(false);
  const navPointerStart = useRef(null);
  const navIndexOf = (clientX) => {
    const nav = navRef.current;
    if (!nav) return 0;
    const buttons = Array.from(nav.querySelectorAll('button'));
    let best = 0;
    let bestDistance = Infinity;
    buttons.forEach((button, i) => {
      const rect = button.getBoundingClientRect();
      const distance = Math.abs(clientX - (rect.left + rect.width / 2));
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    });
    return best;
  };
  const clearNavHoldTimer = () => {
    if (navHoldTimer.current) { window.clearTimeout(navHoldTimer.current); navHoldTimer.current = null; }
  };
  const resetNavHold = () => {
    clearNavHoldTimer();
    navPointerStart.current = null;
    navDragRef.current = false;
    navHoldIndexRef.current = null;
    setNavHoldIndex(null);
    setNavHolding(false);
  };
  const handleNavPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    navPointerStart.current = { x: event.clientX, y: event.clientY };
    const startIndex = navIndexOf(event.clientX);
    const pointerId = event.pointerId;
    clearNavHoldTimer();
    navHoldTimer.current = window.setTimeout(() => {
      // Capture only once the hold is real: capturing on pointerdown retargets
      // the click to the nav and swallowed every plain tap.
      try { navRef.current?.setPointerCapture(pointerId); } catch (error) { /* capture is optional */ }
      navDragRef.current = true;
      navHoldIndexRef.current = startIndex;
      setNavHoldIndex(startIndex);
      setNavHolding(true);
      hapticTap();
    }, 190);
  };
  const handleNavPointerMove = (event) => {
    if (!navDragRef.current) {
      const start = navPointerStart.current;
      if (start && Math.abs(event.clientX - start.x) > 12) clearNavHoldTimer();
      return;
    }
    event.preventDefault();
    const index = navIndexOf(event.clientX);
    if (navHoldIndexRef.current !== index) {
      navHoldIndexRef.current = index;
      setNavHoldIndex(index);
      hapticTap();
    }
  };
  const handleNavPointerUp = (event) => {
    const wasHolding = navDragRef.current;
    clearNavHoldTimer();
    navPointerStart.current = null;
    if (!wasHolding) return;
    const index = navHoldIndexRef.current ?? navIndexOf(event.clientX);
    navSwallowClick.current = true;
    window.setTimeout(() => { navSwallowClick.current = false; }, 80);
    resetNavHold();
    const target = NAV_VISIBLE[index];
    if (target) { setSection(target); if (target === 'home') setWatchItem(null); }
  };
  const handleNavClick = (id) => {
    if (navSwallowClick.current) return;
    hapticTap();
    setSection(id);
    if (id === 'home') setWatchItem(null);
  };
  useEffect(() => {
    if (!WATCH_ENABLED && section === 'watch') setSection('home');
  }, [section]);
  // :active sticks on touch hardware, so the press glow is driven by pointer
  // events with a hard cleanup: it always fades back on release.
  useEffect(() => {
    let pressed = null;
    let timer = null;
    const release = () => {
      if (timer) { window.clearTimeout(timer); timer = null; }
      if (!pressed) return;
      const node = pressed;
      pressed = null;
      node.classList.remove('is-pressed');
    };
    const handleDown = (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const node = target.closest('button, a, [role="button"], .movie-card, .list-row');
      if (!node || node.disabled) return;
      release();
      pressed = node;
      node.classList.add('is-pressed');
      timer = window.setTimeout(release, 520);
    };
    document.addEventListener('pointerdown', handleDown, true);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', release);
    return () => {
      document.removeEventListener('pointerdown', handleDown, true);
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', release);
      if (timer) window.clearTimeout(timer);
    };
  }, []);
  const [actions, setActions] = useState(saved.actions || {});
  const [posterMap, setPosterMap] = useState({});
  const [omdbVersion, setOmdbVersion] = useState(0);
  const [trailer, setTrailer] = useState(null);
  const [watchItem, setWatchItem] = useState(saved.watchItem || null);
  const [profileName, setProfileName] = useState(saved.profileName || '');
  const [authOpen, setAuthOpen] = useState(false);
  const [watchConfirmSkipped, setWatchConfirmSkipped] = useState(() => localStorage.getItem('watch-confirm-skipped') === '1');
  const [nativePlayer, setNativePlayer] = useState(() => localStorage.getItem('native-player') === '1');
  const [adBlockerDismissed, setAdBlockerDismissed] = useState(() => localStorage.getItem('adblocker-dismissed') === '1');
  const [watchConfirmItem, setWatchConfirmItem] = useState(null); // { item, tmdbId, mediaType, onConfirm }
  const [warningToast, setWarningToast] = useState('');
  const { user, login, signup, googleSignIn, anonymousSignIn, logout: authLogout, resetPassword, configured } = useAuth();
  const { pushToCloud, pushBeforeLogout, lastSynced, syncing, conflict, resolveUseRemote, resolveKeepLocal, toast } = useCloudSync(user, actions, profileName, setActions, setProfileName, watchItem, setWatchItem);
  const showWarningToast = useCallback((item) => {
  const guidance = getTitleGuidance(item);
  if (!guidance) return;
  setWarningToast(`${guidance.label}: ${guidance.note}`);
    window.clearTimeout(showWarningToast.timer);
    showWarningToast.timer = window.setTimeout(() => setWarningToast(''), 5200);
  }, []);

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

  const allItems = useMemo(() => [...RAW.map(item => enhance(item, 'marvel')), ...DC_RAW.map(item => enhance(item, 'dc')), ...XMEN_RAW.map(item => enhance(item, 'xmen')), ...SONY_RAW.map(item => enhance(item, 'sony'))], []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ universe, query, genre, rating, ageRatingFilter, sortBy, sortDirection, phaseFilter, typeFilter, actions, section, watchItem, profileName, heroIndex }));
  }, [universe, query, genre, rating, ageRatingFilter, sortBy, sortDirection, phaseFilter, typeFilter, actions, section, watchItem, profileName, heroIndex]);

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
    fetch(assetUrl('posters/posters.json'), { cache: 'force-cache' })
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
    const ck = metadataCacheKey(item) || `omdb:${item.id}`;
    const cached = getFromCache(ck);
    if (cached) {
      if (!poster && cached.poster) poster = cached.poster;
      if (cached.rating) rating = cached.rating;
      if (cached.imdbRating) imdbRating = cached.imdbRating;
      if (cached.tomatoRating) tomatoRating = cached.tomatoRating;
      if (cached.metaRating) metaRating = cached.metaRating;
      if (cached.voteCount) voteCount = cached.voteCount;
    }
    
    if ([134, 143].includes(Number(item.id))) poster = posterFromManifest(item, posterMap) || poster;
    else if (!poster) poster = posterFromManifest(item, posterMap);

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
  }, [actions, posterMap, omdbVersion]);

  const activeItems = useMemo(() => {
    const effectiveRating = (item) => Number(item.rating) || Number(item.imdbRating) || 0;
    const sorted = allItems
      .filter(item => item.universe === universe)
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
      .filter(item => genre === 'All' || item.genres.includes(genre) || item.type === genre.toLowerCase())
      .filter(item => ageRatingFilter === 'All' || (item.ageRating || (item.type === 'series' ? 'TV-14' : 'PG-13')) === ageRatingFilter)
      .filter(item => phaseFilter === 'All' || String(item.phase || '') === String(phaseFilter))
  .filter(item => typeFilter === 'All' || (typeFilter === 'Movies' ? item.type === 'film' : item.type === 'series'))
  .filter(item => sortBy !== 'doomsday-secret-wars' || DOOMSDAY_SECRET_WARS_TITLES.has(item.title))
  .filter(item => sortBy !== 'essential' || item.essential)
  .map(enrichItem)
  .filter(item => effectiveRating(item) >= rating);
  const timelineRank = (item) => {
    if (sortBy === 'chronological') return Number(item.storyYear || item.year || 9999) * 1000 + item.order;
    if (sortBy === 'doomsday-secret-wars') return STORY_ORDER_OVERRIDES.get(item.title) ?? item.order;
    return item.order;
  };
  sorted.sort((a, b) => {
  const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'phase') return ((Number(a.phase) || 99) - (Number(b.phase) || 99)) * dir;
  if (sortBy === 'year') return (a.year - b.year) * (sortDirection === 'asc' ? 1 : -1);
      if (sortBy === 'title') return a.title.localeCompare(b.title) * (sortDirection === 'asc' ? 1 : -1);
      if (sortBy === 'rating') return (effectiveRating(a) - effectiveRating(b)) * dir;
      if (sortBy === 'imdb') return ((Number(a.imdbRating) || 0) - (Number(b.imdbRating) || 0)) * dir;
      if (sortBy === 'tomato') return ((parseInt(a.tomatoRating) || 0) - (parseInt(b.tomatoRating) || 0)) * dir;
      if (sortBy === 'meta') return ((parseInt(a.metaRating) || 0) - (parseInt(b.metaRating) || 0)) * dir;
      if (sortBy === 'popularity') return ((Number(a.voteCount) || 0) - (Number(b.voteCount) || 0)) * dir;
      return (timelineRank(a) - timelineRank(b)) * dir;
    });
    return sorted;
  }, [allItems, universe, query, genre, rating, ageRatingFilter, sortBy, sortDirection, phaseFilter, typeFilter, enrichItem]);

  // Unfiltered items (no search/filter) for WatchPage/WatchBrowse suggestions
  const roadmapItems = useMemo(() => {
    const sorted = allItems.filter(item => item.universe === universe).map(enrichItem);
    sorted.sort((a, b) => a.order - b.order);
    return sorted;
  }, [allItems, universe, enrichItem]);

  const unfilteredItems = useMemo(
    () => roadmapItems,
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
        const response = await fetch(apiUrl(`/api/tmdb/search?q=${encodeURIComponent(query)}`));
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
    // Offline (or a flaky APK connection) — keep the bundled posters we already
    // have instead of burning through requests and marking titles as failed.
    if (isOffline()) return undefined;
    const missing = activeItems.filter(item => {
      const cached = item.tmdbId ? getFromCache(metadataCacheKey(item)) : null;
      return !item.poster && !cached && !posterFromManifest(item, posterMap) && !failedRef.current.has(item.id);
    }).slice(0, 15);
    
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
          const response = await fetch(apiUrl(`/api/tmdb/description?${params.toString()}`));
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
          const searchResponse = await fetch(apiUrl(`/api/tmdb/search?${searchParams.toString()}`));
          
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
                  imdbId: data.imdbId || existing.imdbId,
                  voteCount: data.voteCount || existing.voteCount || 0,
                  releaseDate: data.releaseDate,
                  mediaType: data.mediaType,
                });
              
              console.log(`[v0] Successfully fetched poster for ${item.title}`);
              
              // Fire-and-forget: fetch IMDb rating from OMDb (only if not already cached)
              if (!hadImdb) {
                const omdbParams = new URLSearchParams({ title: item.title, year: String(item.year || '') });
                if (data.imdbId) omdbParams.set('imdbId', data.imdbId);
                fetch(apiUrl(`/api/omdb/rating?${omdbParams.toString()}`))
                  .then(r => r.json())
                  .then(omdb => {
                    if (omdb.rating || omdb.tomatoRating || omdb.metaRating) {
                      const cur = getFromCache(cacheKey) || {};
                      setCache(cacheKey, { ...cur, imdbRating: omdb.rating, tomatoRating: omdb.tomatoRating || cur.tomatoRating, metaRating: omdb.metaRating ? String(parseInt(omdb.metaRating)) : (cur.metaRating || '') });
                      setOmdbVersion(v => v + 1);
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

  // Slicing 6 items is cheap; do NOT memoize-by-id-only — items keep mutating as posters,
  // ratings, and user state load async, and an id-keyed freeze would lock the carousel to
  // the first-pass objects (poster-less) forever.
  const heroItems = useMemo(() => activeItems.slice(0, 6), [activeItems]);

  // Fetch OMDb ratings (IMDb, Rotten Tomatoes, Metacritic) for ALL items
  // Items visible on screen are prioritised so the ratings users see populate first.
  const omdbFetchedRef = useRef(new Set());
  useEffect(() => {
    // Build a priority-ordered list: items likely on screen come first so they get
    // their ratings before off-screen items further down the timeline.
    const seen = new Set();
    const ordered = [];
    const gather = (items) => {
      for (const item of items) {
        if (!seen.has(item.id)) { seen.add(item.id); ordered.push(item); }
      }
    };

    if (section === 'home') {
      gather(heroItems);                                                        // Hero carousel
      gather(activeItems.filter(i => i.userStatus === 'unwatched').slice(0, 10)); // Up next rail
      gather(activeItems.filter(i => i.userStatus === 'watching'));              // Continue watching
      gather(activeItems.filter(i => i.essential));                              // Essential picks
      gather(activeItems.filter(i => i.userStatus === 'watched').slice(-24).reverse()); // Recently watched
      gather(activeItems);                                                      // Everything else
    } else {
      gather(activeItems);
    }

    const needRatings = ordered.filter(item => {
      const ck = metadataCacheKey(item) || `omdb:${item.id}`;
      if (omdbFetchedRef.current.has(ck)) return false;
      const cached = getFromCache(ck);
      return !cached || (!cached.imdbRating && !cached.tomatoRating && !cached.metaRating);
    }).slice(0, 12);
    if (!needRatings.length) return;
    let cancelled = false;
    const fetchOmdbBatch = async (idx) => {
      if (cancelled || idx >= needRatings.length) return;
      const batch = needRatings.slice(idx, idx + 2);
      await Promise.allSettled(batch.map(async (item) => {
        const ck = metadataCacheKey(item) || `omdb:${item.id}`;
        try {
          // Use cached IMDb ID for more reliable OMDb lookup if available
          const cached = getFromCache(ck) || {};
          const omdbParams = new URLSearchParams({ title: item.title, year: String(item.year || '') });
          if (cached.imdbId) omdbParams.set('imdbId', cached.imdbId);
          const r = await fetch(apiUrl(`/api/omdb/rating?${omdbParams.toString()}`));
          // Mark as fetched immediately so rate-limited or empty responses don't cause
          // infinite retry loops within the same session. The next page load resets
          // omdbFetchedRef so un-cached items will be retried automatically.
          omdbFetchedRef.current.add(ck);
          if (!r.ok) return;
          const omdb = await r.json();
          if (omdb.rating || omdb.tomatoRating || omdb.metaRating) {
            const cur = getFromCache(ck) || {};
            setCache(ck, { ...cur, imdbRating: omdb.rating || cur.imdbRating, tomatoRating: omdb.tomatoRating || cur.tomatoRating, metaRating: omdb.metaRating ? String(parseInt(omdb.metaRating)) : (cur.metaRating || '') });
          }
        } catch {}
      }));
      if (!cancelled) { setOmdbVersion(v => v + 1); setTimeout(() => fetchOmdbBatch(idx + 2), 500); }
    };
    fetchOmdbBatch(0);
    return () => { cancelled = true; };
  }, [activeItems, section, heroItems]);
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
  const setStatus = (item, status) => {
    if (status === 'watched') hapticSuccess(); else hapticSelect();
    updateAction(item, { status });
  };
  const toggleWatched = (item) => setStatus(item, item.userStatus === 'watched' ? 'unwatched' : 'watched');
  const togglePhaseWatched = (phase) => {
  const phaseItems = allItems
    .filter(item => item.universe === universe && String(item.phase) === String(phase))
    .map(enrichItem);
  const shouldWatch = phaseItems.some(item => item.userStatus !== 'watched');
  setActions(prev => phaseItems.reduce((next, item) => {
    const key = mediaKey(item);
    const existing = next[key] || next[item.id] || {};
    return { ...next, [key]: { ...existing, status: shouldWatch ? 'watched' : 'unwatched' } };
  }, { ...prev }));
  };
  const toggleBookmark = (item) => {
    const next = !(actions[mediaKey(item)]?.bookmarked || actions[item.id]?.bookmarked);
    if (next) hapticSuccess(); else hapticTap();
    updateAction(item, { bookmarked: next });
  };
  const selectItem = (item) => {
    setSelected(item);
    if (item) window.history.replaceState(null, '', `#detail/${slugifyPosterName(item.title)}`);
    else window.history.replaceState(null, '', `#${section}`);
  };
  const selectedItem = selected ? activeItems.find(item => item.id === selected.id) || selected : null;
  // Freeze the page behind the detail dialog while it is open (declared here
  // because it depends on selectedItem, which does not exist higher up).
  useEffect(() => {
    if (!selectedItem) return undefined;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [selectedItem]);
  const nextUp = activeItems.find(item => item.userStatus !== 'watched' && item.userStatus !== 'dropped') || activeItems[0];
  const playTrailer = (item) => {
    hapticTap();
    const match = getTrailerByTitle(item.title);
    const youtubeId = match?.primary?.youtubeId || match?.youtubeId;
    const options = match?.options;

    // 3. Play or YouTube search
    if (youtubeId) {
      setTrailer({ title: item.title, url: trailerEmbedUrl(youtubeId), options });
    } else {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} official trailer`)}`, '_blank', 'noopener');
    }
  };
  const resetFilters = () => { setQuery(''); setGenre('All'); setRating(0); setAgeRatingFilter('All'); setPhaseFilter('All'); setTypeFilter('All'); setSortBy('order'); setSortDirection('asc'); };
  const handleStartWatch = useCallback((item, tmdbId, mediaType) => {
    if (!WATCH_ENABLED) {
      setStatus(item, 'watching');
      updateAction(item, { watchStartedAt: Date.now() });
      setSelected(item);
      return;
    }
    setWatchItem({ item, tmdbId, mediaType });
    setStatus(item, 'watching');
    updateAction(item, { watchStartedAt: Date.now() });
    setSelected(null);
    setSection('watch');
    window.history.replaceState(null, '', `#watch/${slugifyPosterName(item.title)}`);
    // Scroll to top so the player is visible, even when tapped from a long-scrolled page like the list/home.
    if (typeof window !== 'undefined' && window.scrollY > 4) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // -- Watch confirmation: only shows the dialog for plays triggered FROM the Viewing Roadmap.
  // Every other play path (browse, continue watching, watch-page up-next, etc.) starts playback
  // immediately so the rest of the app feels snappy and uninterrupted. --
  const startWatchWithConfirm = useCallback((item, tmdbId, mediaType, fromRoadmap = false) => {
    if (!fromRoadmap || watchConfirmSkipped) {
      handleStartWatch(item, tmdbId, mediaType);
      return;
    }
    setWatchConfirmItem({ item, tmdbId, mediaType });
  }, [watchConfirmSkipped, handleStartWatch]);

  // Used by the DetailView — keeps the confirmation when tapping Watch Now from the Viewing Roadmap
  // (unless the user previously checked "Don't show this again").
  const startWatchFromRoadmap = useCallback((item, tmdbId, mediaType) => {
    startWatchWithConfirm(item, tmdbId, mediaType, true);
  }, [startWatchWithConfirm]);

  const confirmWatch = useCallback(() => {
    if (!watchConfirmItem) return;
    const { item, tmdbId, mediaType } = watchConfirmItem;
    setWatchConfirmItem(null);
    handleStartWatch(item, tmdbId, mediaType);
  }, [watchConfirmItem, handleStartWatch]);

  const dismissWatchConfirm = useCallback((skipFuture = false) => {
    setWatchConfirmItem(null);
    if (skipFuture) {
      setWatchConfirmSkipped(true);
      localStorage.setItem('watch-confirm-skipped', '1');
    }
  }, []);

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
      universe: universe,
      bookmarked: false,
      userStatus: 'unwatched',
    };
    
    startWatchWithConfirm(tempItem, externalResult.id, externalResult.type);
  };

  const universeName = universe === 'marvel' ? 'MCU' : universe === 'xmen' ? 'X-Men' : universe === 'sony' ? 'Sony' : 'DC';
  const universeAccent = universe === 'marvel' ? '#da1e37' : universe === 'xmen' ? '#a0a0ac' : universe === 'sony' ? '#2f6bd8' : '#2f80ed';
  const selectedTitle = selected?.title || safeWatchItem?.item?.title || '';
  const activeFilterCount = [genre !== 'All', rating > 0, ageRatingFilter !== 'All', typeFilter !== 'All'].filter(Boolean).length;

  if (window.location.pathname !== '/') return <NotFoundPage onHome={() => { window.location.hash = 'home'; window.history.pushState(null, '', '/#home'); window.location.reload(); }} />;

  return (
  <>
  <SeoHead section={section} selectedTitle={selectedTitle} />
  <main className={`movie-site universe-${universe}`} style={{ '--brand-accent': universeAccent, '--accent': universeAccent, '--theme-accent': universeAccent }}>
  <div className="site-glow" />
      <header className="site-header">
  <div className="header-top">
  <button className="brand" onClick={() => { setQuery(''); setSection('home'); setWatchItem(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Go to Incursion home"><b>Incursion</b><small>{universeName} timeline</small></button>
  <div className="header-quick-actions" aria-label="Quick viewing controls">
  {(() => {
    // Exactly one quick card: whatever is playing now wins, otherwise the next title.
    const watchingItem = activeItems.find(item => item.userStatus === 'watching');
    const quickItem = watchingItem || nextUp;
    if (!quickItem) return null;
    return <button className={`header-status-pill ${watchingItem ? 'watching' : 'next'}`} onClick={() => selectItem(quickItem)} title={`Open ${watchingItem ? 'current' : 'next'}: ${quickItem.title}`}>
      <span className="header-pill-poster">{quickItem.poster ? <img src={quickItem.poster} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Play size={14} fill="currentColor" />}</span>
      <span className="header-pill-label"><small>{watchingItem ? 'Watching now' : 'Up next'}</small><b>{quickItem.title}</b><em>{watchingItem ? `${elapsedPctLabel(watchingItem)} complete` : `${quickItem.year} · ${runtimeLabel(quickItem.runtime, quickItem.type)}`}</em></span>
    </button>;
  })()}
  </div>
  </div>
  <div className="header-bar">
  <div className="universe-tabs" role="tablist" aria-label="Universe">
  {[['marvel', 'Marvel'], ['sony', 'Sony'], ['xmen', 'X-Men'], ['dc', 'DC']].map(([key, label]) => (
    <button key={key} data-universe={key} role="tab" aria-selected={universe === key} aria-label={`${label} universe`} title={`${label} universe`} className={universe === key ? 'active' : ''} onClick={() => { hapticTap(); setUniverse(key); setHeroIndex(0); }}><span className="universe-logo" aria-hidden="true">{UNIVERSE_LOGOS[key]}</span><span className="sr-only">{label}</span></button>
  ))}
  </div>
        <div className="header-search">
          <Search size={18} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${universe === 'marvel' ? 'Marvel' : universe === 'xmen' ? 'X-Men' : universe === 'sony' ? 'Sony' : 'DC'} titles & TMDB…`} aria-label="Search titles" />
          {query && <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>}
        </div>
        <div className="header-tools">
  <div className="header-phase-menu">
  <button ref={phaseButtonRef} className={`header-phase-btn ${phaseFilter !== 'All' ? 'active' : ''}`} onClick={() => { const rect = phaseButtonRef.current?.getBoundingClientRect(); if (rect) setPhaseMenuPosition({ top: rect.bottom + 7, left: rect.left }); setPhaseMenuOpen(open => !open); }} aria-expanded={phaseMenuOpen} aria-haspopup="listbox">
  <ListFilter size={14} /> <span>{phaseFilter === 'All' ? 'All phases' : `Phase ${phaseFilter}`}</span><ChevronDown size={13} />
  </button>
  {phaseMenuOpen && <div className="header-phase-dropdown" style={{ top: phaseMenuPosition.top, left: phaseMenuPosition.left }} role="listbox" aria-label="Select phase">
  <p className="phase-menu-title">Jump to phase</p>
  {['All', ...new Set(allItems.filter(item => item.universe === universe && item.phase).map(item => item.phase))].map(phase => {
    const phaseItems = phase === 'All' ? [] : allItems.filter(item => item.universe === universe && String(item.phase) === String(phase)).map(enrichItem);
    const phaseWatched = phaseItems.length > 0 && phaseItems.every(item => item.userStatus === 'watched');
    const phasePartiallyWatched = phaseItems.some(item => item.userStatus === 'watched') && !phaseWatched;
    return <div key={phase} className="phase-menu-row"><button className={String(phaseFilter) === String(phase) ? 'selected' : ''} onClick={() => { setPhaseFilter(phase); setPhaseMenuOpen(false); }} role="option" aria-selected={String(phaseFilter) === String(phase)}>{phase === 'All' ? 'All phases' : `Phase ${phase}`}</button>{phase !== 'All' && <input type="checkbox" checked={phaseWatched} ref={input => { if (input) input.indeterminate = phasePartiallyWatched; }} onClick={event => event.stopPropagation()} onChange={() => togglePhaseWatched(phase)} aria-checked={phasePartiallyWatched ? 'mixed' : phaseWatched} aria-label={`Mark all of Phase ${phase} as watched`} />}</div>;
  })}
  </div>}
  </div>
  <button className={`header-sort-btn ${sortBy !== 'order' ? 'active' : ''}`} onClick={() => { hapticTap(); setFiltersOpen(false); setSortOpen(true); }} aria-haspopup="dialog" title={`Sorted by ${SORT_LABELS[sortBy]} ${sortDirection === 'asc' ? '↑' : '↓'} — tap to change`}>
    <ArrowUpDown size={15} />
    <span className="header-sort-label">{SORT_LABELS[sortBy]}</span>
    <small className="header-sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</small>
  </button>
  <button className={`header-filter-btn ${activeFilterCount > 0 ? 'active' : ''}`} onClick={() => { hapticTap(); setSortOpen(false); setFiltersOpen(true); }} aria-haspopup="dialog" aria-label={`Open filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}>
    <SlidersHorizontal size={15} />
    <span className="header-filter-label">Filters</span>
    {activeFilterCount > 0 && <b className="header-filter-count">{activeFilterCount}</b>}
  </button>
        </div>
  </div>
      </header>

      {section === 'home' && !adBlockerDismissed && <AdBlockerDialog onDismiss={() => { setAdBlockerDismissed(true); localStorage.setItem('adblocker-dismissed', '1'); }} />}
      {section === 'home' && <>
        {uiVariant === 'control' && <ControlOverview
          stats={stats}
          items={activeItems}
          nextUp={nextUp}
          universeLabel={universe === 'marvel' ? 'Marvel Cinematic Universe' : universe === 'xmen' ? 'X-Men Universe' : universe === 'sony' ? 'Sony Spider-Man Universe' : 'DC Universe'}
          onOpen={selectItem}
          onStart={(item) => startWatchWithConfirm(item, item.tmdbId || null, item.type === 'series' ? 'tv' : 'movie')}
          onPhase={(phase) => setPhaseFilter(phase)}
        />}
        <section className="hero-layout">
          <TopCarousel items={heroItems} featured={featured} heroIndex={heroIndex} setHeroIndex={setHeroIndex} setSelected={selectItem} />
        </section>
        <UpNextBoard items={activeItems.filter(i => i.userStatus === 'unwatched').slice(0, 10)} setSelected={selectItem} onStart={(item) => startWatchWithConfirm(item, item.tmdbId || null, item.type === 'series' ? 'tv' : 'movie')} />
        <MovieRail title="Essential picks" items={activeItems.filter(i => i.essential)} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} paginated gridControls />
        <MovieRail title="Recently watched" items={activeItems.filter(i => i.userStatus === 'watched').slice(-24).reverse()} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} empty="Mark titles as watched to see them here." paginated gridControls />
        {activeItems.filter(i => i.userStatus === 'watching').length > 0 &&          <ContinueWatching items={activeItems.filter(i => i.userStatus === 'watching')} setSelected={selectItem} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} onResume={startWatchWithConfirm} />}
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

      {section === 'list' && <ListSection items={activeItems} sortKey={`${sortBy}-${sortDirection}`} externalResults={externalSearchResults} externalLoading={externalSearchLoading} query={query} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} onPlayExternal={onPlayExternal} onWarning={showWarningToast} />}
      {section === 'analytics' && <><AnalyticsPanel stats={stats} large /><MovieRail title="In progress" items={activeItems.filter(i => i.userStatus === 'watching')} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} /></>}
            {section === 'profile' && <ProfilePage stats={stats} activeItems={activeItems} universe={universe} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} profileName={profileName} setProfileName={setProfileName} user={user} configured={configured} onLogin={() => setAuthOpen(true)} onLogout={async () => { await pushBeforeLogout(); authLogout(); setWatchItem(null); }} lastSynced={lastSynced} syncing={syncing} onSync={pushToCloud} conflict={conflict} onResolveRemote={resolveUseRemote} onResolveLocal={resolveKeepLocal} syncToast={toast} nativePlayer={nativePlayer} setNativePlayer={setNativePlayer} />}
      {WATCH_ENABLED && section === 'watch' && safeWatchItem && <WatchPage watchItem={safeWatchItem} activeItems={roadmapItems} onBack={() => { setWatchItem(null); window.history.replaceState(null, '', '#watch'); }} setStatus={setStatus} toggleBookmark={toggleBookmark} onStartWatch={startWatchWithConfirm} updateAction={updateAction} nativePlayer={nativePlayer} setNativePlayer={setNativePlayer} />}
      {WATCH_ENABLED && section === 'watch' && !safeWatchItem && <WatchBrowse activeItems={activeItems} externalResults={externalSearchResults} externalLoading={externalSearchLoading} actions={actions} query={query} onStartWatch={startWatchWithConfirm} onPlayExternal={onPlayExternal} setSelected={selectItem} setStatus={setStatus} toggleBookmark={toggleBookmark} />}

      {warningToast && <div className="app-warning-toast" role="status"><ShieldAlert size={16} /><span>{warningToast}</span><button onClick={() => setWarningToast('')} aria-label="Dismiss warning"><X size={14} /></button></div>}
  <nav
        ref={navRef}
        className="bottom-nav"
        aria-label="Primary"
        data-holding={navHolding ? 'true' : 'false'}
        style={{ '--nav-index': navHoldIndex ?? Math.max(0, NAV_VISIBLE.indexOf(section)), '--nav-count': NAV_VISIBLE.length, '--nav-dur': navHolding ? '90ms' : '.58s' }}
        onPointerDown={handleNavPointerDown}
        onPointerMove={handleNavPointerMove}
        onPointerUp={handleNavPointerUp}
        onPointerCancel={resetNavHold}
        onContextMenu={(event) => { if (navHolding) event.preventDefault(); }}
      >
        <span className="nav-blob" aria-hidden="true" />
        {NAV_VISIBLE.map((id) => {
          const { label, Icon } = NAV_TAB_META[id];
          return <button key={id} className={section === id ? 'active' : ''} aria-current={section === id ? 'page' : undefined} onClick={() => handleNavClick(id)}>
            <Icon size={22} /><span>{label}</span>
          </button>;
        })}
      </nav>

      {selectedItem && <DetailView item={selectedItem} onClose={() => selectItem(null)} setStatus={setStatus} toggleBookmark={toggleBookmark} onStartWatch={startWatchWithConfirm} onStartWatchFromRoadmap={startWatchFromRoadmap} activeItems={roadmapItems} />}
      {trailer && <TrailerModal trailer={trailer} onClose={() => setTrailer(null)} />}
      {filtersOpen && <Filters genre={genre} setGenre={setGenre} rating={rating} setRating={setRating} ageRatingFilter={ageRatingFilter} setAgeRatingFilter={setAgeRatingFilter} universe={universe} typeFilter={typeFilter} setTypeFilter={setTypeFilter} genres={genres} count={activeItems.length} onClose={() => setFiltersOpen(false)} />}
      {sortOpen && <SortSheet sortBy={sortBy} setSortBy={setSortBy} sortDirection={sortDirection} setSortDirection={setSortDirection} count={activeItems.length} onClose={() => setSortOpen(false)} />}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onLogin={login} onSignup={signup} onGoogleSignIn={googleSignIn} onAnonymousSignIn={anonymousSignIn} onResetPassword={resetPassword} />}
      {watchConfirmItem && <WatchConfirmDialog item={watchConfirmItem.item} onConfirm={confirmWatch} onDismiss={(skipFuture) => dismissWatchConfirm(skipFuture)} />}
      <Footer />
    </main>
  </>
  );
}

/* Control room overview — editorial headline + mission-control progress board. */
function ControlOverview({ stats, items, nextUp, universeLabel, onOpen, onStart, onPhase }) {
  const phases = useMemo(
    () => [...new Set(items.filter(item => item.phase).map(item => Number(item.phase)))].sort((a, b) => a - b),
    [items],
  );
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * Math.max(0, Math.min(100, stats.percent))) / 100;
  const nextMeta = nextUp ? `${nextUp.year} · ${runtimeLabel(nextUp.runtime, nextUp.type)}` : '';

  return <section className="ct-overview">
    <div className="ct-lead">
      <p className="ct-eyebrow">{universeLabel} · Control room</p>
      <h1 className="ct-title">Your timeline,<br /><em>chapter by chapter.</em></h1>
      <p className="ct-sub">Every release in viewing order, with the progress you have already made. Pick up the next chapter and keep the streak alive.</p>
      <div className="ct-lead-actions">
        <button className="ct-primary" onClick={() => nextUp && onStart(nextUp)} disabled={!nextUp}><Play size={16} fill="currentColor" /><span>Continue{nextUp ? ` · ${nextUp.title}` : ''}</span></button>
        <button className="ct-ghost" onClick={() => nextUp && onOpen(nextUp)} disabled={!nextUp}>Details</button>
      </div>
      {nextUp && <button className="ct-nextup" onClick={() => onOpen(nextUp)}>
        <span className="ct-nextup-poster"><PosterArt item={nextUp} /></span>
        <span className="ct-nextup-copy">
          <small>Next up · #{String(nextUp.order || nextUp.id).padStart(2, '0')}</small>
          <strong>{nextUp.title}</strong>
          <em>{nextMeta}</em>
        </span>
        <ChevronRight size={18} className="ct-nextup-arrow" />
      </button>}
    </div>
    <div className="ct-board">
      <div className="ct-ring-card">
        <svg className="ct-ring" viewBox="0 0 120 120" role="img" aria-label={`${stats.percent}% of the timeline complete`}>
          <circle cx="60" cy="60" r={radius} className="ct-ring-track" />
          <circle cx="60" cy="60" r={radius} className="ct-ring-value" strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <div className="ct-ring-copy"><b>{stats.percent}%</b><span>complete</span></div>
      </div>
      <div className="ct-stats">
        <div><b>{stats.watched}</b><span>Watched</span></div>
        <div><b>{stats.watching}</b><span>In progress</span></div>
        <div><b>{stats.bookmarked}</b><span>Saved</span></div>
        <div><b>{stats.watchedTime}</b><span>Runtime</span></div>
      </div>
      <div className="ct-phases">
        <p className="ct-phases-title">Phase progress</p>
        {phases.map(phase => {
          const phaseItems = items.filter(item => Number(item.phase) === phase);
          const done = phaseItems.filter(item => item.userStatus === 'watched').length;
          const percent = Math.round((done / Math.max(phaseItems.length, 1)) * 100);
          return <button key={phase} className="ct-phase" onClick={() => onPhase(String(phase))}>
            <span className="ct-phase-label">Phase {phase}</span>
            <span className="ct-phase-bar"><span style={{ width: `${percent}%` }} /></span>
            <span className="ct-phase-count">{done}/{phaseItems.length}</span>
          </button>;
        })}
      </div>
    </div>
  </section>;
}

function TopCarousel({ items, featured, heroIndex, setHeroIndex, setSelected }) {
  const [paused, setPaused] = useState(false);
  const [inlineTrailer, setInlineTrailer] = useState(null);
  const touchStartPoint = useRef(null);
  const didSwipe = useRef(false);
  const resumeTimer = useRef(null);
  const [leavingId, setLeavingId] = useState(null);
  const prevIndexRef = useRef(heroIndex);
  const [prevBg, setPrevBg] = useState(null);
  const prevBgIdRef = useRef(featured?.id ?? null);
  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);
  useEffect(() => {
    if (!leavingId) return undefined;
    const timer = window.setTimeout(() => setLeavingId(null), 880);
    return () => window.clearTimeout(timer);
  }, [leavingId]);
  // Resolve the outgoing poster during render so its exit class lands in the
  // same commit as the new index. The old backdrop is deliberately kept: it sits
  // underneath the incoming one, which is why the colour change has no seam.
  if (prevIndexRef.current !== heroIndex) {
    const previous = items[prevIndexRef.current % Math.max(items.length, 1)];
    prevIndexRef.current = heroIndex;
    const current = items[heroIndex % Math.max(items.length, 1)];
    if (previous && previous.id !== current?.id) setLeavingId(previous.id);
  }
  // Keep the previous backdrop mounted underneath so the change is a crossfade,
  // not a hard swap while the new image decodes.
  if (prevBgIdRef.current !== (featured?.id ?? null)) {
    const previous = items.find((entry) => entry.id === prevBgIdRef.current);
    prevBgIdRef.current = featured?.id ?? null;
    if (previous?.poster) setPrevBg(previous);
  }
  const move = (dir) => {
    setInlineTrailer(null);
    setHeroIndex((heroIndex + dir + items.length) % Math.max(items.length, 1));
  };
  const handleTouchStart = (event) => {
    window.clearTimeout(resumeTimer.current);
    const touch = event.touches[0];
    touchStartPoint.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    didSwipe.current = false;
    setPaused(true);
  };
  const handleTouchEnd = (event) => {
    const start = touchStartPoint.current;
    const touch = event.changedTouches[0];
    touchStartPoint.current = null;
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);
    // Only accept a clear horizontal gesture (within roughly 34 degrees).
    // Vertical or diagonal scrolling should never change the featured poster.
    const isHorizontalSwipe = horizontalDistance > 46 && horizontalDistance >= verticalDistance * 1.5;
    didSwipe.current = isHorizontalSwipe;
    if (isHorizontalSwipe) {
      const section = event.currentTarget;
      // Use the regular carousel transition, but shorten it slightly for a manual gesture.
      section.dataset.fastSwipe = 'true';
      window.setTimeout(() => section.removeAttribute('data-fast-swipe'), 420);
      move(deltaX < 0 ? 1 : -1);
    }
    resumeTimer.current = window.setTimeout(() => setPaused(false), 4200);
  };
  const handleTouchCancel = () => {
    touchStartPoint.current = null;
    didSwipe.current = false;
    resumeTimer.current = window.setTimeout(() => setPaused(false), 4200);
  };
  const selectPoster = (item, rawIndex, offset) => {
    if (didSwipe.current) { didSwipe.current = false; return; }
    setInlineTrailer(null);
    offset ? setHeroIndex(rawIndex) : setSelected(item);
  };

  useEffect(() => {
    if (paused || inlineTrailer || items.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setTimeout(() => setHeroIndex((heroIndex + 1) % items.length), 4800);
    return () => window.clearTimeout(timer);
  }, [heroIndex, inlineTrailer, items.length, paused, setHeroIndex]);

  const showTrailer = () => {
    const match = getTrailerByTitle(featured.title);
    const id = match?.primary?.youtubeId || match?.youtubeId;
    if (id) {
      setInlineTrailer(`${trailerEmbedUrl(id)}&autoplay=1`);
    } else {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${featured.title} official trailer`)}`, '_blank', 'noopener');
    }
  };

  return <section className="top-carousel" style={{ '--accent': featured?.accent || '#9a4a4a' }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
    <div className="carousel-backdrops" aria-hidden="true">
      {prevBg?.poster && <img className="carousel-backdrop is-previous" src={prevBg.poster} alt="" width="300" height="450" referrerPolicy="no-referrer" />}
      {featured?.poster && <img key={featured.id} className="carousel-backdrop is-current" src={featured.poster} alt="" width="300" height="450" referrerPolicy="no-referrer" />}
    </div>
    <div className="carousel-backdrop-shade" aria-hidden="true" />
    
    <div className="feature-stage">
      <div className="poster-stack smooth-stack">
        {inlineTrailer ? <div className="inline-trailer"><iframe src={inlineTrailer} title={`${featured.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /><button onClick={() => setInlineTrailer(null)} aria-label="Close trailer"><X size={20} /></button></div> : items.map((item, rawIndex) => { const offset = (rawIndex - heroIndex + items.length) % items.length; const isLeaving = leavingId === item.id && offset >= 3; if (offset > 3 && !isLeaving) return null; const posterClass = isLeaving ? 'poster-exit' : `poster-${offset}`; return <button key={item.id} aria-label={offset ? `Show ${item.title}` : `View ${item.title} details`} aria-hidden={offset === 3 || isLeaving ? 'true' : undefined} tabIndex={offset === 3 || isLeaving ? -1 : 0} className={`stack-poster ${posterClass}`} onClick={() => selectPoster(item, rawIndex, offset)} style={{ '--accent': item.accent }}><PosterArt item={item} loading="eager" fetchPriority={offset === 0 ? 'high' : 'auto'} /></button>; })}
      </div>
      <div className="feature-copy">
        <div className="feature-text" key={featured?.id}>
          <div className="feature-kicker"><span>{featured?.year}</span><span>{runtimeLabel(featured?.runtime, featured?.type)}</span><span>{featured?.rating} rating</span></div>
          <h1>{featured?.title}</h1>
          <p key={featured?.id} className="feature-desc">{featured?.desc || `Follow ${featured?.title} in the complete ${featured?.universe === 'marvel' ? 'Marvel Cinematic Universe' : 'DC Universe'} viewing order.`}</p>
        </div>
        <div className="feature-footer"><button className="feature-play" onClick={showTrailer}><Clapperboard size={18} /> Watch trailer</button><div className="chips">{featured?.genres.slice(0, 3).map(g => <span key={g}>{g}</span>)}</div></div>
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
          <div key={`density-${gridDensity}`} className={`${scrollable ? 'movie-grid web-grid rail-scroll' : 'movie-grid web-grid'} grid-${gridDensity}${variant === 'upnext' ? ' upnext-grid' : ''}`}>
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

function MovieCard({ item, setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer, onWarning, style }) {
  const guidance = getTitleGuidance(item);
  return <article className="movie-card" style={{ '--accent': item.accent, ...style }}>
    <button className="poster-button" onClick={() => setSelected(item)}>
      <PosterArt item={item} />
    </button>
    <div className="card-body">
      <div className="card-title-row">
        <button className="title-button" onClick={() => setSelected(item)} title={item.title}>{item.title}</button>
        {guidance && <button className="warning-info-button" onClick={() => onWarning(item)} aria-label={`Show viewing guidance for ${item.title}`} title="Viewing guidance"><Info size={12} /></button>}
      </div>
      <div className="card-meta-row"><span className="card-meta-phase">Phase {item.phase || '—'}</span><span className="card-meta-text">{item.year} · {runtimeLabel(item.runtime, item.type)}{item.userStatus === 'watching' && item.watchedDuration > 30000 ? ` · ${watchTimeLabel(item)}` : ''}{item.releaseStatus === 'upcoming' && item.releaseDate ? <span className="card-release-badge">{new Date(item.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span> : ''}{item.releaseStatus === 'upcoming' && !item.releaseDate ? <span className="card-release-badge">Upcoming</span> : ''}{item.releaseStatus === 'announced' ? <span className="card-release-badge announced">Announced</span> : ''}</span></div>
        <div className="card-ratings-line">{item.rating && <span className="list-rating"><Star size={9} fill="currentColor" />{Number(item.rating).toFixed(1)}</span>}{item.imdbRating && <span className="list-rating list-rating-imdb">★{item.imdbRating}</span>}{item.tomatoRating && <span className={`list-rating list-rating-tomato ${getTomatoTier(item.tomatoRating).cls}`}>{getTomatoTier(item.tomatoRating).emoji}{item.tomatoRating}</span>}{item.metaRating && <span className="list-rating list-rating-meta">M{parseInt(item.metaRating)}</span>}{!(item.rating || item.imdbRating || item.tomatoRating || item.metaRating) && (item.tmdbId ? <span className="list-rating list-rating-loading" aria-label="Ratings loading"><span className="rating-skeleton" /></span> : <span className="list-rating list-rating-na">N/A</span>)}</div>
    </div>
    <div className="card-actions"><button onClick={() => setStatus(item, item.userStatus === 'watched' ? 'unwatched' : 'watched')} className={`watch-chip ${item.userStatus === 'watched' ? 'watched' : ''}`} aria-label={item.userStatus === 'watched' ? `Mark ${item.title} as unwatched` : `Mark ${item.title} as watched`} aria-pressed={item.userStatus === 'watched'}>{item.userStatus === 'watched' ? <><Check size={16} /><span>Watched</span></> : <><Play size={16} /><span>Watch</span></>}</button><button onClick={() => toggleBookmark(item)} className={`bookmark-chip ${item.bookmarked ? 'saved' : ''}`} aria-label={item.bookmarked ? 'Remove bookmark' : 'Save title'}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
  </article>;
}

function ListSection({ items, sortKey, externalResults = [], externalLoading = false, query = '', setSelected, setStatus, toggleBookmark, playTrailer, onPlayExternal, onWarning }) {
  const pageSize = 12;
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstItem = (currentPage - 1) * pageSize;
  const visibleItems = items.slice(firstItem, firstItem + pageSize);
  useEffect(() => { setPage(1); }, [items.length]);

  // Swipe a row right to mark it watched, left to save it (touch only).
  const swipeRef = useRef(null);
  const suppressClickRef = useRef(false);
  const handleRowTouchStart = (event, item) => {
    const touch = event.touches[0];
    if (!touch) return;
    suppressClickRef.current = false;
    swipeRef.current = { x: touch.clientX, y: touch.clientY, dx: 0, vertical: false, item, el: event.currentTarget };
  };
  const handleRowTouchMove = (event) => {
    const state = swipeRef.current;
    const touch = event.touches[0];
    if (!state || !touch) return;
    const dx = touch.clientX - state.x;
    const dy = touch.clientY - state.y;
    if (!state.vertical && Math.abs(dy) > Math.abs(dx) + 6) {
      state.vertical = true;
      state.el.style.transform = '';
      return;
    }
    if (state.vertical) return;
    state.dx = Math.max(-120, Math.min(120, dx));
    state.el.style.transition = 'none';
    state.el.style.transform = `translateX(${state.dx}px)`;
  };
  const handleRowTouchEnd = () => {
    const state = swipeRef.current;
    swipeRef.current = null;
    if (!state) return;
    state.el.style.transition = '';
    state.el.style.transform = '';
    if (Math.abs(state.dx) < 64) return;
    suppressClickRef.current = true;
    const wasWatched = state.item.userStatus === 'watched';
    if (state.dx > 0) {
      setStatus(state.item, wasWatched ? 'unwatched' : 'watched');
      if (wasWatched) hapticTap(); else hapticSuccess();
    } else {
      toggleBookmark(state.item);
      hapticSelect();
    }
    window.setTimeout(() => { suppressClickRef.current = false; }, 420);
  };

  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <section className={`list-section ${viewMode === 'grid' ? 'is-grid-view' : 'is-list-view'}`}>
    <div className="list-heading"><div><p className="eyebrow">Every story, in order</p><h2>Complete viewing list</h2><p className="list-intro">Track every chapter, update your progress, and keep the next story within reach.</p></div><div className="list-summary"><strong>{items.length}</strong><span>titles</span></div></div>    <div className="list-results-bar">
      <span className="list-results-count">Showing {items.length ? firstItem + 1 : 0}–{Math.min(firstItem + pageSize, items.length)} of {items.length} titles</span>
      <div className="list-results-actions">
        <span className="list-page-indicator">Page {currentPage} of {pageCount}</span>
        <div className="list-view-toggle" role="group" aria-label="List view mode">
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => { hapticTap(); setViewMode('list'); }}>List</button>
          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => { hapticTap(); setViewMode('grid'); }}>Grid</button>
        </div>
      </div>
    </div>
    {viewMode === 'grid' ? <div key={`grid-${sortKey}`} className="movie-grid web-grid list-card-grid">{visibleItems.map((item, i) => <MovieCard key={item.id} item={item} setSelected={setSelected} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} onWarning={onWarning} style={{ animationDelay: `${i * 30}ms` }} />)}</div> : <div key={`list-${sortKey}`} className="list-grid">{visibleItems.map((item, index) => <article className="list-row" key={item.id} data-state={item.userStatus} data-saved={item.bookmarked ? 'true' : 'false'} style={{ '--accent': item.accent, animationDelay: `${index * 30}ms` }} onClick={() => { if (suppressClickRef.current) return; hapticTap(); setSelected(item); }} onTouchStart={(event) => handleRowTouchStart(event, item)} onTouchMove={handleRowTouchMove} onTouchEnd={handleRowTouchEnd} onTouchCancel={handleRowTouchEnd} role="button" tabIndex={0} aria-label={`View ${item.title} details`} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(item); } }}>
      <span className="list-index">{String(firstItem + index + 1).padStart(2, '0')}</span>
      <div className="list-poster"><PosterArt item={item} /></div>
      <div className="list-copy"><div className="list-title-line"><strong>{item.title}</strong><span className="phase-badge">Phase {item.phase || '—'}</span>{getTitleGuidance(item) && <button className="warning-info-button" onClick={(event) => { event.stopPropagation(); onWarning(item); }} aria-label={`Show viewing guidance for ${item.title}`}><Info size={13} /></button>}{item.essential && <span>Essential</span>}{item.userStatus !== 'unwatched' && <span className={`list-state ${item.userStatus}`}>{STATUS_LABELS[item.userStatus]}</span>}</div><div className="list-ratings-line">{item.rating && <span className="list-rating"><Star size={9} fill="currentColor" />{Number(item.rating).toFixed(1)}</span>}{item.imdbRating && <span className="list-rating list-rating-imdb">★{item.imdbRating}</span>}{item.tomatoRating && <span className={`list-rating list-rating-tomato ${getTomatoTier(item.tomatoRating).cls}`}>{getTomatoTier(item.tomatoRating).emoji}{item.tomatoRating}</span>}{item.metaRating && <span className="list-rating list-rating-meta">M{parseInt(item.metaRating)}</span>}{!(item.rating || item.imdbRating || item.tomatoRating || item.metaRating) && (item.tmdbId ? <span className="list-rating list-rating-loading" aria-label="Ratings loading"><span className="rating-skeleton" /></span> : <span className="list-rating list-rating-na">N/A</span>)}</div><div className="list-meta-line"><span>{item.year}</span><span>{item.type === 'film' ? 'Film' : 'Series'}</span><span>{runtimeLabel(item.runtime, item.type)}</span>{item.season ? <span>Season {item.season}</span> : null}{item.phase ? <span>Phase {item.phase}</span> : null}</div><p className="list-desc">{item.desc || `${item.title} in the complete ${item.universe === 'marvel' ? 'MCU' : 'DC'} story timeline.`}</p><div className="list-tags">{(item.genres || []).slice(0,3).map(g => <span key={g}>{g}</span>)}</div></div>
      <div className="list-actions" onClick={e => e.stopPropagation()}><button className={`list-watch ${item.userStatus === 'watched' ? 'watched' : ''}`} onClick={() => setStatus(item, item.userStatus === 'watched' ? 'unwatched' : 'watched')} aria-label={item.userStatus === 'watched' ? `Mark ${item.title} as unwatched` : `Mark ${item.title} as watched`} aria-pressed={item.userStatus === 'watched'}>{item.userStatus === 'watched' ? <><Check size={16} /><span>Watched</span></> : <><Play size={16} /><span>Watch</span></>}</button><StatusSelect item={item} setStatus={setStatus} /><button className={`list-bookmark ${item.bookmarked ? 'saved' : ''}`} onClick={() => toggleBookmark(item)} aria-label={item.bookmarked ? 'Remove bookmark' : 'Bookmark title'}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
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
    <button className="status-trigger" onClick={() => { hapticTap(); setOpen(!open); }} aria-haspopup="listbox" aria-expanded={open}>
      <span className="status-dot" aria-hidden="true" />
      <span className="status-label">{triggerLabel}</span>
      <ChevronDown size={13} className="status-chevron" aria-hidden="true" />
    </button>
    {open && <div className="status-dropdown" role="listbox" aria-label={`Set status for ${item.title}`}>
      {STATUS.map(status => {
        const Icon = STATUS_META[status].icon;
        return <button key={status} className={`status-option ${status} ${item.userStatus === status ? 'active' : ''}`} role="option" aria-selected={item.userStatus === status} onClick={() => { if (status === 'watched') hapticSuccess(); else hapticSelect(); setStatus(item, status); setOpen(false); }}>
          <Icon size={15} className="status-option-icon" />
          <span className="status-option-label">{STATUS_LABELS[status]}</span>
          {item.userStatus === status && <Check size={14} className="status-option-check" />}
        </button>;
      })}
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
  const meta = item.metaRating ? parseInt(item.metaRating) : null;
  return (
    <>
      {tmdb && <span className="detail-rating tmdb-rating"><Star size={15} fill="currentColor" /> {tmdb}<small>TMDB</small></span>}
      {imdb && <span className="detail-rating imdb-rating">★ {imdb}<small>IMDb</small></span>}
      {tomato && (() => { const t = getTomatoTier(tomato); return <span className={`detail-rating tomato-rating ${t.cls}`}>{t.emoji} {tomato}<small>{t.label}</small></span>; })()}
      {meta && <span className="detail-rating meta-rating">M {meta}<small>Meta</small></span>}
      {!tmdb && !imdb && !tomato && !meta && (item.tmdbId
        ? <span className="detail-rating is-loading" aria-label="Ratings loading"><span className="rating-skeleton" /><small>Loading</small></span>
        : <span className="detail-rating is-empty"><Star size={15} fill="currentColor" /> N/A</span>)}
    </>
  );
}

function AnalyticsPanel({ stats, large = false }) {
  return <section className={`analytics-panel ${large ? 'large' : ''}`}><div><p className="eyebrow">Analytics</p><h2>{stats.percent}% complete</h2><div className="progress"><span style={{ width: `${stats.percent}%` }} /></div></div><div className="stat-grid"><div><b>{stats.total}</b><span>Total</span></div><div><b>{stats.watched}</b><span>Watched</span></div><div><b>{stats.watching}</b><span>Watching</span></div><div><b>{stats.dropped}</b><span>Dropped</span></div><div><b>{stats.bookmarked}</b><span>Saved</span></div><div><b>{stats.watchedTime}</b><span>Watch Time</span></div></div></section>;
}

function DetailView({ item, onClose, setStatus, toggleBookmark, onStartWatch, onStartWatchFromRoadmap, activeItems }) {
  const guidance = getTitleGuidance(item);
  const [inlineTrailer, setInlineTrailer] = useState(null);
  const [isTrailerExpanded, setIsTrailerExpanded] = useState(false);
  const [searchSheet, setSearchSheet] = useState(false);
  const grabStartRef = useRef(null);
  React.useEffect(() => {
    const finish = (event) => {
      const start = grabStartRef.current;
      if (!start) return;
      grabStartRef.current = null;
      start.modal?.classList.remove('is-dragging');
      start.modal?.style.setProperty('--sheet-drag', '0px');
      if (event.type === 'pointerup' && start.delta > 96) onClose();
    };
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
    return () => {
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
    };
  }, [onClose]);
  // Spoilers stop shouting once the prerequisite is already watched.
  const prereqWatched = useMemo(() => {
    if (!guidance || !Array.isArray(activeItems) || !activeItems.length) return false;
    const haystack = `${guidance.watchAfter || ''} ${guidance.note || ''}`.toLowerCase();
    const matches = activeItems.filter(entry => entry?.title && entry.id !== item.id && haystack.includes(entry.title.toLowerCase()));
    return matches.length > 0 && matches.every(entry => entry.userStatus === 'watched');
  }, [guidance, activeItems, item.id]);
  const showTrailer = () => {
    const match = getTrailerByTitle(item.title);
    const id = match?.primary?.youtubeId || match?.youtubeId;
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

  const [downloadEpisodes, setDownloadEpisodes] = useState([]);
  const [downloadEpisode, setDownloadEpisode] = useState(item.epStart || 1);

  useEffect(() => {
    if (item.type !== 'series' || !item.tmdbId) return;
    const season = item.season || 1;
    fetch(apiUrl(`/api/tmdb/episodes?tmdbId=${item.tmdbId}&season=${season}`), { cache: 'force-cache' })
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
      const W = 1000, H = 560, R = 28, pad = 44, gap = 40;
      const posterW = 272, posterH = 408;
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      const ink = light ? '#10141b' : '#ffffff';
      const muted = light ? '#54606f' : '#a7b1c0';
      const surface = light ? '#ffffff' : '#0d1015';
      const tile = light ? 'rgba(16, 24, 40, .05)' : 'rgba(255, 255, 255, .05)';
      const accent = light ? (item.accent || '#da1e37') : lightenHex(item.accent || '#da1e37', 0.72);

      let poster = null;
      if (item.poster) {
        try {
          const resp = await fetch(item.poster);
          if (resp.ok) {
            const blobUrl = URL.createObjectURL(await resp.blob());
            poster = await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = () => resolve(null);
              img.src = blobUrl;
            });
            URL.revokeObjectURL(blobUrl);
          }
        } catch { /* poster is optional */ }
      }

      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Base card, then the same blurred poster backdrop the dialog uses.
      ctx.fillStyle = surface;
      ctx.beginPath(); ctx.roundRect(0, 0, W, H, R); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.roundRect(0, 0, W, H, R); ctx.clip();
      if (poster) {
        const iw = poster.naturalWidth || poster.width, ih = poster.naturalHeight || poster.height;
        const ratio = Math.max((W * 1.25) / iw, (H * 1.25) / ih);
        const dw = iw * ratio, dh = ih * ratio;
        ctx.globalAlpha = light ? 0.3 : 0.55;
        if ('filter' in ctx) ctx.filter = 'blur(46px) saturate(1.9) brightness(.92)';
        ctx.drawImage(poster, (W - dw) / 2, (H - dh) / 2 - H * 0.1, dw, dh);
        if ('filter' in ctx) ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      const shade = ctx.createLinearGradient(W * 0.32, 0, W, H);
      if (light) {
        shade.addColorStop(0, 'rgba(255, 255, 255, .93)');
        shade.addColorStop(0.55, 'rgba(255, 255, 255, .955)');
        shade.addColorStop(1, 'rgba(255, 255, 255, .985)');
      } else {
        shade.addColorStop(0, 'rgba(13, 16, 21, .86)');
        shade.addColorStop(0.5, 'rgba(13, 16, 21, .93)');
        shade.addColorStop(1, 'rgba(13, 16, 21, .975)');
      }
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Poster, matching the dialog's rounded poster block.
      const px = pad, py = pad;
      ctx.save();
      ctx.beginPath(); ctx.roundRect(px, py, posterW, posterH, 20); ctx.clip();
      if (poster) {
        const iw = poster.naturalWidth || poster.width, ih = poster.naturalHeight || poster.height;
        const ratio = Math.max(posterW / iw, posterH / ih);
        const sw = posterW / ratio, sh = posterH / ratio;
        ctx.drawImage(poster, (iw - sw) / 2, (ih - sh) / 2, sw, sh, px, py, posterW, posterH);
      } else {
        ctx.fillStyle = tile;
        ctx.fillRect(px, py, posterW, posterH);
      }
      ctx.restore();

      const cx = px + posterW + gap;
      const cw = W - pad - cx;
      const wrap = (text, font, maxWidth, maxLines) => {
        ctx.font = font;
        const words = String(text).split(/\s+/).filter(Boolean);
        const lines = [];
        let line = '';
        for (const word of words) {
          const attempt = line ? `${line} ${word}` : word;
          if (ctx.measureText(attempt).width <= maxWidth) { line = attempt; continue; }
          if (line) lines.push(line);
          line = word;
          if (lines.length === maxLines) break;
        }
        if (line && lines.length < maxLines) lines.push(line);
        if (lines.length === maxLines) {
          let last = lines[maxLines - 1];
          while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
          lines[maxLines - 1] = `${last.trim()}…`;
        }
        return lines;
      };

      const universeLabel = item.universe === 'marvel' ? 'Marvel Cinematic Universe' : item.universe === 'xmen' ? 'X-Men Universe' : item.universe === 'sony' ? 'Sony Spider-Man Universe' : 'DC Universe';
      const chapter = `#${String(item.order || item.id).padStart(2, '0')}`;

      let y = py + 16;
      ctx.font = '800 10.5px Inter, sans-serif';
      ctx.fillStyle = light ? '#3b4553' : '#c3ccd8';
      ctx.fillText(universeLabel.toUpperCase(), cx, y);
      const chapterWidth = ctx.measureText(chapter).width;
      ctx.fillStyle = accent;
      ctx.fillText(chapter, W - pad - chapterWidth, y);
      y += 16;

      let titleSize = 54;
      const titleFont = (size) => `900 ${size}px Inter, sans-serif`;
      while (titleSize > 28) {
        ctx.font = titleFont(titleSize);
        const lines = wrap(item.title || '', titleFont(titleSize), cw, 2);
        if (lines.length < 2 && ctx.measureText(item.title || '').width <= cw) break;
        if (lines.length === 2 && ctx.measureText(lines[1].replace('…', '')).width < cw * 0.92) break;
        titleSize -= 2;
      }
      ctx.font = titleFont(titleSize);
      ctx.fillStyle = ink;
      const titleLines = wrap(item.title || '', titleFont(titleSize), cw, 2);
      titleLines.forEach((line, index) => {
        y += titleSize * (index === 0 ? 0.92 : 1.04);
        ctx.fillText(line, cx, y);
      });
      y += 26;

      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillStyle = muted;
      const metaBits = [item.year, runtimeLabel(item.runtime, item.type), item.type === 'series' ? 'Series' : 'Film'];
      if (item.phase) metaBits.push(`Phase ${item.phase}`);
      const meta = wrap(metaBits.filter(Boolean).join('  ·  '), '600 13px Inter, sans-serif', cw, 1)[0] || '';
      ctx.fillText(meta, cx, y);

      const ratings = [
        item.rating && { value: Number(item.rating).toFixed(1), label: 'TMDB', color: '#f2c94c' },
        item.imdbRating && { value: item.imdbRating, label: 'IMDb', color: '#f5c518' },
        item.tomatoRating && { value: item.tomatoRating, label: 'Tomato', color: getTomatoTier(item.tomatoRating).cls === 'rotten' ? '#4ade80' : '#e74c3c' },
        item.metaRating && { value: String(parseInt(item.metaRating)), label: 'Meta', color: '#f59e0b' },
      ].filter(Boolean);
      if (ratings.length) {
        y += 24;
        let rx = cx;
        for (const rating of ratings) {
          ctx.font = '700 13px Inter, sans-serif';
          const valueWidth = ctx.measureText(rating.value).width;
          ctx.font = '600 10.5px Inter, sans-serif';
          const labelWidth = ctx.measureText(rating.label.toUpperCase()).width;
          const width = valueWidth + 5 + labelWidth;
          if (rx + width > cx + cw) break;
          ctx.font = '700 13px Inter, sans-serif';
          ctx.fillStyle = rating.color;
          ctx.fillText(rating.value, rx, y);
          ctx.font = '600 10.5px Inter, sans-serif';
          ctx.fillStyle = muted;
          ctx.fillText(rating.label.toUpperCase(), rx + valueWidth + 5, y - 1);
          rx += width + 18;
        }
      }

      const factsHeight = 68;
      const factsTop = H - pad - 26 - 12 - factsHeight;
      y += 14;
      const desc = item.desc || `Follow ${item.title} in the complete ${universeLabel} viewing order.`;
      const descFont = '400 13.5px Inter, sans-serif';
      const descLineHeight = 22;
      const descLines = Math.max(1, Math.floor((factsTop - 14 - y) / descLineHeight));
      ctx.font = descFont;
      ctx.fillStyle = muted;
      wrap(desc, descFont, cw, descLines).forEach((line) => {
        y += descLineHeight;
        ctx.fillText(line, cx, y);
      });

      const facts = [
        { label: 'PHASE', value: item.phase ? `Phase ${item.phase}` : '—' },
        { label: 'STATUS', value: STATUS_LABELS[item.userStatus] || 'Unwatched' },
        { label: 'ORDER', value: `#${String(item.order || item.id).padStart(2, '0')} in the saga` },
      ];
      const factW = (cw - 16) / 3;
      facts.forEach((fact, index) => {
        const fx = cx + index * (factW + 8);
        ctx.fillStyle = tile;
        ctx.beginPath(); ctx.roundRect(fx, factsTop, factW, factsHeight, 14); ctx.fill();
        ctx.fillStyle = light ? '#7c8698' : '#8690a0';
        ctx.font = '700 9px Inter, sans-serif';
        ctx.fillText(fact.label, fx + 12, factsTop + 22);
        ctx.fillStyle = ink;
        ctx.font = '800 12.5px Inter, sans-serif';
        ctx.fillText(wrap(fact.value, '800 12.5px Inter, sans-serif', factW - 24, 1)[0], fx + 12, factsTop + 44);
      });

      const footY = H - pad;
      ctx.strokeStyle = light ? 'rgba(16, 24, 40, .1)' : 'rgba(255, 255, 255, .08)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, footY - 26); ctx.lineTo(W - pad, footY - 26); ctx.stroke();
      ctx.font = '700 10.5px Inter, sans-serif';
      ctx.fillStyle = light ? '#7c8698' : '#7d8794';
      ctx.fillText(`${universeLabel.replace(/ .*/, '')} viewing order · ${item.year || ''}`.trim(), pad, footY - 6);
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(W - pad - 4, footY - 10, 4, 0, Math.PI * 2); ctx.fill();

      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${slugifyPosterName(item.title)}-card.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

  const modalRef = React.useRef(null);
  React.useEffect(() => {
    if (isTrailerExpanded && modalRef.current) modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isTrailerExpanded]);

  const itemRoadmap = useMemo(() => getRoadmap(item, activeItems), [activeItems, item]);

  return <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <article role="dialog" aria-modal="true" aria-labelledby="detail-title" style={{ '--accent': item.accent }} className="detail-modal">
      {item.poster && <div className="detail-bg" aria-hidden="true"><img className="detail-backdrop" src={item.poster} alt="" /><div className="detail-backdrop-shade" /></div>}
      <span
        className="detail-grabber"
        aria-hidden="true"
        onPointerDown={(event) => {
          const modal = event.currentTarget.parentElement;
          grabStartRef.current = { y: event.clientY, delta: 0, modal };
          event.currentTarget.setPointerCapture?.(event.pointerId);
          modal?.classList.add('is-dragging');
        }}
        onPointerMove={(event) => {
          const start = grabStartRef.current;
          if (!start) return;
          start.delta = Math.min(Math.max(0, event.clientY - start.y), 170);
          start.modal?.style.setProperty('--sheet-drag', `${start.delta}px`);
        }}
        onPointerUp={() => {
          const start = grabStartRef.current;
          if (!start) return;
          grabStartRef.current = null;
          start.modal?.classList.remove('is-dragging');
          start.modal?.style.setProperty('--sheet-drag', '0px');
          if (start.delta > 96) onClose();
        }}
        onPointerCancel={() => {
          const start = grabStartRef.current;
          grabStartRef.current = null;
          start?.modal?.classList.remove('is-dragging');
          start?.modal?.style.setProperty('--sheet-drag', '0px');
        }}
      />
      <div className="detail-modal-scroll" ref={modalRef}>
      <div className="detail-close-dock"><button className="detail-close" onClick={onClose} aria-label="Close details"><X size={21} /></button></div>
      <div className={`detail-layout${isTrailerExpanded ? ' has-trailer' : ''}`}>
        <div className="detail-media">
          <div className={`detail-poster${isTrailerExpanded ? ' is-expanded' : ''}`}>
            {inlineTrailer
              ? <div className="detail-inline-trailer"><iframe src={inlineTrailer} title={`${item.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /><button onClick={closeTrailer} aria-label="Close trailer"><X size={20} /></button></div>
              : <PosterArt item={item} />}
          </div>
        </div>
        <div className="detail-content">
          {!isTrailerExpanded && (
            <div className="detail-actions-row">
              <button className="detail-watch-now" onClick={() => setSearchSheet(true)} aria-label={`Find where to watch ${item.title}`}><Play size={18} /> Watch Now</button>
              <button className="detail-trailer" onClick={showTrailer}><Clapperboard size={18} /> Watch trailer</button>
            </div>
          )}
          <div className="detail-kicker"><span>{universeFullName(item.universe)}</span><span>#{String(item.order || item.id).padStart(2, '0')}</span></div>
          <h1 id="detail-title">{item.title} <span className="phase-badge">Phase {item.phase || '—'}</span></h1>
          {guidance && (prereqWatched
            ? <details className="detail-spoiler-warning is-caught-up">
                <summary><Check size={16} /><span>{guidance.label} · prerequisites watched</span><ChevronDown size={14} className="spoiler-chevron" /></summary>
                <p>{guidance.note}</p>
              </details>
            : <div className="detail-spoiler-warning" role="alert"><ShieldAlert size={18} /><div><strong>{guidance.label}</strong><p>{guidance.note}</p></div></div>)}
          <div className="detail-chips"><RatingChips item={item} />{(item.genres || []).slice(0,3).map(g => <span key={g}>{g}</span>)}</div>
          <p className="detail-description">{item.desc || `Follow ${item.title} in the complete ${item.universe === 'marvel' ? 'Marvel Cinematic Universe' : 'DC Universe'} viewing order.`}</p>
          <div className="detail-facts"><div><Calendar size={18} /><span>Release year</span><strong>{item.year}</strong></div><div><Timer size={18} /><span>Runtime</span><strong>{runtimeLabel(item.runtime, item.type)}</strong></div><div><Sparkles size={18} /><span>Format</span><strong>{item.type}</strong></div>{item.userStatus === 'watching' && item.watchedDuration > 30000 && <div><Clock size={18} /><span>Watched</span><strong>{watchTimeLabel(item)}</strong></div>}</div>
          <div className="detail-progress-actions"><StatusSelect item={item} setStatus={setStatus} /><button className={`detail-bookmark ${item.bookmarked ? 'saved' : ''}`} onClick={() => toggleBookmark(item)} aria-label={item.bookmarked ? 'Remove bookmark' : 'Save title'}><Bookmark size={19} fill={item.bookmarked ? 'currentColor' : 'none'} /></button>
</div><div className="detail-download-row">{item.type === 'series' && <EpisodeDropdown episodes={downloadEpisodes} selected={downloadEpisode} onSelect={setDownloadEpisode} season={item.season || 1} />}<button className="detail-download" onClick={handleDownloadClick} disabled={!item.tmdbId || (item.type === 'series' && !downloadEpisodes.length)} aria-label={`Download ${item.title}${item.type === 'series' ? ` episode ${downloadEpisode}` : ''}`}><Download size={18} /><span>Download</span></button><button className={`detail-snap${snapError ? ' snap-failed' : ''}`} onClick={snapCard} disabled={snapping} aria-label={`Snapshot ${item.title} as shareable card`}><Camera size={17} /><span>{snapping ? '…' : snapError || 'Snap'}</span></button></div>
          {itemRoadmap && (
            <RoadmapBoard
              segments={itemRoadmap.segments}
              complete={itemRoadmap.complete}
              total={itemRoadmap.siblings.length}
              title="Viewing roadmap"
              eyebrow="Recommended sequence"
              onPlay={(target) => onStartWatchFromRoadmap(target, target.tmdbId || null, target.type === 'series' ? 'tv' : 'movie')}
            />
          )}
          </div>
      </div>
      </div>
      {searchSheet && <SearchLinksDialog
        item={item}
        onClose={() => setSearchSheet(false)}
        onMarkWatching={() => { setSearchSheet(false); onStartWatch(item, item.tmdbId, item.type === 'series' ? 'tv' : 'movie'); }}
      />}
    </article>
  </div>;
}

/* Watch Now hands off to the web instead of pretending to stream in place. */
function SearchLinksDialog({ item, onClose, onMarkWatching }) {
  const query = encodeURIComponent(`${item.title} ${item.year || ''}`.trim());
  const options = [
    { key: 'youtube', label: 'YouTube', note: 'Official trailers and clips', href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} official trailer`)}` },
    { key: 'justwatch', label: 'JustWatch', note: 'Which service streams it', href: `https://www.justwatch.com/us/search?q=${encodeURIComponent(item.title)}` },
    { key: 'google', label: 'Google', note: 'Everywhere it is available', href: `https://www.google.com/search?q=${query}+where+to+watch` },
  ];
  return <div className="search-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="search-sheet" role="dialog" aria-modal="true" aria-labelledby="search-sheet-title">
      <header>
        <p className="eyebrow">Playback lives elsewhere</p>
        <h2 id="search-sheet-title">Where to watch {item.title}</h2>
      </header>
      <div className="search-links">
        {options.map(option => <a key={option.key} href={option.href} target="_blank" rel="noopener noreferrer" onClick={onClose}>
          <span><strong>{option.label}</strong><small>{option.note}</small></span>
          <ExternalLink size={16} />
        </a>)}
      </div>
      <div className="search-sheet-actions">
        <button className="search-primary" onClick={onMarkWatching}>Mark as watching</button>
        <button className="search-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  </div>;
}
/* Shared viewing roadmap: numbered timeline rail with branch chips. */
function RoadmapBoard({ segments = [], complete = 0, total = 0, title = 'Viewing roadmap', eyebrow = 'Recommended sequence', onPlay, footer }) {
  const steps = useMemo(() => {
    const list = [];
    segments.forEach((seg) => {
      if (seg.type === 'part') {
        list.push({ part: seg.item, isActive: Boolean(seg.isActive), branches: [] });
      } else if (list.length) {
        list[list.length - 1].branches.push(seg.items);
      }
    });
    return list;
  }, [segments]);
  const percent = total ? Math.round((complete / total) * 100) : 0;

  return <section className="rm-board">
    <header className="rm-head">
      <div className="rm-head-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <div className="rm-meter" aria-label={`${complete} of ${total} watched`}>
        <span className="rm-meter-count"><b>{complete}</b>/{total} watched</span>
        <span className="rm-meter-track"><span style={{ width: `${percent}%` }} /></span>
      </div>
    </header>
    <ol className="rm-track">
      {steps.map((step, index) => {
        const item = step.part;
        const watched = item.userStatus === 'watched';
        return <li key={item.id} className={`rm-step${step.isActive ? ' is-active' : ''}${watched ? ' is-watched' : ''}`}>
          <span className="rm-node" aria-hidden="true">{watched ? <Check size={13} /> : String(index + 1).padStart(2, '0')}</span>
          <button type="button" className="rm-card" onClick={() => onPlay(item)} title={`Play ${item.title}`} style={{ '--accent': item.accent }}>
            <span className="rm-poster">
              {item.poster ? <img src={item.poster} alt="" loading="lazy" /> : <FallbackPoster item={item} />}
            </span>
            <span className="rm-copy">
              <span className="rm-state">{step.isActive ? 'Now playing' : watched ? 'Watched' : `Chapter ${index + 1}`}{item.season ? ` · Season ${item.season}` : ''}</span>
              <strong className="rm-title">{item.title.replace(/^Agents of SHIELD S\d+ /, '')}</strong>
              <span className="rm-meta">{item.year} · {runtimeLabel(item.runtime, item.type)}</span>
            </span>
            <ChevronRight size={16} className="rm-arrow" aria-hidden="true" />
          </button>
          {step.branches.map((branch, branchIndex) => <div className="rm-branch" key={`branch-${index}-${branchIndex}`}>
            <span className="rm-branch-label">Connected stories</span>
            <div className="rm-branch-items">
              {branch.map(intItem => <button type="button" key={intItem.id} className="rm-chip" onClick={() => onPlay(intItem)} style={{ '--accent': intItem.accent }} title={intItem.connectionNote || intItem.title}>
                <span className="rm-chip-poster">{intItem.poster ? <img src={intItem.poster} alt="" loading="lazy" /> : null}</span>
                <span className="rm-chip-copy">
                  <strong>{intItem.title}</strong>
                  {intItem.connectionNote ? <small>{intItem.connectionNote}</small> : null}
                </span>
              </button>)}
            </div>
          </div>)}
        </li>;
      })}
    </ol>
    {footer}
  </section>;
}
/* Up next: one spotlight chapter plus the queue behind it, instead of a card grid. */
function UpNextBoard({ items = [], setSelected, onStart }) {
  if (!items.length) return null;
  const [lead, ...rest] = items;
  const queue = rest.slice(0, 3);
  return <section className="unb-board">
    <header className="unb-head">
      <div>
        <p className="unb-eyebrow">Up next</p>
        <h2>Continue the timeline</h2>
      </div>
      <span className="unb-count">{items.length} unwatched</span>
    </header>
    <div className="unb-body">
      <article className="unb-lead" style={{ '--accent': lead.accent }}>
        <button className="unb-poster" onClick={() => setSelected(lead)} aria-label={`Open ${lead.title}`}>
          <PosterArt item={lead} />
        </button>
        <div className="unb-lead-copy">
          <span className="unb-chapter">{universeShortName(lead.universe)} · Chapter {String(lead.order || lead.id).padStart(2, '0')}</span>
          <button className="unb-title" onClick={() => setSelected(lead)}>{lead.title}</button>
          <span className="unb-meta">{lead.year} · {runtimeLabel(lead.runtime, lead.type)} · {lead.type === 'series' ? 'Series' : 'Film'}</span>
          {lead.desc && <p className="unb-desc">{lead.desc}</p>}
          <div className="unb-actions">
            <button className="unb-start" onClick={() => onStart(lead)}><Play size={15} fill="currentColor" /> Start</button>
            <button className="unb-detail" onClick={() => setSelected(lead)}><Info size={15} /> Details</button>
          </div>
        </div>
      </article>
      {queue.length > 0 && <div className="unb-queue">
        <p className="unb-queue-label">Then{rest.length > queue.length ? ` · +${rest.length - queue.length} more` : ''}</p>
        <div className="unb-queue-items">
          {queue.map((item, index) => <button key={item.id} className="unb-item" onClick={() => setSelected(item)} style={{ '--accent': item.accent }}>
            <span className="unb-item-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="unb-item-poster">{item.poster ? <img src={item.poster} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <FallbackPoster item={item} />}</span>
            <span className="unb-item-copy"><strong>{item.title}</strong><small>{item.year} · {runtimeLabel(item.runtime, item.type)}</small></span>
            <ChevronRight size={15} className="unb-item-arrow" aria-hidden="true" />
          </button>)}
        </div>
      </div>}
    </div>
  </section>;
}
function TrailerModal({ trailer, onClose }) {
  return <aside className="trailer-modal"><div><button className="trailer-close" onClick={onClose}><X /></button><h2>{trailer.title} trailer</h2><iframe src={trailer.url} title={`${trailer.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></aside>;
}

function ContinueWatching({ items, setSelected, setStatus, toggleBookmark, playTrailer, onResume }) {
  const handleResume = async (item) => {
    const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
    if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
    const res = await fetch(apiUrl(`/api/tmdb/poster?${params.toString()}`));
    if (res.ok) {
      const data = await res.json();
      if (data.tmdbId) { onResume(item, data.tmdbId, data.mediaType === 'tv' ? 'tv' : 'movie'); return; }
    }
    onResume(item, item.tmdbId || null, item.type === 'series' ? 'tv' : 'movie');
  };
  const pageSize = 12;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [items.length]);
  return (
    <section className="rail-card web-rail">
      <div className="section-title"><h2>Continue Watching</h2><span>{items.length} in progress</span></div>
      <div className="movie-grid web-grid grid-3">
        {visibleItems.map(item => (
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
              <button onClick={() => handleResume(item)} className={`watch-chip resume-chip ${item.userStatus === 'watching' ? 'resuming' : ''}`} aria-label={`Resume ${item.title}`}><Play size={16} fill="currentColor" /><span>Resume</span></button>
              <button onClick={() => toggleBookmark(item)} className={`bookmark-chip ${item.bookmarked ? 'saved' : ''}`} aria-label={item.bookmarked ? 'Remove bookmark' : 'Save title'}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button>
            </div>
          </article>
        ))}
      </div>
      {pageCount > 1 && <nav className="pagination" aria-label="Continue Watching pages"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft size={18} /></button>{Array.from({ length: pageCount }, (_, i) => i + 1).map(n => <button key={n} className={currentPage === n ? 'active' : ''} aria-current={currentPage === n ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}<button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount} aria-label="Next page"><ChevronRight size={18} /></button></nav>}
    </section>
  );
}

function WatchBrowse({ activeItems, externalResults = [], externalLoading = false, actions = {}, query = '', onStartWatch, onPlayExternal, setSelected, setStatus, toggleBookmark }) {
  const pageSize = 12;
  const [upNextPage, setUpNextPage] = useState(1);
  const [upNextGridDensity, setUpNextGridDensity] = useState(4);
  const inProgress = activeItems.filter(i => i.userStatus === 'watching');
  const allUpNext = activeItems.filter(i => i.userStatus === 'unwatched');
  const upNextPageCount = Math.max(1, Math.ceil(allUpNext.length / pageSize));
  const currentUpNextPage = Math.min(upNextPage, upNextPageCount);
  const upNext = allUpNext.slice((currentUpNextPage - 1) * pageSize, currentUpNextPage * pageSize);
  const watched = activeItems.filter(i => i.userStatus === 'watched').length;
  const nextWatch = inProgress[0] || allUpNext[0] || null;
  const total = activeItems.length || 1;
  const pct = Math.round((watched / total) * 100);
  useEffect(() => { setUpNextPage(1); }, [allUpNext.length]);
  const handleResume = async (item) => {
    const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
    if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
    const res = await fetch(apiUrl(`/api/tmdb/poster?${params.toString()}`));
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
      {item.metaRating && <span className="wb-rating-badge wb-meta">M{parseInt(item.metaRating)}</span>}
      {!(item.rating || item.imdbRating || item.tomatoRating || item.metaRating) && <span className="wb-rating-badge wb-na">N/A</span>}
    </div>
  );

  return (
    <section className="watch-browse">
      <div className="wb-hero">
        <div className="wb-hero-bg" />
        <div className="wb-hero-content">
          <p className="wb-hero-eyebrow">Watch hub · {activeItems.length} titles tracked</p>
          <h1>{nextWatch ? nextWatch.title : 'Ready to watch?'}</h1>
          <p className="wb-hero-desc">{nextWatch ? (nextWatch.desc || nextWatch.overview || 'Continue the timeline from where you paused.') : 'Pick up where you left off or discover your next story.'}</p>
          <div className="wb-hero-actions">
            {nextWatch && (
              <button className="wb-hero-cta" onClick={() => handleResume(nextWatch)}>
                <Play size={17} fill="currentColor" />
                <span className="wb-hero-cta-label">{inProgress.length ? 'Resume' : 'Start watching'}</span>
                <span className="wb-hero-cta-title">{nextWatch.title}</span>
              </button>
            )}
            {nextWatch && <button className="wb-hero-secondary" onClick={() => setSelected(nextWatch)}>Details</button>}
          </div>
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
        <div className="wb-hero-art">
          {nextWatch && <PosterArt item={nextWatch} loading="eager" />}
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
                <button className="wb-card-media" onClick={() => setSelected(item)}>
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
                  <button onClick={(e) => { e.stopPropagation(); handleResume(item); }} className="wb-action-btn wb-action-primary"><Play size={14} fill="currentColor" /> Resume</button>
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
            <div className="wb-density-toggle" role="group" aria-label="Start Watching grid columns">
              {[2, 3, 4].map(count => <button key={count} className={upNextGridDensity === count ? 'active' : ''} onClick={() => setUpNextGridDensity(count)} aria-label={`${count} columns`}>{count}</button>)}
            </div>
          </div>
          <div key={`wbgrid-${upNextGridDensity}`} className={`wb-grid wb-grid-${upNextGridDensity}`}>
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

/* ── Server preference cache (per-title, persisted to localStorage) ──────────── */

function WatchPage({ watchItem, activeItems, onBack, setStatus, toggleBookmark, onStartWatch, updateAction, nativePlayer, setNativePlayer }) {
  const { item, tmdbId, mediaType } = watchItem;
const readServerCache = () => {
  try { return JSON.parse(localStorage.getItem('server-prefs') || '{}'); } catch { return {}; }
};

const saveServerPref = (tmdbId, server) => {
  if (!tmdbId) return;
  try {
    const cache = readServerCache();
    cache[tmdbId] = server;
    localStorage.setItem('server-prefs', JSON.stringify(cache));
  } catch {}
};

  const [switching, setSwitching] = useState(false);
  const [toast, setToast] = useState('');
  const [contextExpanded, setContextExpanded] = useState(false);
  const [selectedServer, setSelectedServerRaw] = useState(() => {
    const cached = readServerCache();
    const pref = item.tmdbId ? cached[item.tmdbId] : null;
    return pref || 'videasy';
  });

  // Auto-save server preference per title
  const setSelectedServer = (server) => {
    setSelectedServerRaw(server);
    if (currentItem?.tmdbId) saveServerPref(currentItem.tmdbId, server);
  };

  const currentItem = activeItems.find(i => i.id === item.id) || item;
  const isSeries = currentItem.type === 'series' && currentItem.tmdbId;
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(currentItem.epStart || 1);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const watchedEpisodes = currentItem.watchedEpisodes || [];
  const loadTimeoutRef = useRef(null);
  const [iframeTimedOut, setIframeTimedOut] = useState(false);
  const [restartCounter, setRestartCounter] = useState(0);
  const iframeKey = `${selectedServer}-${isSeries ? `ep-${currentItem.tmdbId}-${currentItem.season || 1}-${selectedEpisode}` : currentItem.tmdbId || item.id}-r${restartCounter}`;

  // Detect iframe load failures: start 10s timer on iframe key change, cancel on load
  useEffect(() => {
    if (nativePlayer) return;
    clearTimeout(loadTimeoutRef.current);
    setToast('');
    setIframeTimedOut(false);
    loadTimeoutRef.current = setTimeout(() => {
      const alt = selectedServer === 'videasy' ? 'MoviePire' : 'Videasy';
      setToast(`Player taking longer than expected. Try restarting or switch servers.`);
      setIframeTimedOut(true);
    }, 10000);
    return () => clearTimeout(loadTimeoutRef.current);
  }, [iframeKey, nativePlayer]);

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
    fetch(apiUrl(`/api/tmdb/episodes?tmdbId=${currentItem.tmdbId}&season=${season}`), { cache: 'force-cache' })
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

  const initProgressRef = useRef(Math.floor((currentItem.watchedDuration || 0) / 1000));
  const playerUrl = useMemo(() => buildPlayerUrl({
    provider: selectedServer,
    mediaType: currentItem.type === 'series' ? 'tv' : 'movie',
    tmdbId: currentItem.tmdbId || tmdbId,
    title: item.title,
    season: currentItem.season || 1,
    episode: isSeries ? selectedEpisode : undefined,
    progressSeconds: Math.max(0, initProgressRef.current || 0),
  }), [selectedServer, currentItem.type, currentItem.tmdbId, currentItem.season, tmdbId, item.title, isSeries, selectedEpisode]);
  const roadmapInfo = useMemo(() => getRoadmap(currentItem, activeItems), [activeItems, currentItem]);

  const currentOrder = currentItem.order || currentItem.id;
  const contextItems = useMemo(() => {
    return activeItems.filter(i => {
      if (contextExpanded) return true;
      return Math.abs(i.order - currentOrder) <= 2;
    }).sort((a, b) => a.order - b.order);
  }, [activeItems, currentOrder, contextExpanded]);

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
    const interval = setInterval(() => setElapsed(prev => prev + 5000), 5000);
    return () => clearInterval(interval);
  }, [currentItem.id, totalMs, restartCounter]);

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
      const res = await fetch(apiUrl(`/api/tmdb/poster?${params.toString()}`));
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
          <span className="watch-kicker">{universeShortName(currentItem.universe)} · #{String(currentItem.order || currentItem.id).padStart(2, '0')}</span>
          <h1>{currentItem.title}</h1>
        </div>
        <div className="watch-server-select">
          <Cloud size={15} aria-hidden="true" />
          <span>Server</span>
          <ServerDropdown server={selectedServer} onSelect={setSelectedServer} />
        </div>
      </header>
      {toast && (
        <div className="watch-toast">
          <span>{toast}</span>
          <button className="watch-toast-close" onClick={() => { setToast(''); setIframeTimedOut(false); }} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}
      <div className="watch-theater">
      <div className="watch-main">
      <div className="watch-stage">
      <div className="watch-player">
        {nativePlayer ? (
          <div className="watch-native-launch">
            <div className="watch-native-icon-ring">
              <Play size={36} fill="currentColor" />
            </div>
            <h2>External player</h2>
            <p>Opens {item.title} in a new tab using the native browser player.</p>
            <a className="watch-native-btn" href={playerUrl} target="_blank" rel="noopener noreferrer">
              <Play size={18} fill="currentColor" />
              <span>Open {item.title}</span>
            </a>
            <button className="watch-native-embed-link" onClick={() => {
              setNativePlayer(false);
              localStorage.setItem('native-player', '0');
            }}>Switch back to embedded player</button>
          </div>
        ) : (
          <iframe key={iframeKey} src={playerUrl} title={`Watch ${item.title}`} frameBorder="0" allowFullScreen allow="encrypted-media" loading="eager" onLoad={() => { clearTimeout(loadTimeoutRef.current); setToast(''); saveServerPref(currentItem.tmdbId, selectedServer); }} />
        )}
      </div>
      <div className="watch-progress-bar"><span style={{ width: `${progress}%` }} /></div>
      <div className="watch-controlbar">
        {!nativePlayer && (
          <button className="watch-restart-btn" onClick={() => { setRestartCounter(c => c + 1); setToast(''); setIframeTimedOut(false); }} title="Restart from beginning">
            <RotateCcw size={13} /> Restart
          </button>
        )}
        <div className="watch-controlbar-meta">
          {isSeries && <span className="watch-controlbar-chip">S{currentItem.season || 1} · E{selectedEpisode}</span>}
          <span className="watch-controlbar-chip">{Math.round(progress)}% watched</span>
          {roadmapInfo && <span className="watch-controlbar-chip">{roadmapInfo.complete}/{roadmapInfo.siblings.length} parts</span>}
        </div>
        <span className="watch-controlbar-server">{selectedServer}</span>
      </div>
      </div>
        <div className="watch-info">
        <p className="watch-eyebrow">Story details</p>
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
      </div>
      <aside className="watch-side">
        {isSeries && episodes.length > 0 && (
          <div className="watch-episode-picker">
            <div className="watch-episode-head">
              <h2>Episodes</h2>
              <span>{episodeLoading ? 'Loading…' : `${watchedInRange.length}/${episodeRangeTotal} watched`}</span>
            </div>
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
      </aside>
      </div>
      <RoadmapBoard
        segments={roadmapInfo ? roadmapInfo.segments : contextItems.map(item => ({ type: 'part', item, isActive: item.id === currentItem.id }))}
        complete={roadmapInfo ? roadmapInfo.complete : contextItems.filter(item => item.userStatus === 'watched').length}
        total={roadmapInfo ? roadmapInfo.siblings.length : contextItems.length}
        title={roadmapInfo ? 'Viewing roadmap' : 'Viewing order'}
        eyebrow={roadmapInfo ? 'Recommended sequence' : 'Story context'}
        onPlay={handleSwitchItem}
        footer={!roadmapInfo && activeItems.length > 5 ? (
          <button className="roadmap-expand-btn" onClick={() => setContextExpanded(!contextExpanded)}>
            {contextExpanded ? 'Show less' : `View full timeline (${activeItems.length} titles)`}
            <ChevronDown size={14} style={{ transform: contextExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
          </button>
        ) : null}
      />
    </section>
  );
}


const AGE_RATINGS = ['PG-13', 'R', 'TV-14', 'TV-PG', 'TV-MA', 'Not Rated'];

const SORT_OPTIONS = [
  { value: 'order', label: 'Viewing Order' },
  { value: 'chronological', label: 'Original Chronological' },
  { value: 'doomsday-secret-wars', label: 'Doomsday → Secret Wars' },
  { value: 'essential', label: 'Essential Only' },
  { value: 'rating', label: 'TMDB Rating' },
  { value: 'imdb', label: 'IMDb Rating' },
  { value: 'tomato', label: 'Rotten Tomatoes' },
  { value: 'meta', label: 'Metacritic' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'year', label: 'Release Year' },
  { value: 'title', label: 'Title A–Z' },
];

function Sheet({ titleId, eyebrow, title, meta, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; };
  }, [onClose]);

  return <div className="filter-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="filter-screen web-filter" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="filter-head">
        <div className="filter-head-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={titleId}>{title}</h2>
          <span className="filter-head-meta">{meta}</span>
        </div>
        <button className="filter-close-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>
      <div className="filter-body">{children}</div>
      <div className="filter-footer">{footer}</div>
    </aside>
  </div>;
}

function Filters({ genre, setGenre, rating, setRating, ageRatingFilter, setAgeRatingFilter, universe, typeFilter, setTypeFilter, genres, count, onClose }) {
  const TYPE_OPTIONS = ['All', 'Movies', 'Series'];
  const RATING_OPTIONS = [{ value: 0, label: 'Any' }, { value: 6, label: '6+' }, { value: 7, label: '7+' }, { value: 8, label: '8+' }, { value: 9, label: '9+' }];
  const activeFilters = [genre !== 'All', rating > 0, ageRatingFilter !== 'All', typeFilter !== 'All'].filter(Boolean).length;
  const resetFilters = () => { hapticWarning(); setGenre('All'); setRating(0); setAgeRatingFilter('All'); setTypeFilter('All'); };

  return <Sheet
    titleId="filter-dialog-title"
    eyebrow="Narrow the list"
    title="Filters"
    meta={`${count} titles match`}
    onClose={onClose}
    footer={<>
      <button className="filter-clear-btn" onClick={resetFilters} disabled={activeFilters === 0}>
        <RotateCcw size={14} />
        {activeFilters > 0 ? `Reset ${activeFilters}` : 'Reset'}
      </button>
      <button className="filter-results-btn" onClick={onClose}><Check size={16} /> Show {count} results</button>
    </>}
  >
    <div className="filter-status-row">
      <span className={`filter-status-pill ${activeFilters ? 'is-active' : ''}`}>
        {activeFilters ? `${activeFilters} filter${activeFilters > 1 ? 's' : ''} active` : 'Showing everything'}
      </span>
      <span className="filter-status-hint">Phase and order live in the header</span>
    </div>

      <section className="filter-card">
        <div className="filter-card-head"><span className="filter-card-icon"><Clapperboard size={14} /></span><h3>Format</h3></div>
        <div className="filter-chip-row">
          {TYPE_OPTIONS.map(t => (
            <button key={t} className={`filter-chip ${typeFilter === t ? 'selected' : ''}`} onClick={() => { hapticTap(); setTypeFilter(t); }}>{t}</button>
          ))}
        </div>
      </section>

      <section className="filter-card">
        <div className="filter-card-head"><span className="filter-card-icon"><Sparkles size={14} /></span><h3>Genre</h3></div>
        <div className="filter-chip-row">
          {genres.map(g => (
            <button key={g} className={`filter-chip ${genre === g ? 'selected' : ''}`} onClick={() => { hapticTap(); setGenre(g === genre ? 'All' : g); }}>{g}</button>
          ))}
        </div>
      </section>

      <section className="filter-card">
        <div className="filter-card-head"><span className="filter-card-icon"><Star size={14} /></span><h3>Minimum rating</h3></div>
        <div className="filter-chip-row">
          {RATING_OPTIONS.map(r => (
            <button key={r.value} className={`filter-chip filter-chip-star ${rating === r.value ? 'selected' : ''}`} aria-pressed={rating === r.value} onClick={() => { hapticTap(); setRating(r.value); }}>{r.value > 0 && <Star size={11} fill="currentColor" />}{r.label}</button>
          ))}
        </div>
      </section>

      <section className="filter-card">
        <div className="filter-card-head"><span className="filter-card-icon"><ShieldAlert size={14} /></span><h3>Age rating</h3></div>
        <div className="filter-chip-row">
          {[{ value: 'All', label: 'All' }, ...AGE_RATINGS.map(r => ({ value: r, label: r }))].map(a => (
            <button key={a.value} className={`filter-chip ${ageRatingFilter === a.value ? 'selected' : ''}`} onClick={() => { hapticTap(); setAgeRatingFilter(a.value); }}>{a.label}</button>
          ))}
        </div>
      </section>
  </Sheet>;
}

function SortSheet({ sortBy, setSortBy, sortDirection, setSortDirection, count, onClose }) {
  const isDefault = sortBy === 'order' && sortDirection === 'asc';
  return <Sheet
    titleId="sort-dialog-title"
    eyebrow="Choose the order"
    title="Sort list"
    meta={`${count} titles in view`}
    onClose={onClose}
    footer={<>
      <button className="filter-clear-btn" onClick={() => { setSortBy('order'); setSortDirection('asc'); }} disabled={isDefault}>
        <RotateCcw size={14} />
        Default
      </button>
      <button className="filter-results-btn" onClick={onClose}><Check size={16} /> Show {count} results</button>
    </>}
  >
    <div className="sort-direction-bar" role="group" aria-label="Sort direction">
      <button className={sortDirection === 'asc' ? 'active' : ''} aria-pressed={sortDirection === 'asc'} onClick={() => { hapticTap(); setSortDirection('asc'); }}>
        <ChevronUp size={15} />
        <span>Ascending</span>
      </button>
      <button className={sortDirection === 'desc' ? 'active' : ''} aria-pressed={sortDirection === 'desc'} onClick={() => { hapticTap(); setSortDirection('desc'); }}>
        <ChevronDown size={15} />
        <span>Descending</span>
      </button>
    </div>
    <div className="sort-option-list">
      {SORT_OPTIONS.map(opt => (
        <button key={opt.value} className={`sort-option ${sortBy === opt.value ? 'selected' : ''}`} aria-pressed={sortBy === opt.value} onClick={() => { hapticTap(); setSortBy(opt.value); }}>
          <span className="sort-option-label">{opt.label}</span>
          {sortBy === opt.value ? <span className="sort-option-check"><Check size={13} /></span> : <span className="sort-option-mark" aria-hidden="true" />}
        </button>
      ))}
    </div>
  </Sheet>;
}

/* ── Watch confirmation dialog ─────────────────────────────────────────────── */
function WatchConfirmDialog({ item, onConfirm, onDismiss }) {
  return (
    <div className="confirm-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="wconfirm-title">
        <button className="confirm-close" onClick={() => onDismiss(false)} aria-label="Close"><X size={18} /></button>
        <div className="confirm-icon-ring">
          <Play size={24} fill="currentColor" />
        </div>
        <h2 id="wconfirm-title">Start watching?</h2>
        <p className="confirm-item-title">{item?.title}</p>
        <p className="confirm-hint">You will be redirected to the player. An ad blocker is recommended for the best experience.</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn-primary" onClick={onConfirm}>Watch now</button>
          <button className="confirm-btn confirm-btn-secondary" onClick={() => onDismiss(false)}>Cancel</button>
        </div>
        <button className="confirm-skip" onClick={() => onDismiss(true)}>Don't show this again</button>
      </div>
    </div>
  );
}

function AdBlockerDialog({ onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Stagger entrance so it slides in after the page loads
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss after 5s once visible
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(handleDismiss, 5000);
    return () => clearTimeout(t);
  }, [visible]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 200);
  };

  if (!visible && !exiting) return null;

  return (
    <div className={`adblocker-toast${exiting ? ' adblocker-toast-exit' : ''}`} role="status" aria-live="polite">
      <div className="adblocker-toast-icon">
        <ShieldAlert size={16} />
      </div>
      <div className="adblocker-toast-body">
        <span className="adblocker-toast-title">Pro tip</span>
        <p className="adblocker-toast-desc">
          Use an ad blocker for cleaner streams.{' '}
          <a href="https://github.com/gorhill/uBlock" target="_blank" rel="noopener noreferrer">uBlock Origin</a>
        </p>
      </div>
      <button className="adblocker-toast-close" onClick={handleDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────────────── */
function Footer() {
  const [open, setOpen] = useState(false);
  return (
    <footer className={`site-footer${open ? ' footer-expanded' : ''}`}>
      <div className="footer-bottom">
        <span>&copy; {new Date().getFullYear()} Cinematic Viewing Order. All rights reserved.</span>
        <span>Not affiliated with Marvel, DC, Disney, Warner Bros., or any film studio.</span>
        <button className="footer-info-btn" onClick={() => setOpen(!open)} title={open ? 'Hide details' : 'Show disclaimers & attribution'}>{open ? '✕' : 'ⓘ'}</button>
      </div>
      {open && (
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
      )}
    </footer>
  );
}
