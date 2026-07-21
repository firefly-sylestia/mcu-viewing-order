import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, Home, Bookmark, Play, UserRound, X, ArrowLeft, Star, BarChart3, Check, Clock, ListFilter, RotateCcw, ChevronLeft, ChevronRight, Calendar, Timer, Sparkles, LogIn, LogOut, Cloud, Download } from 'lucide-react';
import { RAW } from './data/mcuData';
import { DC_RAW } from './data/dcData';
import { XMEN_RAW } from './data/xmenData';
import { getTrailerByTitle, trailerEmbedUrl } from './data/trailerData';
import ProfilePage from './components/ProfilePage';
import AuthModal from './components/AuthModal';
import { useAuth } from './hooks/useAuth';
import { useCloudSync } from './hooks/useCloudSync';
import { configured as firebaseReady } from './firebase';
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
const xmenPalette = ['#1a3a5c', '#1e5080', '#2566a0', '#2f80c8', '#4a90d9', '#6baae6'];

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

const localPoster = (item) => {
  if (item.id >= 5000) return '';
  const explicit = {
    12: '/posters/012-i-am-groot-s1-and-s2.jpg',
    203: '/posters/012-i-am-groot-s1-and-s2.jpg',
    30: '/posters/030-guardians-holiday-special.jpg',
    155: '/posters/058-werewolf-by-night.jpg',
    103: '/posters/009-A-Funny-Thing-Happened-on-the-Way-to-Thors-Hammer.jpg',
    151: '/posters/151-agents-of-shield-s6-and-s7.jpg',
  }[item.id];
  return explicit || `/posters/${String(item.id).padStart(3, '0')}-${slugifyPosterName(item.title)}.jpg`;
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
  rating: Number((6.7 + ((item.id * 17) % 25) / 10).toFixed(1)),
  genres: item.type === 'series' ? ['Series', 'Action', 'Drama'] : ['Action', item.phase >= 4 ? 'Adventure' : 'Sci-fi', item.essential ? 'Essential' : 'Canon'],
  poster: localPoster(item),
  accent: universe === 'dc' ? dcPalette[(item.phase - 1) % dcPalette.length] : universe === 'xmen' ? xmenPalette[(item.phase - 1) % xmenPalette.length] : marvelPalette[(item.phase - 1) % marvelPalette.length],
});

export default function App() {
  const saved = useMemo(readSavedState, []);
  const [universe, setUniverse] = useState(saved.universe || 'marvel');
  const [query, setQuery] = useState(saved.query || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [genre, setGenre] = useState(saved.genre || 'All');
  const [rating, setRating] = useState(saved.rating || 0);
  const [ageRatingFilter, setAgeRatingFilter] = useState(saved.ageRatingFilter || 'All');
  const [sortBy, setSortBy] = useState(saved.sortBy || 'order');
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ universe, query, genre, rating, ageRatingFilter, sortBy, actions, section, watchItem, profileName, heroIndex }));
  }, [universe, query, genre, rating, ageRatingFilter, sortBy, actions, section, watchItem, profileName, heroIndex]);

  useEffect(() => {
    const hashed = parseHash().section;
    if (hashed !== section) {
      const target = section === 'watch' && safeWatchItem
        ? `#watch/${slugifyPosterName(safeWatchItem.item.title)}`
        : `#${section}`;
      window.history.replaceState(null, '', target);
    }
  }, [section, safeWatchItem]);

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
  const enrichItem = useCallback((item) => ({
    ...item,
    poster: item.poster || posterMap[item.id] || posterMap[String(item.id)] || posterMap[slugifyPosterName(item.title)] || '',
    userStatus: actions[item.id]?.status || 'unwatched',
    bookmarked: Boolean(actions[item.id]?.bookmarked),
    watchStartedAt: actions[item.id]?.watchStartedAt || null,
    watchedDuration: actions[item.id]?.watchedDuration || 0,
    watchedEpisodes: actions[item.id]?.watchedEpisodes || [],
    rating: posterMap[`rating_${item.id}`] || item.rating,
  }), [actions, posterMap]);

  const activeItems = useMemo(() => {
    const sorted = allItems
      .filter(item => item.universe === universe)
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
      .filter(item => genre === 'All' || item.genres.includes(genre) || item.type === genre.toLowerCase())
      .filter(item => Number(item.rating) >= rating)
      .filter(item => ageRatingFilter === 'All' || (item.ageRating || (item.type === 'series' ? 'TV-14' : 'PG-13')) === ageRatingFilter)
      .map(enrichItem);
    sorted.sort((a, b) => sortBy === 'year' ? a.year - b.year : sortBy === 'title' ? a.title.localeCompare(b.title) : a.order - b.order);
    return sorted;
  }, [allItems, universe, query, genre, rating, ageRatingFilter, sortBy, enrichItem]);

  // Unfiltered items (no search/filter) for WatchPage/WatchBrowse suggestions
  const unfilteredItems = useMemo(() => {
    const sorted = allItems
      .filter(item => item.universe === universe)
      .map(enrichItem);
    sorted.sort((a, b) => a.order - b.order);
    return sorted;
  }, [allItems, universe, enrichItem]);

  const failedRef = useRef(new Set());

  useEffect(() => {
    const missing = activeItems.filter(item => !item.poster && !posterMap[item.id] && !failedRef.current.has(item.id)).slice(0, 6);
    if (!missing.length) return;
    let cancelled = false;
    const batchSize = 3;
    const fetchBatch = async (startIndex) => {
      if (cancelled || startIndex >= missing.length) return;
      const batch = missing.slice(startIndex, startIndex + batchSize);
      const results = await Promise.allSettled(batch.map(item => {
        const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
        if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
        return fetch(`/api/tmdb/poster?${params.toString()}`, { cache: 'force-cache' })
          .then(response => response.ok ? response.json() : null);
      }));
      if (!cancelled) {
        const updates = {};
        const failed = [];
        results.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            if (result.value?.poster) {
              updates[batch[i].id] = result.value.poster;
              if (result.value.rating) updates[`rating_${batch[i].id}`] = Number(result.value.rating);
            } else {
              failed.push(batch[i].id);
            }
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

  const heroItems = activeItems.slice(0, 6);
  const featured = heroItems[heroIndex % Math.max(heroItems.length, 1)] || activeItems[0];
  const genres = ['All', 'Action', 'Adventure', 'Drama', 'Sci-fi', 'Essential', 'Series'];
  const stats = useMemo(() => {
    const total = activeItems.length || 1;
    const watched = activeItems.filter(item => item.userStatus === 'watched').length;
    const watching = activeItems.filter(item => item.userStatus === 'watching').length;
    const dropped = activeItems.filter(item => item.userStatus === 'dropped').length;
    const bookmarked = activeItems.filter(item => item.bookmarked).length;
    const watchedMinutes = activeItems.filter(item => item.userStatus === 'watched').reduce((sum, i) => sum + (i.runtime || 0), 0);
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
  }, [activeItems]);

  const updateAction = (item, patch) => setActions(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), ...patch } }));
  const cycleStatus = (item) => {
    const current = actions[item.id]?.status || 'unwatched';
    updateAction(item, { status: STATUS[(STATUS.indexOf(current) + 1) % STATUS.length] });
  };
  const setStatus = (item, status) => updateAction(item, { status });
  const toggleWatched = (item) => setStatus(item, item.userStatus === 'watched' ? 'unwatched' : 'watched');
  const toggleBookmark = (item) => updateAction(item, { bookmarked: !actions[item.id]?.bookmarked });
  const selectItem = (item) => {
    setSelected(item);
    if (item) window.history.replaceState(null, '', `#detail/${slugifyPosterName(item.title)}`);
    else window.history.replaceState(null, '', `#${section}`);
  };
  const selectedItem = selected ? activeItems.find(item => item.id === selected.id) || selected : null;
  const nextUp = activeItems.find(item => item.userStatus !== 'watched' && item.userStatus !== 'dropped') || activeItems[0];
  const playTrailer = (item) => {
    const match = getTrailerByTitle(item.title);
    const youtubeId = match?.primary?.youtubeId || match?.youtubeId;
    const url = youtubeId ? trailerEmbedUrl(youtubeId) : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(`${item.title} trailer`)}`;
    setTrailer({ title: item.title, url });
  };
  const resetFilters = () => { setQuery(''); setGenre('All'); setRating(0); setAgeRatingFilter('All'); setSortBy('order'); };
  const handleStartWatch = (item, tmdbId, mediaType) => {
    setWatchItem({ item, tmdbId, mediaType });
    setStatus(item, 'watching');
    updateAction(item, { watchStartedAt: Date.now() });
    setSelected(null);
    setSection('watch');
    window.history.replaceState(null, '', `#watch/${slugifyPosterName(item.title)}`);
  };

  const universeName = universe === 'marvel' ? 'MCU' : universe === 'xmen' ? 'X-Men' : 'DC';
  const universeAccent = universe === 'marvel' ? '#da1e37' : universe === 'xmen' ? '#2f80c8' : '#2f80ed';
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
          <input value={query} onChange={e => { setQuery(e.target.value); if (section !== 'watch') setSection('list'); }} placeholder={`Search ${universe === 'marvel' ? 'Marvel' : universe === 'xmen' ? 'X-Men' : 'DC'} titles…`} />
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
        <MovieRail title="Recently watched" items={activeItems.filter(i => i.userStatus === 'watched').slice(-24).reverse()} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} empty="Mark titles as watched to see them here." scrollable />
        {activeItems.filter(i => i.userStatus === 'watching').length > 0 && <ContinueWatching items={activeItems.filter(i => i.userStatus === 'watching')} setSelected={selectItem} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} onResume={handleStartWatch} />}
      </>}

      {section === 'list' && <ListSection items={activeItems} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}
      {section === 'analytics' && <><AnalyticsPanel stats={stats} large /><MovieRail title="In progress" items={activeItems.filter(i => i.userStatus === 'watching')} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} /></>}
            {section === 'profile' && <ProfilePage stats={stats} activeItems={activeItems} universe={universe} setSelected={selectItem} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} profileName={profileName} setProfileName={setProfileName} user={user} configured={configured} onLogin={() => setAuthOpen(true)} onLogout={async () => { await pushBeforeLogout(); authLogout(); setWatchItem(null); }} lastSynced={lastSynced} syncing={syncing} onSync={pushToCloud} conflict={conflict} onResolveRemote={resolveUseRemote} onResolveLocal={resolveKeepLocal} syncToast={toast} />}
      {section === 'watch' && safeWatchItem && <WatchPage watchItem={safeWatchItem} activeItems={unfilteredItems} onBack={() => { setWatchItem(null); window.history.replaceState(null, '', '#watch'); }} setStatus={setStatus} toggleBookmark={toggleBookmark} onStartWatch={handleStartWatch} updateAction={updateAction} />}
      {section === 'watch' && !safeWatchItem && <WatchBrowse activeItems={activeItems} onStartWatch={handleStartWatch} setSelected={selectItem} setStatus={setStatus} toggleBookmark={toggleBookmark} setSection={setSection} setQuery={setQuery} />}

      <nav className="bottom-nav" aria-label="Primary">
        <button className={section === 'home' ? 'active' : ''} onClick={() => { setQuery(''); setSection('home'); setWatchItem(null); }}><Home size={22} /><span>Home</span></button>
        <button className={section === 'list' ? 'active' : ''} onClick={() => { setQuery(''); setSection('list'); }}><ListFilter size={22} /><span>List</span></button>
        <button className={section === 'analytics' ? 'active' : ''} onClick={() => { setQuery(''); setSection('analytics'); }}><BarChart3 size={22} /><span>Stats</span></button>
        <button className={section === 'watch' ? 'active' : ''} onClick={() => { setQuery(''); setSection('watch'); }}><Play size={22} /><span>Watch</span></button>
        <button className={section === 'profile' ? 'active' : ''} onClick={() => { setQuery(''); setSection('profile'); }}><UserRound size={22} /><span>Profile</span></button>
      </nav>

      {selectedItem && <DetailView item={selectedItem} onClose={() => selectItem(null)} setStatus={setStatus} toggleBookmark={toggleBookmark} onStartWatch={handleStartWatch} activeItems={unfilteredItems} />}
      {trailer && <TrailerModal trailer={trailer} onClose={() => setTrailer(null)} />}
      {filtersOpen && <Filters genre={genre} setGenre={setGenre} rating={rating} setRating={setRating} ageRatingFilter={ageRatingFilter} setAgeRatingFilter={setAgeRatingFilter} sortBy={sortBy} setSortBy={setSortBy} genres={genres} count={activeItems.length} onClose={() => setFiltersOpen(false)} />}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onLogin={login} onSignup={signup} onGoogleSignIn={googleSignIn} onAnonymousSignIn={anonymousSignIn} onResetPassword={resetPassword} />}
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

  const showTrailer = () => {
    const match = getTrailerByTitle(featured.title);
    const youtubeId = match?.primary?.youtubeId || match?.youtubeId;
    const baseUrl = youtubeId ? trailerEmbedUrl(youtubeId) : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(`${featured.title} trailer`)}`;
    setInlineTrailer(`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}autoplay=1`);
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
    <button className="poster-button" onClick={() => setSelected(item)}><PosterArt item={item} /></button>
    <div className="card-body"><button className="title-button" onClick={() => setSelected(item)}>{item.title}</button><span>{item.year} · {runtimeLabel(item.runtime, item.type)}{item.userStatus === 'watching' && item.watchedDuration > 30000 ? ` · ${watchTimeLabel(item)}` : ''}</span></div>
    <div className="card-actions"><button onClick={() => playTrailer(item)} className="trailer-chip" aria-label={`Play ${item.title} trailer`}><Play size={16} fill="currentColor" /><span>Trailer</span></button><StatusSelect item={item} setStatus={setStatus} compact /><button onClick={() => toggleBookmark(item)} className={`bookmark-chip ${item.bookmarked ? 'saved' : ''}`} aria-label={item.bookmarked ? 'Remove bookmark' : 'Bookmark title'}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
  </article>;
}

function ListSection({ items, setSelected, setStatus, toggleBookmark, playTrailer }) {
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
      <div className="list-copy"><div className="list-title-line"><strong>{item.title}</strong>{item.essential && <span>Essential</span>}</div><span>{item.year} · {item.type} · {runtimeLabel(item.runtime, item.type)}</span><p>{item.desc || `${item.title} in the complete ${item.universe === 'marvel' ? 'MCU' : 'DC'} story timeline.`}</p><div className="list-tags">{item.genres.slice(0,3).map(g => <span key={g}>{g}</span>)}</div></div>
      <div className="list-actions" onClick={e => e.stopPropagation()}><button className="list-trailer" onClick={() => playTrailer(item)} aria-label={`Play ${item.title} trailer`}><Play size={16} fill="currentColor" /><span>Trailer</span></button><StatusSelect item={item} setStatus={setStatus} /><button className={`list-bookmark ${item.bookmarked ? 'saved' : ''}`} onClick={() => toggleBookmark(item)} aria-label={item.bookmarked ? 'Remove bookmark' : 'Bookmark title'}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
    </article>)}</div>}
    {pageCount > 1 && <nav className="pagination" aria-label="Viewing list pages"><button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft size={18} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map(pageNumber => <button key={pageNumber} className={currentPage === pageNumber ? 'active' : ''} aria-current={currentPage === pageNumber ? 'page' : undefined} onClick={() => goToPage(pageNumber)}>{pageNumber}</button>)}<button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Next page"><ChevronRight size={18} /></button></nav>}
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
  const showTrailer = () => {
    const match = getTrailerByTitle(item.title);
    const youtubeId = match?.primary?.youtubeId || match?.youtubeId;
    const baseUrl = youtubeId ? trailerEmbedUrl(youtubeId) : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(`${item.title} trailer`)}`;
    setInlineTrailer(`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}autoplay=1`);
    setIsTrailerExpanded(true);
  };
  const closeTrailer = () => {
    setIsTrailerExpanded(false);
    setTimeout(() => setInlineTrailer(null), 400);
  };
  const [watchLoading, setWatchLoading] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [torrents, setTorrents] = useState(null);
  const downloadRef = useRef(null);

  useEffect(() => { setTorrents(null); setDownloadOpen(false); }, [item.id]);

  const searchTorrents = async () => {
    if (torrents) { setDownloadOpen(!downloadOpen); return; }
    setDownloadOpen(true);
    try {
      const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
      const res = await fetch(`/api/torrent/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTorrents(data.torrents || []);
      }
    } catch { setTorrents([]); }
  };

  useEffect(() => {
    const close = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setDownloadOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleWatchOnVideasy = async (item) => {
    if (watchLoading) return;
    setWatchLoading(true);
    try {
      const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
      if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
      const res = await fetch(`/api/tmdb/poster?${params.toString()}`);
      if (!res.ok) throw new Error('TMDB lookup failed');
      const data = await res.json();
      if (!data.tmdbId) throw new Error('No TMDB ID found');
      const mediaType = data.mediaType === 'tv' ? 'tv' : 'movie';
      onStartWatch(item, data.tmdbId, mediaType);
    } catch {
      // fallback: try with title as ID (some Videasy instances support this)        onStartWatch(item, item.tmdbId || null, item.type === 'series' ? 'tv' : 'movie');
    } finally {
      setWatchLoading(false);
    }
  };
  const modalRef = React.useRef(null);
  React.useEffect(() => {
    if (isTrailerExpanded && modalRef.current) modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isTrailerExpanded]);

  // Compute roadmap for multi-part series
  const itemRoadmap = useMemo(() => {
    if (!activeItems || !item.tmdbId || item.type !== 'series') return null;
    const siblings = activeItems
      .filter(i => i.tmdbId === item.tmdbId && i.type === 'series')
      .sort((a, b) => a.order - b.order);
    if (siblings.length < 2) return null;
    const segments = [];
    for (let i = 0; i < siblings.length; i++) {
      const part = siblings[i];
      segments.push({ type: 'part', item: part, isActive: part.id === item.id });
      if (i < siblings.length - 1) {
        const nextPart = siblings[i + 1];
        const interstitials = activeItems
          .filter(x => x.order > part.order && x.order < nextPart.order)
          .sort((a, b) => a.order - b.order);
        if (interstitials.length > 0) {
          segments.push({ type: 'interstitials', items: interstitials });
        }
      }
    }
    return { segments, siblings };
  }, [activeItems, item]);

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
          <div className="detail-chips"><span className="detail-rating"><Star size={15} fill="currentColor" /> {item.rating.toFixed ? item.rating.toFixed(1) : item.rating}</span>{item.genres.slice(0,3).map(g => <span key={g}>{g}</span>)}</div>
          <p className="detail-description">{item.desc || `Follow ${item.title} in the complete ${item.universe === 'marvel' ? 'Marvel Cinematic Universe' : 'DC Universe'} viewing order.`}</p>
          <div className="detail-facts"><div><Calendar size={18} /><span>Release year</span><strong>{item.year}</strong></div><div><Timer size={18} /><span>Runtime</span><strong>{runtimeLabel(item.runtime, item.type)}</strong></div><div><Sparkles size={18} /><span>Format</span><strong>{item.type}</strong></div>{item.userStatus === 'watching' && item.watchedDuration > 30000 && <div><Clock size={18} /><span>Watched</span><strong>{watchTimeLabel(item)}</strong></div>}</div>
          <div className="detail-progress-actions"><StatusSelect item={item} setStatus={setStatus} /><button className={`detail-bookmark ${item.bookmarked ? 'saved' : ''}`} onClick={() => toggleBookmark(item)} aria-label={item.bookmarked ? 'Remove bookmark' : 'Save title'}><Bookmark size={19} fill={item.bookmarked ? 'currentColor' : 'none'} /></button><button className="detail-videasy" onClick={() => handleWatchOnVideasy(item)} disabled={watchLoading} aria-label={`Watch ${item.title} on Videasy`}><Play size={18} fill="currentColor" /><span>{watchLoading ? 'Loading...' : 'Watch Now'}</span></button><div className="detail-download-wrap" ref={downloadRef}><button className="detail-download" onClick={searchTorrents} aria-label={`Download ${item.title}`}><Download size={18} /><span>Download</span></button>{downloadOpen && <div className="download-dropdown">{torrents === null ? <span className="download-loading">Searching...</span> : torrents.length === 0 ? <span className="download-empty">No torrents found</span> : torrents.map((t, i) => <a key={i} className="download-option" href={t.magnet} target="_blank" rel="noopener noreferrer" onClick={() => setDownloadOpen(false)}><span className="download-quality">{t.quality}</span><span className="download-size">{t.size}</span><span className="download-seeds">{t.seeds} seeds</span></a>)}</div>}</div></div>
          {itemRoadmap && (
            <div className="detail-roadmap">
              <div className="section-title"><h2>Viewing Roadmap</h2><button>{itemRoadmap.siblings.length} Parts</button></div>
              <div className="roadmap-timeline">
                {itemRoadmap.segments.map((seg, idx) => {
                  if (seg.type === 'part') {
                    const partNum = itemRoadmap.segments.filter((s, i) => s.type === 'part' && i <= idx).length;
                    return (
                      <div key={seg.item.id} className={`roadmap-part ${seg.isActive ? 'active' : ''}`} style={{ '--accent': seg.item.accent, cursor: 'default' }}>
                        <span className="roadmap-part-dot" />
                        <div className="roadmap-part-poster">
                          {seg.item.poster ? <img src={seg.item.poster} alt={seg.item.title} loading="lazy" /> : <FallbackPoster item={seg.item} />}
                        </div>
                        <div className="roadmap-part-info">
                          <span className="roadmap-part-badge">{seg.isActive && '● '}Part {partNum}{seg.item.season ? ` S${seg.item.season}` : ''}</span>
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
                          <span>watch between</span>
                          <ChevronRight size={14} className="chevron" />
                        </div>
                        <div className="roadmap-inter-items">
                          {seg.items.map(intItem => (
                            <div key={intItem.id} className="roadmap-inter-card" style={{ '--accent': intItem.accent, cursor: 'default' }}>
                              <div className="roadmap-inter-poster">
                                {intItem.poster ? <img src={intItem.poster} alt={intItem.title} loading="lazy" /> : <FallbackPoster item={intItem} />}
                              </div>
                              <span className="roadmap-inter-title">{intItem.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
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
    <section className="continue-watching rail-card web-rail">
      <div className="section-title"><h2>Continue Watching</h2><button>{items.length} in progress</button></div>
      <div className="movie-grid web-grid rail-scroll">
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

function WatchBrowse({ activeItems, onStartWatch, setSelected, setStatus, toggleBookmark, setSection, setQuery }) {
  const pageSize = 12;
  const [upNextPage, setUpNextPage] = useState(1);
  const inProgress = activeItems.filter(i => i.userStatus === 'watching');
  const allUpNext = activeItems.filter(i => i.userStatus === 'unwatched');
  const upNextPageCount = Math.max(1, Math.ceil(allUpNext.length / pageSize));
  const currentUpNextPage = Math.min(upNextPage, upNextPageCount);
  const upNext = allUpNext.slice((currentUpNextPage - 1) * pageSize, currentUpNextPage * pageSize);
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
  return (
    <section className="watch-browse">
      <div className="watch-browse-hero">
        <div className="watch-browse-icon"><Play size={48} fill="currentColor" /></div>
        <h1>Ready to watch?</h1>
        <p>Pick up where you left off or discover something new to start watching.</p>
      </div>
      {inProgress.length > 0 && (
        <section className="watch-browse-section">
          <div className="section-title"><h2>Continue Watching</h2><button>{inProgress.length} in progress</button></div>
          <div className="watch-browse-grid">
            {inProgress.map(item => (
              <article key={item.id} className="movie-card watch-browse-card in-progress-card" style={{ '--accent': item.accent }}>
                <button className="poster-button" onClick={() => handleResume(item)}>
                  <PosterArt item={item} />
                  <div className="continue-overlay"><Play size={28} fill="currentColor" /></div>
                </button>
                <div className="card-body"><button className="title-button" onClick={() => setSelected(item)}>{item.title}</button><span>{elapsedPctLabel(item)} complete</span></div>
                <div className="card-actions">
                  <button onClick={() => handleResume(item)} className="trailer-chip"><Play size={16} fill="currentColor" /><span>Resume</span></button>
                  <StatusSelect item={item} setStatus={setStatus} compact />
                  <button onClick={() => toggleBookmark(item)} className={`bookmark-chip ${item.bookmarked ? 'saved' : ''}`}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {upNext.length > 0 && (
        <section className="watch-browse-section">
          <div className="section-title"><h2>Start Watching</h2><button>{allUpNext.length} available</button></div>
          <div className="watch-browse-grid">
            {upNext.map(item => (
              <article key={item.id} className="movie-card watch-browse-card start-card" style={{ '--accent': item.accent }}>
                <button className="poster-button" onClick={() => setSelected(item)}><PosterArt item={item} /></button>
                <div className="card-body"><button className="title-button" onClick={() => setSelected(item)}>{item.title}</button><span>{item.year} · {runtimeLabel(item.runtime, item.type)}</span></div>
                <div className="card-actions watch-start-actions">
                  <button onClick={() => handleResume(item)} className="trailer-chip watch-primary-action"><Play size={16} fill="currentColor" /><span>Watch</span></button>
                  <button onClick={() => toggleBookmark(item)} className={`bookmark-chip watch-bookmark-action ${item.bookmarked ? 'saved' : ''}`}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /><span>{item.bookmarked ? 'Saved' : 'Save'}</span></button>
                </div>
              </article>
            ))}
          </div>
          {upNextPageCount > 1 && <nav className="pagination" aria-label="Start watching pages"><button onClick={() => setUpNextPage(p => Math.max(1, p - 1))} disabled={currentUpNextPage === 1} aria-label="Previous page"><ChevronLeft size={18} /></button>{Array.from({ length: upNextPageCount }, (_, i) => i + 1).map(n => <button key={n} className={currentUpNextPage === n ? 'active' : ''} aria-current={currentUpNextPage === n ? 'page' : undefined} onClick={() => setUpNextPage(n)}>{n}</button>)}<button onClick={() => setUpNextPage(p => Math.min(upNextPageCount, p + 1))} disabled={currentUpNextPage === upNextPageCount} aria-label="Next page"><ChevronRight size={18} /></button></nav>}
        </section>
      )}
      {inProgress.length === 0 && allUpNext.length === 0 && (
        <div className="watch-browse-empty">
          <h2>Nothing to watch yet</h2>
          <p>Open a movie or show detail and tap "Watch Now" to get started.</p>
          <button onClick={() => { setQuery(''); setSection('list'); }}>Browse titles</button>
        </div>
      )}
    </section>
  );
}

function WatchPage({ watchItem, activeItems, onBack, setStatus, toggleBookmark, onStartWatch, updateAction }) {
  const { item, tmdbId, mediaType } = watchItem;
  const [switching, setSwitching] = useState(false);
  const [toast, setToast] = useState('');
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
  const allEpisodesWatched = episodeRangeTotal > 0 && watchedEpisodes.length >= episodeRangeTotal;

  useEffect(() => { setSelectedEpisode(currentItem.epStart || 1); }, [currentItem.id, currentItem.epStart]);

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

  const videasyUrl = useMemo(() => {
    const effectiveTmdbId = currentItem.tmdbId || tmdbId;
    const effectiveMediaType = currentItem.type === 'series' ? 'tv' : 'movie';
    const season = currentItem.season || 1;
    let base = effectiveTmdbId
      ? (isSeries && selectedEpisode
        ? `https://player.videasy.net/${effectiveMediaType}/${effectiveTmdbId}/${season}/${selectedEpisode}`
        : `https://player.videasy.net/${effectiveMediaType}/${effectiveTmdbId}`)
      : `https://player.videasy.net/${effectiveMediaType}/${encodeURIComponent(item.title)}`;
    const params = new URLSearchParams();
    params.set('autoplay', '1');
    const startSec = Math.floor((currentItem.watchedDuration || 0) / 1000);
    if (startSec > 5) params.set('progress', String(startSec));
    return `${base}?${params.toString()}`;
  }, [tmdbId, item.title, currentItem.tmdbId, currentItem.type, currentItem.season, isSeries, selectedEpisode]);
  const roadmapInfo = useMemo(() => {
    if (!currentItem.tmdbId || currentItem.type !== 'series') return null;
    const siblings = activeItems
      .filter(i => i.tmdbId === currentItem.tmdbId && i.type === 'series')
      .sort((a, b) => a.order - b.order);
    if (siblings.length < 2) return null;
    const segments = [];
    const seqItems = [];
    for (let i = 0; i < siblings.length; i++) {
      const part = siblings[i];
      segments.push({ type: 'part', item: part, isActive: part.id === currentItem.id });
      seqItems.push(part);
      if (i < siblings.length - 1) {
        const nextPart = siblings[i + 1];
        const interstitials = activeItems
          .filter(x => x.order > part.order && x.order < nextPart.order)
          .sort((a, b) => a.order - b.order);
        if (interstitials.length > 0) {
          segments.push({ type: 'interstitials', items: interstitials });
          seqItems.push(...interstitials);
        }
      }
    }
    const currentIndex = seqItems.findIndex(i => i.id === currentItem.id);
    const nextInSequence = seqItems
      .slice(currentIndex + 1)
      .filter(i => i.userStatus !== 'watched' && i.userStatus !== 'dropped');
    return { segments, nextInSequence, siblings };
  }, [activeItems, currentItem]);

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
        <div className="watch-header-spacer" />
      </header>
      {toast && <div className="watch-toast">{toast}</div>}
      <div className="watch-player">
        <iframe key={isSeries ? `ep-${currentItem.tmdbId}-${currentItem.season || 1}-${selectedEpisode}` : currentItem.tmdbId || item.id} src={videasyUrl} title={`Watch ${item.title}`} frameBorder="0" allowFullScreen allow="encrypted-media" />
      </div>
      <div className="watch-progress-bar"><span style={{ width: `${progress}%` }} /></div>
      {isSeries && episodes.length > 0 && (
        <div className="watch-episode-picker">
          <span className="watch-episode-label">{episodeLoading ? 'Loading...' : `${watchedEpisodes.length}/${episodeRangeTotal} watched`}</span>
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
      {roadmapInfo && (
        <section className="watch-roadmap">
          <div className="section-title"><h2>Viewing Roadmap</h2><button>{roadmapInfo.siblings.length} Parts</button></div>
          <div className="roadmap-timeline">
            {roadmapInfo.segments.map((seg, idx) => {
              if (seg.type === 'part') {
                const partNum = roadmapInfo.segments.filter((s, i) => s.type === 'part' && i <= idx).length;
                return (
                  <button
                    key={seg.item.id}
                    className={`roadmap-part ${seg.isActive ? 'active' : ''}`}
                    onClick={() => handleSwitchItem(seg.item)}
                    style={{ '--accent': seg.item.accent }}
                  >
                    <span className="roadmap-part-dot" />
                    <div className="roadmap-part-poster">
                      {seg.item.poster ? <img src={seg.item.poster} alt={seg.item.title} loading="lazy" /> : <FallbackPoster item={seg.item} />}
                    </div>
                    <div className="roadmap-part-info">
                      <span className="roadmap-part-badge">{seg.isActive && '● '}Part {partNum}{seg.item.season ? ` S${seg.item.season}` : ''}</span>
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
                      <span>watch between</span>
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
      )}
      <div className="watch-info">
        <div className="watch-meta">
          <span>{currentItem.year}</span>
          <span>·</span>
          <span>{runtimeLabel(currentItem.runtime, currentItem.type)}</span>
          <span>·</span>
          <span className="watch-rating"><Star size={14} fill="currentColor" /> {currentItem.rating.toFixed ? currentItem.rating.toFixed(1) : currentItem.rating}</span>
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

function FilterSelect({ label, value, options, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = useRef(null);
  React.useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const activeLabel = options.find(o => o.value === value)?.label || options[0]?.label || '';
  return <div className="filter-select" ref={ref}>
    <button className="filter-select-trigger" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}>
      <span className="filter-select-label">{activeLabel}</span>
      <svg className="filter-select-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    {open && <div className="filter-select-dropdown" role="listbox">
      {options.map(opt => <button key={opt.value} className={`filter-select-option ${value === opt.value ? 'active' : ''}`} role="option" aria-selected={value === opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}>
        <span>{opt.label}</span>
        {value === opt.value && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>)}
    </div>}
  </div>;
}

const AGE_RATINGS = ['PG-13', 'R', 'TV-14', 'TV-PG', 'TV-MA', 'Not Rated'];

function Filters({ genre, setGenre, rating, setRating, ageRatingFilter, setAgeRatingFilter, sortBy, setSortBy, genres, count, onClose }) {
  return <aside className="filter-screen web-filter">
    <div className="filter-head"><button onClick={() => { setGenre('All'); setRating(0); setAgeRatingFilter('All'); setSortBy('order'); }}>Clear All</button><b>Filters</b><button onClick={onClose}><X /></button></div>
    <label>Sort by</label>
    <FilterSelect value={sortBy} onChange={setSortBy} options={[{ value: 'order', label: 'Recommended' }, { value: 'year', label: 'Year' }, { value: 'title', label: 'Title' }]} />
    <label>Minimum rating</label>
    <FilterSelect value={rating} onChange={v => setRating(Number(v))} options={[{ value: 0, label: 'Any rating' }, { value: 8, label: '8 & above' }, { value: 7, label: '7 & above' }, { value: 6, label: '6 & above' }]} />
    <label>Age rating</label>
    <FilterSelect value={ageRatingFilter} onChange={setAgeRatingFilter} options={[{ value: 'All', label: 'All ratings' }, ...AGE_RATINGS.map(r => ({ value: r, label: r }))]} />
    <div className="genre-title">Genres <span>{genre === 'All' ? 0 : 1}</span></div><div className="filter-chips">{genres.map(g => <button key={g} className={genre === g ? 'selected' : ''} onClick={() => setGenre(g)}>{g}</button>)}</div>
    <button className="show-results" onClick={onClose}>Show {count} results</button>
  </aside>;
}
