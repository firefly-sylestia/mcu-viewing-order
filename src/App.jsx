import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Home, Bookmark, Play, UserRound, X, ArrowLeft, Star, BarChart3, Check, Clock, ListFilter, RotateCcw, ChevronLeft, ChevronRight, Calendar, Timer, Sparkles } from 'lucide-react';
import { RAW } from './data/mcuData';
import { DC_RAW } from './data/dcData';
import { getTrailerByTitle, trailerEmbedUrl } from './data/trailerData';
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
  accent: item.id >= 5000 ? '#d6202d' : palette[item.phase % palette.length],
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
    const url = match ? trailerEmbedUrl(match) : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(`${item.title} trailer`)}`;
    setTrailer({ title: item.title, url });
  };
  const resetFilters = () => { setQuery(''); setGenre('All'); setRating(0); setSortBy('order'); };

  return (
    <main className="movie-site">
      <div className="site-glow" />
      <header className="site-header">
        <button className="brand" onClick={() => { setSection('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span>MCU</span><b>MCU Viewing Order</b></button>
        <div className="universe-tabs" role="tablist" aria-label="Universe">
          <button className={universe === 'marvel' ? 'active' : ''} onClick={() => { setUniverse('marvel'); setHeroIndex(0); }}>Marvel</button>
          <button className={universe === 'dc' ? 'active' : ''} onClick={() => { setUniverse('dc'); setHeroIndex(0); }}>DC</button>
        </div>
      </header>

      <section className="control-strip">
        <label className="search-box web-search"><Search size={22} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search movie" /></label>
        <button className="pill-button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={20} /> Filters</button>
        <button className="pill-button muted" onClick={resetFilters}><RotateCcw size={18} /> Reset</button>
      </section>

      {section === 'home' && <>
        <section className="hero-layout">
          <div className="hero-copy">
            <p className="eyebrow">{universe === 'marvel' ? 'Marvel timeline' : 'DC timeline'} · {activeItems.length} titles</p>
            <h1>Track every film and series in a cinematic viewing dashboard.</h1>
            <p>Search, filter, save, mark progress, open details, and switch between Marvel and DC without losing the polished dark movie-app style.</p>
            <div className="hero-actions"><button onClick={() => playTrailer(featured)}><Play size={18} fill="currentColor" /> Watch trailer</button><button onClick={() => setSelected(featured)}>Open details</button></div>
          </div>
          <TopCarousel items={heroItems} featured={featured} heroIndex={heroIndex} setHeroIndex={setHeroIndex} setSelected={setSelected} playTrailer={playTrailer} />
        </section>
        <SuggestionStrip nextUp={nextUp} stats={stats} setSelected={setSelected} playTrailer={playTrailer} />
        <AnalyticsPanel stats={stats} />
        <MovieRail title="Recommended" items={activeItems.slice(6, 18)} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />
      </>}

      {section === 'list' && <ListSection items={activeItems} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}
      {section === 'analytics' && <><AnalyticsPanel stats={stats} large /><MovieRail title="In progress" items={activeItems.filter(i => i.userStatus === 'watching')} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} /></>}
      {section === 'saved' && <MovieRail title="Saved titles" items={activeItems.filter(i => i.bookmarked)} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} empty="No saved titles yet. Tap bookmarks on any card." />}

      <nav className="bottom-nav web-bottom" aria-label="Primary">
        <button className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}><Home /></button>
        <button className={section === 'list' ? 'active' : ''} onClick={() => setSection('list')}><ListFilter /></button>
        <button className={section === 'analytics' ? 'active' : ''} onClick={() => setSection('analytics')}><BarChart3 /></button>
        <button className={section === 'saved' ? 'active' : ''} onClick={() => setSection('saved')}><UserRound /></button>
      </nav>

      {selectedItem && <DetailView item={selectedItem} onClose={() => setSelected(null)} toggleWatched={toggleWatched} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}
      {trailer && <TrailerModal trailer={trailer} onClose={() => setTrailer(null)} />}
      {filtersOpen && <Filters genre={genre} setGenre={setGenre} rating={rating} setRating={setRating} sortBy={sortBy} setSortBy={setSortBy} genres={genres} count={activeItems.length} onClose={() => setFiltersOpen(false)} />}
    </main>
  );
}

function TopCarousel({ items, featured, heroIndex, setHeroIndex, setSelected, playTrailer }) {
  const move = (dir) => setHeroIndex((heroIndex + dir + items.length) % Math.max(items.length, 1));
  return <section className="top-carousel" style={{ '--accent': featured?.accent || '#d6202d' }}>
    <div className="section-title"><h2>TOP MOVIES</h2><button onClick={() => setSelected(featured)}>Details</button></div>
    <div className="carousel-controls"><button onClick={() => move(-1)}><ChevronLeft /></button><button onClick={() => playTrailer(featured)}><Play fill="currentColor" /></button><button onClick={() => move(1)}><ChevronRight /></button></div>
    <div className="poster-stack smooth-stack">
      {items.map((item, rawIndex) => { const offset = (rawIndex - heroIndex + items.length) % items.length; if (offset > 2) return null; return <button key={item.id} className={`stack-poster poster-${offset}`} onClick={() => setSelected(item)} style={{ '--accent': item.accent }}><PosterArt item={item} /><Bookmark className="save" size={18} /></button>; })}
    </div>
    <div className="hero-meta"><h3>{featured?.title}</h3><div className="dots">{items.slice(0, 4).map((item, index) => <button key={item.id} className={item.id === featured?.id ? 'active' : ''} onClick={() => setHeroIndex(index)} />)}</div></div>
    <div className="chips">{featured?.genres.slice(0, 4).map(g => <span key={g}>{g}</span>)}</div>
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
    <div className="card-actions"><button onClick={() => playTrailer(item)} className="trailer-chip"><Play size={14} fill="currentColor" />Trailer</button><StatusSelect item={item} setStatus={setStatus} compact /><button onClick={() => toggleBookmark(item)} className={item.bookmarked ? 'saved' : ''}><Bookmark fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
  </article>;
}

function ListSection({ items, setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer }) {
  return <section className="list-section"><div className="section-title"><h2>Complete list</h2><button>{items.length} results</button></div>{items.map((item, index) => <article className="list-row" key={item.id} style={{ '--accent': item.accent }}><b>{String(index + 1).padStart(2, '0')}</b><button className="list-poster" onClick={() => setSelected(item)}><PosterArt item={item} /></button><button onClick={() => setSelected(item)}>{item.title}<span>{item.year} · {item.type} · {runtimeLabel(item.runtime, item.type)}</span></button><div className="chips">{item.genres.slice(0,2).map(g => <span key={g}>{g}</span>)}</div><button onClick={() => playTrailer(item)}><Play size={16} fill="currentColor" /></button><StatusSelect item={item} setStatus={setStatus} /><button onClick={() => toggleBookmark(item)}><Bookmark fill={item.bookmarked ? 'currentColor' : 'none'} /></button></article>)}</section>;
}


function StatusSelect({ item, setStatus, compact = false }) {
  return <label className={`status-select ${item.userStatus} ${compact ? 'compact' : ''}`}>
    <span>{compact ? '' : 'Status'}</span>
    <select value={item.userStatus} onChange={event => setStatus(item, event.target.value)} aria-label={`Set status for ${item.title}`}>
      {STATUS.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
    </select>
  </label>;
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

function DetailView({ item, onClose, toggleWatched, setStatus, toggleBookmark, playTrailer }) {
  return <aside className="detail-screen web-detail" style={{ '--accent': item.accent }}>
    <div className="detail-actions"><button onClick={onClose}><ArrowLeft /></button><button onClick={() => toggleBookmark(item)}><Bookmark fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
    <div className="wide-poster"><PosterArt item={item} /><button className="play" onClick={() => playTrailer(item)}><Play fill="currentColor" /></button></div>
    <section className="red-panel"><h1>{item.title}</h1><div className="chips"><span className="imdb">IMDB {item.rating.toFixed ? item.rating.toFixed(1) : item.rating}</span>{item.genres.slice(0,3).map(g => <span key={g}>{g}</span>)}</div></section>
    <section className="facts"><b>{item.year}</b><b>{item.universe.toUpperCase()}</b><b>{runtimeLabel(item.runtime, item.type)}</b><span><Calendar size={14}/> Year</span><span><Sparkles size={14}/> Universe</span><span><Timer size={14}/> Time</span></section>
    <section className="description"><p>{item.desc || `Follow ${item.title} in the ${item.universe === 'marvel' ? 'Marvel' : 'DC'} viewing order.`}</p><div>{[0,1,2,3,4].map(i => <Star key={i} className={i < 4 ? 'gold' : ''} size={18} fill="currentColor" />)}</div><div className="detail-cta-row"><button className="show-results" onClick={() => toggleWatched(item)}>{item.userStatus === 'watched' ? 'Mark unwatched' : 'Mark watched'}</button><StatusSelect item={item} setStatus={setStatus} /></div></section>
  </aside>;
}

function TrailerModal({ trailer, onClose }) {
  return <aside className="trailer-modal"><div><button className="trailer-close" onClick={onClose}><X /></button><h2>{trailer.title} trailer</h2><iframe src={trailer.url} title={`${trailer.title} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></aside>;
}

function Filters({ genre, setGenre, rating, setRating, sortBy, setSortBy, genres, count, onClose }) {
  return <aside className="filter-screen web-filter">
    <div className="filter-head"><button onClick={() => { setGenre('All'); setRating(0); setSortBy('order'); }}>Clear All</button><b>Filters</b><button onClick={onClose}><X /></button></div>
    <label>Sort by</label><select className="select-row native-select" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="order">Recommended</option><option value="year">Year</option><option value="title">Title</option></select>
    <label>Minimum rating</label><select className="select-row native-select" value={rating} onChange={e => setRating(Number(e.target.value))}><option value={0}>Any rating</option><option value={8}>8 &</option><option value={7}>7 &</option><option value={6}>6 &</option></select>
    <div className="genre-title">Genres <span>{genre === 'All' ? 0 : 1}</span></div><div className="filter-chips">{genres.map(g => <button key={g} className={genre === g ? 'selected' : ''} onClick={() => setGenre(g)}>{g}</button>)}</div>
    <button className="show-results" onClick={onClose}>Show {count} results</button>
  </aside>;
}
