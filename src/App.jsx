import React, { useState, useEffect, useRef, useMemo, useCallback, useReducer } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Media } from '@capacitor-community/media';
import CropModal from './components/CropModal';
import SetupWizard from './components/SetupWizard';
import { readStorageJSON, readStorageValue, removeStorageValue, safeLocalStorageSetItem, scheduleStorageWrite, pruneObject } from './utils/cacheStorage';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { renderCardToCanvas } from './export/cards/renderCardToCanvas';
import { drawPremiumStars, drawRoundedPanel, drawWrappedText } from './export/cards/helpers';
import { useHeroBackdrop } from './hooks/useHeroBackdrop';
import { usePosterCache } from './hooks/usePosterCache';
import { useOverlayNavigation } from './hooks/useOverlayNavigation';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { Header, TimelineControls, ProgressSection, TitleCard, DetailDrawer, Settings as SettingsSection, Analytics } from './components/features';
import { APPEARANCE_MODES, CHARACTER_THEMES, resolveThemeTokens } from './constants/themeSettings';
import { buildSemanticThemeVars, UI_PARITY_TOKENS } from './constants/ui';
import './App.layout.css';
import './App.components.css';
import './App.motion.css';

import {
  ESSENTIAL_LIST,
  NO_PREREQ,
  PHASES,
  RAW,
  RELEASE_INFO,
  UPCOMING_PLACEHOLDERS,
} from './data/mcuData';
import { DC_RAW, DC_PHASES, DC_CORE_IDS } from './data/dcData';
import { UNIVERSE_META } from './constants/universeSwitch';
import { TIMELINE_MODES, TIMELINE_MODE_IDS, CHARACTER_POV_TITLE_SETS, STORY_ORDER_OVERRIDES, SONY_MARVEL_TITLE_SET } from './data/timelineModes';
import { AFTER_CREDITS, AFTER_CREDITS_DEFAULT, DIRECTOR_DATA } from './data/afterCreditsData';
import { TRAILER_DATA, trailerEmbedUrl, getTrailerByTitle } from './data/trailerData';

import { Search, Eye, EyeOff, Film, Tv, Zap, ChevDown, ChevRight, ArrowUpDown, Check, Clock, Heart, Pause, Trash2, Upload, Download, Sun, Star, Moon, Settings, Info, Bookmark, Layers, PlayCircle, PauseCircle, XCircle, SlidersH, UserCircle, Menu, SwitchIcon, X } from './constants/icons';
import { MARVEL_UI_LEXICON, DC_UI_LEXICON, LIST_MODES } from './constants/appText';
import { matchesSearch } from './utils/searchUtils';

const TYPE_META = {
  film:   { label: 'Film',   Icon: Film, color: '#d4372f' },
  series: { label: 'Series', Icon: Tv,   color: '#4a9ede' },
  short:  { label: 'Short',  Icon: Zap,  color: '#a06cd5' },
};

const FALLBACK_TYPE_META = { label: 'Title', Icon: Layers, color: 'var(--theme-text-secondary)' };

const STATUS_META = {
  watched:        { label: 'Completed',      color: '#e11d48', Icon: Check,      bg: 'rgba(225,29,72,0.12)'  },
  'plan-to-watch':{ label: 'Watchlist',      color: '#3b82f6', Icon: Bookmark,   bg: 'rgba(59,130,246,0.12)' },
  watching:       { label: 'In Progress',    color: '#8b5cf6', Icon: PlayCircle, bg: 'rgba(139,92,246,0.12)' },
  'on-hold':      { label: 'Paused',         color: '#f59e0b', Icon: PauseCircle,bg: 'rgba(245,158,11,0.12)' },
  dropped:        { label: 'Dropped',        color: '#ef4444', Icon: XCircle,    bg: 'rgba(239,68,68,0.12)'  },
  unwatched:      { label: 'Unwatched',      color: 'var(--theme-text-secondary)', Icon: EyeOff, bg: 'transparent' },
};

const SORT_LABELS = { order: 'Chronological', year: 'By Year', title: 'Alphabetical', runtime: 'Runtime', watched: 'Recently Watched', status: 'By Status' };
const HIDDEN_FILTER_STATUSES = new Set(['watched', 'dropped']);
const TITLE_ROW_STATIC = {
  titleBtn: { overflow: 'hidden' },
  titleLine: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  genreMeta: { marginTop: 2, fontSize: 10, fontFamily: 'var(--font-marvel-ui)', letterSpacing: 1.2 },
};
const DESKTOP_TEXT_SCALES = [1, 1.25, 1.5, 1.75, 2];
// ─── Static data ────────────────────────────────────────────────────────────

// ─── OMDB ratings key (for ratings only — posters use TMDB) ─────────────────
const OMDB_RATINGS_KEY = '2c971c17';

const CACHE_KEYS = {
  poster: 'mcu-poster-cache-v1',
  meta: 'mcu-meta-cache-v1',
  posterExportFailures: 'mcu-poster-export-failures-v1',
  userActions: 'mcu-user-actions-v1',
  userActionsLikes: 'mcu-user-actions-likes-v1',
  userActionsRatings: 'mcu-user-actions-ratings-v1',
  userActionsRewatch: 'mcu-user-actions-rewatch-v1',
  userActionsBookmarks: 'mcu-user-actions-bookmarks-v1',
  userActionsReviews: 'mcu-user-actions-reviews-v1',
  uiState: 'mcu-ui-state-v1',
  heroCarousel: 'mcu-hero-carousel-cache-v1',
};


const UI_STATE_DEFAULTS = {
  listMode: 'core',
  search: '',
  searchScope: { title: true, description: false, director: false, actors: false, prerequisites: false, metadata: false },
  sortBy: 'order',
  essentialOnly: false,
  watchedOnly: false,
  statusFilter: null,
  typeFilter: null,
  activePhase: 0,
  filtersOpen: false,
  viewMode: 'list',
  densityMode: 'comfortable',
  timelineMode: 'release',
  autoHideStatuses: false,
  performanceMode: true,
  posterDataSaver: true,
  desktopTextScale: 1,
  textScaleEnabled: true,
  scrollTop: 0,
  exportPrefs: { font: 'inter', textScale: 1.08, detailUseReviewStyle: true },
};

const VALID_LIST_MODES = new Set(LIST_MODES.map(mode => mode.id));
const VALID_VIEW_MODES = new Set(['list', 'calendar']);
const VALID_PHASES = new Set([0, ...PHASES.map(phase => phase.id), ...DC_PHASES.map(phase => phase.id)]);
const VALID_TYPES = new Set([null, ...Object.keys(TYPE_META)]);
const VALID_STATUSES = new Set([null, ...Object.keys(STATUS_META)]);
const VALID_DENSITY_MODES = new Set(['comfortable', 'compact']);
const VALID_TIMELINE_MODES = TIMELINE_MODE_IDS;
const VALID_DESKTOP_TEXT_SCALES = new Set(DESKTOP_TEXT_SCALES);
const AUTO_HIDDEN_STATUSES = HIDDEN_FILTER_STATUSES;

const getSafeTypeMeta = (type) => TYPE_META[type] || FALLBACK_TYPE_META;
const getSafeStatusMeta = (status) => STATUS_META[status] || STATUS_META.unwatched;
const compressTmdbPosterUrl = (src, enabled) => {
  if (!enabled || typeof src !== 'string') return src;
  return src.replace('image.tmdb.org/t/p/w500', 'image.tmdb.org/t/p/w342');
};

const readSavedUiState = () => {
  if (typeof window === 'undefined') return UI_STATE_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(CACHE_KEYS.uiState);
    if (!raw) return UI_STATE_DEFAULTS;
    const saved = JSON.parse(raw);
    return {
      ...UI_STATE_DEFAULTS,
      listMode: VALID_LIST_MODES.has(saved.listMode) ? saved.listMode : UI_STATE_DEFAULTS.listMode,
      search: typeof saved.search === 'string' ? saved.search : UI_STATE_DEFAULTS.search,
      searchScope: {
        ...UI_STATE_DEFAULTS.searchScope,
        ...(saved.searchScope && typeof saved.searchScope === 'object' ? saved.searchScope : {}),
      },
      sortBy: SORT_LABELS[saved.sortBy] ? saved.sortBy : UI_STATE_DEFAULTS.sortBy,
      essentialOnly: Boolean(saved.essentialOnly),
      watchedOnly: Boolean(saved.watchedOnly),
      statusFilter: VALID_STATUSES.has(saved.statusFilter) ? saved.statusFilter : UI_STATE_DEFAULTS.statusFilter,
      typeFilter: VALID_TYPES.has(saved.typeFilter) ? saved.typeFilter : UI_STATE_DEFAULTS.typeFilter,
      activePhase: VALID_PHASES.has(Number(saved.activePhase)) ? Number(saved.activePhase) : UI_STATE_DEFAULTS.activePhase,
      filtersOpen: Boolean(saved.filtersOpen),
      viewMode: VALID_VIEW_MODES.has(saved.viewMode) ? saved.viewMode : UI_STATE_DEFAULTS.viewMode,
      densityMode: VALID_DENSITY_MODES.has(saved.densityMode) ? saved.densityMode : UI_STATE_DEFAULTS.densityMode,
      timelineMode: VALID_TIMELINE_MODES.has(saved.timelineMode) ? saved.timelineMode : UI_STATE_DEFAULTS.timelineMode,
      autoHideStatuses: typeof saved.autoHideStatuses === 'boolean' ? saved.autoHideStatuses : UI_STATE_DEFAULTS.autoHideStatuses,
      performanceMode: typeof saved.performanceMode === 'boolean' ? saved.performanceMode : UI_STATE_DEFAULTS.performanceMode,
      posterDataSaver: typeof saved.posterDataSaver === 'boolean' ? saved.posterDataSaver : UI_STATE_DEFAULTS.posterDataSaver,
      desktopTextScale: VALID_DESKTOP_TEXT_SCALES.has(Number(saved.desktopTextScale)) ? Number(saved.desktopTextScale) : UI_STATE_DEFAULTS.desktopTextScale,
      textScaleEnabled: typeof saved.textScaleEnabled === 'boolean' ? saved.textScaleEnabled : UI_STATE_DEFAULTS.textScaleEnabled,
      scrollTop: Number.isFinite(Number(saved.scrollTop)) ? Math.max(0, Number(saved.scrollTop)) : UI_STATE_DEFAULTS.scrollTop,
    };
  } catch {
    return UI_STATE_DEFAULTS;
  }
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const calculateWatchStreak = (items) => {
  const dayKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const daySet = new Set(
    items
      .filter(item => item.status === 'watched' && item.watchedDate)
      .map(item => String(item.watchedDate).slice(0, 10))
      .filter(Boolean)
  );
  if (!daySet.size) return 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayKey = dayKey(cursor);
  if (!daySet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daySet.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (daySet.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const DEFAULT_EXPORT_TEXT_SCALE = 1.22;
const EXPORT_FONT_FAMILIES = {
  inter: 'Inter, Outfit, sans-serif',
  grotesk: 'Outfit, Inter, sans-serif',
  manrope: 'Manrope, Outfit, sans-serif',
  marvel: 'Bebas Neue, Rajdhani, Outfit, sans-serif',
};
const EXPORT_FONT_PREVIEW_FAMILY = {
  inter: 'Inter, Outfit, sans-serif',
  grotesk: 'Outfit, Inter, sans-serif',
  manrope: 'Manrope, Outfit, sans-serif',
  marvel: 'Bebas Neue, Rajdhani, Outfit, sans-serif',
};
const EXPORT_THEME_OPTIONS = [
  { id: 'sacredTimeline', label: 'Sacred Timeline', desc: 'canon progress' },
  { id: 'timelinePortal', label: 'Timeline Portal', desc: 'portal arcs' },
  { id: 'watchParty', label: 'Watch Party', desc: 'fan energy' },
  { id: 'multiverseGlitch', label: 'Multiverse Glitch', desc: 'variant shards' },
  { id: 'heroDossier', label: 'Hero Dossier', desc: 'mission file' },
];

const WATERMARK_POSITION_PRESETS = {
  hero: { position: 'bottom-end', mobile: { x: 14, y: 14 }, tablet: { x: 20, y: 18 }, desktop: { x: 28, y: 22 } },
  card: { position: 'top-end', mobile: { x: 10, y: 10 }, tablet: { x: 12, y: 12 }, desktop: { x: 14, y: 14 } },
};

const WATERMARK_THEME_TOKENS = {
  light: { opacity: 0.14, blendMode: 'multiply' },
  dark: { opacity: 0.11, blendMode: 'screen' },
  cinematic: { opacity: 0.12, blendMode: 'soft-light' },
};

const WatermarkOverlay = ({ label = 'MCU', surface = 'card', theme = 'dark', viewport = 'desktop', avoid = [] }) => {
  const preset = WATERMARK_POSITION_PRESETS[surface] || WATERMARK_POSITION_PRESETS.card;
  const tokens = WATERMARK_THEME_TOKENS[theme] || WATERMARK_THEME_TOKENS.dark;
  const offsets = preset[viewport] || preset.desktop;
  const avoidSet = new Set(avoid);
  const shouldFlipToBottom = preset.position.startsWith('top') && (avoidSet.has('title') || avoidSet.has('cta'));
  const shouldFlipToStart = preset.position.endsWith('end') && avoidSet.has('progress');
  const resolvedPosition = `${shouldFlipToBottom ? 'bottom' : preset.position.split('-')[0]}-${shouldFlipToStart ? 'start' : preset.position.split('-')[1]}`;
  const style = {
    position: 'absolute',
    pointerEvents: 'none',
    opacity: tokens.opacity,
    mixBlendMode: tokens.blendMode,
    letterSpacing: '0.32em',
    fontFamily: 'var(--font-marvel-display)',
    fontSize: surface === 'hero' ? 12 : 10,
    fontWeight: 650,
    color: 'var(--theme-text-muted)',
    textTransform: 'uppercase',
    zIndex: 3,
  };
  if (resolvedPosition.includes('top')) style.top = offsets.y;
  if (resolvedPosition.includes('bottom')) style.bottom = offsets.y;
  if (resolvedPosition.includes('start')) style.left = offsets.x;
  if (resolvedPosition.includes('end')) style.right = offsets.x;
  if (resolvedPosition === 'center') {
    style.top = '50%';
    style.left = '50%';
    style.transform = 'translate(-50%, -50%)';
  }
  return <div style={style}>{label}</div>;
};
const waitForExportFont = async (fontFamily) => {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.ready,
      document.fonts.load(`700 32px ${fontFamily}`),
      document.fonts.load(`900 64px ${fontFamily}`),
    ]);
  } catch {}
};

const isAgentsOfShieldCarouselDuplicate = (item) => /agents of shield/i.test(item?.title || '');
const HERO_ROTATION_MS = 10000;
const HERO_VISIBLE_COUNT = 15;
const HERO_PRELOAD_AHEAD = 12;
const loadedHeroPosterSrcs = new Set();
const heroPosterLoadPromises = new Map();

const preloadHeroPoster = (src) => {
  if (!src || typeof window === 'undefined') return Promise.resolve(src || '');
  if (loadedHeroPosterSrcs.has(src)) return Promise.resolve(src);
  if (heroPosterLoadPromises.has(src)) return heroPosterLoadPromises.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = async () => {
      try { await img.decode?.(); } catch {}
      loadedHeroPosterSrcs.add(src);
      heroPosterLoadPromises.delete(src);
      resolve(src);
    };
    img.onerror = () => {
      heroPosterLoadPromises.delete(src);
      reject(new Error(`Unable to load hero poster: ${src}`));
    };
    img.src = src;
  });
  heroPosterLoadPromises.set(src, promise);
  return promise;
};

const hashStringToUnit = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};
const runWhenIdle = (cb, timeout = 400) => {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(cb, { timeout });
  }
  return setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: true }), 32);
};

const createManagedCache = (entries = {}, options = {}) => {
  const {
    maxItems = 120,
    maxSerializedSize = 350_000,
    eviction = 'lru',
  } = options;

  const normalized = Object.entries(entries || {}).reduce((acc, [k, v]) => {
    if (v && typeof v === 'object' && 'value' in v) acc[k] = v;
    else if (v !== undefined) acc[k] = { value: v, touchedAt: Date.now(), createdAt: Date.now() };
    return acc;
  }, {});

  const toOrderedEntries = () => Object.entries(normalized).sort(([, a], [, b]) => {
    const aTime = eviction === 'timestamp' ? (a.createdAt || a.touchedAt || 0) : (a.touchedAt || a.createdAt || 0);
    const bTime = eviction === 'timestamp' ? (b.createdAt || b.touchedAt || 0) : (b.touchedAt || b.createdAt || 0);
    return aTime - bTime;
  });

  const trim = () => {
    let ordered = toOrderedEntries();
    while (ordered.length > maxItems) {
      const [oldestKey] = ordered.shift();
      delete normalized[oldestKey];
    }
    let serialized = JSON.stringify(normalized);
    while (serialized.length > maxSerializedSize && ordered.length) {
      const [oldestKey] = ordered.shift();
      delete normalized[oldestKey];
      serialized = JSON.stringify(normalized);
    }
    return normalized;
  };

  trim();
  return normalized;
};

const extractCacheValues = (cache) => Object.entries(cache || {}).reduce((acc, [k, v]) => {
  if (v && typeof v === 'object' && 'value' in v) acc[k] = v.value;
  else acc[k] = v;
  return acc;
}, {});

const slugifyPosterName = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const posterFileName = (item, ext = 'jpg') => `${String(item.id).padStart(3, '0')}-${slugifyPosterName(item.title)}.${ext}`;
const posterExportName = (item, ext = 'jpg') => posterFileName(item, ext);



const loadedPosterSrcs = new Set();
const requestedPosterSrcs = new Set();
const posterDecodeStateBySrc = new Map();
const posterPreloadObserversBySrc = new Map();

const LazyPoster = React.memo(function LazyPoster({ src, alt, className = 'poster', eager = false, loadingMode = 'auto' }) {
  const shellRef = useRef(null);
  const [shouldLoadSrc, setShouldLoadSrc] = useState(() => eager || loadedPosterSrcs.has(src));
  const [loaded, setLoaded] = useState(() => loadedPosterSrcs.has(src) || posterDecodeStateBySrc.get(src) === 'loaded');

  useEffect(() => {
    const isLoaded = loadedPosterSrcs.has(src) || posterDecodeStateBySrc.get(src) === 'loaded';
    setShouldLoadSrc(eager || isLoaded);
    setLoaded(isLoaded);
  }, [eager, src]);

  useEffect(() => {
    if (!src || shouldLoadSrc || eager) return undefined;
    const target = shellRef.current;
    if (!target) return undefined;
    if (typeof IntersectionObserver !== 'function') {
      setShouldLoadSrc(true);
      return undefined;
    }
    const existingObserver = posterPreloadObserversBySrc.get(src);
    if (existingObserver) {
      existingObserver.observe(target);
      return () => existingObserver.unobserve(target);
    }
    const observer = new IntersectionObserver((entries) => {
      const hasMatch = entries.some(entry => entry.isIntersecting || entry.intersectionRatio > 0.01);
      if (!hasMatch) return;
      setShouldLoadSrc(true);
      observer.disconnect();
      posterPreloadObserversBySrc.delete(src);
    }, { threshold: 0.01, rootMargin: '220px 0px 220px 0px' });
    posterPreloadObserversBySrc.set(src, observer);
    observer.observe(target);
    return () => observer.unobserve(target);
  }, [eager, shouldLoadSrc, src]);

  const handleLoad = () => {
    posterDecodeStateBySrc.set(src, 'loaded');
    loadedPosterSrcs.add(src);
    setLoaded(true);
  };

  return <div ref={shellRef} className={`poster-shell ${loaded ? 'is-loaded' : ''}`}>
    <div className="poster-skeleton" aria-hidden="true" />
    <img className={`${className} ${loaded ? 'is-loaded' : ''}`} src={shouldLoadSrc ? src : undefined} alt={alt} loading={eager ? 'eager' : loadingMode} decoding="async" fetchpriority={eager ? 'high' : 'auto'} onLoad={handleLoad} />
  </div>;
});
const TMDB_LOOKUP_OVERRIDES = {
  1: { tmdbId: 1771, mediaType: 'movie' },
  2: { tmdbId: 1726, mediaType: 'movie' },
  3: { tmdbId: 1724, mediaType: 'movie' },
  4: { tmdbId: 10138, mediaType: 'movie' },
  5: { tmdbId: 10195, mediaType: 'movie' },
  6: { tmdbId: 24428, mediaType: 'movie' },
  8: { tmdbId: 118340, mediaType: 'movie' },
  9: { tmdbId: 100402, mediaType: 'movie' },
  10: { tmdbId: 68721, mediaType: 'movie' },
  11: { tmdbId: 283995, mediaType: 'movie' },
  12: { tmdbId: 232125, mediaType: 'tv' },
  13: { tmdbId: 99861, mediaType: 'movie' },
  17: { tmdbId: 497698, mediaType: 'movie' },
  20: { tmdbId: 363088, mediaType: 'movie' },
  25: { tmdbId: 85271, mediaType: 'tv' },
  26: { tmdbId: 88396, mediaType: 'tv' },
  28: { tmdbId: 634649, mediaType: 'movie' },
  29: { tmdbId: 88329, mediaType: 'tv' },
  30: { tmdbId: 774752, mediaType: 'movie' },
  31: { tmdbId: 84958, mediaType: 'tv' },
  32: { tmdbId: 640146, mediaType: 'movie' },
  33: { tmdbId: 84958, mediaType: 'tv' },
  34: { tmdbId: 91363, mediaType: 'tv' },
  35: { tmdbId: 91363, mediaType: 'tv' },
  36: { tmdbId: 91363, mediaType: 'tv' },
  37: { tmdbId: 533535, mediaType: 'movie' },
  38: { tmdbId: 616037, mediaType: 'movie' },
  39: { tmdbId: 447365, mediaType: 'movie' },
  40: { tmdbId: 505642, mediaType: 'movie' },
  41: { tmdbId: 92749, mediaType: 'tv' },
  42: { tmdbId: 566525, mediaType: 'movie' },
  43: { tmdbId: 453395, mediaType: 'movie' },
  44: { tmdbId: 138501, mediaType: 'tv' },
  45: { tmdbId: 524434, mediaType: 'movie' },
  46: { tmdbId: 92783, mediaType: 'tv' },
  47: { tmdbId: 92782, mediaType: 'tv' },
  48: { tmdbId: 609681, mediaType: 'movie' },
  49: { tmdbId: 114472, mediaType: 'tv' },
  50: { tmdbId: 122226, mediaType: 'tv' },
  51: { tmdbId: 202555, mediaType: 'tv' },
  53: { tmdbId: 822119, mediaType: 'movie' },
  54: { tmdbId: 114471, mediaType: 'tv' },
  55: { tmdbId: 986056, mediaType: 'movie' },
  56: { tmdbId: 617126, mediaType: 'movie' },
  58: { tmdbId: 894205, mediaType: 'movie' },
  60: { tmdbId: 138505, mediaType: 'tv' },
  151: { tmdbId: 1403, mediaType: 'tv' },
};

const POSTER_OVERRIDES = {
  // Keep combined or episodic entries pinned to the correct franchise/show when TMDB search is ambiguous.
  12: '/posters/012-i-am-groot-s1-and-s2.jpg',
  30: '/posters/030-guardians-holiday-special.jpg',
  103: '/posters/009-A-Funny-Thing-Happened-on-the-Way-to-Thors-Hammer.jpg',
  151: '/posters/151-agents-of-shield-s6-and-s7.jpg',
};

const getPosterExtension = (src) => {
  const withoutQuery = String(src || '').split('?')[0];
  const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  return ext && ext.length <= 5 ? ext : 'jpg';
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const inferFileExtFromSrc = (src) => getPosterExtension(src);

const fetchBlob = async (src) => {
  const response = await fetch(src);
  if (!response.ok) throw new Error('Poster unavailable');
  return response.blob();
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const wrapCacheEntries = (values, previousCache = {}) => {
  const now = Date.now();
  return Object.entries(values || {}).reduce((acc, [k, value]) => {
    if (value === undefined || value === null || value === '') return acc;
    const prev = previousCache[k];
    const prevValue = prev && typeof prev === 'object' && 'value' in prev ? prev.value : prev;
    const prevCreatedAt = prev && typeof prev === 'object' && 'createdAt' in prev ? prev.createdAt : now;
    acc[k] = {
      value,
      createdAt: prevCreatedAt,
      touchedAt: prevValue === value ? (prev?.touchedAt || now) : now,
    };
    return acc;
  }, {});
};

const useDebouncedEffect = (effect, deps, delay = 350) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      effect();
    }, delay);
    return () => clearTimeout(timer);
  }, [...deps, delay]);
};


const areTitleRowPropsEqual = (prev, next) => (
  prev.item === next.item
  && prev.idx === next.idx
  && prev.ph === next.ph
  && prev.T === next.T
  && prev.typeMeta === next.typeMeta
  && prev.statusMeta === next.statusMeta
  && prev.releaseStatus === next.releaseStatus
  && prev.releaseStatusText === next.releaseStatusText
  && prev.releaseLabel === next.releaseLabel
  && prev.poster === next.poster
  && prev.genres === next.genres
  && prev.isExpanded === next.isExpanded
  && prev.isWatched === next.isWatched
  && prev.isBookmarked === next.isBookmarked
  && prev.statusDropdown === next.statusDropdown
  && prev.rating === next.rating
  && prev.bulkSelectMode === next.bulkSelectMode
  && prev.isSelected === next.isSelected
  && prev.statusLabelOverride === next.statusLabelOverride
  && prev.isDesktopViewport === next.isDesktopViewport
);

const MemoizedTitleRow = React.memo(function MemoizedTitleRow({
  item,
  idx,
  ph,
  T,
  typeMeta,
  statusMeta,
  releaseStatus,
  releaseStatusStyleObj,
  releaseStatusText,
  releaseLabel,
  poster,
  genres,
  isExpanded,
  isWatched,
  isBookmarked,
  statusDropdown,
  rating,
  onOpenDetail,
  onSetStatus,
  onToggleBookmark,
  onOpenStatus,
  bulkSelectMode = false,
  isSelected = false,
  onToggleSelected,
  statusLabelOverride = null,
  isDesktopViewport = false,
}) {
  const StatusIcon = statusMeta.Icon;
  const TypeIcon = typeMeta.Icon;
  const RowStatusIcon = statusMeta.Icon;
  const hideWatchToggle = releaseStatus === 'upcoming';
  return (
    <div>
      <div className={`rrow type-${item.type} row-status-${item.status} ${isExpanded ? 'curvy-selected' : ''}`} style={{ opacity: 1, borderLeftColor: isExpanded ? 'var(--theme-accent)' : 'transparent', '--phase-color': ph.color, '--phase-glow': ph.glow, ...(isWatched ? { background: 'color-mix(in srgb, var(--theme-watched-bg) 62%, transparent)' } : {}) }}>
        <div className={`row-index ${isWatched ? 'is-watched' : ''}`}>
          {bulkSelectMode ? (
            <input
              type="checkbox"
              checked={isSelected}
              aria-label={`Select ${item.title}`}
              onChange={(event) => onToggleSelected(item.id, event.target.checked)}
              onClick={(event) => event.stopPropagation()}
              className="row-select-checkbox"
            />
          ) : (idx + 1)}
        </div>
        <LazyPoster className="poster" src={poster} alt={`${item.title} poster`} eager={idx < 8} loadingMode="lazy" />

        <button className="title-btn" onClick={() => onOpenDetail(item)} style={TITLE_ROW_STATIC.titleBtn}>
          <div className="title-row-top" style={TITLE_ROW_STATIC.titleLine}>
            <span className="title-main">{item.title}</span>
            <ChevRight size={10} className="title-chevron" />
          </div>
          <div className="title-row-mid release-meta-grid">
            {item.episodes && <span className="meta-chip meta-chip-xs truncate-single-line">{item.episodes} EP</span>}
            <span className="meta-chip meta-chip-type truncate-single-line" style={{ color: typeMeta.color }}><TypeIcon size={8} />{typeMeta.label}</span>
            <span className="meta-chip meta-chip-sm truncate-single-line">{item.year || releaseLabel}</span>
            <span className="meta-chip meta-chip-release meta-chip-xxs truncate-single-line" style={{ color: releaseStatusStyleObj.color, background: releaseStatusStyleObj.background, border: `1px solid ${releaseStatusStyleObj.border}` }}>{releaseStatusText}</span>
            {!item.essential && <span className="meta-chip meta-chip-xs truncate-single-line">OPT</span>}
          </div>
          <div className="meta-muted line-clamp-2 overflow-wrap-anywhere title-subline" style={TITLE_ROW_STATIC.genreMeta}>GENRES: {genres.join(' • ').toUpperCase()}</div>
        </button>

        <div className={`row-actions ${isDesktopViewport ? 'is-desktop' : ''}`}>
          <div className="row-meta-line truncate-single-line rating-marvel-pill">★ {rating || '—'}</div>
          <button
            aria-label={`Open status menu for ${item.title}`}
            aria-haspopup="menu"
            aria-expanded={statusDropdown === item.id}
            onClick={(event) => onOpenStatus(event, item.id)}
            className={`wbtn status-pill status-marvel-pill status-shade-${item.status} row-status-btn`}
          >
            <span className="row-status-label">
              <RowStatusIcon size={10} />
              {statusLabelOverride || statusMeta.label}
            </span>
            <ChevDown size={10} className={`row-status-chevron ${statusDropdown === item.id ? 'is-open' : ''}`} />
          </button>
          <button className={`wbtn bookmark-marvel-btn ${isDesktopViewport ? 'is-desktop' : ''}`} aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'} onClick={() => onToggleBookmark(item.id)} data-bookmarked={isBookmarked}><Bookmark size={11} /></button>
          {!hideWatchToggle && (
            <button
              aria-label={isWatched ? `Mark ${item.title} as unwatched` : `Mark ${item.title} as watched`}
              title={isWatched ? 'Mark unwatched' : 'Mark watched'}
              onClick={(event) => {
                event.stopPropagation();
                onSetStatus(item.id, isWatched ? 'unwatched' : 'watched');
              }}
              className="wbtn status-toggle notwatched-marvel-btn row-watch-toggle"
            ><RowStatusIcon size={12} /></button>
          )}
        </div>
        
      </div>
    </div>
  );
}, areTitleRowPropsEqual);



const SidebarMenu = React.memo(React.forwardRef(function SidebarMenu({
  open,
  darkMode,
  performanceMode,
  pillBorder,
  surfaceBorder,
  onToggle,
  onClose,
  onOpenSettings,
  controlsHidden = false,
  settingsOpen = false,
  children,
}, ref) {
  return (
    <>
      <div className="sidebar-control-cluster" style={controlsHidden ? { opacity: 0, pointerEvents: 'none', visibility: 'hidden' } : undefined}>
      <button className="theme-btn sidebar-toggle-btn" onClick={onToggle} aria-label="Toggle sidebar menu" style={{ background: darkMode ? 'rgba(8,12,28,0.96)' : '#ffffff', color: darkMode ? '#f5fffd' : '#0f172a', borderColor: darkMode ? 'rgba(255,255,255,0.42)' : pillBorder, boxShadow: 'none' }}><Menu size={18} /></button>
      <button className="theme-btn sidebar-toggle-btn settings-toggle-btn" onClick={onOpenSettings} aria-label="Open settings and profile" style={{ background: darkMode ? 'rgba(8,12,28,0.96)' : '#ffffff', color: darkMode ? '#f5fffd' : '#0f172a', borderColor: darkMode ? 'rgba(255,255,255,0.42)' : pillBorder, boxShadow: 'none' }}><Settings size={18} /></button>
      </div>
      <div className="sidebar-backdrop" data-state={open ? 'open' : 'closed'} onPointerDown={(e) => { e.preventDefault(); onClose?.(); }} />
      <aside ref={ref} data-state={open ? 'open' : 'closed'} aria-hidden={!open} className="sidebar-menu" style={{ '--sidebar-bg': darkMode ? 'rgba(8,12,28,0.88)' : 'rgba(248,251,255,0.9)', '--sidebar-border': surfaceBorder, '--sidebar-transform': open ? 'translateX(0)' : 'translateX(-105%)', '--sidebar-shadow': darkMode ? 'var(--elevation-surface-3)' : 'var(--elevation-surface-2)', '--sidebar-blur': performanceMode ? 'none' : 'blur(8px)' }}>
        {children}
      </aside>
    </>
  );
}));

const SettingsMenu = React.memo(React.forwardRef(function SettingsMenu({
  open,
  darkMode,
  performanceMode,
  onClose,
  children,
}, ref) {
  return (
    <>
      <button className="settings-backdrop" data-state={open ? 'open' : 'closed'} aria-label="Close settings menu" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose?.(); }} />
      <div className="settings-shell" data-state={open ? 'open' : 'closed'} role="dialog" aria-modal={open ? 'true' : 'false'} aria-hidden={!open} aria-label="Settings and profile" ref={ref}>
        <div className="fade-in settings-menu settings-menu-redesign" data-state={open ? 'open' : 'closed'} style={{ '--settings-bg': darkMode ? 'rgba(10,16,30,0.97)' : 'rgba(255,255,255,0.98)', '--settings-blur': performanceMode ? 'none' : 'blur(8px)' }}>
          <div className="settings-close-row"><button className="fpill settings-close-sticky" onClick={() => onClose?.()}><X size={14}/>Close</button></div>{children}
        </div>
      </div>
    </>
  );
}));

const PhaseRows = React.memo(function PhaseRows({ rows, renderRow }) {
  const shellRef = useRef(null);
  const rowHeightsRef = useRef(new Map());
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900));
  const [measuredVersion, setMeasuredVersion] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let rafId = 0;
    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        setScrollY(window.scrollY || 0);
        setViewportHeight(window.innerHeight || 900);
      });
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const estimatedRowHeight = 132;
  const estimatedTotalHeight = rows.length * estimatedRowHeight;
  const computedOverscan = Math.min(12, Math.max(6, Math.round(viewportHeight / 220)));

  const windowRange = useMemo(() => {
    if (!rows.length) return { start: 0, end: -1 };
    const shellRect = shellRef.current?.getBoundingClientRect?.();
    if (!shellRect) return { start: 0, end: Math.min(rows.length - 1, 26) };

    const listTopInPage = shellRect.top + scrollY;
    const top = Math.max(0, scrollY - listTopInPage);
    const bottom = top + viewportHeight;

    let acc = 0;
    let start = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const h = rowHeightsRef.current.get(rows[i]?.id) ?? estimatedRowHeight;
      if (acc + h >= top) {
        start = i;
        break;
      }
      acc += h;
    }

    let end = start;
    let run = acc;
    for (let i = start; i < rows.length; i += 1) {
      const h = rowHeightsRef.current.get(rows[i]?.id) ?? estimatedRowHeight;
      run += h;
      end = i;
      if (run >= bottom) break;
    }

    return {
      start: Math.max(0, start - computedOverscan),
      end: Math.min(rows.length - 1, end + computedOverscan),
    };
  }, [rows, scrollY, viewportHeight, measuredVersion, computedOverscan]);

  const { topSpacer, bottomSpacer, visibleRows } = useMemo(() => {
    if (!rows.length || windowRange.end < windowRange.start) return { topSpacer: 0, bottomSpacer: 0, visibleRows: [] };
    let topPx = 0;
    for (let i = 0; i < windowRange.start; i += 1) topPx += rowHeightsRef.current.get(rows[i]?.id) ?? estimatedRowHeight;
    let visiblePx = 0;
    const subset = [];
    for (let i = windowRange.start; i <= windowRange.end; i += 1) {
      subset.push({ item: rows[i], idx: i });
      visiblePx += rowHeightsRef.current.get(rows[i]?.id) ?? estimatedRowHeight;
    }
    const measuredTotal = rows.reduce((sum, row) => sum + (rowHeightsRef.current.get(row?.id) ?? estimatedRowHeight), 0);
    const total = Math.max(estimatedTotalHeight, measuredTotal);
    const bottomPx = Math.max(0, total - topPx - visiblePx);
    return { topSpacer: topPx, bottomSpacer: bottomPx, visibleRows: subset };
  }, [rows, windowRange, estimatedTotalHeight]);

  const setRowRef = useCallback((rowId) => (node) => {
    if (!node || !rowId) return;
    const nextHeight = Math.ceil(node.getBoundingClientRect().height);
    const prevHeight = rowHeightsRef.current.get(rowId);
    if (nextHeight > 0 && prevHeight !== nextHeight) {
      rowHeightsRef.current.set(rowId, nextHeight);
      setMeasuredVersion(v => v + 1);
    }
  }, []);

  return (
    <div className="phase-rows-full" ref={shellRef}>
      {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden="true" />}
      {visibleRows.map(({ item, idx }) => (
        <div key={item.id} ref={setRowRef(item.id)} className="phase-row-virtualized">
          {renderRow(item, idx)}
        </div>
      ))}
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden="true" />}
    </div>
  );
});
// ─── Component ───────────────────────────────────────────────────────────────
export default function MCUViewer() {
  const initialUiState = useMemo(() => readSavedUiState(), []);
  const [universe, setUniverse] = useState('mcu');
  const [brandTapCount, setBrandTapCount] = useState(0);

  const [allowMotionReplay] = useState(false);


  const [items,          setItems]          = useState(RAW);
  const [listMode,       setListMode]       = useState(initialUiState.listMode);
  const [search,         setSearch]         = useState(initialUiState.search);
  const [searchScope,    setSearchScope]    = useState(initialUiState.searchScope || UI_STATE_DEFAULTS.searchScope);
  const [sortBy,         setSortBy]         = useState(initialUiState.sortBy);
  const [essentialOnly,  setEssOnly]        = useState(initialUiState.essentialOnly);
  const [watchedOnly,    setWatchedOnly]    = useState(initialUiState.watchedOnly);
  const [statusFilter,   setStatusFilter]   = useState(initialUiState.statusFilter);
  const [typeFilter,     setTypeFilter]     = useState(initialUiState.typeFilter);
  const [activePhase,    setActivePhase]    = useState(initialUiState.activePhase);
  const activeUniverse = UNIVERSE_META[universe] || UNIVERSE_META.mcu;
  const themedChoices = useMemo(() => CHARACTER_THEMES.map(choice => ({
    ...choice,
    displayLabel: universe === 'dc' ? (choice.dcLabel || choice.label) : choice.label,
    displaySwatch: universe === 'dc' ? (choice.dcSwatch || choice.swatch) : choice.swatch,
  })), [universe]);
  const [uiModeState, dispatchUiMode] = useReducer((state, action) => ({ ...state, ...action }), { sortOpen: false, phaseOpen: false, filterStatusOpen: false, dockStatusOpen: false, filtersOpen: initialUiState.filtersOpen, timelineOpen: false });
  const { sortOpen, phaseOpen, filterStatusOpen, dockStatusOpen, filtersOpen, timelineOpen } = uiModeState;
  const setSortOpen = (next) => dispatchUiMode({ sortOpen: typeof next === 'function' ? next(uiModeState.sortOpen) : next });
  const setTimelineOpen = (next) => dispatchUiMode({ timelineOpen: typeof next === 'function' ? next(uiModeState.timelineOpen) : next });
  const setPhaseOpen = (next) => dispatchUiMode({ phaseOpen: typeof next === 'function' ? next(uiModeState.phaseOpen) : next });
  const [statusDropdown, setStatusDropdown] = useState(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(true);
  const [fabMinimized, setFabMinimized] = useState(false);
  const [browseMode, setBrowseMode] = useState('home');
  const openSearchMode = useCallback(() => {
    setBrowseMode('search');
    setListMode('extended');
    setActivePhase(0);
    setSearchScope(UI_STATE_DEFAULTS.searchScope);
  }, [setBrowseMode, setListMode, setActivePhase, setSearchScope]);
  const setFilterStatusOpen = (next) => dispatchUiMode({ filterStatusOpen: typeof next === 'function' ? next(uiModeState.filterStatusOpen) : next });
  const setDockStatusOpen = (next) => dispatchUiMode({ dockStatusOpen: typeof next === 'function' ? next(uiModeState.dockStatusOpen) : next });
  const setFiltersOpen = (next) => dispatchUiMode({ filtersOpen: typeof next === 'function' ? next(uiModeState.filtersOpen) : next });
  const [dropdownPos,    setDropdownPos]    = useState({ x: 0, y: 0 });
  const [darkMode,       setDarkMode]       = useState(false);
  const [expandedItem,   setExpandedItem]   = useState(null);
  const [expandedPhase,  setExpandedPhase]  = useState(null);
  const [celebPhase,     setCelebPhase]     = useState(null);
  const [editingDateId,  setEditingDateId]  = useState(null);
  const [headerCompact]  = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = Number(window.sessionStorage.getItem('mcu-hero-index-v1'));
    return Number.isFinite(saved) ? Math.max(0, saved) : 0;
  });
  const [currentHeroSrc, setCurrentHeroSrc] = useState(() => {
    if (typeof window === 'undefined') return '';
    const saved = window.sessionStorage.getItem('mcu-hero-src-v1') || '';
    if (saved) loadedHeroPosterSrcs.add(saved);
    return saved;
  });
  const [previousHeroSrc, setPreviousHeroSrc] = useState('');
  const [detailItem,     setDetailItem]     = useState(null);
  const [detailData,     setDetailData]     = useState(null);
  const [detailPlotState, setDetailPlotState] = useState({ active: 'primary', primary: '', secondary: '', loadingSecondary: false, secondaryProvider: 'OMDb' });
  const [metaCache,      setMetaCache]      = useState({});
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [detailPosterFailed, setDetailPosterFailed] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerExpanded, setTrailerExpanded] = useState(false);
  const [trailerRotateHint, setTrailerRotateHint] = useState('');
  const [trailerVariantIndex, setTrailerVariantIndex] = useState(0);
  const [releaseFilter, setReleaseFilter] = useState('all');
  const trailerShellRef = useRef(null);
  const { posterCache, setPosterCache, localPosterMap, setLocalPosterMap } = usePosterCache();
  const [posterFetchState, setPosterFetchState] = useState({ active: false, done: 0, total: 0, message: '' });
  const [heroCarouselCache, setHeroCarouselCache] = useState({ signature: '', posters: [] });
  const [posterExportState, setPosterExportState] = useState({ active: false, done: 0, total: 0, message: '' });
  const [posterExportFailures, setPosterExportFailures] = useState({});
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const [showAllFiltersOverride, setShowAllFiltersOverride] = useState(false);
  const [profile,        setProfile]        = useState({ name: '', pfp: '' });
  const [uploadedAvatars,setUploadedAvatars]= useState([]);
  const [avatarCropSrc, setAvatarCropSrc] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [themeMode,      setThemeMode]      = useState('iron-man');
  const [appearanceMode, setAppearanceMode] = useState('glass');
  const [marvelLangMode, setMarvelLangMode] = useState(false);
  const [spoilerSafeMode, setSpoilerSafeMode] = useState(true);
  const [autoHideStatuses, setAutoHideStatuses] = useState(initialUiState.autoHideStatuses);
  const [viewMode, setViewMode] = useState(initialUiState.viewMode);
  const [densityMode, setDensityMode] = useState(initialUiState.densityMode);
  const [timelineMode,   setTimelineMode]   = useState(initialUiState.timelineMode);
  const showPhaseSystem = timelineMode === 'release' || timelineMode === 'chronological';
  const [performanceMode, setPerformanceMode] = useState(initialUiState.performanceMode);
  const [posterDataSaver, setPosterDataSaver] = useState(initialUiState.posterDataSaver);
  const [scrollTuning] = useState({ desktopMultiplier: 5, desktopDeltaCap: 7, mobileMultiplier: 5, mobileDeltaCap: 7 });
  const [genreFilter] = useState('all');
  const [myLikes,        setMyLikes]        = useState({});
  const [myRating,       setMyRating]       = useState({});
  const [rewatchCount,   setRewatchCount]   = useState({});
  const [reviews,        setReviews]        = useState({});
  const [bookmarks,      setBookmarks]      = useState({});
  const [reviewCardTheme, setReviewCardTheme] = useState('sacredTimeline');
  const [exportFont, setExportFont] = useState('inter');
  const [exportTextScale, setExportTextScale] = useState(DEFAULT_EXPORT_TEXT_SCALE);
  const [analyticsTab, setAnalyticsTab] = useState('overview');
  const [exportComposerOpen, setExportComposerOpen] = useState(false);
  const [exportPreview, setExportPreview] = useState({ url: '', loading: false, error: '' });
  const [exportSettings, setExportSettings] = useState(() => ({
    type: 'unified', theme: 'sacredTimeline', bgOpacity: 60, fontWeight: 800, density: 'comfortable', posterMode: 'featured',
    sections: { completion: true, hours: true, streak: true, phaseBreakdown: true, recentMomentum: true, topRated: true, history: true, rating: true, reviewSnippet: true, profileBadge: true }, aspect: '4:5',
  }));
  const [autoBackupStamp, setAutoBackupStamp] = useState('');
  const [autoBackups, setAutoBackups] = useState([]);
  const [reviewShareStatus, setReviewShareStatus] = useState({ type: '', message: '' });
  const [analyticsOpen,  setAnalyticsOpen]  = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds,    setSelectedIds]    = useState(() => new Set());
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);
  const [scrollCheckpoint, setScrollCheckpoint] = useState(initialUiState.scrollTop);
  const [metadataBuild, setMetadataBuild] = useState({ status: 'idle', currentTitle: '', done: 0, total: 0, failedIds: [] });

  useEffect(() => {
    setItems(universe === 'dc' ? DC_RAW : RAW);
    setActivePhase(0);
    setExpandedPhase(null);
    setExpandedItem(null);
    setHeroIndex(0);
  }, [universe]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const closeAnalytics = useCallback(() => setAnalyticsOpen(false), []);
  const closeTrailer = useCallback(() => {
    setTrailerOpen(false);
    setTrailerExpanded(false);
  }, []);
  const handleTrailerBack = useCallback(() => {
    setTrailerExpanded(false);
  }, []);
  const closeDetail = useCallback(() => { setDetailItem(null); setTrailerOpen(false); setTrailerExpanded(false); setTrailerVariantIndex(0); }, []);
  const openTrailerPlayer = useCallback(() => {
    setTrailerOpen(true);
    setTrailerRotateHint('Rotate your device for fullscreen landscape playback.');
    window.setTimeout(() => setTrailerRotateHint(''), 2600);
  }, []);
  const openImdbForItem = useCallback((item, data) => {
    const imdbId = data?.imdbID || data?.imdbId || '';
    const fallback = `https://www.imdb.com/find/?q=${encodeURIComponent(`${item.title} ${item.year || ''}`.trim())}`;
    window.open(imdbId ? `https://www.imdb.com/title/${imdbId}/` : fallback, '_blank', 'noopener,noreferrer');
  }, []);
  const toggleSidebarPanel = useCallback(() => {
    setSidebarOpen(prev => {
      const next = !prev;
      if (next) {
        setSettingsOpen(false);
        setAnalyticsOpen(false);
      }
      return next;
    });
  }, []);
  const toggleSettingsPanel = useCallback(() => {
    setSettingsOpen(prev => {
      const next = !prev;
      if (next) {
        setSidebarOpen(false);
        setAnalyticsOpen(false);
      }
      return next;
    });
  }, []);
  const openAnalyticsPanel = useCallback(() => {
    setSidebarOpen(false);
    setSettingsOpen(false);
    setAnalyticsOpen(true);
  }, []);
  const handleInAppBack = useCallback(() => {
    if (browseMode === 'search' || browseMode === 'phase') {
      setBrowseMode('home');
      return true;
    }
    return false;
  }, [browseMode]);

  const [desktopTextScale, setDesktopTextScale] = useState(initialUiState.desktopTextScale);
  const [textScaleEnabled, setTextScaleEnabled] = useState(initialUiState.textScaleEnabled);
  const { isDesktopViewport } = useResponsiveLayout();
  const desktopDpiCompensation = isDesktopViewport
    ? Math.min(1, Math.max(0.85, 1 / (window.devicePixelRatio || 1)))
    : 1;
  const effectiveUiScale = isDesktopViewport && textScaleEnabled ? desktopTextScale * desktopDpiCompensation : 1;
  const { heroBackdropScale, setHeroBackdropScale, heroBackdropOpacity, setHeroBackdropOpacity } = useHeroBackdrop();
  const headerMinimized = false;
  const phaseRefs  = useRef({});
  const sortRef    = useRef(null);
  const timelineRef = useRef(null);
  const phaseRef   = useRef(null);
  const obsRef     = useRef(null);  const isScrolling= useRef(false);
  const mainRef    = useRef(null);
  const settingsRef= useRef(null);
  const sidebarRef = useRef(null);
  const heroIntervalRef = useRef(null);
  const heroRailRef = useRef(null);
  const heroActiveCardRef = useRef(null);
  const heroInteractionTimeoutRef = useRef(null);
  const heroUserInteractingUntilRef = useRef(0);
  const heroProgrammaticScrollRef = useRef(false);
  const heroForceRecenterRef = useRef(false);
  const heroRandomSeedRef = useRef(() => Math.random().toString(36).slice(2));
  if (typeof heroRandomSeedRef.current === 'function') heroRandomSeedRef.current = heroRandomSeedRef.current();
  const restoredUiStateRef = useRef(false);
  const metadataBuildRef = useRef({ paused: false, running: false });
  const detailRequestRef = useRef(0);
  const desktopSmoothScrollStateRef = useRef({ raf: null, velocity: 0, lastTs: 0 });



  useOverlayNavigation({
    sidebarOpen,
    settingsOpen,
    detailItem,
    analyticsOpen,
    onCloseDetail: closeDetail,
    onCloseAnalytics: closeAnalytics,
    onCloseSettings: closeSettings,
    onCloseSidebar: closeSidebar,
    hasInAppBackStep: browseMode === 'search' || browseMode === 'phase',
    onInAppBack: handleInAppBack,
  });

  const currentPhases = universe === 'dc' ? DC_PHASES : PHASES;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__scrollTuning = scrollTuning;
  }, [scrollTuning]);

  const overlayActive = Boolean(settingsOpen || analyticsOpen || detailItem || sidebarOpen || setupOpen || avatarCropSrc);
  const blockHomeInteractions = Boolean(settingsOpen || sidebarOpen || setupOpen || avatarCropSrc);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__overlayActive = overlayActive;
    return () => { window.__overlayActive = false; };
  }, [overlayActive]);

  useEffect(() => {
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;
    const prevBodyOverflow = bodyStyle.overflow;
    const prevBodyTouchAction = bodyStyle.touchAction;
    const prevHtmlOverflow = htmlStyle.overflow;

    if (overlayActive) {
      bodyStyle.overflow = 'hidden';
      bodyStyle.touchAction = 'none';
      htmlStyle.overflow = 'hidden';
    }

    return () => {
      bodyStyle.overflow = prevBodyOverflow;
      bodyStyle.touchAction = prevBodyTouchAction;
      htmlStyle.overflow = prevHtmlOverflow;
    };
  }, [overlayActive]);

  useEffect(() => {
    if (!sidebarOpen || !sidebarRef.current) return;
    const panel = sidebarRef.current;
    const focusable = panel.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus?.();
    const trap = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', trap);
    return () => panel.removeEventListener('keydown', trap);
  }, [sidebarOpen]);
  useEffect(() => {
    if (sidebarOpen) setFabMenuOpen(false);
  }, [sidebarOpen]);
  useEffect(() => {
    if (!sidebarOpen && !settingsOpen) return;
    setStatusDropdown(null);
    setDockStatusOpen(false);
  }, [sidebarOpen, settingsOpen]);


  useEffect(() => {
    if (!detailItem) return;
    setDockStatusOpen(false);
    setStatusDropdown(null);
    setFilterStatusOpen(false);
    setPhaseOpen(false);
    setSortOpen(false);
  }, [detailItem]);

  useEffect(() => {
    const s = localStorage.getItem('mcu-v7');
    if (s) {
      try {
        const saved = JSON.parse(s);
        setItems(prev => prev.map(i => ({
          ...i,
          status: saved[i.id]?.status || 'unwatched',
          watchedDate: saved[i.id]?.watchedDate || null,
          statusChangedAt: saved[i.id]?.statusChangedAt || saved[i.id]?.watchedDate || null
        })));
      } catch {}
    }
  }, []);

  const persist = (next) => {
    const data = {};
    next.forEach(i => {
      if (i.status !== 'unwatched' || i.watchedDate) {
        data[i.id] = { status: i.status, watchedDate: i.watchedDate, statusChangedAt: i.statusChangedAt || i.watchedDate || null };
      }
    });
    localStorage.setItem('mcu-v7', JSON.stringify(data));
  };

  const setStatusDirect = (id, newStatus) => {
    setItems(prev => {
      const n = prev.map(i => {
        if (i.id !== id) return i;
        const updated = { ...i, status: newStatus, statusChangedAt: new Date().toISOString() };
        if (newStatus === 'watched' && !i.watchedDate) {
          updated.watchedDate = new Date().toISOString().slice(0, 16);
        } else if (newStatus !== 'watched') {
          updated.watchedDate = null;
        }
        return updated;
      });
      const item = n.find(i => i.id === id);
      if (newStatus === 'watched' && item) {
        const phaseItems = n.filter(i => i.phase === item.phase && (listMode === 'core' ? coreIds.has(i.id) : true));
        const allDone = phaseItems.every(i => i.status === 'watched');
        if (allDone) {
          setCelebPhase(item.phase);
          setTimeout(() => setCelebPhase(null), 2400);
        }
      }
      if (AUTO_HIDDEN_STATUSES.has(newStatus)) setAutoHideStatuses(true);
      if (newStatus === 'unwatched') setRewatchCount(prevCount => ({ ...prevCount, [id]: 0 }));
      persist(n);
      return n;
    });
    if (watchedOnly && newStatus === 'watched') {
      setWatchedOnly(false);
      setStatusFilter(null);
    }
  };



  useEffect(() => {
    if (typeof window === 'undefined' || !isDesktopViewport || overlayActive || performanceMode) return;
    const container = mainRef.current;
    const canAnimate = window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches ?? true;
    if (!container || !canAnimate) return;

    const state = desktopSmoothScrollStateRef.current;
    const maxDesktopStep = 180;
    const friction = 0.86;

    const getScrollHost = () => (container.scrollHeight > container.clientHeight + 1 ? container : window);
    const getWindowTop = () => window.scrollY || document.documentElement.scrollTop || 0;

    const tick = (ts) => {
      if (!state.lastTs) state.lastTs = ts;
      const deltaMs = Math.min(32, Math.max(8, ts - state.lastTs));
      state.lastTs = ts;

      const host = getScrollHost();
      const frameStep = state.velocity * (deltaMs / 16.7);
      if (Math.abs(frameStep) < 0.1) {
        state.velocity = 0;
        state.lastTs = 0;
        state.raf = null;
        return;
      }

      if (host === window) {
        const prevTop = getWindowTop();
        window.scrollTo({ top: prevTop + frameStep, behavior: 'auto' });
        const nextTop = getWindowTop();
        if (Math.abs(nextTop - prevTop) < 0.1) state.velocity = 0;
      } else {
        const prevTop = host.scrollTop;
        host.scrollTop = prevTop + frameStep;
        if (Math.abs(host.scrollTop - prevTop) < 0.1) state.velocity = 0;
      }

      state.velocity *= friction;
      state.raf = requestAnimationFrame(tick);
    };

    const onWheel = (event) => {
      if (!event.cancelable || event.ctrlKey || event.defaultPrevented) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const interactive = target.closest('input, textarea, select, [contenteditable="true"], .hero-carousel-track');
        if (interactive) return;
      }
      event.preventDefault();
      const directionAdjusted = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const delta = Math.max(-maxDesktopStep, Math.min(maxDesktopStep, directionAdjusted));
      state.velocity += delta;
      state.velocity = Math.max(-maxDesktopStep, Math.min(maxDesktopStep, state.velocity));
      if (!state.raf) state.raf = requestAnimationFrame(tick);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = null;
      state.velocity = 0;
      state.lastTs = 0;
    };
  }, [isDesktopViewport, overlayActive, performanceMode]);

  useEffect(() => {
    const el = mainRef.current;
    let scrollSaveTimer;
    let previousTop = 0;
    const getCurrentScrollTop = () => {
      const canScrollMain = el && el.scrollHeight > el.clientHeight + 1;
      return canScrollMain ? el.scrollTop : window.scrollY;
    };
    previousTop = getCurrentScrollTop();
    const onScroll = () => {
      const currentTop = getCurrentScrollTop();
      const delta = currentTop - previousTop;
      if (currentTop < 120) {
        setFabMinimized(false);
      } else if (delta > 7) {
        setFabMinimized(true);
        if (fabMenuOpen) setFabMenuOpen(false);
      } else if (delta < -10) {
        setFabMinimized(false);
      }
      previousTop = currentTop;
      isScrolling.current = true;
      clearTimeout(isScrolling._t);
      clearTimeout(scrollSaveTimer);
      isScrolling._t = setTimeout(() => { isScrolling.current = false; }, 150);
      scrollSaveTimer = setTimeout(() => setScrollCheckpoint(currentTop), 220);
    };
    el?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(scrollSaveTimer);
      el?.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, [fabMenuOpen]);

  useEffect(() => {
    // Phase selection is a filter, so do not rewrite it from scroll position.
    // Rewriting the active phase while the user scrolls can temporarily filter
    // every other phase out of the DOM, which looks like the list disappears.
    return () => obsRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const fn = e => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false); if (timelineRef.current && !timelineRef.current.contains(e.target)) setTimelineOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  useEffect(() => {
    const fn = e => { if (phaseRef.current && !phaseRef.current.contains(e.target)) setPhaseOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  useEffect(() => {
    const fn = e => { if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false); };
    document.addEventListener('pointerdown', fn, true);
    return () => document.removeEventListener('pointerdown', fn, true);
  }, []);

  const scrollToListTop = useCallback(() => {
    const container = mainRef.current;
    if (container && container.scrollHeight > container.clientHeight + 1) {
      container.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const scrollTo = id => {
    const el = phaseRefs.current[id];
    const container = mainRef.current;
    if (!el) return;

    const topBarOffset = headerCompact ? 72 : 96;
    const canScrollMain = container && container.scrollHeight > container.clientHeight + 1;
    if (canScrollMain) {
      const containerTop = container.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      const desiredTop = elTop - containerTop + container.scrollTop - topBarOffset;
      const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const clampedTop = Math.max(0, Math.min(maxTop, desiredTop));
      container.scrollTo({ top: clampedTop, behavior: 'smooth' });
      return;
    }

    const desiredWindowTop = el.getBoundingClientRect().top + window.scrollY - topBarOffset;
    const maxWindowTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clampedWindowTop = Math.max(0, Math.min(maxWindowTop, desiredWindowTop));
    window.scrollTo({ top: clampedWindowTop, behavior: 'smooth' });
  };

  const exportProgress = async () => {
    try {
      const payload = createProgressPayload({
        items,
        actions: { likes: myLikes, ratings: myRating, rewatch: rewatchCount, bookmarks, reviews },
        profile,
        exportPrefs: { font: exportFont, textScale: exportTextScale },
      });
      const content = JSON.stringify(payload, null, 2);
      const fileName = `mcu-progress-${Date.now()}.json`;
      if (Capacitor.isNativePlatform()) {
        const res = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        await Share.share({ title: 'MCU Progress Export', text: 'MCU progress backup JSON', url: res.uri });
        return;
      }
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 600);
    } catch {}
  };

  const shareProgressCard = async () => {
    const currentPhase = activePhase === 0 ? stickyPhaseProgress.label : (currentPhases.find(p => p.id === activePhase)?.name || stickyPhaseProgress.label);
    await shareCardImage({ type: 'progress', data: { pct, currentPhase, totalWatched, totalItems: activeItems.length } });
  };

  const importProgress = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        const importedItems = Array.isArray(imported) ? imported : (Array.isArray(imported.items) ? imported.items : []);
        setItems(prev => {
          const map = new Map(importedItems.map(x => [x.id, x]));
          const next = prev.map(i => map.has(i.id) ? { ...i, status: map.get(i.id).status || 'unwatched', watchedDate: map.get(i.id).watchedDate || null, statusChangedAt: map.get(i.id).statusChangedAt || map.get(i.id).watchedDate || null } : i);
          persist(next);
          return next;
        });
        const actions = imported.actions || {};
        if (actions.likes) setMyLikes(actions.likes);
        if (actions.ratings) setMyRating(actions.ratings);
        if (actions.rewatch) setRewatchCount(actions.rewatch);
        if (actions.bookmarks) setBookmarks(actions.bookmarks);
        if (actions.reviews) setReviews(actions.reviews);
        if (imported.profile && typeof imported.profile === 'object') setProfile(prev => ({ ...prev, ...imported.profile }));
        if (imported.exportPrefs?.font) setExportFont(imported.exportPrefs.font);
        if (Number.isFinite(Number(imported.exportPrefs?.textScale))) setExportTextScale(Math.max(0.9, Math.min(2.4, Number(imported.exportPrefs.textScale))));
      } catch {}
    };
    reader.readAsText(file);
  };

  const exportFetchedPosters = async (mode = 'all') => {
    const failedIds = new Set(Object.keys(posterExportFailures).map(Number));
    const sourceItems = mode === 'failed' ? activeItems.filter(item => failedIds.has(item.id)) : activeItems;
    const exportable = sourceItems.filter(item => {
      const src = localPosterSrc(item) || posterCache[item.id];
      return src && !src.includes('placehold.co');
    });
    if (!exportable.length) {
      setPosterExportState({ active: false, done: 0, total: 0, message: mode === 'failed' ? 'No failed poster exports to retry.' : 'No fetched or local posters to export yet.' });
      return;
    }

    setPosterExportState({ active: true, done: 0, total: exportable.length, message: mode === 'failed' ? 'Retrying failed poster exports…' : 'Preparing poster image downloads…' });
    const manifest = [];
    const nextFailures = { ...posterExportFailures };

    for (const [index, item] of exportable.entries()) {
      const src = localPosterSrc(item) || posterCache[item.id];
      const ext = getPosterExtension(src);
      const filename = posterExportName(item, ext);
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error('Poster unavailable');
        const blob = await response.blob();
        manifest.push({ id: item.id, title: item.title, file: filename, source: src });

        if (Capacitor.isNativePlatform()) {
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          await Filesystem.writeFile({ path: `mcu-posters/${filename}`, data: base64, directory: Directory.Documents, recursive: true });
        } else {
          triggerDownload(blob, filename);
        }
        delete nextFailures[item.id];
      } catch {
        nextFailures[item.id] = { id: item.id, title: item.title, source: src, failedAt: new Date().toISOString() };
        manifest.push({ id: item.id, title: item.title, file: filename, source: src, error: 'Could not export this poster image.' });
      }
      setPosterExportFailures({ ...nextFailures });
      safeLocalStorageSetItem(CACHE_KEYS.posterExportFailures, JSON.stringify(nextFailures));
      setPosterExportState({ active: true, done: index + 1, total: exportable.length, message: `${mode === 'failed' ? 'Retried' : 'Exported'} ${index + 1}/${exportable.length} poster images…` });
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    const manifestBlob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), mode, posters: manifest }, null, 2)], { type: 'application/json' });
    if (Capacitor.isNativePlatform()) {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(manifestBlob);
      });
      const result = await Filesystem.writeFile({ path: mode === 'failed' ? 'mcu-posters/failed-manifest.json' : 'mcu-posters/manifest.json', data, directory: Directory.Documents, recursive: true });
      await Share.share({ title: 'MCU Poster Images', text: 'Exported poster images and manifest', url: result.uri });
    } else {
      triggerDownload(manifestBlob, mode === 'failed' ? 'mcu-posters-failed-manifest.json' : 'mcu-posters-manifest.json');
    }
    const failedCount = Object.keys(nextFailures).length;
    setPosterExportState({ active: false, done: exportable.length, total: exportable.length, message: `${mode === 'failed' ? 'Retried' : 'Exported'} ${exportable.length} poster images.${failedCount ? ` ${failedCount} failed export${failedCount === 1 ? '' : 's'} saved for retry.` : ''}` });
  };

  const STATUS_SORT_ORDER = { watching: 0, 'plan-to-watch': 1, unwatched: 2, watched: 3, 'on-hold': 4, dropped: 5 };
  const coreIds = useMemo(() => (universe === 'dc' ? DC_CORE_IDS : new Set(ESSENTIAL_LIST.map(i => i.id))), [universe]);
  const openDetail = useCallback((item) => {
    detailRequestRef.current += 1;
    setDetailData(null);
    setDetailPosterFailed(false);
    setTrailerVariantIndex(0);
    setDetailPlotState({ active: 'primary', primary: item?.desc || '', secondary: '', loadingSecondary: false, secondaryProvider: 'OMDb' });
    setDetailItem(item);
  }, []);
  useEffect(() => {
    const onDocPointerDown = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) setSortMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, []);
  const toggleBookmark = useCallback((id) => setBookmarks(p => ({ ...p, [id]: p[id] ? 0 : 1 })), []);
  const toggleSelected = useCallback((id, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const clearBulkSelection = useCallback(() => setSelectedIds(new Set()), []);

  const applyBulkStatus = (newStatus) => {
    if (!selectedIds.size) return;
    setItems(prev => {
      const now = new Date().toISOString();
      const n = prev.map(i => {
        if (!selectedIds.has(i.id)) return i;
        const updated = { ...i, status: newStatus, statusChangedAt: now };
        if (newStatus === 'watched' && !i.watchedDate) updated.watchedDate = now.slice(0, 16);
        else if (newStatus !== 'watched') updated.watchedDate = null;
        return updated;
      });
      if (AUTO_HIDDEN_STATUSES.has(newStatus)) setAutoHideStatuses(true);
      persist(n);
      return n;
    });
    clearBulkSelection();
    setBulkSelectMode(false);
  };

  const markPhaseWatched = (phaseId, newStatus) => {
    setItems(prev => {
      const n = prev.map(i => {
        if (i.phase !== phaseId) return i;
        if (listMode === 'core' && !coreIds.has(i.id)) return i;
        const updated = { ...i, status: newStatus, statusChangedAt: new Date().toISOString() };
        if (newStatus === 'watched' && !i.watchedDate) {
          updated.watchedDate = new Date().toISOString().slice(0, 16);
        } else if (newStatus !== 'watched') {
          updated.watchedDate = null;
        }
        return updated;
      });
      if (AUTO_HIDDEN_STATUSES.has(newStatus)) setAutoHideStatuses(true);
      persist(n);
      return n;
    });
  };

  const { filtered, grouped, phaseKeys } = useMemo(() => {
    const f = items.filter(i => {
      if (listMode === 'core' && !coreIds.has(i.id)) return false;
      if (showAllFiltersOverride) return true;
      if (listMode === 'core' && essentialOnly && !i.essential) return false;
      if (watchedOnly && i.status !== 'watched') return false;
      if (statusFilter && i.status !== statusFilter) return false;
      if (typeFilter && i.type !== typeFilter) return false;
      if (showPhaseSystem && activePhase && i.phase !== activePhase) return false;
      if (releaseFilter === 'released' && (i.releaseStatus === 'upcoming' || i.releaseStatus === 'TBA')) return false;
      if (releaseFilter === 'upcoming' && !(i.releaseStatus === 'upcoming' || i.releaseStatus === 'TBA')) return false;
      if (timelineMode === 'loki' && !CHARACTER_POV_TITLE_SETS.loki.has(i.title)) return false;
      if (timelineMode === 'wanda' && !CHARACTER_POV_TITLE_SETS.wanda.has(i.title)) return false;
      if (timelineMode === 'sony' && !SONY_MARVEL_TITLE_SET.has(i.title)) return false;
      if (timelineMode === 'multiverse') {
        const isMultiverse = /what if|multiverse|loki|deadpool|friendly neighborhood|x-men/i.test(i.title + ' ' + (i.desc || ''));
        if (!isMultiverse) return false;
      }
      if (genreFilter !== 'all' && i.type !== genreFilter) return false;
      const after = AFTER_CREDITS[i.title] || AFTER_CREDITS_DEFAULT;
      const timelineLabel = TIMELINE_MODES.find(m => m.id === timelineMode)?.label || '';
      return matchesSearch(i, search, { director: DIRECTOR_DATA[i.title] || '', actors: metaCache[i.id]?.cast || '', connectsTo: after.connectsTo || [], timelineLabel }, searchScope);
    }).sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'year') return a.year - b.year;
      if (sortBy === 'runtime') return (a.episodes || (a.type === 'film' ? 2.3 : 6)) - (b.episodes || (b.type === 'film' ? 2.3 : 6));
      if (sortBy === 'watched') return (b.watchedDate || '').localeCompare(a.watchedDate || '');
      if (sortBy === 'status') return (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99);
      if (sortBy === 'order' && timelineMode === 'release') return a.year - b.year || a.order - b.order;
      if (sortBy === 'order' && timelineMode === 'chronological') {
        const ao = STORY_ORDER_OVERRIDES.get(a.title) ?? a.order + 100;
        const bo = STORY_ORDER_OVERRIDES.get(b.title) ?? b.order + 100;
        return ao - bo || a.order - b.order;
      }
      if (sortBy === 'order' && timelineMode === 'sony') return a.year - b.year || a.order - b.order;
      return a.order - b.order;
    });
    const g = {};
    f.forEach(i => (g[i.phase] = g[i.phase] || []).push(i));
    const pk = Object.keys(g).map(Number).sort((a, b) => a - b);
    return { filtered: f, grouped: g, phaseKeys: pk };
  }, [items, listMode, essentialOnly, watchedOnly, statusFilter, autoHideStatuses, typeFilter, activePhase, browseMode, timelineMode, genreFilter, search, sortBy, coreIds, showAllFiltersOverride, localPosterMap, releaseFilter, metaCache, searchScope]);




  const getAfterCreditsMeta = useCallback((item) => {
    const base = AFTER_CREDITS[item?.title] || AFTER_CREDITS_DEFAULT;
    return {
      ...base,
      connectsTo: Array.isArray(base.connectsTo) ? base.connectsTo : [],
    };
  }, []);
  const activeItems = useMemo(
    () => listMode === 'core' ? items.filter(i => coreIds.has(i.id)) : items,
    [items, listMode, coreIds]
  );


  useEffect(() => {
    const timer = setTimeout(() => {
      const container = mainRef.current;
      if (container) container.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'auto' });
      restoredUiStateRef.current = true;
    }, 180);
    return () => clearTimeout(timer);
  }, []);

  useDebouncedEffect(() => {
    if (!restoredUiStateRef.current) return;
    const container = mainRef.current;
    const canScrollMain = container && container.scrollHeight > container.clientHeight + 1;
    const scrollTop = canScrollMain ? container.scrollTop : window.scrollY;
    safeLocalStorageSetItem(CACHE_KEYS.uiState, JSON.stringify({
      listMode,
      search,
      searchScope,
      sortBy,
      essentialOnly,
      watchedOnly,
      statusFilter,
      typeFilter,
      activePhase,
      filtersOpen,
      viewMode,
      densityMode,
      timelineMode,
      autoHideStatuses,
      performanceMode,
      posterDataSaver,
      desktopTextScale,
      textScaleEnabled,
      scrollTop,
    }));
  }, [listMode, search, searchScope, sortBy, essentialOnly, watchedOnly, statusFilter, typeFilter, activePhase, filtersOpen, viewMode, densityMode, timelineMode, autoHideStatuses, performanceMode, posterDataSaver, desktopTextScale, textScaleEnabled, scrollCheckpoint], 300);
  const totalWatched = useMemo(() => activeItems.filter(i => i.status === 'watched').length, [activeItems]);
  const essTotal     = useMemo(() => activeItems.filter(i => i.essential).length, [activeItems]);
  const essWatched   = useMemo(() => activeItems.filter(i => i.essential && i.status === 'watched').length, [activeItems]);
  const pct = activeItems.length ? Math.round((totalWatched / activeItems.length) * 100) : 0;
  const phaseStats = useMemo(() => currentPhases.map(ph => {
    const phaseItems = activeItems.filter(i => i.phase === ph.id);
    const watched = phaseItems.filter(i => i.status === 'watched').length;
    return { phase: ph.id, watched, total: phaseItems.length };
  }).filter(p => p.total > 0), [activeItems]);


  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const shell = mainRef.current;
    if (!shell) return undefined;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animated = Array.from(shell.querySelectorAll('[data-motion]'));
    if (!animated.length) return undefined;

    if (prefersReducedMotion) {
      animated.forEach((el) => {
        el.classList.add('is-visible');
        el.style.setProperty('--section-progress', '0');
      });
      return undefined;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const replay = el.dataset.replay === 'true' || allowMotionReplay;
        if (entry.isIntersecting) {
          el.classList.add('is-visible', 'in-view');
          if (!replay) el.dataset.played = 'true';
        } else {
          el.classList.remove('in-view');
          if (replay) el.classList.remove('is-visible');
        }
      });
    }, { threshold: [0, 0.15, 0.3], rootMargin: '0px 0px -18% 0px' });

    const progressObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const range = entry.boundingClientRect.height + window.innerHeight;
        const raw = (window.innerHeight - entry.boundingClientRect.top) / Math.max(range, 1);
        const progress = Math.max(0, Math.min(1, raw));
        entry.target.style.setProperty('--section-progress', progress.toFixed(3));
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    animated.forEach((el) => {
      el.style.setProperty('--section-progress', '0');
      revealObserver.observe(el);
      progressObserver.observe(el);
    });

    return () => {
      revealObserver.disconnect();
      progressObserver.disconnect();
    };
  }, [allowMotionReplay, viewMode, phaseKeys.length]);

  const stickyPhaseProgress = useMemo(() => {
    if (activePhase === 0) return { label: 'All Phases', done: totalWatched, total: activeItems.length, pct };
    const phaseItems = activeItems.filter(i => i.phase === activePhase);
    const done = phaseItems.filter(i => i.status === 'watched').length;
    const total = phaseItems.length;
    return { label: `Phase ${activePhase}`, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [activePhase, activeItems, totalWatched, pct]);

  const CAST_MAP = {
    'Iron Man': ['Robert Downey Jr.', 'Gwyneth Paltrow', 'Jeff Bridges'],
    'The Avengers': ['Robert Downey Jr.', 'Chris Evans', 'Scarlett Johansson'],
    'Captain America: The First Avenger': ['Chris Evans', 'Hayley Atwell', 'Sebastian Stan'],
    'Thor': ['Chris Hemsworth', 'Tom Hiddleston', 'Natalie Portman'],
  };
  const saveImageToDevice = useCallback(async (blob, filename) => {
    const base64 = await blobToBase64(blob);
    const isNative = Capacitor.isNativePlatform();
    if (isNative && Capacitor.getPlatform() === 'android') {
      const dataUri = `data:image/png;base64,${base64}`;
      try {
        try { await Media.createAlbum({ name: 'MCUViewingOrder' }); } catch {}
        const albums = await Media.getAlbums();
        const album = (albums?.albums || []).find(a => a.name === 'MCUViewingOrder');
        if (album?.identifier) {
          await Media.savePhoto({ path: dataUri, albumIdentifier: album.identifier, fileName: filename.replace(/\.png$/i, '') });
          return { method: 'mediastore' };
        }
      } catch {}
      await Filesystem.writeFile({
        path: `Pictures/MCUViewingOrder/${filename}`,
        data: base64,
        directory: Directory.ExternalStorage,
        recursive: true,
      });
      return { method: 'filesystem' };
    }
    triggerDownload(blob, filename);
    return { method: 'download' };
  }, []);

  const localPosterSrc = useCallback((item) => {
    const mapped = POSTER_OVERRIDES[item.id] || localPosterMap[item.id] || localPosterMap[String(item.id)] || localPosterMap[slugifyPosterName(item.title)];
    if (!mapped) return '';
    return mapped.startsWith('/') ? mapped : `/posters/${mapped}`;
  }, [localPosterMap]);
  const posterSrc = useCallback((item) => {
    const rawSrc = localPosterSrc(item) || posterCache[item.id] || `https://placehold.co/220x330/1a1f33/f7c4de?text=${encodeURIComponent(item.title+'\n'+item.year)}`;
    return compressTmdbPosterUrl(rawSrc, posterDataSaver);
  }, [localPosterSrc, posterCache, posterDataSaver]);


  useEffect(() => {
    // Keep a small warm cache near the top of the active list without forcing deep eager fetches.
    const targets = filtered.slice(0, 24);
    if (!targets.length) return undefined;

    let cancelled = false;
    const enqueue = (start = 0) => {
      if (cancelled) return;
      const batch = targets.slice(start, start + 8);
      batch.forEach((item) => {
        const src = posterSrc(item);
        if (!src || loadedPosterSrcs.has(src) || requestedPosterSrcs.has(src) || posterDecodeStateBySrc.get(src) === 'loaded') return;
        requestedPosterSrcs.add(src);
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
        const markLoaded = () => {
          posterDecodeStateBySrc.set(src, 'loaded');
          loadedPosterSrcs.add(src);
          requestedPosterSrcs.delete(src);
        };
        img.onload = markLoaded;
        img.onerror = () => requestedPosterSrcs.delete(src);
      });
      if (start + 8 < targets.length) {
        window.setTimeout(() => enqueue(start + 8), 90);
      }
    };

    enqueue(0);

    return () => {
      cancelled = true;
    };
  }, [filtered, posterSrc]);

  const heroPosterItems = useMemo(() => {
    const seen = new Set();
    return activeItems
      .filter(item => !isAgentsOfShieldCarouselDuplicate(item))
      .map(item => ({ item, src: posterSrc(item) }))
      .filter(({ src, item }) => {
        if (!src || seen.has(src)) return false;
        seen.add(src);
        return !seen.has(`title:${item.title.toLowerCase()}`) && seen.add(`title:${item.title.toLowerCase()}`);
      })
      .sort((a, b) => hashStringToUnit(`${a.src}|${heroRandomSeedRef.current}`) - hashStringToUnit(`${b.src}|${heroRandomSeedRef.current}`));
  }, [activeItems, posterSrc]);
  const heroPosters = useMemo(() => heroPosterItems.map(({ src }) => src), [heroPosterItems]);
  const visibleHeroPosters = useMemo(() => {
    if (!heroPosterItems.length) return [];
    const count = Math.min(HERO_VISIBLE_COUNT, heroPosterItems.length);
    const centerOffset = Math.floor(count / 2);
    return Array.from({ length: count }, (_, offset) => {
      const rawIndex = heroIndex - centerOffset + offset;
      const idx = ((rawIndex % heroPosterItems.length) + heroPosterItems.length) % heroPosterItems.length;
      return heroPosterItems[idx];
    }).filter(Boolean);
  }, [heroPosterItems, heroIndex]);
  const activeHeroSrc = heroPosters.length ? (heroPosters[heroIndex % heroPosters.length] || heroPosters[0] || '') : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('mcu-hero-index-v1', String(heroIndex));
  }, [heroIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!currentHeroSrc) return;
    window.sessionStorage.setItem('mcu-hero-src-v1', currentHeroSrc);
  }, [currentHeroSrc]);

  useEffect(() => {
    if (!previousHeroSrc) return undefined;
    const timer = window.setTimeout(() => setPreviousHeroSrc(''), performanceMode ? 140 : 220);
    return () => window.clearTimeout(timer);
  }, [previousHeroSrc, darkMode]);

  useEffect(() => {
    if (!activeHeroSrc) return undefined;

    let cancelled = false;
    const normalizedIndex = heroIndex % heroPosters.length;

    preloadHeroPoster(activeHeroSrc)
      .then((loadedSrc) => {
        if (!cancelled && loadedSrc) {
          setCurrentHeroSrc(prevSrc => {
            if (prevSrc && prevSrc !== loadedSrc) setPreviousHeroSrc(prevSrc);
            return loadedSrc;
          });
        }
      })
      .catch(() => {
        // Keep the previous backdrop in place if the next poster fails.
      });

    for (let offset = 1; offset <= Math.min(HERO_PRELOAD_AHEAD, heroPosters.length - 1); offset += 1) {
      const nextSrcCandidate = heroPosters[(normalizedIndex + offset) % heroPosters.length];
      preloadHeroPoster(nextSrcCandidate).catch(() => {});
    }

    return () => { cancelled = true; };
  }, [heroPosters, heroIndex, activeHeroSrc]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    if (heroPosters.length <= 1) return undefined;
    const overlayBlockingCycle = overlayActive;
    const telemetry = (state, reason) => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(new CustomEvent(`backdrop_cycle_${state}_reason`, { detail: { reason } }));
    };

    const startHeroCycle = () => {
      if (overlayBlockingCycle) return;
      if (heroIntervalRef.current) return;
      heroIntervalRef.current = window.setInterval(() => {
        if (Date.now() < heroUserInteractingUntilRef.current) return;
        setHeroIndex(i => (i + 1) % heroPosters.length);
      }, HERO_ROTATION_MS);
      telemetry('resumed', 'home-active');
    };
    const stopHeroCycle = () => {
      if (!heroIntervalRef.current) return;
      window.clearInterval(heroIntervalRef.current);
      heroIntervalRef.current = null;
      telemetry('paused', overlayBlockingCycle ? 'overlay-open' : 'document-hidden');
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') startHeroCycle();
      else stopHeroCycle();
    };

    const debounce = window.setTimeout(onVisibility, 120);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(debounce);
      document.removeEventListener('visibilitychange', onVisibility);
      stopHeroCycle();
    };
  }, [heroPosters.length, settingsOpen, analyticsOpen, detailItem, sidebarOpen]);

  const pauseHeroAutoSlide = useCallback((duration = 2200) => {
    heroUserInteractingUntilRef.current = Date.now() + duration;
    if (heroInteractionTimeoutRef.current) window.clearTimeout(heroInteractionTimeoutRef.current);
    heroInteractionTimeoutRef.current = window.setTimeout(() => {
      heroUserInteractingUntilRef.current = 0;
      heroInteractionTimeoutRef.current = null;
    }, duration);
  }, []);

  useEffect(() => () => {
    if (heroInteractionTimeoutRef.current) window.clearTimeout(heroInteractionTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!heroActiveCardRef.current || !heroRailRef.current) return undefined;
    if (Date.now() < heroUserInteractingUntilRef.current && !heroForceRecenterRef.current) return undefined;
    const mainScrollTop = mainRef.current?.scrollTop || window.scrollY || 0;
    if (mainScrollTop > 220) return undefined;
    const frame = window.requestAnimationFrame(() => {
      heroProgrammaticScrollRef.current = true;
      const rail = heroRailRef.current;
      const card = heroActiveCardRef.current;
      if (rail && card) {
        const targetLeft = card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2;
        rail.scrollTo({ left: Math.max(0, targetLeft), behavior: performanceMode ? 'auto' : 'smooth' });
      }
      window.setTimeout(() => { heroProgrammaticScrollRef.current = false; heroForceRecenterRef.current = false; }, performanceMode ? 120 : 520);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [heroIndex, activeHeroSrc, visibleHeroPosters, performanceMode]);

  const goToNextHero = useCallback(() => {
    if (!heroPosters.length) return;
    pauseHeroAutoSlide(2800);
    heroForceRecenterRef.current = true;
    setHeroIndex(i => (i + 1) % heroPosters.length);
  }, [heroPosters.length, pauseHeroAutoSlide]);

  const goToPrevHero = useCallback(() => {
    if (!heroPosters.length) return;
    pauseHeroAutoSlide(2800);
    heroForceRecenterRef.current = true;
    setHeroIndex(i => (i - 1 + heroPosters.length) % heroPosters.length);
  }, [heroPosters.length, pauseHeroAutoSlide]);

  const handleHeroWheel = useCallback((e) => {
    const horizontalIntent = e.shiftKey || (Math.abs(e.deltaX) > 6 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.35);
    if (!horizontalIntent) return;
    const horizontalDelta = e.shiftKey ? e.deltaY : e.deltaX;
    if (!horizontalDelta) return;
    pauseHeroAutoSlide(2600);
    e.currentTarget.scrollBy({ left: horizontalDelta * 2.4, behavior: 'auto' });
    e.preventDefault();
  }, [pauseHeroAutoSlide]);

  const spoilerSafe = useMemo(() => spoilerSafeMode, [spoilerSafeMode]);

  const memoryScore = useMemo(() => Math.max(0, Math.min(100, Math.round((totalWatched / Math.max(1, activeItems.length)) * 100) - (spoilerSafe ? 10 : 0))), [totalWatched, activeItems.length, spoilerSafe]);
  const TMDB_DIRECT_KEY = import.meta.env.VITE_TMDB_API_KEY || '65eda48cf5803f22304fd21f4f06a35e';

  const fetchTmdbPoster = async (item, { force = false } = {}) => {
    const local = localPosterSrc(item);
    if (local) return local;
    if (item.type === 'short' && !TMDB_LOOKUP_OVERRIDES[item.id]) return '';
    if (!force && posterCache[item.id]) return posterCache[item.id];
    const stableLookup = TMDB_LOOKUP_OVERRIDES[item.id];
    const q = encodeURIComponent(cleanLookupTitle(item.title));
    const y = encodeURIComponent(String(item.year || ''));
    const stableParams = stableLookup ? `&tmdbId=${encodeURIComponent(stableLookup.tmdbId)}&mediaType=${encodeURIComponent(stableLookup.mediaType)}` : '';
    try {
      const proxyRes = await fetchWithTimeout(`/api/tmdb/poster?title=${q}&year=${y}${stableParams}`, {}, 7000);
      if (proxyRes.ok) {
        const payload = await proxyRes.json();
        if (payload?.poster) return payload.poster;
      }
    } catch {}

    if (!TMDB_DIRECT_KEY) return '';
    try {
      if (stableLookup) {
        const detailRes = await fetchWithTimeout(`https://api.themoviedb.org/3/${stableLookup.mediaType}/${stableLookup.tmdbId}?api_key=${TMDB_DIRECT_KEY}&language=en-US`, {}, 7000);
        const detail = await detailRes.json();
        return detail?.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : '';
      }
      const params = new URLSearchParams({ query: cleanLookupTitle(item.title), include_adult: 'false', language: 'en-US', page: '1', year: String(item.year || '') });
      const res = await fetchWithTimeout(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_DIRECT_KEY}&${params.toString()}`, {}, 7000);
      const data = await res.json();
      const best = (data?.results || []).find(r => r?.poster_path && (r.media_type === 'movie' || r.media_type === 'tv'));
      return best?.poster_path ? `https://image.tmdb.org/t/p/w500${best.poster_path}` : '';
    } catch {
      return '';
    }
  };
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 9000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const fetchTmdbDetail = async (item) => {
    if (item.type === 'short' && !TMDB_LOOKUP_OVERRIDES[item.id]) return null;
    const stableLookup = TMDB_LOOKUP_OVERRIDES[item.id];
    const q = encodeURIComponent(cleanLookupTitle(item.title));
    const y = encodeURIComponent(String(item.year || ''));
    const stableParams = stableLookup ? `&tmdbId=${encodeURIComponent(stableLookup.tmdbId)}&mediaType=${encodeURIComponent(stableLookup.mediaType)}` : '';
    try {
      const r = await fetchWithTimeout(`/api/tmdb/poster?title=${q}&year=${y}&details=1${stableParams}`, {}, 7000);
      if (!r.ok) return null;
      const payload = await r.json();
      return payload?.details || null;
    } catch {
      return null;
    }
  };
  const normalizeDetailData = ({ item, tmdb = null, omdb = null, fallback = {} }) => {
    const expectedYear = Number(item.year);
    const tmdbYear = Number(tmdb?.Year);
    const omdbYear = Number(String(omdb?.year || '').slice(0, 4));
    const trustTmdbYear = Number.isFinite(tmdbYear) && Math.abs(tmdbYear - expectedYear) <= 1;
    const trustOmdbYear = Number.isFinite(omdbYear) && Math.abs(omdbYear - expectedYear) <= 1;
    return {
      Poster: (trustTmdbYear ? tmdb?.Poster : '') || fallback.Poster || posterCache[item.id] || '',
      Year: (trustTmdbYear ? tmdb?.Year : '') || (trustOmdbYear ? omdb?.year : '') || fallback.Year || String(item.year),
      Plot: (trustOmdbYear ? omdb?.plot : '') || (trustTmdbYear ? tmdb?.Plot : '') || fallback.Plot || item.desc,
      Released: (trustTmdbYear ? tmdb?.Released : '') || (trustOmdbYear ? omdb?.released : '') || fallback.Released || metaCache[item.id]?.released || '',
      Actors: (trustTmdbYear ? tmdb?.Actors : '') || fallback.Actors || metaCache[item.id]?.cast || '',
      imdbRating: (trustOmdbYear ? omdb?.rating : '') || (trustTmdbYear ? tmdb?.imdbRating : '') || fallback.imdbRating || metaCache[item.id]?.rating || 'N/A',
      Director: (trustTmdbYear ? tmdb?.Director : '') || fallback.Director || metaCache[item.id]?.director || '',
    };
  };

  const fetchOmdbInfo = async (item) => {
    const q = encodeURIComponent(cleanLookupTitle(item.title));
    const y = encodeURIComponent(String(item.year || ''));
    try {
      const proxied = await fetchWithTimeout(`/api/omdb/rating?title=${q}&year=${y}`, {}, 7000);
      if (proxied.ok) {
        const payload = await proxied.json();
        return {
          rating: payload?.rating || '',
          released: payload?.released || '',
          plot: payload?.plot || '',
          year: payload?.year || '',
        };
      }
    } catch {}
    try {
      const direct = await fetchWithTimeout(`https://www.omdbapi.com/?apikey=${OMDB_RATINGS_KEY}&t=${q}&y=${y}&plot=short`, {}, 7000);
      const data = await direct.json();
      return {
        rating: data?.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '',
        released: data?.Released && data.Released !== 'N/A' ? data.Released : '',
        plot: data?.Plot && data.Plot !== 'N/A' ? data.Plot : '',
        year: data?.Year && data.Year !== 'N/A' ? data.Year : '',
      };
    } catch {}
    return { rating: '', released: '', plot: '', year: '' };
  };
  const cleanLookupTitle = (title) => title.replace(/\sS\d.*$/i, '').replace(/\sEps?.*$/i, '').trim();

  const isRealReleaseDate = (dateStr) => /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''));

  const parseRealReleaseDate = (dateStr) => {
    if (!isRealReleaseDate(dateStr)) return null;
    const parsed = new Date(`${dateStr}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const releaseInfoFor = (item) => {
    const stored = RELEASE_INFO[item.title] || {};
    return {
      date: item.releaseDate || stored.date || metaCache[item.id]?.released || '',
      label: item.releaseLabel || stored.label || '',
      status: item.releaseStatus || stored.status || '',
    };
  };

  const releaseStatusFor = (item, now = new Date()) => {
    const info = releaseInfoFor(item);
    const parsed = parseRealReleaseDate(info.date);
    if (parsed) return parsed > now ? 'upcoming' : 'released';
    if (info.status === 'released') return 'released';
    if (info.status === 'upcoming') return 'upcoming';
    if (Number(item.year) && Number(item.year) < now.getFullYear()) return 'released';
    return 'TBA';
  };

  const releaseStatusLabel = (status) => status === 'TBA' ? 'TBA' : status.charAt(0).toUpperCase() + status.slice(1);

  const releaseStatusStyle = (status) => ({
    released: { color: '#3ec47a', background: 'rgba(62,196,122,0.1)', border: 'rgba(62,196,122,0.35)' },
    upcoming: { color: 'var(--theme-accent-alt)', background: 'rgba(232,184,75,0.12)', border: 'rgba(232,184,75,0.38)' },
    TBA: { color: '#a7b1c2', background: 'rgba(167,177,194,0.1)', border: 'rgba(167,177,194,0.28)' },
  }[status] || { color: T.textMuted, background: T.expandBg, border: T.expandBorder });

  const formatReleaseDate = (dateStr, fallbackYear, label = '', status = '') => {
    const d = parseRealReleaseDate(dateStr);
    if (d) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (label) return label;
    if (status === 'TBA') return Number(fallbackYear) ? `${fallbackYear} · TBA` : 'TBA';
    return Number(fallbackYear) ? String(fallbackYear) : 'TBA';
  };

  const inferGenre = (item) => {
    const t = item.title.toLowerCase();
    if (t.includes('guardians') || t.includes('captain marvel') || t.includes('marvels') || t.includes('secret invasion')) return 'Sci-Fi';
    if (t.includes('doctor strange') || t.includes('wanda') || t.includes('agatha')) return 'Fantasy';
    if (t.includes('what if') || t.includes('i am groot') || t.includes('friendly neighborhood')) return 'Animation';
    if (t.includes('moon knight') || t.includes('punisher') || t.includes('daredevil')) return 'Crime';
    if (item.type === 'series') return 'Drama';
    return 'Action';
  };

  const inferGenres = (item) => {
    const g = new Set([inferGenre(item)]);
    const t = item.title.toLowerCase();
    if (t.includes('winter soldier') || t.includes('secret invasion')) g.add('Thriller');
    if (t.includes('guardians') || t.includes('groot') || t.includes('she-hulk')) g.add('Comedy');
    if (t.includes('moon knight') || t.includes('agatha') || t.includes('multiverse')) g.add('Mystery');
    if (item.type === 'series') g.add('Serial');
    return [...g].slice(0, 3);
  };

  const nextUnwatched = useMemo(() => filtered.find(i => i.status !== 'watched') || null, [filtered]);
  const allWatched = useMemo(() => activeItems.length > 0 && activeItems.every(i => i.status === 'watched'), [activeItems]);
  const recentActivity = useMemo(() => [...activeItems].filter(i => i.watchedDate).sort((a,b) => (b.watchedDate||'').localeCompare(a.watchedDate||'')).slice(0,5), [activeItems]);
  const recentlyWatchedItems = useMemo(() => [...activeItems]
    .filter(i => i.status === 'watched' && i.watchedDate)
    .sort((a, b) => (b.watchedDate || b.statusChangedAt || '').localeCompare(a.watchedDate || a.statusChangedAt || ''))
    .slice(0, 4), [activeItems]);
  const watchStreak = useMemo(() => calculateWatchStreak(activeItems), [activeItems]);
  const totalEntries = activeItems.length;
  const seriesCount = activeItems.filter(i => i.type === 'series').length;
  const filmCount = activeItems.filter(i => i.type === 'film').length;
  const estRuntimeHours = Math.round(((filmCount * 2.3) + (seriesCount * 6.0)) * 10) / 10;
  const remainingHours = Math.max(0, Math.round((estRuntimeHours * (1 - pct / 100)) * 10) / 10);

  const getReleaseCertainty = useCallback((entry) => {
    if (entry.hasRealDate) return 'Exact Date';
    if (entry.releaseStatus === 'TBA') return 'TBA';
    return 'Window';
  }, []);

  const calendarItems = useMemo(() => {
    const now = new Date();
    const withDates = activeItems.map(item => {
      const info = releaseInfoFor(item);
      const parsed = parseRealReleaseDate(info.date);
      const releaseStatus = releaseStatusFor(item, now);
      const yearSort = Number(item.year) || 9999;
      return {
        item,
        rawDate: info.date,
        label: info.label,
        parsed,
        releaseStatus,
        hasRealDate: Boolean(parsed),
        sortTime: parsed ? parsed.getTime() : Date.UTC(yearSort, 11, 31),
      };
    }).sort((a, b) => a.sortTime - b.sortTime || a.item.order - b.item.order);
    const groupLabel = (entry) => {
      if (entry.parsed) return entry.parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const y = Number(entry.item.year) || new Date().getFullYear();
      const seasonal = /spring|summer|fall|autumn|winter/i.test(entry.label || entry.rawDate || '');
      if (seasonal) return `Q${Math.max(1, Math.min(4, Math.ceil((new Date(`${entry.label || 'Dec'} 1, ${y}`).getMonth() + 1) / 3)))} ${y}`;
      return `${y}`;
    };
    const groupBy = (arr) => arr.reduce((acc, entry) => {
      const key = groupLabel(entry);
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    }, {});
    return {
      upcoming: withDates.filter(x => x.releaseStatus === 'upcoming' && x.hasRealDate),
      released: withDates.filter(x => x.releaseStatus === 'released'),
      tba: withDates.filter(x => x.releaseStatus === 'TBA' || (x.releaseStatus === 'upcoming' && !x.hasRealDate)),
      grouped: groupBy(withDates),
    };
  }, [activeItems, metaCache]);

  const estimateRuntimeHours = useCallback((item) => {
    if (!item) return 0;
    if (item.type === 'film') return 2.3;
    if (item.type === 'short') return 0.2;
    return Math.max(0.5, (Number(item.episodes) || 6) * 0.75);
  }, []);

  const totalWatchedHours = useMemo(() => activeItems
    .filter(i => i.status === 'watched')
    .reduce((sum, item) => sum + estimateRuntimeHours(item) * (1 + (rewatchCount[item.id] || 0)), 0), [activeItems, estimateRuntimeHours, rewatchCount]);

  const historyItems = useMemo(() => [...activeItems]
    .filter(i => i.watchedDate || rewatchCount[i.id] || myRating[i.id] || reviews[i.id])
    .sort((a, b) => (b.watchedDate || b.statusChangedAt || '').localeCompare(a.watchedDate || a.statusChangedAt || '')), [activeItems, myRating, reviews, rewatchCount]);

  const clampTenPoint = (value) => Math.max(0, Math.min(10, Number.isFinite(value) ? value : 0));
  const setReviewRating = (id, rating) => setMyRating(prev => ({ ...prev, [id]: clampTenPoint(Number(rating)) }));

  const shareCardImage = useCallback(async ({ type, data, statusHandlers = null }) => {
    try {
      const exportFontFamily = EXPORT_FONT_FAMILIES[exportFont] || EXPORT_FONT_FAMILIES.inter;
      await waitForExportFont(exportFontFamily);
      const { blob, filename } = await renderCardToCanvas({
        type,
        data,
        settings: {
          textScale: exportTextScale,
          fontFamily: exportFontFamily,
          fontKey: exportFont,
          posterSrc,
          theme: type === 'review' ? reviewCardTheme : exportSettings.theme,
          bgOpacity: exportSettings.bgOpacity,
          density: exportSettings.density,
          sections: exportSettings.sections,
          namingStrategy: ({ type: cardType, data: cardData }) => {
            if (cardType === 'progress') return `mcu-progress-card-${Date.now()}.png`;
            if (cardType === 'analysis') return 'mcu-analysis-card.png';
            if (cardType === 'review') return `${slugifyPosterName(cardData.item.title)}-review-card.png`;
            return `mcu-${cardType}-card.png`;
          },
        },
      });
      if (!blob) return;
      const result = await saveImageToDevice(blob, filename);
      statusHandlers?.onSuccess?.(result);
    } catch (e) {
      console.error(`Failed to share ${type} card`, e);
      statusHandlers?.onError?.(e);
    }
  }, [exportFont, exportTextScale, posterSrc, saveImageToDevice, reviewCardTheme, exportSettings.theme, exportSettings.bgOpacity, exportSettings.density, exportSettings.sections]);

  const shareReviewCard = async (item) => {
    await shareCardImage({
      type: 'review',
      data: { item, rating: clampTenPoint(myRating[item.id] || 0), reviewText: (reviews[item.id] || '').trim(), reviewer: profile.name || 'Reviewer' },
      statusHandlers: {
        onSuccess: (result) => {
      const methodLabel = result?.method === 'mediastore' ? 'Gallery saved' : result?.method === 'filesystem' ? 'Saved to Pictures folder' : 'Downloaded';
      setReviewShareStatus({ type: 'success', message: `Review card ready: ${methodLabel}.` });
      window.setTimeout(() => setReviewShareStatus({ type: '', message: '' }), 2800);
        },
        onError: () => {
          setReviewShareStatus({ type: 'error', message: 'Review card save failed. Please retry.' });
          window.setTimeout(() => setReviewShareStatus({ type: '', message: '' }), 3200);
        },
      },
    });
  };

  const shareAnalysisCard = async () => {
    await shareCardImage({ type: 'analysis', data: { pct, currentPhase: stickyPhaseProgress.label, totalWatched, totalWatchedHours, streak: watchStreak, totalItems: activeItems.length, phaseStats } });
  };
  const shareUnifiedCard = async () => {
    await shareCardImage({ type: 'unified', data: { featured: historyItems[0] || activeItems[0], rows: historyItems, ratings: myRating, pct, currentPhase: stickyPhaseProgress.label, totalWatched, totalItems: activeItems.length } });
  };

  const exportPreviewRows = useMemo(() => historyItems.slice(0, 6), [historyItems]);
  const exportPreviewFeatured = exportPreviewRows[0] || activeItems[0];
  const topRatedItems = useMemo(() => historyItems
    .filter(item => Number.isFinite(Number(myRating[item.id])) && Number(myRating[item.id]) > 0)
    .sort((a, b) => Number(myRating[b.id] || 0) - Number(myRating[a.id] || 0))
    .slice(0, 3), [historyItems, myRating]);
  const buildExportCardData = useCallback((cardType = exportSettings.type) => {
    const featured = exportPreviewFeatured;
    if (cardType === 'analysis') return { pct, currentPhase: stickyPhaseProgress.label, totalWatched, totalWatchedHours, streak: watchStreak, totalItems: activeItems.length, phaseStats, topRatedItems, ratings: myRating, recentCount: exportPreviewRows.length };
    if (cardType === 'review') return { item: featured, rating: clampTenPoint(myRating[featured?.id] || 0), reviewText: (reviews[featured?.id] || '').trim(), reviewer: profile.name || 'Reviewer' };
    return { featured, rows: historyItems, ratings: myRating, pct, currentPhase: stickyPhaseProgress.label, totalWatched, totalItems: activeItems.length };
  }, [exportSettings.type, exportPreviewFeatured, pct, stickyPhaseProgress.label, totalWatched, totalWatchedHours, watchStreak, activeItems.length, phaseStats, topRatedItems, exportPreviewRows.length, myRating, reviews, profile.name, historyItems]);
  const shareAdvancedExportCard = async () => {
    const cardType = exportSettings.type === 'review' && !exportPreviewFeatured ? 'analysis' : exportSettings.type;
    await shareCardImage({ type: cardType, data: buildExportCardData(cardType) });
  };

  useEffect(() => {
    if (!(exportComposerOpen || analyticsTab === 'advanced-export') || !exportPreviewFeatured) return undefined;
    let cancelled = false;
    let objectUrl = '';
    const timer = window.setTimeout(async () => {
      setExportPreview(prev => ({ ...prev, loading: true, error: '' }));
      try {
        await waitForExportFont(EXPORT_FONT_FAMILIES[exportFont] || EXPORT_FONT_FAMILIES.inter);
        const { blob } = await renderCardToCanvas({
          type: exportSettings.type,
          data: buildExportCardData(exportSettings.type),
          settings: {
            textScale: Math.max(0.9, Math.min(1.35, exportTextScale)),
            fontFamily: EXPORT_FONT_FAMILIES[exportFont] || EXPORT_FONT_FAMILIES.inter,
            fontKey: exportFont,
            posterSrc,
            theme: exportSettings.theme,
            bgOpacity: exportSettings.bgOpacity,
            density: exportSettings.density,
            sections: exportSettings.sections,
            previewScale: 0.42,
          },
        });
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setExportPreview(prev => {
            if (prev.url?.startsWith('blob:')) URL.revokeObjectURL(prev.url);
            return { url: objectUrl, loading: false, error: '' };
          });
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch {
        if (!cancelled) setExportPreview({ url: '', loading: false, error: 'Preview unavailable. Export still works.' });
      }
    }, 360);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [exportComposerOpen, analyticsTab, exportSettings.type, exportSettings.theme, exportSettings.bgOpacity, exportSettings.density, exportSettings.sections, exportFont, exportTextScale, exportPreviewFeatured, buildExportCardData, posterSrc]);


  // ─── Smoother phase gradient (multi-stop per phase for richer look) ──────
  const phaseGradient = useMemo(() => {
    let cursor = 0;
    const stops = [];
    currentPhases.forEach((ph, phIdx) => {
      const phaseItems = activeItems.filter(i => i.phase === ph.id);
      const watched = phaseItems.filter(i => i.status === 'watched').length;
      const w = activeItems.length ? (watched / activeItems.length) * 100 : 0;
      if (w <= 0) return;
      const start = cursor;
      const end = Math.min(100, cursor + w);
      const mid = start + (end - start) * 0.5;
      // Richer multi-stop: fade in, bright midpoint, fade out toward next phase
      stops.push(`${ph.color}bb ${start.toFixed(2)}%`);
      stops.push(`${ph.color}ff ${mid.toFixed(2)}%`);
      stops.push(`${ph.color}cc ${end.toFixed(2)}%`);
      cursor = end;
    });
    if (!stops.length) return 'linear-gradient(90deg, var(--theme-accent), var(--theme-accent-alt))';
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }, [activeItems]);

  useEffect(() => {
    try {
      const saved = readStorageJSON(CACHE_KEYS.poster, {});
      setPosterCache(extractCacheValues(createManagedCache(saved, { maxItems: 220, maxSerializedSize: 450_000, eviction: 'lru' })));
      const metaSaved = readStorageJSON(CACHE_KEYS.meta, {});
      setMetaCache(extractCacheValues(createManagedCache(metaSaved, { maxItems: 260, maxSerializedSize: 500_000, eviction: 'timestamp' })));
      setPosterExportFailures(readStorageJSON(CACHE_KEYS.posterExportFailures, {}));
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/posters/posters.json', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        if (cancelled) return;
        const byId = data?.byId || {};
        const byTitle = Object.entries(data?.byTitle || {}).reduce((acc, [title, src]) => {
          acc[slugifyPosterName(title)] = src;
          return acc;
        }, {});
        const inferred = Object.entries(byId).reduce((acc, [id, src]) => {
          const fileName = String(src).split('/').pop() || '';
          const inferredTitle = fileName
            .replace(/\.[a-z0-9]+$/i, '')
            .replace(/^\d+[-_. ]+/, '')
            .replace(/[-_.]+/g, ' ')
            .trim();
          if (inferredTitle) acc[slugifyPosterName(inferredTitle)] = src;
          acc[String(Number(id))] = src;
          return acc;
        }, {});
        setLocalPosterMap({ ...inferred, ...byTitle, ...byId });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useDebouncedEffect(() => {
    const managed = createManagedCache(wrapCacheEntries(posterCache), { maxItems: 220, maxSerializedSize: 450_000, eviction: 'lru' });
    scheduleStorageWrite(CACHE_KEYS.poster, JSON.stringify(managed));
  }, [posterCache], 350);

  useDebouncedEffect(() => {
    const managed = createManagedCache(wrapCacheEntries(metaCache), { maxItems: 260, maxSerializedSize: 500_000, eviction: 'timestamp' });
    scheduleStorageWrite(CACHE_KEYS.meta, JSON.stringify(managed));
  }, [metaCache], 350);

  useEffect(() => {
    try {
      const p = readStorageJSON('mcu-profile-v1', {});
      if (p?.pfp || p?.name) setProfile(prev => ({ ...prev, ...p }));
      const avatars = readStorageJSON('mcu-uploaded-avatars-v1', []);
      if (Array.isArray(avatars)) setUploadedAvatars(avatars);
      const t = readStorageValue('mcu-theme-mode-v1', '');
      const ap = readStorageValue('mcu-appearance-mode-v1', '');
      if (t) setThemeMode(t);
      if (ap) setAppearanceMode(ap);
      const darkModeSaved = readStorageValue('mcu-dark-mode-v1', '');
      if (darkModeSaved === '1' || darkModeSaved === '0') setDarkMode(darkModeSaved === '1');
      const langModeSaved = readStorageValue('mcu-marvel-lang-v1', '0');
      setMarvelLangMode(langModeSaved === '1');
      const exportPrefsSaved = readStorageJSON('mcu-export-prefs-v1', null);
      if (exportPrefsSaved?.font) setExportFont(exportPrefsSaved.font);
      if (Number.isFinite(Number(exportPrefsSaved?.textScale))) setExportTextScale(Math.max(0.9, Math.min(2.4, Number(exportPrefsSaved.textScale))));
      const snapshots = parseBackupSnapshots(readStorageValue(AUTO_BACKUP_KEY, '[]'));
      const legacy = readStorageValue(LEGACY_AUTO_BACKUP_KEY, '');
      const migrated = snapshots.length ? snapshots : (legacy ? appendSnapshot([], safeJsonParse(legacy, null)).filter(Boolean) : []);
      setAutoBackups(migrated);
      if (!snapshots.length && migrated.length) scheduleStorageWrite(AUTO_BACKUP_KEY, JSON.stringify(migrated));
      setAutoBackupStamp((migrated[0]?.exportedAt || readStorageValue(LEGACY_AUTO_BACKUP_TS_KEY, '') || ''));
    } catch {}
  }, []);


  useEffect(() => {
    const setupDone = readStorageValue('mcu-first-setup-v1') === 'done';
    if (!setupDone) setSetupOpen(true);
  }, []);

  const snapshotAccountData = useCallback(() => ({
    profile,
    uploadedAvatars,
    myLikes,
    myRating,
    rewatchCount,
    bookmarks,
    reviews,
  }), [profile, uploadedAvatars, myLikes, myRating, rewatchCount, bookmarks, reviews]);

  const restoreAccountData = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return;
    setProfile(payload.profile || { name: '', pfp: '' });
    setUploadedAvatars(Array.isArray(payload.uploadedAvatars) ? payload.uploadedAvatars : []);
    setMyLikes(payload.myLikes || {});
    setMyRating(payload.myRating || {});
    setRewatchCount(payload.rewatchCount || {});
    setBookmarks(payload.bookmarks || {});
    setReviews(payload.reviews || {});
  }, []);


  useEffect(() => { scheduleStorageWrite('mcu-profile-v1', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { scheduleStorageWrite('mcu-uploaded-avatars-v1', JSON.stringify(uploadedAvatars)); }, [uploadedAvatars]);
  useEffect(() => { scheduleStorageWrite('mcu-theme-mode-v1', themeMode); }, [themeMode]);
  useEffect(() => { scheduleStorageWrite('mcu-dark-mode-v1', darkMode ? '1' : '0'); }, [darkMode]);
  useEffect(() => { scheduleStorageWrite('mcu-appearance-mode-v1', appearanceMode); }, [appearanceMode]);
  useEffect(() => { scheduleStorageWrite('mcu-marvel-lang-v1', marvelLangMode ? '1' : '0'); }, [marvelLangMode]);
  useEffect(() => { scheduleStorageWrite('mcu-export-prefs-v1', JSON.stringify({ font: exportFont, textScale: exportTextScale })); }, [exportFont, exportTextScale]);

  useEffect(() => {
    try {
      const saved = readStorageJSON(CACHE_KEYS.userActions, {});
      const likesSaved = readStorageJSON(CACHE_KEYS.userActionsLikes, null);
      const ratingsSaved = readStorageJSON(CACHE_KEYS.userActionsRatings, null);
      const rewatchSaved = readStorageJSON(CACHE_KEYS.userActionsRewatch, null);
      const bookmarksSaved = readStorageJSON(CACHE_KEYS.userActionsBookmarks, null);
      const reviewsSaved = readStorageJSON(CACHE_KEYS.userActionsReviews, null);
      setMyLikes(likesSaved || saved.likes || {});
      setMyRating(ratingsSaved || saved.ratings || {});
      setRewatchCount(rewatchSaved || saved.rewatch || {});
      setBookmarks(bookmarksSaved || saved.bookmarks || {});
      setReviews(reviewsSaved || saved.reviews || {});
    } catch {}
  }, []);

  useDebouncedEffect(() => {
    const payload = {
      likes: pruneObject(myLikes, Boolean),
      ratings: pruneObject(myRating, value => Number(value) > 0),
      rewatch: pruneObject(rewatchCount, value => Number(value) > 0),
      bookmarks: pruneObject(bookmarks, Boolean),
      reviews: pruneObject(reviews, value => String(value || '').trim().length > 0),
    };
    const serialized = JSON.stringify(payload);
    const ok = safeLocalStorageSetItem(CACHE_KEYS.userActions, serialized);
    if (!ok || serialized.length > 200_000) {
      safeLocalStorageSetItem(CACHE_KEYS.userActionsLikes, JSON.stringify(payload.likes));
      safeLocalStorageSetItem(CACHE_KEYS.userActionsRatings, JSON.stringify(payload.ratings));
      safeLocalStorageSetItem(CACHE_KEYS.userActionsRewatch, JSON.stringify(payload.rewatch));
      safeLocalStorageSetItem(CACHE_KEYS.userActionsBookmarks, JSON.stringify(payload.bookmarks));
      safeLocalStorageSetItem(CACHE_KEYS.userActionsReviews, JSON.stringify(payload.reviews));
    }
  }, [myLikes, myRating, rewatchCount, bookmarks, reviews], 400);

  const clearPosterMetaCache = useCallback(() => {
    [CACHE_KEYS.poster, CACHE_KEYS.meta, CACHE_KEYS.posterExportFailures].forEach(removeStorageValue);
    setPosterCache({});
    setMetaCache({});
    setPosterExportFailures({});
    setPosterFetchState({ active: false, done: 0, total: 0, message: 'Poster and metadata cache cleared.' });
  }, []);

  const clearAvatarActionCache = useCallback(() => {
    [
      CACHE_KEYS.userActions,
      CACHE_KEYS.userActionsLikes,
      CACHE_KEYS.userActionsRatings,
      CACHE_KEYS.userActionsRewatch,
      CACHE_KEYS.userActionsBookmarks,
      CACHE_KEYS.userActionsReviews,
      'mcu-profile-v1',
      'mcu-uploaded-avatars-v1',
    ].forEach(removeStorageValue);
    setProfile({ name: '', pfp: '' });
    setUploadedAvatars([]);
    setMyLikes({});
    setMyRating({});
    setRewatchCount({});
    setBookmarks({});
    setReviews({});
    setPosterFetchState({ active: false, done: 0, total: 0, message: 'Profile, avatar, and action cache cleared.' });
  }, []);

  useDebouncedEffect(() => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      items: items.map(({ id, status, watchedDate, statusChangedAt }) => ({ id, status, watchedDate, statusChangedAt })),
      actions: { likes: myLikes, ratings: myRating, rewatch: rewatchCount, bookmarks, reviews },
      profile,
      exportPrefs: { font: exportFont, textScale: exportTextScale },
    };
    const nextSnapshots = appendSnapshot(autoBackups, snapshot);
    scheduleStorageWrite(AUTO_BACKUP_KEY, JSON.stringify(nextSnapshots));
    setAutoBackups(nextSnapshots);
    setAutoBackupStamp(snapshot.exportedAt);
  }, [items, myLikes, myRating, rewatchCount, bookmarks, reviews, profile, exportFont, exportTextScale], 800);
  useEffect(() => {
    const sequence = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let index = 0;
    const onKeyDown = (event) => {
      if (event.key === sequence[index]) {
        index += 1;
        if (index === sequence.length) {
          setThemeMode('mystic');
          index = 0;
        }
      } else {
        index = event.key === sequence[0] ? 1 : 0;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);


  const hasCompleteMetadata = (item, posterValues = posterCache, metaValues = metaCache) => {
    const meta = metaValues[item.id] || {};
    const hasPoster = Boolean(localPosterSrc(item) || posterValues[item.id]);
    return hasPoster && Boolean(meta.released || RELEASE_INFO[item.title]?.date) && Boolean(meta.rating || RELEASE_INFO[item.title]?.rating) && Boolean(meta.plot) && Boolean(meta.cast);
  };

  const fetchAndCacheMetadataItem = async (item, { forcePoster = false, forceAll = false } = {}) => {
    let posterValue = localPosterSrc(item) || posterCache[item.id] || '';
    let metaValue = { ...(metaCache[item.id] || {}) };

    if (forcePoster && !localPosterSrc(item)) posterValue = '';

    const needsPoster = !posterValue;
    const needsTmdbDetails = forceAll || !metaValue.plot || !metaValue.cast || !metaValue.released;
    const needsOmdbInfo = forceAll || !metaValue.rating || !metaValue.released || !metaValue.plot;

    const tmdbDetails = needsTmdbDetails ? await fetchTmdbDetail(item) : null;
    if (needsPoster && !localPosterSrc(item)) {
      posterValue = await fetchTmdbPoster(item, { force: forcePoster });
    }

    const omdbInfo = needsOmdbInfo ? await fetchOmdbInfo(item) : null;
    metaValue = {
      ...metaValue,
      released: omdbInfo?.released || tmdbDetails?.Released || metaValue.released || '',
      rating: omdbInfo?.rating || tmdbDetails?.imdbRating || metaValue.rating || '',
      plot: omdbInfo?.plot || tmdbDetails?.Plot || metaValue.plot || '',
      cast: tmdbDetails?.Actors || metaValue.cast || '',
      director: tmdbDetails?.Director || metaValue.director || '',
    };

    if (posterValue && !localPosterSrc(item)) {
      setPosterCache(prev => {
        const next = { ...prev, [item.id]: posterValue };
        const managed = createManagedCache(wrapCacheEntries(next), { maxItems: 220, maxSerializedSize: 450_000, eviction: 'lru' });
        scheduleStorageWrite(CACHE_KEYS.poster, JSON.stringify(managed));
        return next;
      });
    }
    setMetaCache(prev => {
      const next = { ...prev, [item.id]: { ...prev[item.id], ...metaValue } };
      const managed = createManagedCache(wrapCacheEntries(next), { maxItems: 260, maxSerializedSize: 500_000, eviction: 'timestamp' });
      scheduleStorageWrite(CACHE_KEYS.meta, JSON.stringify(managed));
      return next;
    });
    return { poster: posterValue, meta: metaValue };
  };

  // ─── Manual build: one title at a time; skips cached metadata ────────────
  const refreshPostersAndMetadata = async (mode = 'view') => {
    if (posterFetchState.active) return;
    const source = mode === 'all' ? items : mode === 'core' ? items.filter(item => coreIds.has(item.id)) : filtered;
    const targets = source.filter(item => !hasCompleteMetadata(item) || (!localPosterSrc(item) && !posterCache[item.id]));
    if (!targets.length) {
      setPosterFetchState({ active: false, done: 0, total: 0, message: `Metadata cache is already complete for ${mode} selection.` });
      return;
    }

    setPosterFetchState({ active: true, done: 0, total: targets.length, message: `Building metadata and missing posters for ${targets.length} entries…` });
    const batchSize = 3;
    let done = 0;
    for (let i = 0; i < targets.length; i += batchSize) {
      await new Promise(resolve => runWhenIdle(async () => {
        const batch = targets.slice(i, i + batchSize);
        for (const item of batch) {
          try {
            await fetchAndCacheMetadataItem(item);
          } catch {}
          done += 1;
          setPosterFetchState({ active: true, done, total: targets.length, message: `Cached ${done}/${targets.length}: ${item.title}` });
        }
        resolve();
      }));
      await wait(24);
    }
    setPosterFetchState({ active: false, done: targets.length, total: targets.length, message: `Built metadata for ${targets.length} entries.` });
  };


  // Intentionally avoid background metadata/poster warmups on app load.
  // This keeps startup network/data usage minimal and only fetches on demand.
  const refreshPosterForItem = async (item) => {
    if (localPosterSrc(item)) {
      setPosterFetchState({ active: false, done: 0, total: 0, message: `${item.title} uses a local poster override.` });
      return;
    }
    setPosterFetchState({ active: true, done: 0, total: 1, message: `Refreshing poster for ${item.title}…` });
    setPosterCache(prev => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    try {
      const poster = await fetchTmdbPoster(item, { force: true });
      if (poster) {
        setPosterCache(prev => ({ ...prev, [item.id]: poster }));
        setDetailPosterFailed(false);
        setPosterFetchState({ active: false, done: 1, total: 1, message: `Poster refreshed for ${item.title}.` });
      } else {
        setPosterFetchState({ active: false, done: 1, total: 1, message: `No TMDB poster found for ${item.title}.` });
      }
    } catch {
      setPosterFetchState({ active: false, done: 1, total: 1, message: `Could not refresh poster for ${item.title}.` });
    }
  };

  const exportPosterForItem = async (item, options = {}) => {
    const { share = false } = options;
    const src = localPosterSrc(item) || posterCache[item.id];
    const filename = posterExportName(item, 'png').replace(/\.\w+$/, '-details-card.png');
    try {
      const info = releaseInfoFor(item);
      const status = releaseStatusFor(item);
      const description = spoilerSafeMode
        ? 'Spoiler-safe mode is enabled for this exported details card. Story beats are intentionally hidden.'
        : (detailPlotState.active === 'secondary'
          ? (detailPlotState.secondary || detailData?.Plot || item.desc)
          : (detailPlotState.primary || detailData?.Plot || item.desc));
      const canvas = document.createElement('canvas');
      canvas.width = 1400;
      canvas.height = 2000;
      const ctx = canvas.getContext('2d');
      const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grd.addColorStop(0, '#0b1224');
      grd.addColorStop(0.44, '#121f3b');
      grd.addColorStop(1, '#22122f');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const ratingNum = clampTenPoint(Number(detailData?.imdbRating || metaCache[item.id]?.rating || 0));
      let img = null;
      if (src) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
        ctx.globalAlpha = 0.5;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        const veil = ctx.createLinearGradient(0, 0, 0, canvas.height);
        veil.addColorStop(0, 'rgba(3,7,18,0.42)');
        veil.addColorStop(0.5, 'rgba(3,7,18,0.72)');
        veil.addColorStop(1, 'rgba(3,7,18,0.92)');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      drawRoundedPanel(ctx, { x: 44, y: 48, w: 1312, h: 1904, radius: 58, fill: 'rgba(10,18,36,0.86)', stroke: 'rgba(125,211,252,0.34)', lineWidth: 4 });
      drawRoundedPanel(ctx, { x: 82, y: 88, w: 1236, h: 1824, radius: 42, fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(255,255,255,0.16)' });
      const exportFontFamily = EXPORT_FONT_FAMILIES[exportFont] || EXPORT_FONT_FAMILIES.inter;
      await waitForExportFont(exportFontFamily);
      const scale = Math.min(exportTextScale * (exportFont === 'marvel' ? 1.18 : 1), 1.9);
      if (img) {
        drawRoundedPanel(ctx, { x: 112, y: 130, w: 394, h: 574, radius: 34, fill: 'rgba(255,255,255,0.12)', stroke: 'rgba(125,211,252,0.42)', lineWidth: 3 });
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(126, 144, 366, 546, 26);
        ctx.clip();
        ctx.drawImage(img, 126, 144, 366, 546);
        ctx.restore();
      }
      ctx.fillStyle = '#93c5fd';
      ctx.font = `900 ${Math.round(28 * scale)}px ${exportFontFamily}`;
      ctx.fillText('MCU DETAILS CARD', 550, 164);
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${Math.round(60 * scale)}px ${exportFontFamily}`;
      drawWrappedText(ctx, item.title, 550, 244, 700, Math.round(68 * scale), 3);
      ctx.font = `750 ${Math.round(30 * scale)}px ${exportFontFamily}`;
      ctx.fillStyle = '#bfdbfe';
      ctx.fillText(`${item.year} • Phase ${item.phase} • ${getSafeTypeMeta(item.type).label || item.type}`, 550, 468, 700);
      drawPremiumStars(ctx, { x: 550, y: 550, size: Math.round(42 * scale), rating10: ratingNum, active: '#ffd35c', fontFamily: exportFontFamily });
      ctx.fillStyle = '#ffd35c';
      ctx.font = `900 ${Math.round(42 * scale)}px ${exportFontFamily}`;
      ctx.fillText(`${ratingNum ? ratingNum.toFixed(1) : '—'}/10`, 550, 626, 700);
      drawRoundedPanel(ctx, { x: 112, y: 778, w: 1176, h: 530, radius: 36, fill: 'rgba(255,255,255,0.06)', stroke: 'rgba(147,197,253,0.35)' });
      ctx.fillStyle = '#93c5fd';
      ctx.font = `900 ${Math.round(28 * scale)}px ${exportFontFamily}`;
      ctx.fillText('STORY BRIEF', 150, 858);
      ctx.fillStyle = '#edf6ff';
      ctx.font = `650 ${Math.round(34 * scale)}px ${exportFontFamily}`;
      drawWrappedText(ctx, description, 150, 924, 1100, Math.round(48 * scale), 7);
      drawRoundedPanel(ctx, { x: 112, y: 1350, w: 1176, h: 374, radius: 36, fill: 'rgba(255,255,255,0.055)', stroke: 'rgba(196,181,253,0.34)' });
      ctx.fillStyle = '#c4b5fd';
      ctx.font = `900 ${Math.round(26 * scale)}px ${exportFontFamily}`;
      ctx.fillText('WATCH INTEL', 150, 1424);
      ctx.fillStyle = '#d3ddf6';
      ctx.font = `700 ${Math.round(28 * scale)}px ${exportFontFamily}`;
      ctx.fillText(`Release: ${formatReleaseDate(info.date, item.year, info.label, status)}`, 150, 1494, 1080);
      drawWrappedText(ctx, `Prerequisite: ${item.prereq}`, 150, 1552, 1080, Math.round(40 * scale), 2);
      const cast = detailData?.Actors && detailData.Actors !== 'N/A' ? detailData.Actors : (CAST_MAP[item.title] || ['Cast data coming soon']).join(', ');
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('Cast', 150, 1658);
      ctx.fillStyle = '#d3ddf6';
      drawWrappedText(ctx, cast, 250, 1658, 980, Math.round(38 * scale), 3);
      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      ctx.font = `800 24px ${exportFontFamily}`;
      ctx.fillText('Made with MCU Viewing Order', 112, 1858);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
      const outputFilename = share ? filename.replace('-details-card.png', '-shared-details-card.png') : filename;
      if (Capacitor.isNativePlatform()) {
        const base64 = await blobToBase64(blob);
        await Filesystem.writeFile({ path: `mcu-posters/${outputFilename}`, data: base64, directory: Directory.Documents, recursive: true });
      } else {
        triggerDownload(blob, outputFilename);
      }
      setPosterExportState({ active: false, done: 1, total: 1, message: `${share ? 'Shared-ready' : 'Exported'} details card for ${item.title}.` });
    } catch {
      setPosterExportState({ active: false, done: 1, total: 1, message: `Could not export details card for ${item.title}.` });
    }
  };

  // ─── Build metadata: one title at a time, never automatically on load ───
  const getMetadataTargets = ({ retryOnly = false, refreshAll = false } = {}) => {
    if (retryOnly && metadataBuild.failedIds.length) {
      const failed = new Set(metadataBuild.failedIds);
      return activeItems.filter(item => failed.has(item.id));
    }
    const scopeItems = listMode === 'core' ? items.filter(i => coreIds.has(i.id)) : items;
    return scopeItems.filter(item => {
      if (refreshAll) return true;
      const hasPoster = Boolean(localPosterSrc(item) || posterCache[item.id]);
      const meta = metaCache[item.id] || {};
      const hasMetadata = Boolean(meta.rating || meta.released);
      return !hasPoster || !hasMetadata;
    });
  };

  const runMetadataBuild = async (options = {}) => {
    if (metadataBuildRef.current.running) return;
    const targets = getMetadataTargets(options);
    metadataBuildRef.current = { paused: false, running: true };
    setMetadataBuild({ status: targets.length ? 'running' : 'complete', currentTitle: '', done: 0, total: targets.length, failedIds: [] });

    if (!targets.length) {
      metadataBuildRef.current.running = false;
      return;
    }

    const failedIds = [];
    let done = 0;
    for (const item of targets) {
      if (metadataBuildRef.current.paused) break;
      setMetadataBuild(prev => ({ ...prev, status: 'running', currentTitle: item.title, done, failedIds: [...failedIds] }));
      try {
        const tmdbPoster = localPosterSrc(item) ? '' : await fetchTmdbPoster(item);
        if (tmdbPoster && !localPosterSrc(item)) {
          setPosterCache(prev => ({ ...prev, [item.id]: tmdbPoster }));
        }

        const ratingData = await fetchOmdbInfo(item);
        setMetaCache(prev => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            rating: ratingData?.rating || prev[item.id]?.rating || '',
            released: ratingData?.released || prev[item.id]?.released || '',
          },
        }));
      } catch {
        failedIds.push(item.id);
      }
      done += 1;
      setMetadataBuild(prev => ({ ...prev, done, currentTitle: item.title, failedIds: [...failedIds] }));
      await wait(250);
    }

    const paused = metadataBuildRef.current.paused;
    metadataBuildRef.current = { paused: false, running: false };
    setMetadataBuild(prev => ({
      ...prev,
      status: paused ? 'paused' : (failedIds.length ? 'error' : 'complete'),
      currentTitle: paused ? prev.currentTitle : '',
      done,
      total: targets.length,
      failedIds,
    }));
  };

  const pauseMetadataBuild = () => {
    if (!metadataBuildRef.current.running) return;
    metadataBuildRef.current.paused = true;
    setMetadataBuild(prev => ({ ...prev, status: 'paused' }));
  };

  const handleMetadataBuildClick = () => {
    if (metadataBuild.status === 'running') {
      pauseMetadataBuild();
      return;
    }
    runMetadataBuild({ retryOnly: metadataBuild.status === 'error' });
  };

  const metadataButtonLabel = metadataBuild.status === 'running'
    ? 'Pause build'
    : metadataBuild.status === 'paused'
      ? 'Resume build'
      : metadataBuild.status === 'error'
        ? 'Retry failed'
        : metadataBuild.status === 'complete'
          ? 'Build missing metadata'
          : 'Build metadata';

  const metadataStatusText = metadataBuild.status === 'running'
    ? `Building ${metadataBuild.done}/${metadataBuild.total}${metadataBuild.currentTitle ? ` · ${metadataBuild.currentTitle}` : ''}`
    : metadataBuild.status === 'paused'
      ? `Paused ${metadataBuild.done}/${metadataBuild.total}`
      : metadataBuild.status === 'error'
        ? `${metadataBuild.failedIds.length} failed · retry available`
        : metadataBuild.status === 'complete'
          ? `Done · ${metadataBuild.total} checked`
          : 'Fetches one title at a time';

  // ─── Detail panel fetch: TMDB for everything, OMDB only for rating ──────
  useEffect(() => {
    const fetchDetail = async () => {
      if (!detailItem) return;
      const requestId = detailRequestRef.current + 1;
      detailRequestRef.current = requestId;

      const fallback = {
        Plot: metaCache[detailItem.id]?.plot || detailItem.desc,
        Year: String(detailItem.year),
        Released: metaCache[detailItem.id]?.released || '',
        Actors: metaCache[detailItem.id]?.cast || '',
        imdbRating: metaCache[detailItem.id]?.rating || 'N/A'
      };
      const localFirstData = normalizeDetailData({ item: detailItem, fallback });
      setDetailData(localFirstData);
      setDetailLoading(true);

      await new Promise(resolve => requestAnimationFrame(resolve));
      if (detailRequestRef.current !== requestId) return;

      try {
        const [tmdbPoster, tmdbDetails] = await Promise.all([
          localPosterSrc(detailItem) ? Promise.resolve('') : fetchTmdbPoster(detailItem),
          fetchTmdbDetail(detailItem),
        ]);

        if (detailRequestRef.current !== requestId) return;

        if (tmdbPoster && !localPosterSrc(detailItem)) {
          setPosterCache(prev => ({ ...prev, [detailItem.id]: tmdbPoster }));
        }

        const merged = normalizeDetailData({ item: detailItem, tmdb: tmdbDetails, omdb: null, fallback });
        setDetailData(merged);
        setDetailPlotState(prev => ({ ...prev, primary: tmdbDetails?.Plot || merged.Plot || detailItem.desc }));

        setMetaCache(prev => ({
          ...prev,
          [detailItem.id]: {
            ...prev[detailItem.id],
            rating: tmdbDetails?.imdbRating || prev[detailItem.id]?.rating || '',
            released: tmdbDetails?.Released || prev[detailItem.id]?.released || '',
            plot: tmdbDetails?.Plot || prev[detailItem.id]?.plot || '',
            cast: tmdbDetails?.Actors || prev[detailItem.id]?.cast || '',
          }
        }));
      } catch {
        if (detailRequestRef.current !== requestId) return;
        setDetailData(localFirstData);
      } finally {
        if (detailRequestRef.current === requestId) setDetailLoading(false);
      }
    };
    fetchDetail();
  }, [detailItem]);

  const fetchSecondaryPlotForDetail = async () => {
    if (!detailItem || detailPlotState.secondary || detailPlotState.loadingSecondary) return;
    setDetailPlotState(prev => ({ ...prev, loadingSecondary: true }));
    try {
      const omdbInfo = await fetchOmdbInfo(detailItem);
      const secondary = omdbInfo?.plot || detailItem.desc;
      setDetailPlotState(prev => ({ ...prev, secondary, loadingSecondary: false }));
    } catch {
      setDetailPlotState(prev => ({ ...prev, secondary: detailItem.desc, loadingSecondary: false }));
    }
  };

  useEffect(() => {
    setDetailPosterFailed(false);
  }, [detailItem]);

  const openStatusDropdown = (e, itemId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const dropW = 240, dropH = 280;
    const gap = 10;
    let x = rect.left - dropW + rect.width;
    let y = rect.top - dropH - gap;
    if (x < gap) x = gap;
    if (x + dropW > window.innerWidth - gap) x = window.innerWidth - dropW - gap;
    if (y < gap) y = rect.bottom + gap;
    if (y + dropH > window.innerHeight - gap) y = Math.max(gap, window.innerHeight - dropH - gap);
    setDropdownPos({ x, y });
    setStatusDropdown(itemId);
  };

  // ─── Theme tokens ──────────────────────────────────────────────────────────
  const T = darkMode ? {
    appBg: '#06060f', headerBg: 'linear-gradient(180deg,#0d0d1e 0%,#06060f 100%)',
    headerBorder: '#13132a', navBg: '#08081a', navBorder: '#13132a',
    filterBg: 'transparent', filterBorder: '#10101f',
    surfaceBg: 'transparent', surfaceBorder: '#12122a',
    rowHoverBg: 'rgba(255,255,255,0.04)', rowWatchedBg: 'rgba(62,196,122,0.22)',
    rowBorder: '#0e0e1e', expandBg: '#090916', expandBorder: '#14142a',
    pillBg: '#0d0d1e', pillBorder: '#1a1a2e', pillText: '#6a7a90',
    pillHoverBorder: '#252540', pillHoverText: '#c5d0e8',
    inputBg: '#0b0b1d', inputBorder: '#171730', inputColor: '#c5d0e8',
    dropdownBg: '#0d0d1e', dropdownBorder: '#1e1e36', dropdownShadow: '0 24px 64px rgba(0,0,0,0.95)',
    text: '#cfd9ea', textMuted: '#8fa1b8', textFaint: '#5a6880',
    sortHoverBg: '#0f0f22', statBg: '#0b0b1c', statBorder: '#131328',
    numFaint: '#4a5566', footerText: '#1e2a38',
    scrollTrack: '#07070f', scrollThumb: '#16162a', scrollThumbH: '#222238',
    hexDot: 'rgba(255,255,255,0.01)', switcherBg: '#080818', switcherBorder: '#13132a',
    phaseSummaryBg: 'color-mix(in srgb, #ffffff 5%, transparent)', phaseSummaryBorder: '#13132a',
  } : {
    appBg: '#e8e2d7', headerBg: 'linear-gradient(180deg,#f5f0e6 0%,#e8e2d7 100%)',
    headerBorder: '#ddd8d0', navBg: '#ffffff', navBorder: '#e8e2d8',
    filterBg: 'transparent', filterBorder: 'rgba(178,170,160,0.52)',
    surfaceBg: 'transparent', surfaceBorder: '#d5cec3',
    rowHoverBg: 'rgba(31,41,55,0.04)', rowWatchedBg: 'rgba(62,196,122,0.14)',
    rowBorder: '#dfd7cc', expandBg: '#f0e9de', expandBorder: '#d8cfc3',
    pillBg: '#e7e0d5', pillBorder: '#d0c8bc', pillText: '#535d6e',
    pillHoverBorder: '#b8afa2', pillHoverText: '#172235',
    inputBg: '#f5efe4', inputBorder: '#cbc2b6', inputColor: '#1a2030',
    dropdownBg: '#f3ece1', dropdownBorder: '#cbc2b6', dropdownShadow: '0 20px 44px rgba(15,23,42,0.12)',
    text: '#162033', textMuted: '#42506a', textFaint: '#607089',
    sortHoverBg: '#ece4d9', statBg: '#f3ede2', statBorder: '#d8cfc3',
    numFaint: '#8e98a6', footerText: '#8e98a6',
    scrollTrack: '#e5ddd2', scrollThumb: '#beb5a8', scrollThumbH: '#aba294',
    hexDot: 'rgba(13,24,42,0.028)', switcherBg: '#eee7dc', switcherBorder: '#d5ccbf',
    phaseSummaryBg: 'color-mix(in srgb, #ffffff 5%, transparent)', phaseSummaryBorder: 'rgba(214,205,194,0.5)',
  };

  // ─── Per-theme accent + distinctive surface tints ─────────────────────────
  const activeThemeVars = resolveThemeTokens({ appearanceMode, characterTheme: themeMode, darkMode });

  const semanticThemeVars = buildSemanticThemeVars(darkMode);

  const cssThemeVars = {
    ...activeThemeVars,
    '--theme-accent': 'var(--accent-1)',
    '--theme-accent-alt': 'var(--accent-2)',
    '--theme-surface': 'var(--surface-1)',
    '--theme-surface-hover': 'var(--surface-2)',
    '--theme-text': 'var(--text-primary)',
    '--theme-text-secondary': 'var(--text-secondary)',
    ...semanticThemeVars,
    '--theme-border': darkMode ? '#1b1b33' : '#c8beaf',
    '--theme-text-disabled': darkMode ? 'rgba(186, 200, 222, 0.56)' : 'rgba(77, 91, 111, 0.56)',
    '--font-marvel-display': 'var(--font-display)',
    '--font-marvel-ui': 'var(--font-ui)',
    '--font-marvel-body': 'var(--font-body)',
    '--ui-space-1': UI_PARITY_TOKENS.spacing.xs,
    '--ui-space-2': UI_PARITY_TOKENS.spacing.sm,
    '--ui-space-3': UI_PARITY_TOKENS.spacing.md,
    '--ui-space-4': UI_PARITY_TOKENS.spacing.lg,
    '--ui-radius-sm': UI_PARITY_TOKENS.radius.sm,
    '--ui-radius-md': UI_PARITY_TOKENS.radius.md,
    '--ui-radius-lg': UI_PARITY_TOKENS.radius.lg,
    '--motion-fast': UI_PARITY_TOKENS.motion.fast,
    '--motion-base': UI_PARITY_TOKENS.motion.base,
    '--motion-slow': UI_PARITY_TOKENS.motion.slow,
    '--theme-success-soft': darkMode
      ? 'color-mix(in srgb, var(--theme-accent) 16%, transparent)'
      : 'color-mix(in srgb, var(--theme-accent) 12%, #f8f9fb)',
    '--theme-warning-soft': darkMode ? 'rgba(232,184,75,0.16)' : 'rgba(232,184,75,0.12)',
    '--theme-danger-soft': darkMode ? 'rgba(209,106,106,0.16)' : 'rgba(209,106,106,0.12)',
    '--text-disabled': darkMode ? 'rgba(186, 200, 222, 0.56)' : 'rgba(77, 91, 111, 0.56)',
    '--theme-overlay-surface': darkMode
      ? `color-mix(in srgb, ${activeThemeVars['--theme-accent']} 14%, rgba(255,255,255,0.06))`
      : `color-mix(in srgb, ${activeThemeVars['--theme-accent-alt']} 10%, rgba(15,23,42,0.04))`,
    '--theme-overlay-border': darkMode
      ? `color-mix(in srgb, ${activeThemeVars['--theme-accent-alt']} 32%, rgba(255,255,255,0.14))`
      : `color-mix(in srgb, ${activeThemeVars['--theme-accent']} 26%, rgba(15,23,42,0.14))`,
    '--overlay-soft': darkMode ? 'rgba(2,6,18,0.3)' : 'rgba(15,23,42,0.09)',
    '--overlay-dark': darkMode ? 'rgba(2,6,18,0.46)' : 'rgba(15,23,42,0.15)',
    '--overlay-strong': darkMode ? 'rgba(2,6,18,0.58)' : 'rgba(15,23,42,0.24)',
    '--control-solid-bg': darkMode ? 'rgba(20,25,46,0.84)' : 'rgba(239,233,223,0.94)',
    '--detail-shell-bg': darkMode
      ? 'linear-gradient(145deg, color-mix(in srgb,var(--theme-bg) 92%, #000), color-mix(in srgb,var(--theme-surface) 88%, #000) 54%, color-mix(in srgb,var(--theme-bg-alt) 88%, #000))'
      : 'linear-gradient(145deg, color-mix(in srgb,var(--theme-surface) 88%, var(--theme-bg)), color-mix(in srgb,var(--theme-bg) 90%, #f5efe3) 56%, color-mix(in srgb,var(--theme-surface) 78%, var(--theme-bg)))',
    '--detail-panel-bg': darkMode
      ? 'color-mix(in srgb,var(--theme-surface) 74%, rgba(8,12,26,0.82))'
      : 'color-mix(in srgb,var(--theme-surface) 74%, var(--theme-bg))',
    '--app-bg-base': darkMode ? '#06060f' : '#e2dbcf',
    '--app-bg-vignette': darkMode ? 'rgba(2,6,23,0.42)' : 'rgba(2,6,23,0.08)',
    '--app-bg-noise-opacity': darkMode ? '0.06' : '0.03',
    '--theme-app-bg': darkMode
      ? `radial-gradient(circle at 8% 2%, color-mix(in srgb, ${activeThemeVars['--theme-accent']} 40%, transparent), transparent 34%), radial-gradient(circle at 90% 8%, color-mix(in srgb, ${activeThemeVars['--theme-accent-alt']} 36%, transparent), transparent 40%), radial-gradient(circle at 50% 120%, rgba(14,165,233,0.22), transparent 52%), linear-gradient(138deg, #02030a 0%, #09071a 30%, #0f1031 58%, #1a1038 100%)`
      : `radial-gradient(circle at 8% 4%, color-mix(in srgb, ${activeThemeVars['--theme-accent']} 15%, #e9e1d5), transparent 34%), radial-gradient(circle at 88% 14%, color-mix(in srgb, ${activeThemeVars['--theme-accent-alt']} 13%, #e9e1d5), transparent 40%), linear-gradient(140deg, #e5ddd1 0%, #dfd6c8 44%, #e4dbcf 100%)`,
    '--comp-overlay-bg': darkMode ? 'rgba(4,8,18,0.56)' : 'rgba(255,255,255,0.58)',
    '--comp-dropdown-bg': darkMode ? 'rgba(9,14,28,0.52)' : 'rgba(255,255,255,0.62)',
    '--theme-header-bg': darkMode
      ? `linear-gradient(180deg, color-mix(in srgb, ${activeThemeVars['--theme-accent']} 18%, #0c1022), #06060f)`
      : `linear-gradient(180deg, color-mix(in srgb, ${activeThemeVars['--theme-accent']} 9%, #f2ede3), #ece5d9)`,
    '--theme-watched-bg': darkMode
      ? `linear-gradient(100deg, color-mix(in srgb, ${activeThemeVars['--theme-accent']} 18%, rgba(12,18,34,0.62)), color-mix(in srgb, ${activeThemeVars['--theme-accent-alt']} 10%, rgba(10,20,32,0.54)))`
      : `linear-gradient(100deg, color-mix(in srgb, ${activeThemeVars['--theme-accent']} 14%, #ffffff), color-mix(in srgb, ${activeThemeVars['--theme-accent-alt']} 8%, #f7f5ef))`,
    ...activeThemeVars,
  };
  const routeMode = analyticsOpen || settingsOpen ? 'utility' : 'home';

  // Count active filters for the collapsed bar badge
  const activeFilterCount = [typeFilter, statusFilter, watchedOnly, autoHideStatuses, essentialOnly && listMode === 'core', sortBy !== 'order'].filter(Boolean).length;
  const trailerDataForDetail = detailItem ? getTrailerByTitle(detailItem.title) : null;
  const trailerOptions = trailerDataForDetail?.options || [];
  const selectedTrailer = trailerOptions[trailerVariantIndex] || trailerOptions[0] || null;
  const trailerOptionIndex = trailerOptions.findIndex(option => /trailer/i.test(option?.label || option?.type || ''));
  const teaserOptionIndex = trailerOptions.findIndex(option => /teaser/i.test(option?.label || option?.type || ''));
  const hasTrailerOption = trailerOptionIndex >= 0;
  const hasTeaserOption = teaserOptionIndex >= 0;
  const postCreditForward = detailItem ? getAfterCreditsMeta(detailItem).connectsTo : [];
  const postCreditInbound = useMemo(() => detailItem
    ? Object.entries(AFTER_CREDITS)
      .filter(([, meta]) => Array.isArray(meta?.connectsTo) && meta.connectsTo.includes(detailItem.title))
      .map(([name]) => name)
    : [], [detailItem]);
  const tUniverse = (label) => {
    if (!marvelLangMode) return label;
    const lexicon = universe === 'dc' ? DC_UI_LEXICON : MARVEL_UI_LEXICON;
    return lexicon[label] || `✦ ${label}`;
  };
  const filterTriggerLabel = tUniverse('Filters');

  const renderPhaseSelector = () => (
    <>
    {showPhaseSystem && (
    <div ref={phaseRef} className="phase-selector-rail">
      <button className="fpill phase-chip marvel-phase-btn" data-active={activePhase === 0} onClick={() => { setActivePhase(0); requestAnimationFrame(() => scrollToListTop()); }}>
        <span className="phase-chip-label">All Phases</span>
      </button>
      {currentPhases.map((ph) => {
        const stat = phaseStats.find(s => s.phase === ph.id);
        const total = stat?.total || 0;
        const watched = stat?.watched || 0;
        const isActive = activePhase === ph.id;
        return (
          <button
            key={ph.id}
            onClick={() => {
              setActivePhase(ph.id);
              requestAnimationFrame(() => scrollToListTop());
            }}
            className="fpill phase-chip marvel-phase-btn"
            data-active={isActive}>
            <span className="phase-chip-label">{ph.name}</span>
            <span className="phase-chip-count">{watched}/{total}</span>
          </button>
        );
      })}
    </div>
    )}
    <div className="phase-selector-rail" style={{ marginTop: showPhaseSystem ? 10 : 0 }}>
      {[
        { id: 'all', label: 'All Release States' },
        { id: 'released', label: 'Now Available' },
        { id: 'upcoming', label: 'Coming Soon / TBA' },
      ].map(opt => (
        <button
          key={opt.id}
          className="fpill phase-chip"
          data-active={releaseFilter === opt.id}
          onClick={() => setReleaseFilter(opt.id)}
          aria-pressed={releaseFilter === opt.id}
        >
          <span className="phase-chip-label">{opt.label}</span>
        </button>
      ))}
    </div>
    </>
  );

  const sectionScaffold = (
    <>
      <Header title="MCU Viewing Order" subtitle="Modernized modular UI shell" />
      <TimelineControls />
      <ProgressSection />
      <TitleCard />
      <SettingsSection open={settingsOpen} />
      <Analytics open={analyticsOpen} />
      <DetailDrawer open={Boolean(detailItem)} />
    </>
  );

  const appThemeBg = routeMode === 'utility'
    ? `linear-gradient(180deg, color-mix(in srgb, var(--theme-surface) 36%, var(--app-bg-base)), var(--app-bg-base))`
    : `radial-gradient(circle at 50% 0%, var(--app-bg-vignette), transparent 58%), var(--theme-app-bg)`;
  const appTexture = 'none';
  const heroBackdropBackgroundSize = isDesktopViewport
    ? `${Math.max(heroBackdropScale - 16, 112)}% auto`
    : `auto ${Math.max(heroBackdropScale - 8, 96)}%`;
  return (
    <div data-scaffold={Boolean(sectionScaffold)} data-theme={appearanceMode} style={{ ...cssThemeVars, '--row-gap': densityMode === 'compact' ? '8px' : '12px', '--row-pad': densityMode === 'compact' ? '11px 10px 11px 8px' : '16px 16px 16px 12px', '--row-min-h': densityMode === 'compact' ? '72px' : '86px', '--text-scale': 1, '--ui-scale': effectiveUiScale, minHeight: '100dvh', backgroundColor: 'var(--app-bg-base)', backgroundImage: appTexture !== 'none' ? `${appTexture}, ${appThemeBg}` : appThemeBg, backgroundSize: appTexture !== 'none' ? '6px 6px, auto' : 'auto', color: 'var(--theme-text)', fontFamily: 'var(--font-marvel-body)', fontSize: '16px', zoom: effectiveUiScale, display: 'flex', flexDirection: 'column', overflowX: 'hidden', overflowY: 'visible', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', transition: 'background 260ms var(--ease-out), color 180ms var(--ease-out)' }} className={`theme-switch ${universe === 'dc' ? 'dc-universe' : 'mcu-universe'}${performanceMode || browseMode === 'phase' ? ' performance-mode' : ''}${overlayActive ? ' overlay-open' : ''}${browseMode === 'phase' ? ' phase-list-mode' : ''}`} data-color-mode={darkMode ? 'dark' : 'light'}>
      


      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100vh', minHeight: '100vh', maxHeight: '100vh', zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {browseMode !== 'phase' && previousHeroSrc && previousHeroSrc !== currentHeroSrc && (
          <div
            key={`backdrop-exit-${previousHeroSrc}`}
            className="hero-backdrop-image is-exiting"
            style={{ '--backdrop-opacity': heroBackdropOpacity, position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderRadius: 24, overflow: 'hidden', backgroundImage: `url(${previousHeroSrc})`, backgroundSize: heroBackdropBackgroundSize, backgroundRepeat: 'no-repeat', backgroundPosition: 'center 7%', transition: browseMode === 'phase' ? 'none' : undefined }}
          />
        )}
        {currentHeroSrc && (
          <div
            key={`backdrop-${currentHeroSrc}`}
            className="hero-backdrop-image"
            style={{ '--backdrop-opacity': heroBackdropOpacity, position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderRadius: 24, overflow: 'hidden', backgroundImage: `url(${currentHeroSrc})`, backgroundSize: heroBackdropBackgroundSize, backgroundRepeat: 'no-repeat', backgroundPosition: 'center 7%', transition: browseMode === 'phase' ? 'none' : undefined }}
          />
        )}
        <div className="hero-backdrop-blend" />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--theme-accent) 20%, transparent), transparent 42%), radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--theme-accent-alt) 18%, transparent), transparent 40%), linear-gradient(165deg, color-mix(in srgb, var(--theme-accent) ${darkMode ? '6%' : '3%'}, #04050f), color-mix(in srgb, var(--theme-accent-alt) ${darkMode ? '5%' : '2.5%'}, #0a1734) 42%, ${darkMode ? '#090d1e' : '#edf2fa'} 100%)`, opacity: darkMode ? 0.12 : 0.06, transition: 'opacity 0.95s ease-in-out', animation: 'cinematicIn 0.8s ease both' }} />
      </div>

      {/* ━━ SETTINGS PANEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <SidebarMenu controlsHidden={analyticsOpen || detailItem || sidebarOpen || settingsOpen} settingsOpen={settingsOpen} ref={sidebarRef} open={sidebarOpen} darkMode={darkMode} performanceMode={performanceMode} pillBorder={T.pillBorder} surfaceBorder={T.surfaceBorder} onToggle={toggleSidebarPanel} onClose={closeSidebar} onOpenSettings={toggleSettingsPanel}>
        <div className="sidebar-redesign">
          <section className="sidebar-panel sidebar-panel--brand">
            <p className="sidebar-kicker">{universe === 'dc' ? 'Justice Network' : 'Avengers Network'}</p>
            <h3>{tUniverse('Mission Control')}</h3>
            <p>{tUniverse('Track progress blurb')}</p>
            <div className="sidebar-profile-row">
              {profile.pfp ? <img src={profile.pfp} alt="profile" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} /> : <div className="sidebar-avatar-fallback"><UserCircle size={20} /></div>}
              <div>
                <strong>{profile.name || tUniverse('Marvel Fan')}</strong>
                <span>{universe === 'dc' ? activeUniverse.subtitle : 'Sacred Timeline Keeper'}</span>
              </div>
            </div>
          </section>

          <section className="sidebar-panel">
            <div className="sidebar-section-title">{tUniverse('Theme & Language')}</div>
            <div className="sidebar-btn-grid">
              <button className="fpill" onClick={() => setDarkMode(true)} style={{ justifyContent: 'center', borderColor: darkMode ? 'var(--theme-accent)' : 'var(--theme-border)' }}><Moon size={12} />{tUniverse('Dark')}</button>
              <button className="fpill" onClick={() => setDarkMode(false)} style={{ justifyContent: 'center', borderColor: !darkMode ? 'var(--theme-accent)' : 'var(--theme-border)' }}><Sun size={12} />{tUniverse('Light')}</button>
            </div>
            <button className='fpill settings-toggle-pill' type='button' aria-pressed={marvelLangMode} onClick={() => setMarvelLangMode(v => !v)} style={{ justifyContent: 'space-between' }}><span>{tUniverse('Universe Language')}</span><span>{marvelLangMode ? 'On' : 'Off'}</span></button>
          </section>

          <section className="sidebar-panel">
            <div className="sidebar-section-title">{tUniverse('View & Navigate')}</div>
            <div className="sidebar-btn-grid">
              <button className="fpill" onClick={() => { setSidebarOpen(false); setViewMode(viewMode === 'list' ? 'calendar' : 'list'); }} style={{ justifyContent: 'center' }}>{viewMode === 'list' ? 'Calendar View' : 'List View'}</button>
              <button className="fpill" onClick={openAnalyticsPanel} style={{ justifyContent: 'center' }}>{tUniverse('Analytics')}</button>
            </div>
            <button className="fpill" onClick={() => { setSidebarOpen(false); toggleSettingsPanel(); }} style={{ width: '100%', justifyContent: 'center' }}><Settings size={13} />{tUniverse('Open Settings')}</button>
          </section>

          <section className="sidebar-panel">
            <div className="sidebar-section-title">{tUniverse('Universe Style')}</div>
            <div className='appearance-grid'>
              {APPEARANCE_MODES.map(mode => <button key={mode.id} className={`appearance-card ${appearanceMode===mode.id ? 'is-active' : ''}`} onClick={() => setAppearanceMode(mode.id)}><span>{mode.label}</span><em /></button>)}
            </div>
            <div className='theme-grid' style={{ marginTop: 8 }}>
              {themedChoices.map(({ id: t, displayLabel, displaySwatch }) => (
                <button key={t} className="fpill filter-pill type-pill" style={{ justifyContent: 'center', gap: 6, fontSize: 11, borderColor: themeMode === t ? 'color-mix(in srgb, var(--accent-1) 36%, var(--edge-color))' : 'var(--edge-color)' }} onClick={() => setThemeMode(t)}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: displaySwatch, flexShrink: 0, display: 'inline-block' }} />{displayLabel}
                </button>
              ))}
            </div>
          </section>

          <section className="sidebar-panel">
            <div className="sidebar-section-title">{tUniverse('Watchlist Mode')}</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {LIST_MODES.map(mode => {
                const isActive = listMode === mode.id;
                return <button key={`side-${mode.id}`} className="fpill" onClick={() => { setListMode(mode.id); setExpandedItem(null); setExpandedPhase(null); setSidebarOpen(false); }} style={{ justifyContent: 'space-between', borderColor: isActive ? (mode?.color || 'var(--theme-accent)') : 'var(--theme-border)', color: isActive ? (mode?.color || 'var(--theme-accent)') : 'var(--theme-text)' }}><span>{mode.label}</span>{isActive && <Check size={12} />}</button>;
              })}
            </div>
          </section>
        </div>
      </SidebarMenu>

      <SettingsMenu ref={settingsRef} open={settingsOpen} darkMode={darkMode} performanceMode={performanceMode} onClose={closeSettings}>
  <div className="settings-redesign">
    <section className="settings-hero-card">
      <div>
        <p className="settings-eyebrow">Settings Hub</p>
        <h2>{universe === 'dc' ? 'Customize your DC experience' : 'Customize your Marvel experience'}</h2>
        <p>Unified controls for profile, universe themes, sync, backups, and modern accessibility-focused tuning.</p>
      </div>
      <div className="settings-hero-actions">
        <button className="fpill" onClick={() => setDarkMode(true)} style={{ justifyContent: 'center', borderColor: darkMode ? 'var(--theme-accent)' : 'var(--theme-border)' }}><Moon size={13} />Dark</button>
        <button className="fpill" onClick={() => setDarkMode(false)} style={{ justifyContent: 'center', borderColor: !darkMode ? 'var(--theme-accent)' : 'var(--theme-border)' }}><Sun size={13} />Light</button>
      </div>
    </section>

    <section className="settings-grid-2">
      <article className="settings-card">
        <h3>Profile</h3>
        <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="User name" className="settings-input" />
        <div className="settings-avatar-grid">
          {uploadedAvatars.map((src, idx) => (
            <button key={idx} onClick={() => setProfile(p => ({ ...p, pfp: src }))} title={`Avatar ${idx + 1}`} className="settings-avatar-btn" style={{ background: profile.pfp === src ? 'var(--theme-surface-hover)' : 'transparent' }}>
              <img src={src} alt={`Avatar ${idx + 1}`} style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '50%', objectFit: 'cover' }} />
            </button>
          ))}
          <label title="Upload custom avatar" className="settings-avatar-upload">
            <div style={{ display: 'grid', placeItems: 'center', fontSize: 11, gap: 2 }}>
              <Upload size={13} />
              <span>Custom +</span>
            </div>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const img = String(r.result || ''); setAvatarCropSrc(img); }; r.readAsDataURL(f); }} style={{ display: 'none' }} />
          </label>
        </div>
        <button className="fpill" onClick={() => setProfile(p => ({ ...p, pfp: '' }))} disabled={!profile.pfp} style={{ justifyContent: 'center', opacity: profile.pfp ? 1 : 0.55 }}><Trash2 size={14}/>Remove Profile Picture</button>
      </article>

      <article className="settings-card">
        <h3>{tUniverse('Interface Behavior')}</h3>
        <label className="settings-toggle-row"><span><EyeOff size={14}/>{tUniverse('Auto-hide Completed')}</span><button className='fpill settings-toggle-pill' type='button' aria-pressed={autoHideStatuses} onClick={() => setAutoHideStatuses(v => !v)}>{autoHideStatuses ? 'On' : 'Off'}</button></label>
        <label className="settings-toggle-row"><span><Pause size={14}/>{tUniverse('Reduce Motion')}</span><button className='fpill settings-toggle-pill' type='button' aria-pressed={performanceMode} onClick={() => setPerformanceMode(v => !v)}>{performanceMode ? 'On' : 'Off'}</button></label>
        <label className="settings-toggle-row"><span><Film size={14}/>Poster Data Saver</span><button className='fpill settings-toggle-pill' type='button' aria-pressed={posterDataSaver} onClick={() => setPosterDataSaver(v => !v)}>{posterDataSaver ? 'On' : 'Off'}</button></label>
        <p className="settings-help">Data saver uses lighter TMDB poster sizes in home and list feeds when available.</p>
      </article>
    </section>

    <section className="settings-card">
      <h3>{tUniverse('Preferences')}</h3>
      <div className="settings-toggle-grid">
        <label className="settings-toggle-row"><span><Star size={14}/>{tUniverse('Universe Language')}</span><button className='fpill settings-toggle-pill' type='button' aria-pressed={marvelLangMode} onClick={() => setMarvelLangMode(v => !v)}>{marvelLangMode ? 'On' : 'Off'}</button></label>
        <label className="settings-toggle-row"><span><EyeOff size={14}/>{tUniverse('Spoiler Safe')}</span><button className='fpill settings-toggle-pill' type='button' aria-pressed={spoilerSafeMode} onClick={() => setSpoilerSafeMode(v => !v)}>{spoilerSafeMode ? 'On' : 'Off'}</button></label>
        <label className="settings-toggle-row"><span><Zap size={14}/>{tUniverse('Performance Mode')}</span><button className='fpill settings-toggle-pill' type='button' aria-pressed={performanceMode} onClick={() => setPerformanceMode(v => !v)}>{performanceMode ? 'On' : 'Off'}</button></label>
      </div>
      <p className="settings-help">Performance mode reduces visual effects for slower devices.</p>
    </section>

    <section className="settings-grid-2">
      <article className="settings-card">
        <h3>Visual Tuning</h3>
        <label className="settings-toggle-row"><span><Layers size={14}/>Desktop text scaling</span><button className='fpill settings-toggle-pill' type='button' onClick={() => setTextScaleEnabled(v => !v)}>{textScaleEnabled ? 'On' : 'Off'}</button></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 6 }}>
          {DESKTOP_TEXT_SCALES.map(scale => <button key={`desktop-scale-${scale}`} className='fpill' type='button' onClick={() => setDesktopTextScale(scale)} disabled={!textScaleEnabled} style={{ justifyContent: 'center', opacity: textScaleEnabled ? 1 : 0.55 }}>{Math.round(scale * 100)}%</button>)}
        </div>
        <p className="settings-help">Current scale: {Math.round((textScaleEnabled ? effectiveUiScale : 1) * 100)}%</p>
        <div className="settings-slider-group"><span><Film size={12} /> Background size ({heroBackdropScale}%)</span><input type='range' min={100} max={112} step={1} value={heroBackdropScale} onChange={(e) => setHeroBackdropScale(Number(e.target.value))} /></div>
        <div className="settings-slider-group"><span>Background opacity ({Math.round(heroBackdropOpacity * 100)}%)</span><input type='range' min={75} max={100} step={1} value={Math.round(heroBackdropOpacity * 100)} onChange={(e) => setHeroBackdropOpacity(Number(e.target.value) / 100)} /></div>
      </article>

      <article className="settings-card">
        <h3>Backup & Restore</h3>
        <p className="settings-help">Automatic snapshots are saved continuously here. Restore any saved point or export the latest JSON to Google Drive.</p>
        <div style={{ display: 'grid', gap: 6 }}><div className="settings-help">Auto snapshots (latest 5)</div>{autoBackups.slice(0,5).map((shot, idx) => { const preview = buildBackupPreview(shot); return <button key={`${shot.exportedAt}-${idx}`} className="fpill" onClick={() => importProgress(new File([JSON.stringify(shot)], 'mcu-auto-backup.json', { type: 'application/json' }))} style={{ justifyContent: 'space-between' }}><span><Clock size={14}/>Restore {new Date(preview.exportedAt).toLocaleDateString()}</span><span style={{ fontSize: 'var(--type-metadata)', color: T.textMuted }}>{preview.watched}/{preview.total}</span></button>; })}</div>
        <div className="settings-inline-actions">
          <button className="fpill" onClick={exportProgress}><Download size={14}/>Export latest JSON</button>
          <label className="fpill import-backup-pill" style={{ cursor: 'pointer' }}><Upload size={14}/>Import JSON<input type="file" accept="application/json" onChange={(e) => importProgress(e.target.files?.[0])} style={{ display: 'none' }} /></label>
        </div>
      </article>
    </section>

    <section className="settings-card">
      <h3>Google Drive Backup Guide</h3>
      <ol className="settings-guide-list">
        <li>Tap <b>Export Backup JSON</b> and save the file locally.</li>
        <li>Open Google Drive app or drive.google.com and upload the JSON file.</li>
        <li>On a new device, download that same JSON from Drive.</li>
        <li>Tap <b>Import Backup JSON</b> in this app and choose the downloaded file.</li>
              </ol>
    </section>
  </div>
</SettingsMenu>

      {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="hexbg" style={{ position: 'relative', zIndex: 'var(--overlay-z-base)', background: universe === 'dc' ? 'linear-gradient(180deg, rgba(20,44,88,.95), rgba(10,22,43,.88))' : 'transparent', borderBottom: universe === 'dc' ? '1px solid rgba(59,130,246,.35)' : 'none', flexShrink: 0, pointerEvents: blockHomeInteractions ? 'none' : 'auto' }}>
        <div className="header-inner" style={{ width: '100%', maxWidth: 1480, margin: '0 auto', padding: headerMinimized ? 'calc(env(safe-area-inset-top, 0px) + 14px) 24px 10px' : 'calc(env(safe-area-inset-top, 0px) + 26px) 30px 16px', transition: 'padding 0.2s ease' }}>
          <div className="header-controls-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            <div className={`header-brand ${headerMinimized ? 'compact' : ''}`} onClick={() => { setBrandTapCount(c => c + 1); setTimeout(() => setBrandTapCount(0), 550); }} onDoubleClick={() => setUniverse(prev => prev === 'mcu' ? 'dc' : 'mcu')} style={{ fontFamily: 'var(--font-marvel-display)', lineHeight: 0.9, marginBottom: 0, fontWeight: 900, cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}>
              <div className="header-title-mcu" style={{ color: universe === 'dc' ? '#9ac5ff' : undefined }}>{activeUniverse.title}</div>
              <div className="header-title-sub">{activeUniverse.subtitle}</div>
              <div className="header-tagline">
                {universe === 'dc'
                  ? (darkMode ? 'In Brightest Day, In Blackest Night' : 'Truth, Justice, and a Better Tomorrow')
                  : (darkMode ? 'Whatever It Takes' : 'Part of the Journey is the End')}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ━━ POSTER CAROUSEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {browseMode === 'home' && <section className="hero-carousel-shell" aria-label={activeUniverse.heroLabel}>
        {heroPosters.length > 0 && (
          <>
            <button className="hero-carousel-nav prev" type="button" aria-label="Previous featured poster" onClick={goToPrevHero}>‹</button>
            <div className="hero-carousel-track"
              ref={heroRailRef}
              onWheel={handleHeroWheel}
              onScroll={() => { if (!heroProgrammaticScrollRef.current) pauseHeroAutoSlide(1800); }}
              onPointerDown={() => pauseHeroAutoSlide(3200)}
              onTouchStart={() => pauseHeroAutoSlide(3200)}>
              {visibleHeroPosters.map(({ src, item: heroItem }, idx) => {
              const isActive = src === activeHeroSrc;
              return (
                <article key={`hero-rail-${src}`} ref={isActive ? heroActiveCardRef : null} className={`hero-carousel-card ${isActive ? 'is-active' : ''}${heroItem?.releaseStatus === 'upcoming' ? ' is-upcoming' : ''}`}>
                  <img
                    className="hero-carousel-poster"
                    src={src}
                    alt={heroItem?.title || `Featured ${activeUniverse.title} poster`}
                    draggable={false}
                    loading={idx < 8 ? 'eager' : 'lazy'}
                    decoding="async"
                    onDragStart={(e) => e.preventDefault()}
                    onClick={() => { if (heroItem) openDetail(heroItem); }}
                    />
                  <div className="hero-carousel-meta">
                    <p className="hero-carousel-title">{heroItem?.title || `Featured ${activeUniverse.title} poster`}</p>
                  </div>
                </article>
              );
              })}
            </div>
            <button className="hero-carousel-nav next" type="button" aria-label="Next featured poster" onClick={goToNextHero}>›</button>
          </>
        )}

        {!detailItem && !analyticsOpen && !settingsOpen && <WatermarkOverlay surface="hero" theme={darkMode ? 'cinematic' : 'light'} viewport={isDesktopViewport ? 'desktop' : 'mobile'} avoid={['cta', 'title']} />}
      </section>}
      {browseMode === 'phase' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 16px 12px' }}>
          <button
            className="fpill"
            onClick={() => setBrowseMode('home')}
            style={{ minHeight: 42, padding: '0 18px', fontSize: 13 }}
          >
            <ChevDown size={14}/> Back to Home Carousel
          </button>
        </div>
      )}

      {browseMode === 'search' && (
        <section className="search-page-shell" style={{ maxWidth: 1480, margin: '8px auto 14px', padding: '0 16px' }}>
          <div className="search-page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: T.textMuted }}>{tUniverse('S.H.I.E.L.D. Intel Search')}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{tUniverse('Locate any Marvel story node')}</div>
            </div>
            <button className="fpill" onClick={() => setBrowseMode('home')}><ChevDown size={14}/> {tUniverse('Back to Home')}</button>
          </div>
          <div className="search-page-panel" style={{ border: `1px solid ${T.filterBorder}`, borderRadius: 18, padding: 14, background: 'color-mix(in srgb, var(--theme-surface) 84%, transparent)', boxShadow: '0 10px 30px color-mix(in srgb, #000 16%, transparent)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} aria-label="Search library" style={{ width: '100%', background: 'color-mix(in srgb, var(--theme-surface) 78%, transparent)', border: `1px solid ${T.inputBorder}`, borderRadius: 14, padding: '12px 14px 12px 38px', color: T.inputColor, fontSize: 15, fontWeight: 650, transition: 'border-color 180ms ease, box-shadow 180ms ease' }} />
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <div style={{ color: T.textMuted, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>Search in</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  ['title', 'Name'],
                  ['description', 'Description'],
                  ['director', 'Director'],
                  ['actors', 'Actors'],
                  ['prerequisites', 'Prerequisites'],
                  ['metadata', 'Phase/Status/Type'],
                ].map(([key, label]) => {
                  const active = Boolean(searchScope[key]);
                  return (
                    <button
                      key={key}
                      className="fpill"
                      onClick={() => setSearchScope(prev => ({ ...prev, [key]: key === 'title' ? true : !prev[key] }))}
                      style={{
                        minHeight: 34,
                        padding: '0 12px',
                        borderRadius: 999,
                        border: `1px solid ${active ? 'color-mix(in srgb, var(--theme-accent) 62%, var(--theme-border))' : T.filterBorder}`,
                        background: active ? 'color-mix(in srgb, var(--theme-accent) 22%, transparent)' : 'transparent',
                        color: active ? 'var(--theme-text)' : T.textMuted,
                        transform: active ? 'translateY(-1px)' : 'none',
                        transition: 'all 180ms ease',
                      }}
                      aria-pressed={active}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ color: T.textMuted, fontSize: 12, letterSpacing: 0.4 }}>{search ? `${filtered.length} matches` : tUniverse('Type to begin searching')}</div>
              {search && <button className="fpill" onClick={() => setSearch('')}><Trash2 size={12}/> {tUniverse('Clear Search')}</button>}
            </div>
          </div>
        </section>
      )}

      {/* ━━ FILTER BAR (collapsible) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {browseMode !== 'search' && <div style={{ background: 'transparent', borderBottom: 'none', flexShrink: 0, position: 'relative', zIndex: 60, marginTop: 16 }}>
        {/* Toggle row — always visible */}
        <div style={{ maxWidth: 1480, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', flexWrap: 'wrap' }}>
            <button className="filters-trigger"
              onClick={() => setFiltersOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: `1px solid ${filtersOpen ? 'color-mix(in srgb, var(--theme-accent) 50%, var(--theme-border))' : T.filterBorder}`, background: 'transparent', color: filtersOpen ? 'var(--theme-accent)' : T.textMuted, cursor: 'pointer', fontFamily: 'var(--font-marvel-ui)', fontSize: 13, letterSpacing: 2, transition: 'all 0.18s' }}
            >
              <SlidersH size={13} />
              {filterTriggerLabel}
              {activeFilterCount > 0 && (
                <span className="filters-count-badge" aria-label={`${activeFilterCount} active filters`}>{activeFilterCount}</span>
              )}
              <ChevDown size={11} style={{ opacity: 0.7, transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            <div ref={sortMenuRef} style={{ position: 'relative' }}>
              <button className="filters-trigger" onClick={() => setSortMenuOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, border: `1px solid ${sortBy === 'order' ? 'color-mix(in srgb, var(--theme-accent) 50%, var(--theme-border))' : T.filterBorder}`, background: 'transparent', color: sortBy === 'order' ? 'var(--theme-accent)' : T.text, cursor: 'pointer', fontFamily: 'var(--font-marvel-ui)', fontSize: 13, letterSpacing: 1.3 }}><ArrowUpDown size={13} />Sort: {SORT_LABELS[sortBy]}<ChevDown size={11} style={{ transform: sortMenuOpen ? 'rotate(180deg)' : 'none' }}/></button>
              {sortMenuOpen && <div className="dropdown-pop filter-dropdown redesigned-sort-menu" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 1450, minWidth: 240 }}>
                {Object.entries(SORT_LABELS).map(([key, label]) => (
                  <button key={key} className={`sopt ${sortBy === key ? 'picked' : ''}`} onClick={() => { setSortBy(key); setSortMenuOpen(false); }} style={{ width: '100%', textAlign: 'left' }}>
                    {label}
                  </button>
                ))}
              </div>}
            </div>
            <div ref={timelineRef} style={{ position: 'relative' }}>
              <button className="filters-trigger" onClick={() => setTimelineOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, border: `1px solid color-mix(in srgb, var(--theme-accent) 42%, var(--theme-border))`, background: 'linear-gradient(135deg, color-mix(in srgb, #ed1d24 22%, var(--theme-surface)) 0%, color-mix(in srgb, #0063e5 18%, var(--theme-surface)) 100%)', color: 'var(--theme-text)', cursor: 'pointer', fontFamily: 'var(--font-marvel-ui)', fontSize: 13, letterSpacing: 1.2, boxShadow: '0 10px 20px rgba(0,0,0,.18)' }}>
                <Layers size={13} /> {TIMELINE_MODES.find(m => m.id === timelineMode)?.label || 'Timeline'} <ChevDown size={11} style={{ transform: timelineOpen ? 'rotate(180deg)' : 'none' }}/>
              </button>
              {timelineOpen && (
                <div className="dropdown-pop filter-dropdown redesigned-sort-menu" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 1450, minWidth: 300 }}>
                  {TIMELINE_MODES.map(mode => (
                    <button key={mode.id} className={`sopt ${timelineMode === mode.id ? 'picked' : ''}`} style={{ width: '100%', textAlign: 'left', marginBottom: 4, borderRadius: 10, border: timelineMode === mode.id ? '1px solid color-mix(in srgb, var(--theme-accent) 60%, transparent)' : '1px solid transparent' }} onClick={() => { setTimelineMode(mode.id); setTimelineOpen(false); }}>
                      <div style={{ fontWeight: 700 }}>{mode.label}</div><div style={{ fontSize: 11, opacity: 0.8 }}>{mode.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {renderPhaseSelector()}
            {activeFilterCount > 0 && (
              <button className="fpill" style={{ color: 'var(--theme-danger)', borderColor: 'var(--theme-danger-soft)', background: 'var(--theme-danger-soft)', padding: '7px 12px' }}
                onClick={() => { setSearch(''); setEssOnly(false); setTypeFilter(null); setStatusFilter(null); setWatchedOnly(false); setAutoHideStatuses(false); setSortBy('order'); setActivePhase(0); setReleaseFilter('all'); }}>
                <Trash2 size={10} /> Clear
              </button>
            )}
            <button className="glass-grad quick-continue-btn" onClick={() => nextUnwatched && openDetail(nextUnwatched)} style={{ border: `1px solid ${T.filterBorder}`, borderRadius: 999, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, maxWidth: 380, background: 'color-mix(in srgb, var(--theme-surface) 70%, transparent)', backdropFilter: 'blur(12px) saturate(130%)', WebkitBackdropFilter: 'blur(12px) saturate(130%)', cursor: nextUnwatched ? 'pointer' : 'default' }}>
              <span style={{ fontSize: 10, letterSpacing: 1.6, color: T.textMuted, textTransform: 'uppercase' }}>Continue</span>
              <span style={{ fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextUnwatched ? nextUnwatched.title : 'All caught up'}</span>
            </button>
            <button className="filters-trigger" onClick={openSearchMode} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, border: `1px solid ${T.filterBorder}`, background: 'transparent', color: T.text, cursor: 'pointer', fontFamily: 'var(--font-marvel-ui)', fontSize: 13, letterSpacing: 1.3 }}>
              <Search size={13} />
              Search Library
            </button>
            <div className='filter-row-actions' style={{ marginLeft: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start', minWidth: 0 }} />
          </div>
        </div>

        {/* Collapsible filter controls */}
        {filtersOpen && (
          <div className="filters-open" style={{ padding: '0 48px 12px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', overflow: 'visible' }}>
              {/* Type pills */}
              {['film', 'series', 'short'].map(t => {
                const m = getSafeTypeMeta(t);
                const on = typeFilter === t;
                return (
                  <button key={t} className="fpill filter-pill type-pill"
                    aria-pressed={on}
                    style={on ? { borderColor: m.color + '88', background: m.color + '14', color: m.color } : {}}
                    onClick={() => setTypeFilter(on ? null : t)}>
                    {on ? <Check size={10} /> : <m.Icon size={10} />}{m.label}
                  </button>
                );
              })}
              {(listMode === 'core' || listMode === 'extended') && (
                <button className="fpill"
                  aria-pressed={essentialOnly}
                  style={essentialOnly ? { borderColor: 'color-mix(in srgb, var(--theme-warning) 50%, transparent)', background: 'var(--theme-warning-soft)', color: 'var(--theme-warning)' } : {}}
                  onClick={() => setEssOnly(o => !o)}>
                  {essentialOnly ? <Check size={10} /> : <Star size={10} />}Must-Watch
                </button>
              )}
              <button className="fpill"
                aria-pressed={showAllFiltersOverride}
                style={showAllFiltersOverride ? { borderColor: 'var(--theme-accent)', background: 'color-mix(in srgb, var(--theme-accent) 14%, var(--theme-surface))', color: 'var(--theme-accent)' } : {}}
                onClick={() => setShowAllFiltersOverride(v => !v)}>
                {showAllFiltersOverride ? <Check size={10} /> : <Eye size={10} />}Show All
              </button>
              {/* Status filter */}
              <div style={{ position: 'relative' }}>
                <button className="fpill"
                  aria-pressed={Boolean(watchedOnly || statusFilter)}
                  style={watchedOnly || statusFilter ? { borderColor: 'color-mix(in srgb, var(--theme-success) 50%, transparent)', background: 'var(--theme-success-soft)', color: 'var(--theme-success)' } : {}}
                  onClick={() => setFilterStatusOpen(v => !v)}
                  >
                  <Check size={10} />Status
                </button>
                {filterStatusOpen && (
                  <div className="dropdown-pop filter-dropdown" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 1400, minWidth: 220 }}
                    >
                    <div className={`sopt ${!statusFilter && !watchedOnly ? 'picked' : ''}`} onClick={() => { setStatusFilter(null); setWatchedOnly(false); setFilterStatusOpen(false); }}>Show all status</div>
                    <div className={`sopt ${watchedOnly ? 'picked' : ''}`} onClick={() => { setWatchedOnly(true); setStatusFilter(null); setFilterStatusOpen(false); }}>Watched only</div>
                    <div className={`sopt ${statusFilter === 'watching' ? 'picked' : ''}`} onClick={() => { setStatusFilter('watching'); setWatchedOnly(false); setFilterStatusOpen(false); }}>Watching</div>
                    <div className={`sopt ${statusFilter === 'plan-to-watch' ? 'picked' : ''}`} onClick={() => { setStatusFilter('plan-to-watch'); setWatchedOnly(false); setFilterStatusOpen(false); }}>Plan to Watch</div>
                    <div className={`sopt ${statusFilter === 'dropped' ? 'picked' : ''}`} onClick={() => { setStatusFilter('dropped'); setWatchedOnly(false); setAutoHideStatuses(false); setFilterStatusOpen(false); }}>Dropped</div>
                    
                  </div>
                )}
              </div>
              {/* Bulk actions */}
              <button className="fpill"
                aria-pressed={bulkSelectMode}
                style={bulkSelectMode ? { borderColor: 'var(--theme-accent)', background: 'color-mix(in srgb, var(--theme-accent) 12%, var(--theme-surface))', color: 'var(--theme-accent)' } : {}}
                onClick={() => { setBulkSelectMode(v => !v); clearBulkSelection(); }}>
                <Check size={10} />{bulkSelectMode ? `Selecting ${selectedIds.size}` : 'Select'}
              </button>
              {bulkSelectMode && (
                <>
                  <button className="fpill" onClick={() => setSelectedIds(new Set(filtered.map(i => i.id)))} style={{ padding: '7px 12px' }}>Select visible</button>
                  <button className="fpill" disabled={!selectedIds.size} onClick={() => applyBulkStatus('watched')} style={{ padding: '7px 12px', opacity: selectedIds.size ? 1 : 0.5 }}><Check size={10}/>Watched</button>
                  <button className="fpill" disabled={!selectedIds.size} onClick={() => applyBulkStatus('plan-to-watch')} style={{ padding: '7px 12px', opacity: selectedIds.size ? 1 : 0.5 }}><Clock size={10}/>Plan</button>
                  <button className="fpill" disabled={!selectedIds.size} onClick={() => applyBulkStatus('unwatched')} style={{ padding: '7px 12px', opacity: selectedIds.size ? 1 : 0.5 }}><EyeOff size={10}/>Unwatched</button>
                </>
              )}
              {/* Reset */}
            </div>
          </div>
        )}
      </div>}
      <div className={`floating-controls${fabMinimized ? ' is-minimized' : ''}`} style={detailItem || trailerOpen || analyticsOpen || settingsOpen || sidebarOpen ? { opacity: 0, pointerEvents: 'none', visibility: 'hidden' } : undefined}>
        <button
          type="button"
          className="fab-primary"
          onClick={() => setFabMenuOpen(v => !v)}
          style={{
            borderColor: fabMenuOpen ? 'var(--theme-accent)' : 'color-mix(in srgb,var(--theme-accent) 28%, var(--theme-border))',
            background: fabMenuOpen ? 'color-mix(in srgb,var(--theme-accent) 16%, var(--theme-surface))' : 'color-mix(in srgb,var(--theme-surface) 86%, transparent)',
            boxShadow: '0 16px 34px rgba(0,0,0,.30)',
          }}
        >
          <Zap size={14} /> <span className="fab-primary-label">Quick Actions</span> <ChevDown size={12} style={{ transform: fabMenuOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {/* ━━ JUMP NEXT BUTTON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="bottom-action-dock" style={{ display: fabMenuOpen ? 'flex' : 'none' }}>
        <button type="button" onClick={handleMetadataBuildClick} className="dock-btn"
          style={{ borderColor: metadataBuild.status === 'running' ? 'var(--theme-warning)' : T.surfaceBorder }}>
          {metadataBuild.status === 'running' ? `Fetch ${metadataBuild.done}/${metadataBuild.total}` : 'Fetch'}
        </button>
        <button type="button" className="dock-btn"
          onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
          style={{ background: 'color-mix(in srgb, var(--theme-accent) 16%, var(--control-solid-bg))' }}>
          View: {viewMode === 'list' ? 'List' : 'Calendar'}
        </button>
        <button type="button" className="dock-btn"
          onClick={() => { const next = listMode === 'core' ? 'extended' : 'core'; setListMode(next); setExpandedItem(null); setExpandedPhase(null); }}
          style={{ background: 'color-mix(in srgb, var(--theme-accent-alt) 16%, var(--control-solid-bg))' }}>
          Mode: {listMode === 'core' ? (universe === 'dc' ? 'DC Core' : 'MCU Core') : 'Extended'}
        </button>
        <div className="dock-status-menu" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setDockStatusOpen(v => !v)}
            aria-label="Open quick status filters"
            className="bottom-action-bar"
            style={{ border: `1px solid ${T.surfaceBorder}`, background: 'var(--control-solid-bg)', color: 'var(--theme-text)', boxShadow: 'none', fontFamily: 'var(--font-marvel-ui)', letterSpacing: 1.2, fontSize: 12, fontWeight: 700 }}
          >
            Status Menu <ChevDown size={12} style={{ transform: dockStatusOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {dockStatusOpen && (
            <div className="dropdown-pop-up dock-status-dropdown" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, minWidth: 220, zIndex: 1400, color: 'var(--theme-text)' }}>
              <div className="dock-status-head">Quick status filter</div>
              <div className="dock-status-grid">
                {[
                  { key: 'all', label: 'All Statuses', Icon: Layers, active: !statusFilter && !watchedOnly, onClick: () => { setStatusFilter(null); setWatchedOnly(false); setAutoHideStatuses(false); setDockStatusOpen(false); } },
                  { key: 'watched', label: 'Watched', Icon: Check, active: watchedOnly, onClick: () => { setWatchedOnly(true); setStatusFilter(null); setAutoHideStatuses(false); setDockStatusOpen(false); } },
                  { key: 'watching', label: 'Watching', Icon: PlayCircle, active: statusFilter === 'watching', onClick: () => { setStatusFilter('watching'); setWatchedOnly(false); setDockStatusOpen(false); } },
                  { key: 'on-hold', label: 'On Hold', Icon: PauseCircle, active: statusFilter === 'on-hold', onClick: () => { setStatusFilter('on-hold'); setWatchedOnly(false); setDockStatusOpen(false); } },
                  { key: 'dropped', label: 'Dropped', Icon: XCircle, active: statusFilter === 'dropped', onClick: () => { setStatusFilter('dropped'); setWatchedOnly(false); setDockStatusOpen(false); } },
                  { key: 'plan-to-watch', label: 'Plan to Watch', Icon: Clock, active: statusFilter === 'plan-to-watch', onClick: () => { setStatusFilter('plan-to-watch'); setWatchedOnly(false); setDockStatusOpen(false); } },
                ].map(opt => (
                  <button key={opt.key} type="button" className={`dock-status-item ${opt.active ? 'active' : ''}`} onClick={opt.onClick} aria-pressed={opt.active}>
                    <opt.Icon size={14} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
        <button
          type="button"
          className="go-top-fab"
          onClick={scrollToListTop}
          aria-label="Go to top"
          style={(detailItem || trailerOpen || analyticsOpen || settingsOpen || sidebarOpen || scrollCheckpoint <= 420) ? { opacity: 0, pointerEvents: 'none', transform: 'translateY(8px)' } : undefined}
        >
          <ChevDown size={14} style={{ transform: 'rotate(180deg)' }} /> Top
        </button>

      {/* ━━ CONTENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <main ref={mainRef} className={`app-scroll-shell${performanceMode ? ' scroll-performance' : ''}`} style={{ overflow: overlayActive ? 'hidden' : 'visible', touchAction: overlayActive ? 'none' : 'pan-y', pointerEvents: blockHomeInteractions ? 'none' : 'auto', flex: '1 1 auto', '--content-max': '95vw', '--content-pad': '20px', '--sticky-offset': headerCompact ? '44px' : '72px' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '28px 18px 96px 18px', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 'calc(100% - 400px)' }} className="list-mode-switch">
          {browseMode !== 'search' && phaseKeys.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'var(--font-marvel-ui)', fontSize: 19, color: T.textMuted, letterSpacing: 4 }}>
              NO RESULTS — ADJUST YOUR FILTERS
            </div>
          )}
          {browseMode === 'search' ? (
            search.trim() ? (
              <section data-motion="section" className='curvy-panel motion-section motion-pop' style={{ border: `1px solid ${T.surfaceBorder}`, background: 'transparent', borderRadius: 14, padding: 12 }}>
                <div className="list-panel" style={{ overflow: 'hidden' }}>
                  <PhaseRows
                    rows={filtered}
                    renderRow={(item, idx) => {
                      const itemReleaseStatus = releaseStatusFor(item);
                      const itemReleaseInfo = releaseInfoFor(item);
                      return (
                        <MemoizedTitleRow
                          key={item.id}
                          item={item}
                          idx={idx}
                          ph={currentPhases.find(p => p.id === item.phase) || currentPhases[0]}
                          T={T}
                          typeMeta={getSafeTypeMeta(item.type)}
                          statusMeta={getSafeStatusMeta(item.status)}
                          releaseStatus={itemReleaseStatus}
                          releaseStatusText={releaseStatusLabel(itemReleaseStatus)}
                          releaseStatusStyleObj={releaseStatusStyle(itemReleaseStatus)}
                          releaseLabel={formatReleaseDate(itemReleaseInfo.date, item.year, itemReleaseInfo.label, itemReleaseStatus)}
                          poster={posterSrc(item)}
                          genres={inferGenres(item)}
                          isExpanded={expandedItem === item.id}
                          isWatched={item.status === 'watched'}
                          isBookmarked={Boolean(bookmarks[item.id])}
                          statusDropdown={statusDropdown}
                          rating={metaCache[item.id]?.rating || RELEASE_INFO[item.title]?.rating}
                          onOpenDetail={openDetail}
                          onSetStatus={setStatusDirect}
                          onToggleBookmark={toggleBookmark}
                          onOpenStatus={openStatusDropdown}
                          bulkSelectMode={bulkSelectMode}
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelected={toggleSelected}
                          isDesktopViewport={isDesktopViewport}
                        />
                      );
                    }}
                  />
                </div>
              </section>
            ) : (
              <div style={{ textAlign: 'center', padding: '84px 0', fontFamily: 'var(--font-marvel-ui)', fontSize: 17, color: T.textMuted, letterSpacing: 2 }}>
                Start typing to search across your full list.
              </div>
            )
          ) : viewMode === 'calendar' ? (
            <section data-motion="section" className='curvy-panel calendar-section motion-section motion-pop' style={{ border: `1px solid ${T.surfaceBorder}`, background: 'transparent', borderRadius: 14, padding: 16 }}>
              <h3 style={{ margin: '4px 0 14px', letterSpacing: 2, fontFamily: 'var(--font-marvel-ui)', color: 'var(--theme-text-primary)', textShadow: '0 1px 4px color-mix(in srgb, var(--theme-bg) 45%, transparent)' }}>Release Calendar</h3>
              <div style={{ marginBottom: 12, color: T.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Grouped by month / quarter / year</div>
              {Object.entries(calendarItems.grouped).map(([group, entries]) => (
                <div key={group}>
                  <div className="calendar-group-header">{group}</div>
                  {entries.map(({ item, rawDate, label, releaseStatus, hasRealDate }) => (
                    <div key={`${group}-${item.id}`} className='rrow calendar-row' style={{ gridTemplateColumns: '108px 52px minmax(0,1fr)', background: 'transparent' }}>
                      <div style={{ fontSize: 11, color: releaseStatus === 'upcoming' ? 'var(--theme-warning)' : T.textMuted }}>{formatReleaseDate(rawDate, item.year, label, releaseStatus)}</div>
                      <LazyPoster className="poster" src={posterSrc(item)} alt={item.title} />
                      <button className='title-btn' onClick={() => openDetail(item)} style={{ textAlign: 'left', textShadow: '0 1px 2px color-mix(in srgb, var(--theme-bg) 35%, transparent)' }}>
                        {item.title}
                        <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span>Phase {item.phase} · {getSafeTypeMeta(item.type).label}</span>
                          <span className={`calendar-badge ${releaseStatus}`}>{releaseStatus}</span>
                          <span className="calendar-badge certainty">{hasRealDate ? 'Exact Date' : getReleaseCertainty({ hasRealDate, releaseStatus })}</span>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ) : showPhaseSystem ? phaseKeys.map(pid => {
            const ph = currentPhases.find(p => p.id === pid);
            const rows = grouped[pid];
            const done = rows.filter(r => r.status === 'watched').length;
            const phasePct = rows.length ? Math.round((done / rows.length) * 100) : 0;
            const isCelebrating = celebPhase === pid;
            const summaryOpen = expandedPhase === pid;

            return (
              <section key={pid} className="section-up motion-section" data-motion="section" data-phase={pid}
                ref={el => { phaseRefs.current[pid] = el; }}
                style={{ marginBottom: 36, scrollMarginTop: 'var(--sticky-offset)', position: 'relative' }}>
                {isCelebrating && (
                  <div className="phase-flash" style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${ph.color}40, ${ph.color}22)`, boxShadow: `0 0 10px ${ph.glow}`, borderRadius: 12, pointerEvents: 'none', zIndex: 5 }} />
                )}

                {/* Phase divider */}
                <div className="curvy-panel phase-header-card motion-pop" style={{ '--phase-color': ph.color, border: `1px solid ${T.surfaceBorder}` }}>
                  <WatermarkOverlay surface="card" theme={darkMode ? 'dark' : 'light'} viewport={isDesktopViewport ? 'desktop' : 'mobile'} avoid={['title', 'progress']} />
                  <div className="phase-title-wrap">
                    <div className="phase-title" style={{ color: ph.color }}>
                      {ph.name}
                    </div>
                    <div className="phase-tagline" style={{ color: T.textMuted }}>
                      {ph.tagline === 'Assembling the Avengers' ? <>ASSEMBLING<br />THE AVENGERS</> : ph.tagline}
                    </div>
                  </div>
                  <span className="phase-progress-chip" style={{ color: phasePct === 100 ? ph.color : T.textMuted, border: `1px solid ${T.surfaceBorder}` }}>
                    {done}/{rows.length}
                  </span>
                  <button onClick={() => setExpandedPhase(summaryOpen ? null : pid)}
                    aria-label={summaryOpen ? 'Hide phase summary' : 'Show phase summary'}
                    style={{ background: 'none', border: `1px solid ${summaryOpen ? ph.color + '66' : T.surfaceBorder}`, color: summaryOpen ? ph.color : T.textMuted, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--font-marvel-ui)', letterSpacing: 2.2, textTransform: 'uppercase', transition: 'all 0.18s' }}>
                    <Info size={11} />INFO
                  </button>
                  {done < rows.length ? (
                    <button onClick={() => markPhaseWatched(pid, 'watched')}
                      style={{ fontFamily: 'var(--font-marvel-ui)', fontSize: 10, letterSpacing: 1.5, color: ph.color, background: 'transparent', border: `1px solid ${ph.color}44`, borderRadius: 6, padding: '4px 9px', cursor: 'pointer', flexShrink: 0, transition: 'all 0.16s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = ph.color + '16'; e.currentTarget.style.borderColor = ph.color + '88'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = ph.color + '44'; }}>
                      MARK ALL
                    </button>
                  ) : (
                    <button onClick={() => markPhaseWatched(pid, 'unwatched')}
                      style={{ fontFamily: 'var(--font-marvel-ui)', fontSize: 10, letterSpacing: 1.5, color: T.textMuted, background: 'transparent', border: `1px solid ${T.surfaceBorder}`, borderRadius: 6, padding: '4px 9px', cursor: 'pointer', flexShrink: 0, transition: 'all 0.16s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.rowHoverBg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      CLEAR
                    </button>
                  )}
                </div>

                {summaryOpen && (
                  <div className="fade-in curvy-panel" style={{ '--phase-color': ph.color, background: `color-mix(in srgb, ${T.phaseSummaryBg} 72%, transparent)`, border: `1px solid ${T.phaseSummaryBorder}`, borderRadius: 12, padding: '12px 14px 12px 18px', marginBottom: 10, fontSize: 14, color: T.textMuted, lineHeight: 1.6, fontFamily: 'var(--font-marvel-display)', letterSpacing: 0.2 }}>
                    {ph.summary}
                  </div>
                )}

                {/* Row table */}
                <div className="list-panel" style={{ overflow: 'hidden' }}>
                  <PhaseRows rows={rows} renderRow={(item, idx) => {
                    const itemReleaseStatus = releaseStatusFor(item);
                    const itemReleaseInfo = releaseInfoFor(item);
                    return (
                      <MemoizedTitleRow
                        key={item.id}
                        item={item}
                        idx={idx}
                        ph={ph}
                        T={T}
                        typeMeta={getSafeTypeMeta(item.type)}
                        statusMeta={getSafeStatusMeta(item.status)}
                        releaseStatus={itemReleaseStatus}
                        releaseStatusText={releaseStatusLabel(itemReleaseStatus)}
                        releaseStatusStyleObj={releaseStatusStyle(itemReleaseStatus)}
                        releaseLabel={formatReleaseDate(itemReleaseInfo.date, item.year, itemReleaseInfo.label, itemReleaseStatus)}
                        poster={posterSrc(item)}
                        genres={inferGenres(item)}
                        isExpanded={expandedItem === item.id}
                        isWatched={item.status === 'watched'}
                        isBookmarked={Boolean(bookmarks[item.id])}
                        statusDropdown={statusDropdown}
                        rating={metaCache[item.id]?.rating || RELEASE_INFO[item.title]?.rating}
                        onOpenDetail={openDetail}
                        onSetStatus={setStatusDirect}
                        onToggleBookmark={toggleBookmark}
                        onOpenStatus={openStatusDropdown}
                        bulkSelectMode={bulkSelectMode}
                        isSelected={selectedIds.has(item.id)}
                        onToggleSelected={toggleSelected}
                        isDesktopViewport={isDesktopViewport}
                      />
                    );
                  }}/>

                </div>
              </section>
            );
          }) : (
            <section data-motion="section" className='curvy-panel motion-section motion-pop' style={{ border: `1px solid ${T.surfaceBorder}`, background: 'transparent', borderRadius: 14, padding: 12 }}>
              <div className="list-panel" style={{ overflow: 'hidden' }}>
                <PhaseRows rows={filtered} renderRow={(item, idx) => {
                  const itemReleaseStatus = releaseStatusFor(item);
                  const itemReleaseInfo = releaseInfoFor(item);
                  const ph = currentPhases.find(p => p.id === item.phase) || currentPhases[0];
                  return (
                    <MemoizedTitleRow
                      key={item.id}
                      item={item}
                      idx={idx}
                      ph={ph}
                      T={T}
                      typeMeta={getSafeTypeMeta(item.type)}
                      statusMeta={getSafeStatusMeta(item.status)}
                      releaseStatus={itemReleaseStatus}
                      releaseStatusText={releaseStatusLabel(itemReleaseStatus)}
                      releaseStatusStyleObj={releaseStatusStyle(itemReleaseStatus)}
                      releaseLabel={formatReleaseDate(itemReleaseInfo.date, item.year, itemReleaseInfo.label, itemReleaseStatus)}
                      poster={posterSrc(item)}
                      genres={inferGenres(item)}
                      isExpanded={expandedItem === item.id}
                      isWatched={item.status === 'watched'}
                      isBookmarked={Boolean(bookmarks[item.id])}
                      statusDropdown={statusDropdown}
                      rating={metaCache[item.id]?.rating || RELEASE_INFO[item.title]?.rating}
                      onOpenDetail={openDetail}
                      onSetStatus={setStatusDirect}
                      onToggleBookmark={toggleBookmark}
                      onOpenStatus={openStatusDropdown}
                      bulkSelectMode={bulkSelectMode}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelected={toggleSelected}
                      isDesktopViewport={isDesktopViewport}
                    />
                  );
                }} />
              </div>
            </section>
          )}

          <div data-motion="section" className="motion-section motion-pop" style={{ textAlign: 'center', marginTop: 44, fontFamily: 'var(--font-marvel-ui)', fontSize: 11, color: 'var(--theme-text-muted)', letterSpacing: 2.2, fontWeight: 700 }}>
            Made with ♥️ by {tUniverse('Marvel Fan')}
          </div>
        </div>
      </main>

      {/* ━━ DETAIL MODAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {detailItem && (
        <div className="detail-backdrop" onClick={() => setDetailItem(null)} role="dialog" aria-label="Movie details">
          <div className="detail-card glass-panel detail-export-shell" onClick={(e) => e.stopPropagation()} style={{ border: '1px solid color-mix(in srgb, var(--theme-accent) 24%, var(--theme-border))' }}>
            <div className="detail-export-grid">
              <div className="detail-poster-frame">
                {detailPosterFailed ? (
                  <div className="detail-fallback-poster" style={{ width: '100%', height: '100%' }}>
                    <span>{detailItem.title}</span>
                  </div>
                ) : (
                  <img src={detailData?.Poster && detailData.Poster !== 'N/A' ? detailData.Poster : posterSrc(detailItem)} onError={() => setDetailPosterFailed(true)} alt={`${detailItem.title} poster`} onClick={() => { if (selectedTrailer?.youtubeId) openTrailerPlayer(); }} style={{ cursor: selectedTrailer?.youtubeId ? 'pointer' : 'default' }} />
                )}
              
                {!!selectedTrailer?.youtubeId && (
                  <button className="fpill" style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 3, background: 'color-mix(in srgb, #ed1d24 22%, var(--theme-surface))', borderColor: 'color-mix(in srgb, #ed1d24 52%, var(--theme-border))' }} onClick={openTrailerPlayer}><PlayCircle size={13}/>Play Media</button>
                )}
</div>

              <div className="detail-export-content">
                <div className="detail-sticky-actions">
                  <button className="fpill glass-panel detail-btn detail-close-sticky" onClick={() => setDetailItem(null)}><X size={14}/>Close</button>
                </div>
                <div className="detail-export-kicker">MCU DETAILS CARD</div>
                <h2 className="detail-export-title">{detailItem.title}</h2>
                <div className="detail-export-meta">
                  <span>Phase {detailItem.phase}</span>
                  <span>{getSafeTypeMeta(detailItem.type).label}</span>
                  {(detailData?.imdbRating && detailData.imdbRating !== 'N/A') && <span>★ {detailData.imdbRating}/10</span>}
                </div>
                <div className="detail-export-actions-inline">
                  {hasTrailerOption && (
                    <button className="fpill glass-panel detail-btn" onClick={() => { setTrailerVariantIndex(trailerOptionIndex); openTrailerPlayer(); }}><PlayCircle size={12}/>Trailer</button>
                  )}
                  {hasTeaserOption && (
                    <button className="fpill glass-panel detail-btn" onClick={() => { setTrailerVariantIndex(teaserOptionIndex); openTrailerPlayer(); }}><PlayCircle size={12}/>Teaser</button>
                  )}
                  {!hasTrailerOption && !hasTeaserOption && !!selectedTrailer?.youtubeId && (
                    <button className="fpill glass-panel detail-btn" onClick={openTrailerPlayer}><PlayCircle size={12}/>Watch Media</button>
                  )}
                  <button className="fpill glass-panel detail-btn" onClick={() => openImdbForItem(detailItem, detailData)}><Info size={12}/>Open IMDb</button>
                  <button className="fpill glass-panel detail-btn" onClick={() => exportPosterForItem(detailItem, { share: true })}><Upload size={12}/>Share Exact Card</button>
                </div>
                {detailLoading && <div className="detail-export-loading">Loading metadata…</div>}
                {!detailLoading && !detailData && <div className="detail-export-loading">Showing local data.</div>}

                <section className="detail-export-panel story">
                  <div className="detail-export-panel-head">
                    <span>STORY BRIEF</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className="fpill glass-panel detail-btn"
                        style={{ padding: '4px 10px', fontSize: 10, borderRadius: 999 }}
                        onClick={async () => {
                          if (detailPlotState.active === 'primary') {
                            if (!detailPlotState.secondary) await fetchSecondaryPlotForDetail();
                            setDetailPlotState(prev => ({ ...prev, active: 'secondary' }));
                          } else {
                            setDetailPlotState(prev => ({ ...prev, active: 'primary' }));
                          }
                        }}
                      >
                        <SwitchIcon size={11} /> {detailPlotState.active === 'primary' ? 'TMDB' : (detailPlotState.loadingSecondary ? 'Loading…' : 'OMDb')}
                      </button>
                      <button
                        className="fpill glass-panel detail-btn"
                        aria-label={spoilerSafe ? 'Disable spoiler safe mode' : 'Enable spoiler safe mode'}
                        title={spoilerSafe ? 'Spoiler Safe: On' : 'Spoiler Safe: Off'}
                        onClick={() => setSpoilerSafeMode(v => !v)}
                        style={{
                          width: 32,
                          height: 32,
                          minWidth: 32,
                          padding: 0,
                          borderRadius: 999,
                          justifyContent: 'center',
                          background: spoilerSafe ? 'var(--theme-warning-soft)' : 'var(--control-solid-bg)',
                          borderColor: spoilerSafe ? 'var(--theme-warning)' : 'var(--theme-border)',
                          color: spoilerSafe ? 'var(--theme-warning)' : 'var(--theme-text-muted)',
                          transition: 'all 180ms var(--ease-out)',
                        }}
                      >
                        <EyeOff size={12} />
                      </button>
                    </div>
                  </div>
                  <p style={{ filter: spoilerSafe ? 'blur(5px)' : 'none', transition: 'filter 0.18s ease' }}>
                    {detailPlotState.active === 'secondary'
                      ? (detailPlotState.secondary || detailItem.desc)
                      : (detailPlotState.primary || detailData?.Plot || detailItem.desc)}
                  </p>
                </section>

                <section className="detail-export-panel intel">
                  <div className="detail-export-panel-head"><span>WATCH INTEL + AFTER-CREDITS NAVIGATOR</span></div>
                  <div className="detail-intel-list">
                    <div><strong>Release</strong><span>{formatReleaseDate(releaseInfoFor(detailItem).date, detailItem.year, releaseInfoFor(detailItem).label, releaseStatusFor(detailItem))}</span></div>
                    <div><strong>Prerequisite</strong><span>{detailItem.prereq}</span></div>
                    <div><strong>Status</strong><span>{getSafeStatusMeta(detailItem.status).label}</span></div>
                    <div><strong>Post-credit scenes</strong><span>{getAfterCreditsMeta(detailItem).count ?? 'Unknown'}</span></div>
                    <div><strong>Watch now?</strong><span>{getAfterCreditsMeta(detailItem).advice === 'must' ? 'Must watch now' : (getAfterCreditsMeta(detailItem).advice === 'can-skip' ? 'Can skip now' : 'Check later')}</span></div>
                    <div><strong>Connects to</strong><span>{getAfterCreditsMeta(detailItem).connectsTo.length ? getAfterCreditsMeta(detailItem).connectsTo.join(', ') : 'No explicit setup tracked'}</span></div>
                    <div><strong>Director</strong><span>{detailData?.Director && detailData.Director !== 'N/A' ? detailData.Director : (DIRECTOR_DATA[detailItem.title] || 'Director data coming soon')}</span></div>
                    <div><strong>Cast</strong><span>{detailData?.Actors && detailData.Actors !== 'N/A' ? detailData.Actors : (CAST_MAP[detailItem.title] || ['Cast data coming soon']).join(', ')}</span></div>
                  </div>
                </section>
                <section className="detail-export-panel intel post-credit-graph-panel">
                  <div className="detail-export-panel-head"><span>POST-CREDIT DEPENDENCY GRAPH</span></div>
                  <div className="post-credit-graph" role="list" aria-label="Post-credit dependency graph">
                    <article className="post-credit-lane outgoing" role="listitem" aria-label="Outgoing post-credit dependencies">
                      <header>
                        <strong>Outgoing stingers</strong>
                        <small>What this title sets up next</small>
                      </header>
                      <div className="post-credit-flow">
                        <span className="post-credit-node is-current">{detailItem.title}</span>
                        {postCreditForward.length ? postCreditForward.map(node => (
                          <React.Fragment key={`forward-${node}`}>
                            <span className="post-credit-arrow" aria-hidden>→</span>
                            <span className="post-credit-node is-outgoing">{node}</span>
                          </React.Fragment>
                        )) : <span className="post-credit-empty">No outgoing setup tracked.</span>}
                      </div>
                    </article>
                    <article className="post-credit-lane incoming" role="listitem" aria-label="Incoming post-credit dependencies">
                      <header>
                        <strong>Incoming stingers</strong>
                        <small>What sets up this title</small>
                      </header>
                      <div className="post-credit-flow">
                        {postCreditInbound.length ? postCreditInbound.map(node => (
                          <React.Fragment key={`incoming-${node}`}>
                            <span className="post-credit-node is-incoming">{node}</span>
                            <span className="post-credit-arrow" aria-hidden>→</span>
                          </React.Fragment>
                        )) : <span className="post-credit-empty">No incoming setup tracked.</span>}
                        <span className="post-credit-node is-current">{detailItem.title}</span>
                      </div>
                    </article>
                  </div>
                </section>

                <div className="detail-export-actions">
                  <button
                    className={`fpill glass-panel detail-btn ${myLikes[detailItem.id] ? 'is-active' : ''}`}
                    onClick={() => setMyLikes(prev => ({ ...prev, [detailItem.id]: !prev[detailItem.id] }))}
                  >
                    <Heart size={12}/> {myLikes[detailItem.id] ? 'Liked' : 'Like'}
                  </button>
                  <button className="fpill glass-panel detail-btn" onClick={() => exportPosterForItem(detailItem)}><Download size={14}/> Export Details Card</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {trailerOpen && detailItem && selectedTrailer?.youtubeId && (
        <div className="detail-backdrop trailer-backdrop" onClick={closeTrailer} role="dialog" aria-label="Trailer player">
          <div className={`detail-card glass-panel trailer-shell ${trailerExpanded ? 'is-expanded' : ''}`} onClick={(e) => e.stopPropagation()}>
            {!trailerExpanded && <div className="trailer-head">
              <div>
                <div className="trailer-eyebrow">Official media</div>
                <strong className="trailer-title">{detailItem.title}</strong>
                {trailerOptions.length > 1 && (
                  <div className="trailer-variant-switch" role="tablist" aria-label="Trailer type">
                    {trailerOptions.map((option, index) => (
                      <button
                        key={`${option.youtubeId}-${index}`}
                        type="button"
                        role="tab"
                        aria-selected={trailerVariantIndex === index}
                        className={`trailer-variant-chip ${trailerVariantIndex === index ? 'is-active' : ''}`}
                        onClick={() => setTrailerVariantIndex(index)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="trailer-actions">
                <button className="fpill trailer-close" onClick={() => setTrailerExpanded(true)}><PlayCircle size={12}/>Enlarge</button>
                <button className="fpill trailer-close" onClick={closeTrailer}><X size={12}/>Close</button>
              </div>
            </div>}
            <div className="trailer-frame" ref={trailerShellRef}>
              <iframe className="trailer-iframe" title={`${detailItem.title} trailer`} src={trailerEmbedUrl(selectedTrailer.youtubeId)} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
            {trailerRotateHint && <div className="trailer-rotate-toast" role="status" aria-live="polite">{trailerRotateHint}</div>}
            {trailerExpanded && <div className="trailer-expanded-actions">
              {trailerOptions.length > 1 && (
                <div className="trailer-variant-switch trailer-variant-switch-inline" role="tablist" aria-label="Trailer type">
                  {trailerOptions.map((option, index) => (
                    <button
                      key={`${option.youtubeId}-${index}`}
                      type="button"
                      role="tab"
                      aria-selected={trailerVariantIndex === index}
                      className={`trailer-variant-chip ${trailerVariantIndex === index ? 'is-active' : ''}`}
                      onClick={() => setTrailerVariantIndex(index)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              <button className="fpill trailer-close" onClick={handleTrailerBack}><PlayCircle size={12}/>Back</button>
              <button className="fpill trailer-close" onClick={closeTrailer}><X size={12}/>Close</button>
            </div>}
          </div>
        </div>
      )}

      {analyticsOpen && (
        <div className="detail-backdrop analytics-backdrop" onClick={closeAnalytics} role="dialog" aria-label="Analysis history">
          <div className="detail-card glass-panel analytics-shell analytics-shell-redesign" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1080, border: '1px solid color-mix(in srgb, var(--theme-accent) 24%, var(--theme-border))', boxShadow: darkMode ? '0 28px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 18px 44px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.86)' }}>
            <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 30, marginBottom: 4 }}>Analysis</h2>
                <div style={{ color: T.textMuted, fontSize: 13 }}>Concise progress insights: phase counts, watch percentage, and streak.</div>
              </div>
              <button className="fpill" onClick={closeAnalytics}>Close</button>
            </div>
            <div className="ui-btn-group analytics-tabs" style={{ position: 'sticky', top: 0, zIndex: 5, marginBottom: 10, paddingBottom: 8, background: 'var(--surface-overlay)', borderRadius: 14, border: '1px solid var(--border-soft)' }}>
              {[{ id: 'overview', label: 'Overview' }, { id: 'reviews', label: 'Reviews' }, { id: 'export', label: 'Quick Export' }, { id: 'advanced-export', label: 'Advanced Export' }].map(tab => (
                <button key={tab.id} className="fpill" onClick={() => setAnalyticsTab(tab.id)} style={{ borderColor: analyticsTab === tab.id ? 'var(--theme-accent)' : 'var(--theme-border)' }}>{tab.label}</button>
              ))}
            </div>
            {analyticsTab === 'overview' && <section className="analytics-overview">
              <div className={`analytics-metric-grid ${isDesktopViewport ? 'desktop' : 'mobile'}`}>
                <article className="analytics-metric-card is-primary">
                  <div className="analytics-metric-label">TOTAL WATCHED HOURS</div>
                  <div className="analytics-metric-value">{Math.round(totalWatchedHours * 10) / 10}h</div>
                  <div className="analytics-metric-meta">Immersion time across your MCU journey.</div>
                </article>
                <article className="analytics-metric-card">
                  <div className="analytics-metric-label">WATCHED TITLES</div>
                  <div className="analytics-metric-value">{totalWatched}</div>
                  <div className="analytics-metric-meta">Completed movies and shows in your active list.</div>
                </article>
                {isDesktopViewport && <article className="analytics-metric-card">
                  <div className="analytics-metric-label">REWATCH SESSIONS</div>
                  <div className="analytics-metric-value">{Object.values(rewatchCount).reduce((a, b) => a + (Number(b) || 0), 0)}</div>
                  <div className="analytics-metric-meta">Times you revisited watched entries.</div>
                </article>}
              </div>
              <div className="analytics-progress-card">
                <div className="analytics-progress-head">
                  <div className="analytics-progress-title">Phase Completion</div>
                  <div className="analytics-progress-sub">Track completion performance by saga phase.</div>
                </div>
                <div className="analytics-progress-list">
                  {phaseStats.map(stat => {
                    const percent = stat.total ? Math.round((stat.watched / stat.total) * 100) : 0;
                    return (
                      <article key={stat.phase} className="analytics-progress-row">
                        <header>
                          <strong>Phase {stat.phase}</strong>
                          <span>{stat.watched}/{stat.total}</span>
                        </header>
                        <div className="analytics-progress-track" aria-label={`Phase ${stat.phase} completion ${percent}%`} role="img">
                          <div className="analytics-progress-fill" style={{ width: `${percent}%` }} />
                        </div>
                        <footer>{percent}% complete</footer>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>}
            {analyticsTab === 'export' && <section className="export-premium-quick">
              <header>
                <h3>Quick Export</h3>
                <p>Beautiful one-tap cards with modernized export visuals.</p>
              </header>
              <div className="export-quick-grid">
                <button className="fpill ui-touch-btn export-action" onClick={shareAnalysisCard}><Upload size={14}/>Share Analysis Card</button>
                <button className="fpill ui-touch-btn export-action" onClick={shareUnifiedCard}><Upload size={14}/>Share Recap Card</button>
                <button className="fpill ui-touch-btn export-action is-strong" onClick={() => { setAnalyticsTab('advanced-export'); setExportComposerOpen(true); }}><SlidersH size={14}/>Open Advanced Export</button>
              </div>
              <small>Progress + recent history in premium share-ready image cards.</small>
            </section>}
            {analyticsTab === 'advanced-export' && <>
            <div className="glass-panel ui-panel ui-control-row export-card-studio export-card-studio-redesign" style={{ marginBottom: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div className="ui-section-header" style={{ marginBottom: 2 }}>Advanced Export Studio</div>
                  <div style={{ color: T.textMuted, fontSize: 'var(--type-caption)', lineHeight: 'var(--lh-reading)', maxWidth: 'var(--content-measure)' }}>Focused composer for card type, theme identity, typography, analysis sections, and live preview.</div>
                </div>
                <button className="fpill ui-touch-btn" onClick={shareAdvancedExportCard}><Upload size={14}/>Share Selected Card</button>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: 1.4, textTransform: 'uppercase' }}>Card type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                  {[{ id: 'analysis', label: 'Analysis', desc: 'Stats + phases' }, { id: 'review', label: 'Detail', desc: 'Featured title' }, { id: 'unified', label: 'Recap', desc: 'Progress + history' }].map(opt => (
                    <button key={opt.id} className="fpill" onClick={() => setExportSettings(prev => ({ ...prev, type: opt.id }))} style={{ justifyContent: 'center', flexDirection: 'column', gap: 2, minHeight: 54, borderColor: exportSettings.type === opt.id ? 'var(--theme-accent)' : 'var(--theme-border)' }}>
                      <strong style={{ fontSize: 12 }}>{opt.label}</strong>
                      <span style={{ fontSize: 10, color: T.textMuted }}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: 1.4, textTransform: 'uppercase' }}>Theme identity</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                  {EXPORT_THEME_OPTIONS.map(opt => (
                    <button key={opt.id} className="fpill" onClick={() => setExportSettings(prev => ({ ...prev, theme: opt.id }))} style={{ justifyContent: 'center', flexDirection: 'column', gap: 2, minHeight: 50, borderColor: exportSettings.theme === opt.id ? 'var(--theme-accent)' : 'var(--theme-border)' }}>
                      <strong style={{ fontSize: 12 }}>{opt.label}</strong>
                      <span style={{ fontSize: 10, color: T.textMuted }}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: 1.4, textTransform: 'uppercase' }}>Font</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6 }}>
                  {[{ id: 'inter', label: 'Inter' }, { id: 'grotesk', label: 'Grotesk' }, { id: 'manrope', label: 'Manrope' }, { id: 'marvel', label: 'Marvel' }].map(opt => (
                    <button key={opt.id} className="fpill" onClick={() => setExportFont(opt.id)} style={{ justifyContent: 'center', fontFamily: EXPORT_FONT_PREVIEW_FAMILY[opt.id] || EXPORT_FONT_PREVIEW_FAMILY.inter, borderColor: exportFont === opt.id ? 'var(--theme-accent)' : 'var(--theme-border)', fontSize: 11 }}>{opt.label}</button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 11, color: T.textMuted }}>Text size: {Math.round(exportTextScale * 100)}%</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto', gap: 8, alignItems: 'center' }}>
                  <button className='fpill' type='button' onClick={() => setExportTextScale(v => Math.max(0.9, Number((v - 0.02).toFixed(2))))} style={{ minWidth: 36, justifyContent: 'center', padding: '5px 8px' }}>−</button>
                  <input type='range' min={90} max={200} step={2} value={Math.round(exportTextScale * 100)} onChange={(e) => setExportTextScale(Number(e.target.value) / 100)} />
                  <button className='fpill' type='button' onClick={() => setExportTextScale(v => Math.min(2, Number((v + 0.02).toFixed(2))))} style={{ minWidth: 36, justifyContent: 'center', padding: '5px 8px' }}>+</button>
                </div>
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 11, color: T.textMuted }}>Poster atmosphere: {exportSettings.bgOpacity}%</span>
                <input type='range' min={60} max={82} step={1} value={exportSettings.bgOpacity} onChange={(e) => setExportSettings(prev => ({ ...prev, bgOpacity: Number(e.target.value) }))} />
              </label>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: 1.4, textTransform: 'uppercase' }}>Included analysis sections</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 6 }}>
                  {[{ id: 'completion', label: 'Completion %' }, { id: 'phaseBreakdown', label: 'Phase breakdown' }, { id: 'streak', label: 'Streak' }, { id: 'hours', label: 'Total hours' }, { id: 'recentMomentum', label: 'Recent momentum' }, { id: 'topRated', label: 'Top rated' }].map(opt => (
                    <button key={opt.id} className="fpill" onClick={() => setExportSettings(prev => ({ ...prev, sections: { ...prev.sections, [opt.id]: !prev.sections?.[opt.id] } }))} style={{ justifyContent: 'center', borderColor: exportSettings.sections?.[opt.id] !== false ? 'var(--theme-accent)' : 'var(--theme-border)', opacity: exportSettings.type === 'analysis' ? 1 : 0.58 }}>{exportSettings.sections?.[opt.id] !== false ? '✓ ' : ''}{opt.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(0,1fr)', maxHeight: '55vh', overflow: 'auto' }}>
              <div className="glass-panel" style={{ padding: 10, borderRadius: 10 }}>
                {exportPreview.loading ? <div style={{ color: T.textMuted }}>Generating preview…</div> : exportPreview.url ? <img src={exportPreview.url} alt="export preview" style={{ width: '100%', borderRadius: 10 }} /> : <div style={{ color: T.textMuted }}>{exportPreview.error || 'Preview unavailable'}</div>}
              </div>
            </div>
            </>}
            {analyticsTab === 'reviews' && <div style={{ display: 'grid', gap: 12, maxHeight: '58vh', overflow: 'auto', paddingRight: 4 }}>
              {historyItems.length === 0 && <div style={{ color: T.textMuted, padding: 16 }}>No watched history yet. Mark an item watched to start your analysis log.</div>}
              {historyItems.map(item => (
                <div key={item.id} className="glass-panel" style={{ borderRadius: 14, padding: '16px 16px 14px', display: 'grid', gap: 12, border: '1px solid color-mix(in srgb, var(--theme-accent) 22%, var(--theme-border))', background: 'color-mix(in srgb, var(--theme-surface) 80%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16, fontWeight: 700 }}>{item.title}</strong>
                    <span style={{ color: T.textMuted, fontSize: 12, fontFamily: 'var(--font-marvel-ui)' }}>{item.watchedDate || 'No watch date'} · ~{Math.round(estimateRuntimeHours(item) * 10) / 10}h</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 14, alignItems: 'start', borderBottom: `1px solid color-mix(in srgb, var(--theme-border) 82%, transparent)`, paddingBottom: 10 }}>
                    <img src={posterSrc(item)} alt={item.title} style={{ width: 100, height: 145, borderRadius: 10, objectFit: 'cover', border: `1px solid ${T.surfaceBorder}` }} />
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button className="fpill" style={{ padding: '7px 10px', fontSize: 11 }} onClick={() => setRewatchCount(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}><Clock size={12}/>Re-watch {rewatchCount[item.id] || 0}</button>
                        <button className="fpill" style={{ padding: '7px 10px', fontSize: 11 }} onClick={() => setRewatchCount(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))}>−</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--theme-accent) 30%, var(--theme-border))', background: 'color-mix(in srgb, var(--theme-surface) 86%, transparent)' }}>
                        <span style={{ color: T.textMuted, fontSize: 11, fontFamily: 'var(--font-marvel-ui)', textTransform: 'uppercase' }}>Rating</span>
                        <input type="number" min={0} max={10} step={0.1} value={myRating[item.id] ?? ''} onChange={(e) => setReviewRating(item.id, Number(e.target.value))} placeholder="4.5" style={{ width: 82, borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.inputColor, padding: '7px 10px', fontWeight: 800, fontSize: 15, textAlign: 'center', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }} />
                        <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 700 }}>/10</span>
                        <div style={{ position: 'relative', display: 'inline-flex', fontSize: 17, letterSpacing: 1.6 }}>
                          <span style={{ color: 'color-mix(in srgb, var(--theme-text-muted) 65%, transparent)' }}>★★★★★</span>
                          <span style={{ color: 'color-mix(in srgb, var(--theme-accent) 70%, var(--theme-accent-alt))', position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: `${Math.max(0, Math.min(100, ((myRating[item.id] || 0) / 10) * 100))}%`, whiteSpace: 'nowrap' }}>★★★★★</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'color-mix(in srgb, var(--theme-accent) 72%, var(--theme-accent-alt))' }}>{Number(myRating[item.id] || 0).toFixed(1)}/10</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10, paddingTop: 10 }}>
                    <textarea value={reviews[item.id] || ''} onChange={(e) => setReviews(prev => ({ ...prev, [item.id]: e.target.value }))} placeholder="Add a review or note…" rows={2} style={{ width: '100%', resize: 'vertical', borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.inputColor, padding: 10, lineHeight: 1.45 }} />
                    <div style={{ paddingTop: 10, borderTop: `1px solid color-mix(in srgb, var(--theme-border) 82%, transparent)` }}>
                      <button className="fpill" style={{ padding: '7px 12px', fontSize: 11, width: 'fit-content', minHeight: 36 }} onClick={() => shareReviewCard(item)}><Upload size={12}/>Share Review Card</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>}
          </div>
        </div>
      )}


      <SetupWizard
        open={setupOpen}
        profile={profile}
        setProfile={setProfile}
        onPickPhoto={() => document.getElementById('setup-avatar-upload')?.click()}
        onFetchCore={() => refreshPostersAndMetadata('core')}
        onFetchAll={() => refreshPostersAndMetadata('all')}
        fetchState={posterFetchState}
        onSkip={() => { safeLocalStorageSetItem('mcu-first-setup-v1', 'done'); setSetupOpen(false); }}
        onFinish={() => { safeLocalStorageSetItem('mcu-first-setup-v1', 'done'); setSetupOpen(false); }}
        spoilerSafeMode={spoilerSafeMode}
        setSpoilerSafeMode={setSpoilerSafeMode}
        performanceMode={performanceMode}
        setPerformanceMode={setPerformanceMode}
        marvelLangMode={marvelLangMode}
        setMarvelLangMode={setMarvelLangMode}
        posterDataSaver={posterDataSaver}
        setPosterDataSaver={setPosterDataSaver}
      />
      <input id="setup-avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setAvatarCropSrc(String(r.result || '')); r.readAsDataURL(f); e.target.value=''; }} />

      {avatarCropSrc && (
        <CropModal
          src={avatarCropSrc}
          cropTarget="avatar"
          theme={{ cardBg: T.surfaceBg, cardShadow: T.dropdownShadow, cardBorder: T.surfaceBorder, textPrimary: T.text, textDim: T.textMuted, accent: '#4a9ede', accent2: 'var(--theme-accent-alt)' }}
          onCancel={() => setAvatarCropSrc('')}
          onConfirm={(img) => {
            setProfile(p => ({ ...p, pfp: img }));
            setUploadedAvatars(a => [img, ...a.filter(x => x !== img)].slice(0, 24));
            setAvatarCropSrc('');
          }}
        />
      )}

      {/* ━━ STATUS DROPDOWN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {statusDropdown !== null && (() => {
        const activeItem = items.find(i => i.id === statusDropdown);
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={() => setStatusDropdown(null)} aria-hidden="true" />
            <div className="dropdown-pop" role="dialog" aria-label="Set watch status"
              style={{ position: 'fixed', top: dropdownPos.y, left: dropdownPos.x, background: 'color-mix(in srgb, var(--theme-surface) 65%, transparent)', border: `1px solid ${T.dropdownBorder}`, borderRadius: 11, padding: '9px', zIndex: 10000, boxShadow: 'none', minWidth: 235 }}>
              <div style={{ fontFamily: 'var(--font-marvel-ui)', fontSize: 10, letterSpacing: 2, color: T.textMuted, marginBottom: 7, paddingBottom: 7, borderBottom: `1px solid ${T.surfaceBorder}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 215 }}>
                {activeItem?.title}
              </div>
              <button
                className="status-menu-bookmark marvel-mini-btn" data-active={bookmarks[activeItem?.id] ? 'true' : 'false'}
                onClick={() => { setBookmarks(p => ({ ...p, [activeItem.id]: p[activeItem.id] ? 0 : 1 })); setStatusDropdown(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 9px', border: `1px solid ${bookmarks[activeItem?.id] ? '#7dd3fc66' : 'transparent'}`, background: bookmarks[activeItem?.id] ? 'rgba(125,211,252,0.12)' : 'transparent', color: bookmarks[activeItem?.id] ? '#7dd3fc' : T.pillText, borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-marvel-display)', fontSize: 12.5, textAlign: 'left' }}
              >
                <Bookmark size={13} />
                {bookmarks[activeItem?.id] ? 'Remove bookmark' : 'Add bookmark'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(STATUS_META).map(([key, meta]) => {
                  const isCurrent = key === activeItem?.status;
                  return (
                    <button key={key}
                      className={`status-menu-item marvel-mini-btn status-menu-${key} ${isCurrent ? 'is-current' : ''}`}
                      autoFocus={isCurrent}
                      onClick={() => { setStatusDirect(activeItem.id, key); setStatusDropdown(null); }}
                      onKeyDown={e => { if (e.key === 'Escape') setStatusDropdown(null); }}
                      aria-pressed={isCurrent}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 9px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-marvel-display)', fontSize: 12.5, fontWeight: isCurrent ? 650 : 500, letterSpacing: 0.4, textAlign: 'left' }}
                    >
                      <meta.Icon size={13} />
                      {meta.label}
                      {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 8.5, opacity: 0.5, fontFamily: 'var(--font-marvel-ui)', letterSpacing: 1 }}>CURRENT</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        );
      })()}
      <SpeedInsights />
    </div>
  );
}
