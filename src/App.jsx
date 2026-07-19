import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, Home, Bookmark, Play, UserRound, X, ArrowLeft, Star, BarChart3, Check, Clock, ListFilter, RotateCcw, ChevronLeft, ChevronRight, Calendar, Timer, Sparkles } from 'lucide-react';
import { RAW } from './data/mcuData';
import { DC_RAW } from './data/dcData';
import { getTrailerByTitle, trailerEmbedUrl } from './data/trailerData';
import ProfilePage from './components/ProfilePage';
import './index.css';

const STORAGE_KEY = 'cinematic-viewing-ui-state-v2';
const STATUS = ['unwatched', 'watching', 'watched', 'dropped'];
const STATUS_LABELS = { unwatched: 'Unwatched', watching: 'Watching', watched: 'Watched', dropped: 'Dropped' };
const palette = ['#d6202d', '#8a1238', '#315f42', '#1f4977', '#6b3bc8', '#b36a17'];

const runtimeLabel = (minutes = 0, type = 'film') => {
  if (!minutes) return type === 'series' ? 'Series' : 'TBA';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
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
    30: '/posters/030-guardians-holiday-special.jpg',
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
  accent: universe === 'dc' ? '#1677d2' : (item.id >= 5000 ? '#d6202d' : palette[item.phase % palette.length]),
});

export default function App() {
  const saved = useMemo(readSavedState, []);
  const [universe, setUniverse] = useState(saved.universe || 'marvel');
  const [query, setQuery] = useState(saved.query || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [genre, setGenre] = useState(saved.genre || 'All');
  const [rating, setRating] = useState(saved.rating || 0);
  const [sortBy, setSortBy] = useState(saved.sortBy || 'order');
  const [heroIndex, setHeroIndex] = useState(0);
  const [section, setSection] = useState('home');
  const [actions, setActions] = useState(saved.actions || {});
  const [posterMap, setPosterMap] = useState({});
  const [trailer, setTrailer] = useState(null);

  const allItems = useMemo(() => [...RAW.map(item => enhance(item, 'marvel')), ...DC_RAW.map(item => enhance(item, 'dc'))], []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ universe, query, genre, rating, sortBy, actions }));
  }, [universe, query, genre, rating, sortBy, actions]);

  useEffect(() => {
    fetch('/posters/posters.json', { cache: 'force-cache' })
      .then(response => response.ok ? response.json() : {})
      .then(data => setPosterMap(data || {}))
      .catch(() => setPosterMap({}));
  }, []);

  const activeItems = useMemo(() => {
    const sorted = allItems
      .filter(item => item.universe === universe)
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
      .filter(item => genre === 'All' || item.genres.includes(genre) || item.type === genre.toLowerCase())
      .filter(item => Number(item.rating) >= rating)
      .map(item => ({ ...item, poster: item.poster || posterMap[item.id] || posterMap[String(item.id)] || posterMap[slugifyPosterName(item.title)] || '', userStatus: actions[item.id]?.status || 'unwatched', bookmarked: Boolean(actions[item.id]?.bookmarked) }));
    sorted.sort((a, b) => sortBy === 'year' ? a.year - b.year : sortBy === 'title' ? a.title.localeCompare(b.title) : a.order - b.order);
    return sorted;
  }, [actions, allItems, universe, query, genre, posterMap, rating, sortBy]);

  useEffect(() => {
    const missing = activeItems.filter(item => !item.poster && !posterMap[item.id]).slice(0, 10);
    if (!missing.length) return;
    let cancelled = false;
    missing.forEach(item => {
      const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
      fetch(`/api/tmdb/poster?${params.toString()}`, { cache: 'force-cache' })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (!cancelled && data?.poster) setPosterMap(prev => ({ ...prev, [item.id]: data.poster }));
        })
        .catch(() => {});
    });
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
    return { total, watched, watching, dropped, bookmarked, percent: Math.round((watched / total) * 100) };
  }, [activeItems]);

  const updateAction = (item, patch) => setActions(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), ...patch } }));
  const cycleStatus = (item) => {
    const current = actions[item.id]?.status || 'unwatched';
    updateAction(item, { status: STATUS[(STATUS.indexOf(current) + 1) % STATUS.length] });
  };
  const setStatus = (item, status) => updateAction(item, { status });
  const toggleWatched = (item) => setStatus(item, item.userStatus === 'watched' ? 'unwatched' : 'watched');
  const toggleBookmark = (item) => updateAction(item, { bookmarked: !actions[item.id]?.bookmarked });
  const selectedItem = selected ? activeItems.find(item => item.id === selected.id) || selected : null;
  const nextUp = activeItems.find(item => item.userStatus !== 'watched' && item.userStatus !== 'dropped') || activeItems[0];
  const playTrailer = (item) => {
    const match = getTrailerByTitle(item.title);
    const youtubeId = match?.primary?.youtubeId || match?.youtubeId;
    const url = youtubeId ? trailerEmbedUrl(youtubeId) : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(`${item.title} trailer`)}`;
    setTrailer({ title: item.title, url });
  };
  const resetFilters = () => { setQuery(''); setGenre('All'); setRating(0); setSortBy('order'); };

  const universeName = universe === 'marvel' ? 'MCU' : 'DC';
  const universeAccent = universe === 'marvel' ? '#d6202d' : '#1677d2';

  return (
    <main className={`movie-site universe-${universe}`} style={{ '--brand-accent': universeAccent }}>
      <div className="site-glow" />
      <header className="site-header">
        <button className="brand" onClick={() => { setSection('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label={`Go to ${universeName} Viewing Order home`}><span>{universeName}</span><b>{universeName} Viewing Order</b></button>
        <div className="universe-tabs" role="tablist" aria-label="Universe">
          <button className={universe === 'marvel' ? 'active' : ''} onClick={() => { setUniverse('marvel'); setHeroIndex(0); }}>Marvel</button>
          <button className={universe === 'dc' ? 'active' : ''} onClick={() => { setUniverse('dc'); setHeroIndex(0); }}>DC</button>
        </div>
        <div className="header-search">
          <Search size={18} />
          <input value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setSection('list')} placeholder={`Search ${universe === 'marvel' ? 'Marvel' : 'DC'} titles…`} />
          {query && <button className="search-clear" onClick={() => setQuery('')}><X size={16} /></button>}
          <button className="header-filter-btn" onClick={() => setFiltersOpen(true)} aria-label="Open filters"><SlidersHorizontal size={18} /></button>
        </div>
      </header>

      {section === 'home' && <>
        <section className="hero-layout">
          <TopCarousel items={heroItems} featured={featured} heroIndex={heroIndex} setHeroIndex={setHeroIndex} setSelected={setSelected} />
        </section>
        <SuggestionStrip nextUp={nextUp} stats={stats} setSelected={setSelected} playTrailer={playTrailer} />
        <AnalyticsPanel stats={stats} />
        <MovieRail title="Up next" items={activeItems.filter(i => i.userStatus === 'unwatched').slice(0, 12)} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />
        <MovieRail title="Essential picks" items={activeItems.filter(i => i.essential).slice(0, 12)} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />
        <MovieRail title="Recently watched" items={activeItems.filter(i => i.userStatus === 'watched').slice(-12).reverse()} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} empty="Mark titles as watched to see them here." />
      </>}

      {section === 'list' && <ListSection items={activeItems} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}
      {section === 'analytics' && <><AnalyticsPanel stats={stats} large /><MovieRail title="In progress" items={activeItems.filter(i => i.userStatus === 'watching')} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} /></>}
      {section === 'profile' && <ProfilePage stats={stats} activeItems={activeItems} universe={universe} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}

      <nav className="bottom-nav" aria-label="Primary">
        <button className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}><Home size={22} /><span>Home</span></button>
        <button className={section === 'list' ? 'active' : ''} onClick={() => setSection('list')}><ListFilter size={22} /><span>List</span></button>
        <button className={section === 'analytics' ? 'active' : ''} onClick={() => setSection('analytics')}><BarChart3 size={22} /><span>Stats</span></button>
        <button className={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}><UserRound size={22} /><span>Profile</span></button>
      </nav>

      {selectedItem && <DetailView item={selectedItem} onClose={() => setSelected(null)} toggleWatched={toggleWatched} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}
      {trailer && <TrailerModal trailer={trailer} onClose={() => setTrailer(null)} />}
      {filtersOpen && <Filters genre={genre} setGenre={setGenre} rating={rating} setRating={setRating} sortBy={sortBy} setSortBy={setSortBy} genres={genres} count={activeItems.length} onClose={() => setFiltersOpen(false)} />}
    </main>
  );
}

function TopCarousel({ items, featured, heroIndex, setHeroIndex, setSelected }) {
  const [paused, setPaused] = useState(false);
  const [inlineTrailer, setInlineTrailer] = useState(null);
  const touchStartX = useRef(null);
  const didSwipe = useRef(false);
  const hoverTimer = useRef(null);
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
  const previewPoster = (rawIndex, offset) => {
    window.clearTimeout(hoverTimer.current);
    if (!offset || window.matchMedia('(hover: none)').matches) return;
    hoverTimer.current = window.setTimeout(() => {
      setInlineTrailer(null);
      setHeroIndex(rawIndex);
    }, offset === 1 ? 280 : 420);
  };
  const cancelPreview = () => window.clearTimeout(hoverTimer.current);
  const selectPoster = (item, rawIndex, offset) => {
    cancelPreview();
    if (didSwipe.current) { didSwipe.current = false; return; }
    setInlineTrailer(null);
    offset ? setHeroIndex(rawIndex) : setSelected(item);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  useEffect(() => {
    if (paused || inlineTrailer || items.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setTimeout(() => setHeroIndex((heroIndex + 1) % items.length), 4800);
    return () => window.clearTimeout(timer);
  }, [heroIndex, inlineTrailer, items.length, paused, setHeroIndex]);

  const showTrailer = () => {
    const match = getTrailerByTitle(featured.title);
    const youtubeId = match?.primary?.youtubeId || match?.youtubeId;
    const baseUrl = youtubeId ? trailerEmbedUrl(youtubeId) : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(`${featured.title} trailer`)}`;
    setInlineTrailer(`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}autoplay=1`);
  };

  return <section className="top-carousel" style={{ '--accent': featured?.accent || '#d6202d' }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    {featured?.poster && <img key={featured.id} className="carousel-backdrop" src={featured.poster} alt="" aria-hidden="true" />}
    <div className="carousel-backdrop-shade" aria-hidden="true" />
    <div className="feature-heading"><div><p className="eyebrow">{featured?.universe === 'marvel' ? 'Marvel Cinematic Universe' : 'DC Universe'} · Featured</p><h2>Top movies</h2></div><button className="feature-detail" onClick={() => setSelected(featured)}>View details</button></div>
    <div className="feature-stage">
      <div className="poster-stack smooth-stack">
        {inlineTrailer ? <div className="inline-trailer"><iframe src={inlineTrailer} title={`${featured.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /><button onClick={() => setInlineTrailer(null)} aria-label="Close trailer"><X size={20} /></button></div> : items.map((item, rawIndex) => { const offset = (rawIndex - heroIndex + items.length) % items.length; if (offset > 2) return null; return <button key={item.id} aria-label={offset ? `Show ${item.title}` : `View ${item.title} details`} className={`stack-poster poster-${offset}`} onMouseEnter={() => previewPoster(rawIndex, offset)} onMouseLeave={cancelPreview} onFocus={() => previewPoster(rawIndex, offset)} onBlur={cancelPreview} onClick={() => selectPoster(item, rawIndex, offset)} style={{ '--accent': item.accent }}><PosterArt item={item} /></button>; })}
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

function PosterArt({ item }) {
  return item.poster ? <>
    <img src={item.poster} alt={`${item.title} poster`} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.removeAttribute('hidden'); }} />
    <FallbackPoster item={item} hidden />
  </> : <FallbackPoster item={item} />;
}
function FallbackPoster({ item, hidden = false }) { return <div className="fallback-poster" hidden={hidden}><strong>{item.title}</strong><span>{item.year}</span></div>; }

function MovieRail({ title, items, setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer, empty }) {
  return <section className="rail-card web-rail"><div className="section-title"><h2>{title}</h2><button>{items.length} titles</button></div>{items.length ? <div className="movie-grid web-grid">{items.map(item => <MovieCard key={item.id} item={item} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />)}</div> : <p className="empty-state">{empty || 'No titles match these filters.'}</p>}</section>;
}

function MovieCard({ item, setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer }) {
  return <article className="movie-card" style={{ '--accent': item.accent }}>
    <button className="poster-button" onClick={() => setSelected(item)}><PosterArt item={item} /></button>
    <div className="card-body"><button className="title-button" onClick={() => setSelected(item)}>{item.title}</button><span>{item.year} · {runtimeLabel(item.runtime, item.type)}</span></div>
    <div className="card-actions"><button onClick={() => playTrailer(item)} className="trailer-chip" aria-label={`Play ${item.title} trailer`}><Play size={16} fill="currentColor" /><span>Trailer</span></button><StatusSelect item={item} setStatus={setStatus} compact /><button onClick={() => toggleBookmark(item)} className={`bookmark-chip ${item.bookmarked ? 'saved' : ''}`} aria-label={item.bookmarked ? 'Remove bookmark' : 'Bookmark title'}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
  </article>;
}

function ListSection({ items, setSelected, setStatus, toggleBookmark, playTrailer }) {
  const pageSize = 12;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstItem = (currentPage - 1) * pageSize;
  const visibleItems = items.slice(firstItem, firstItem + pageSize);
  useEffect(() => { setPage(1); }, [items.length]);
  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <section className="list-section">
    <div className="list-heading"><div><p className="eyebrow">Every story, in order</p><h2>Complete viewing list</h2><p className="list-intro">Track every chapter, update your progress, and keep the next story within reach.</p></div><div className="list-summary"><strong>{items.length}</strong><span>titles</span></div></div>
    <div className="list-results-bar"><span>Showing {items.length ? firstItem + 1 : 0}–{Math.min(firstItem + pageSize, items.length)} of {items.length}</span><span>Page {currentPage} of {pageCount}</span></div>
    <div className="list-grid">{visibleItems.map((item, index) => <article className="list-row" key={item.id} style={{ '--accent': item.accent }}>
      <span className="list-index">{String(firstItem + index + 1).padStart(2, '0')}</span>
      <button className="list-poster" onClick={() => setSelected(item)} aria-label={`View ${item.title} details`}><img src={item.poster} alt={`${item.title} poster`} /></button>
      <div className="list-copy"><div className="list-title-line"><button onClick={() => setSelected(item)}>{item.title}</button>{item.essential && <span>Essential</span>}</div><span>{item.year} · {item.type} · {runtimeLabel(item.runtime, item.type)}</span><p>{item.desc || `${item.title} in the complete ${item.universe === 'marvel' ? 'MCU' : 'DC'} story timeline.`}</p><div className="list-tags">{item.genres.slice(0,3).map(g => <span key={g}>{g}</span>)}</div></div>
      <div className="list-actions"><button className="list-trailer" onClick={() => playTrailer(item)} aria-label={`Play ${item.title} trailer`}><Play size={16} fill="currentColor" /><span>Trailer</span></button><StatusSelect item={item} setStatus={setStatus} /><button className={`list-bookmark ${item.bookmarked ? 'saved' : ''}`} onClick={() => toggleBookmark(item)} aria-label={item.bookmarked ? 'Remove bookmark' : 'Bookmark title'}><Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
    </article>)}</div>
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
  React.useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const CurrentStatusIcon = STATUS_META[item.userStatus].icon;
  return <div className={`status-select ${item.userStatus} ${compact ? 'compact' : ''}`} ref={ref}>
    <button className="status-trigger" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}>
      <CurrentStatusIcon className="status-trigger-icon" size={16} strokeWidth={2.3} />
      <span className="status-label">{STATUS_LABELS[item.userStatus]}</span>
    </button>
    {open && <div className="status-dropdown" role="listbox" aria-label={`Set status for ${item.title}`}>
      <p className="status-menu-title">Viewing status</p>
      {STATUS.map(status => {
        const StatusIcon = STATUS_META[status].icon;
        return <button key={status} className={`status-option ${status} ${item.userStatus === status ? 'active' : ''}`} role="option" aria-selected={item.userStatus === status} onClick={() => { setStatus(item, status); setOpen(false); }}>
          <span className="status-option-icon"><StatusIcon size={16} strokeWidth={2.2} /></span>
          <span className="status-option-copy"><strong>{STATUS_LABELS[status]}</strong><small>{STATUS_META[status].detail}</small></span>
        </button>;
      })}
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
  return <section className={`analytics-panel ${large ? 'large' : ''}`}><div><p className="eyebrow">Analytics</p><h2>{stats.percent}% complete</h2><div className="progress"><span style={{ width: `${stats.percent}%` }} /></div></div><div className="stat-grid"><div><b>{stats.total}</b><span>Total</span></div><div><b>{stats.watched}</b><span>Watched</span></div><div><b>{stats.watching}</b><span>Watching</span></div><div><b>{stats.dropped}</b><span>Dropped</span></div><div><b>{stats.bookmarked}</b><span>Saved</span></div></div></section>;
}

function DetailView({ item, onClose, toggleWatched, setStatus, toggleBookmark }) {
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
    setTimeout(() => setInlineTrailer(null), 200);
  };
  const CurrentStatusIcon = STATUS_META[item.userStatus].icon;
  return <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isTrailerExpanded) onClose(); }}>
    <article className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" style={{ '--accent': item.accent, '--detail-poster-bg': `url('${item.poster}')` }}>
      {item.poster && <img className="detail-backdrop" src={item.poster} alt="" aria-hidden="true" />}
      <div className="detail-backdrop-shade" aria-hidden="true" />
      <button className="detail-close" onClick={onClose} aria-label="Close details"><X size={21} /></button>
      <div className="detail-layout">
        <div className="detail-media">
          <div className={`detail-poster ${isTrailerExpanded ? 'is-expanded' : ''}`}>{inlineTrailer ? <div className="detail-inline-trailer"><iframe src={inlineTrailer} title={`${item.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /><button onClick={closeTrailer} aria-label="Close trailer"><X size={20} /></button></div> : <PosterArt item={item} />}</div>
          {!isTrailerExpanded && <button className="detail-trailer" onClick={showTrailer}><Play size={18} fill="currentColor" /> Watch trailer</button>}
        </div>
        <div className="detail-content">
          <div className="detail-kicker"><span>{item.universe === 'marvel' ? 'Marvel Cinematic Universe' : 'DC Universe'}</span><span>#{String(item.order || item.id).padStart(2, '0')}</span></div>
          <h1 id="detail-title">{item.title}</h1>
          <div className="detail-chips"><span className="detail-rating"><Star size={15} fill="currentColor" /> {item.rating.toFixed ? item.rating.toFixed(1) : item.rating}</span>{item.genres.slice(0,3).map(g => <span key={g}>{g}</span>)}</div>
          <p className="detail-description">{item.desc || `Follow ${item.title} in the complete ${item.universe === 'marvel' ? 'Marvel Cinematic Universe' : 'DC Universe'} viewing order.`}</p>
          <div className="detail-facts"><div><Calendar size={18} /><span>Release year</span><strong>{item.year}</strong></div><div><Timer size={18} /><span>Runtime</span><strong>{runtimeLabel(item.runtime, item.type)}</strong></div><div><Sparkles size={18} /><span>Format</span><strong>{item.type}</strong></div></div>
          <div className="detail-progress-actions"><StatusSelect item={item} setStatus={setStatus} /><button className={`detail-status-mark ${item.userStatus}`} onClick={() => toggleWatched(item)} aria-label={item.userStatus === 'watched' ? 'Mark as unwatched' : 'Mark as watched'} title={STATUS_LABELS[item.userStatus]}><CurrentStatusIcon size={19} strokeWidth={2.4} /></button><button className={`detail-bookmark ${item.bookmarked ? 'saved' : ''}`} onClick={() => toggleBookmark(item)} aria-label={item.bookmarked ? 'Remove bookmark' : 'Save title'}><Bookmark size={19} fill={item.bookmarked ? 'currentColor' : 'none'} /><span>{item.bookmarked ? 'Saved' : 'Save'}</span></button></div>
        </div>
      </div>
    </article>
  </div>;
}

function TrailerModal({ trailer, onClose }) {
  return <aside className="trailer-modal"><div><button className="trailer-close" onClick={onClose}><X /></button><h2>{trailer.title} trailer</h2><iframe src={trailer.url} title={`${trailer.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></aside>;
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

function Filters({ genre, setGenre, rating, setRating, sortBy, setSortBy, genres, count, onClose }) {
  return <aside className="filter-screen web-filter">
    <div className="filter-head"><button onClick={() => { setGenre('All'); setRating(0); setSortBy('order'); }}>Clear All</button><b>Filters</b><button onClick={onClose}><X /></button></div>
    <label>Sort by</label>
    <FilterSelect value={sortBy} onChange={setSortBy} options={[{ value: 'order', label: 'Recommended' }, { value: 'year', label: 'Year' }, { value: 'title', label: 'Title' }]} />
    <label>Minimum rating</label>
    <FilterSelect value={rating} onChange={v => setRating(Number(v))} options={[{ value: 0, label: 'Any rating' }, { value: 8, label: '8 & above' }, { value: 7, label: '7 & above' }, { value: 6, label: '6 & above' }]} />
    <div className="genre-title">Genres <span>{genre === 'All' ? 0 : 1}</span></div><div className="filter-chips">{genres.map(g => <button key={g} className={genre === g ? 'selected' : ''} onClick={() => setGenre(g)}>{g}</button>)}</div>
    <button className="show-results" onClick={onClose}>Show {count} results</button>
  </aside>;
}
