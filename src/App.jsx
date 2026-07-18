import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Home, Bookmark, Play, UserRound, X, ChevronDown, ArrowLeft, Star, BarChart3, Check, Clock, ListFilter, RotateCcw } from 'lucide-react';
import { RAW } from './data/mcuData';
import { DC_RAW } from './data/dcData';
import './index.css';

const STORAGE_KEY = 'cinematic-viewing-ui-state-v2';
const STATUS = ['unwatched', 'watching', 'watched'];
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

  const allItems = useMemo(() => [...RAW.map(item => enhance(item, 'marvel')), ...DC_RAW.map(item => enhance(item, 'dc'))], []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ universe, query, genre, rating, sortBy, actions }));
  }, [universe, query, genre, rating, sortBy, actions]);

  const activeItems = useMemo(() => {
    const sorted = allItems
      .filter(item => item.universe === universe)
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
      .filter(item => genre === 'All' || item.genres.includes(genre) || item.type === genre.toLowerCase())
      .filter(item => Number(item.rating) >= rating)
      .map(item => ({ ...item, userStatus: actions[item.id]?.status || 'unwatched', bookmarked: Boolean(actions[item.id]?.bookmarked) }));
    sorted.sort((a, b) => sortBy === 'year' ? a.year - b.year : sortBy === 'title' ? a.title.localeCompare(b.title) : a.order - b.order);
    return sorted;
  }, [actions, allItems, universe, query, genre, rating, sortBy]);

  const heroItems = activeItems.slice(0, 6);
  const featured = heroItems[heroIndex % Math.max(heroItems.length, 1)] || activeItems[0];
  const genres = ['All', 'Action', 'Adventure', 'Drama', 'Sci-fi', 'Essential', 'Series'];
  const stats = useMemo(() => {
    const total = activeItems.length || 1;
    const watched = activeItems.filter(item => item.userStatus === 'watched').length;
    const watching = activeItems.filter(item => item.userStatus === 'watching').length;
    const bookmarked = activeItems.filter(item => item.bookmarked).length;
    return { total, watched, watching, bookmarked, percent: Math.round((watched / total) * 100) };
  }, [activeItems]);

  const updateAction = (item, patch) => setActions(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), ...patch } }));
  const cycleStatus = (item) => {
    const current = actions[item.id]?.status || 'unwatched';
    updateAction(item, { status: STATUS[(STATUS.indexOf(current) + 1) % STATUS.length] });
  };
  const toggleBookmark = (item) => updateAction(item, { bookmarked: !actions[item.id]?.bookmarked });
  const resetFilters = () => { setQuery(''); setGenre('All'); setRating(0); setSortBy('order'); };

  return (
    <main className="movie-site">
      <div className="site-glow" />
      <header className="site-header">
        <button className="brand" onClick={() => { setSection('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span>VO</span><b>Viewing Order</b></button>
        <nav className="desktop-nav">
          <button className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}>Home</button>
          <button className={section === 'list' ? 'active' : ''} onClick={() => setSection('list')}>List</button>
          <button className={section === 'analytics' ? 'active' : ''} onClick={() => setSection('analytics')}>Analytics</button>
          <button className={section === 'saved' ? 'active' : ''} onClick={() => setSection('saved')}>Saved</button>
        </nav>
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
            <div className="hero-actions"><button onClick={() => setSelected(featured)}><Play size={18} fill="currentColor" /> Open featured</button><button onClick={() => setSection('list')}>Browse list</button></div>
          </div>
          <TopCarousel items={heroItems} featured={featured} setHeroIndex={setHeroIndex} setSelected={setSelected} />
        </section>
        <AnalyticsPanel stats={stats} />
        <MovieRail title="Recommended" items={activeItems.slice(6, 18)} setSelected={setSelected} cycleStatus={cycleStatus} toggleBookmark={toggleBookmark} />
      </>}

      {section === 'list' && <ListSection items={activeItems} setSelected={setSelected} cycleStatus={cycleStatus} toggleBookmark={toggleBookmark} />}
      {section === 'analytics' && <><AnalyticsPanel stats={stats} large /><MovieRail title="In progress" items={activeItems.filter(i => i.userStatus === 'watching')} setSelected={setSelected} cycleStatus={cycleStatus} toggleBookmark={toggleBookmark} /></>}
      {section === 'saved' && <MovieRail title="Saved titles" items={activeItems.filter(i => i.bookmarked)} setSelected={setSelected} cycleStatus={cycleStatus} toggleBookmark={toggleBookmark} empty="No saved titles yet. Tap bookmarks on any card." />}

      <nav className="bottom-nav web-bottom" aria-label="Primary">
        <button className={section === 'home' ? 'active' : ''} onClick={() => setSection('home')}><Home /></button>
        <button className={section === 'list' ? 'active' : ''} onClick={() => setSection('list')}><ListFilter /></button>
        <button className={section === 'analytics' ? 'active' : ''} onClick={() => setSection('analytics')}><BarChart3 /></button>
        <button className={section === 'saved' ? 'active' : ''} onClick={() => setSection('saved')}><UserRound /></button>
      </nav>

      {selected && <DetailView item={selected} onClose={() => setSelected(null)} cycleStatus={cycleStatus} toggleBookmark={toggleBookmark} />}
      {filtersOpen && <Filters genre={genre} setGenre={setGenre} rating={rating} setRating={setRating} sortBy={sortBy} setSortBy={setSortBy} genres={genres} count={activeItems.length} onClose={() => setFiltersOpen(false)} />}
    </main>
  );
}

function TopCarousel({ items, featured, setHeroIndex, setSelected }) {
  return <section className="top-carousel" style={{ '--accent': featured?.accent || '#d6202d' }}>
    <div className="section-title"><h2>TOP MOVIES</h2><button onClick={() => setSelected(featured)}>See all</button></div>
    <div className="poster-stack smooth-stack">
      {items.slice(0, 3).map((item, index) => <button key={item.id} className={`stack-poster poster-${index}`} onClick={() => setSelected(item)} style={{ '--accent': item.accent }}><PosterArt item={item} /><Bookmark className="save" size={18} /></button>)}
    </div>
    <div className="hero-meta"><h3>{featured?.title}</h3><div className="dots">{items.slice(0, 4).map((item, index) => <button key={item.id} className={item.id === featured?.id ? 'active' : ''} onClick={() => setHeroIndex(index)} />)}</div></div>
    <div className="chips">{featured?.genres.slice(0, 4).map(g => <span key={g}>{g}</span>)}</div>
  </section>;
}

function PosterArt({ item }) {
  return item.poster ? <img src={item.poster} alt={`${item.title} poster`} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.removeAttribute('hidden'); }} /> : <FallbackPoster item={item} />;
}
function FallbackPoster({ item }) { return <div className="fallback-poster"><strong>{item.title}</strong><span>{item.year}</span></div>; }

function MovieRail({ title, items, setSelected, cycleStatus, toggleBookmark, empty }) {
  return <section className="rail-card web-rail"><div className="section-title"><h2>{title}</h2><button>{items.length} titles</button></div>{items.length ? <div className="movie-grid web-grid">{items.map(item => <MovieCard key={item.id} item={item} setSelected={setSelected} cycleStatus={cycleStatus} toggleBookmark={toggleBookmark} />)}</div> : <p className="empty-state">{empty || 'No titles match these filters.'}</p>}</section>;
}

function MovieCard({ item, setSelected, cycleStatus, toggleBookmark }) {
  return <article className="movie-card" style={{ '--accent': item.accent }}>
    <button className="poster-button" onClick={() => setSelected(item)}><PosterArt item={item} /></button>
    <div className="card-body"><button className="title-button" onClick={() => setSelected(item)}>{item.title}</button><span>{item.year} · {runtimeLabel(item.runtime, item.type)}</span></div>
    <div className="card-actions"><button onClick={() => cycleStatus(item)} className={item.userStatus}>{item.userStatus === 'watched' ? <Check /> : item.userStatus === 'watching' ? <Clock /> : <Play />}{item.userStatus}</button><button onClick={() => toggleBookmark(item)} className={item.bookmarked ? 'saved' : ''}><Bookmark fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
  </article>;
}

function ListSection({ items, setSelected, cycleStatus, toggleBookmark }) {
  return <section className="list-section"><div className="section-title"><h2>Complete list</h2><button>{items.length} results</button></div>{items.map((item, index) => <article className="list-row" key={item.id} style={{ '--accent': item.accent }}><b>{String(index + 1).padStart(2, '0')}</b><button onClick={() => setSelected(item)}>{item.title}<span>{item.year} · {item.type} · {runtimeLabel(item.runtime, item.type)}</span></button><div className="chips">{item.genres.slice(0,2).map(g => <span key={g}>{g}</span>)}</div><button onClick={() => cycleStatus(item)}>{item.userStatus}</button><button onClick={() => toggleBookmark(item)}><Bookmark fill={item.bookmarked ? 'currentColor' : 'none'} /></button></article>)}</section>;
}

function AnalyticsPanel({ stats, large = false }) {
  return <section className={`analytics-panel ${large ? 'large' : ''}`}><div><p className="eyebrow">Analytics</p><h2>{stats.percent}% complete</h2><div className="progress"><span style={{ width: `${stats.percent}%` }} /></div></div><div className="stat-grid"><div><b>{stats.total}</b><span>Total</span></div><div><b>{stats.watched}</b><span>Watched</span></div><div><b>{stats.watching}</b><span>Watching</span></div><div><b>{stats.bookmarked}</b><span>Saved</span></div></div></section>;
}

function DetailView({ item, onClose, cycleStatus, toggleBookmark }) {
  return <aside className="detail-screen web-detail" style={{ '--accent': item.accent }}>
    <div className="detail-actions"><button onClick={onClose}><ArrowLeft /></button><button onClick={() => toggleBookmark(item)}><Bookmark fill={item.bookmarked ? 'currentColor' : 'none'} /></button></div>
    <div className="wide-poster"><PosterArt item={item} /><button className="play"><Play fill="currentColor" /></button></div>
    <section className="red-panel"><h1>{item.title}</h1><div className="chips"><span className="imdb">IMDB {item.rating.toFixed ? item.rating.toFixed(1) : item.rating}</span>{item.genres.slice(0,3).map(g => <span key={g}>{g}</span>)}</div></section>
    <section className="facts"><b>{item.year}</b><b>{item.universe.toUpperCase()}</b><b>{runtimeLabel(item.runtime, item.type)}</b><span>Year</span><span>Universe</span><span>Time</span></section>
    <section className="description"><p>{item.desc || `Follow ${item.title} in the ${item.universe === 'marvel' ? 'Marvel' : 'DC'} viewing order.`}</p><div>{[0,1,2,3,4].map(i => <Star key={i} className={i < 4 ? 'gold' : ''} size={18} fill="currentColor" />)}</div><button className="show-results" onClick={() => cycleStatus(item)}>Mark status: {item.userStatus}</button></section>
  </aside>;
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
