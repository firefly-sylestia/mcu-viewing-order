import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Home, Bookmark, Play, UserRound, X, ChevronDown, ArrowLeft, Star } from 'lucide-react';
import { RAW } from './data/mcuData';
import { DC_RAW } from './data/dcData';
import './index.css';

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

const palette = ['#d6202d', '#8a1238', '#315f42', '#1f4977', '#6b3bc8', '#b36a17'];
const enhance = (item, universe) => ({
  ...item,
  universe,
  runtime: item.runtime || (item.type === 'series' ? (item.episodes || 6) * 42 : 125 + (item.id % 42)),
  rating: (6.7 + ((item.id * 17) % 25) / 10).toFixed(1),
  genres: item.type === 'series' ? ['Series', 'Action', 'Drama'] : ['Action', item.phase >= 4 ? 'Adventure' : 'Sci-fi', item.essential ? 'Essential' : 'Canon'],
  poster: localPoster(item),
  accent: item.id >= 5000 ? '#d6202d' : palette[item.phase % palette.length],
});

export default function App() {
  const [universe, setUniverse] = useState('marvel');
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [genre, setGenre] = useState('All');
  const [rating, setRating] = useState(0);

  const allItems = useMemo(() => [
    ...RAW.map(item => enhance(item, 'marvel')),
    ...DC_RAW.map(item => enhance(item, 'dc')),
  ], []);

  const activeItems = useMemo(() => allItems
    .filter(item => item.universe === universe)
    .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
    .filter(item => genre === 'All' || item.genres.includes(genre) || item.type === genre.toLowerCase())
    .filter(item => Number(item.rating) >= rating), [allItems, universe, query, genre, rating]);

  const heroItems = activeItems.slice(0, 5);
  const featured = selected || heroItems[0];
  const genres = ['All', 'Action', 'Adventure', 'Drama', 'Sci-fi', 'Essential', 'Series'];

  return (
    <main className="cinema-app">
      <div className="ambient" />
      <section className="phone-shell" aria-label="Movie viewing order app">
        <div className="status-bar"><span>9:41</span><span>▮▮▮ ᯤ ▰</span></div>
        <header className="topbar">
          <label className="search-box">
            <Search size={24} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search movie" />
          </label>
          <button className="round-button filter" onClick={() => setFiltersOpen(true)} aria-label="Open filters"><SlidersHorizontal /></button>
        </header>

        <div className="universe-toggle" role="tablist" aria-label="Universe">
          <button className={universe === 'marvel' ? 'active' : ''} onClick={() => setUniverse('marvel')}>Marvel</button>
          <button className={universe === 'dc' ? 'active' : ''} onClick={() => setUniverse('dc')}>DC</button>
        </div>

        <section className="hero-card">
          <div className="section-title"><h2>TOP MOVIES</h2><button>See all</button></div>
          <div className="poster-stack">
            {heroItems.slice(0, 3).map((item, index) => <MoviePoster key={item.id} item={item} index={index} onClick={() => setSelected(item)} />)}
          </div>
          <div className="hero-meta">
            <h3>{featured?.title}</h3>
            <div className="dots"><span /><span /><span /><span /></div>
          </div>
          <div className="chips">{featured?.genres.slice(0, 4).map(g => <span key={g}>{g}</span>)}</div>
        </section>

        <section className="rail-card">
          <div className="section-title"><h2>RECOMMENDED</h2><button>See all</button></div>
          <div className="movie-grid">
            {activeItems.slice(3, 15).map(item => <SmallCard key={item.id} item={item} onClick={() => setSelected(item)} />)}
          </div>
        </section>

        <nav className="bottom-nav" aria-label="Primary"><Home className="active" /><Bookmark /><Play /><UserRound /></nav>
      </section>

      {selected && <DetailView item={selected} onClose={() => setSelected(null)} />}
      {filtersOpen && <Filters genre={genre} setGenre={setGenre} rating={rating} setRating={setRating} genres={genres} count={activeItems.length} onClose={() => setFiltersOpen(false)} />}
    </main>
  );
}

function MoviePoster({ item, index, onClick }) {
  return <button className={`stack-poster poster-${index}`} onClick={onClick} style={{ '--accent': item.accent }}><PosterArt item={item} /><Bookmark className="save" size={18} /></button>;
}

function PosterArt({ item }) {
  return item.poster ? <img src={item.poster} alt={`${item.title} poster`} onError={e => { e.currentTarget.style.display = 'none'; }} /> : <div className="fallback-poster"><strong>{item.title}</strong><span>{item.year}</span></div>;
}

function SmallCard({ item, onClick }) {
  return <button className="small-card" onClick={onClick} style={{ '--accent': item.accent }}><PosterArt item={item} /><b>{item.title}</b><span>{item.year} · {item.type}</span></button>;
}

function DetailView({ item, onClose }) {
  return <aside className="detail-screen" style={{ '--accent': item.accent }}>
    <div className="status-bar"><span>9:41</span><span>▮▮▮ ᯤ ▰</span></div>
    <div className="detail-actions"><button onClick={onClose}><ArrowLeft /></button><button><Bookmark /></button></div>
    <div className="wide-poster"><PosterArt item={item} /><button className="play"><Play fill="currentColor" /></button></div>
    <section className="red-panel"><h1>{item.title}</h1><div className="chips"><span className="imdb">IMDB {item.rating}</span>{item.genres.slice(0,3).map(g => <span key={g}>{g}</span>)}</div></section>
    <section className="facts"><b>{item.year}</b><b>{item.universe.toUpperCase()}</b><b>{runtimeLabel(item.runtime, item.type)}</b><span>Year</span><span>Universe</span><span>Time</span></section>
    <section className="description"><p>{item.desc || `Follow ${item.title} in the ${item.universe === 'marvel' ? 'Marvel' : 'DC'} viewing order.`}</p><div>{[0,1,2,3,4].map(i => <Star key={i} className={i < 4 ? 'gold' : ''} size={18} fill="currentColor" />)}</div></section>
  </aside>;
}

function Filters({ genre, setGenre, rating, setRating, genres, count, onClose }) {
  return <aside className="filter-screen">
    <div className="filter-head"><button onClick={() => { setGenre('All'); setRating(0); }}>Clear All</button><b>Filters</b><button onClick={onClose}><X /></button></div>
    <label>Sort by</label><div className="select-row">Recommended <ChevronDown /></div>
    <label>Year</label><div className="select-row">2021 <ChevronDown /></div>
    <div className="genre-title">Genres <span>{genre === 'All' ? 0 : 1}</span></div>
    <div className="filter-chips">{genres.slice(1).map(g => <button key={g} className={genre === g ? 'selected' : ''} onClick={() => setGenre(genre === g ? 'All' : g)}>{g}</button>)}</div>
    <h3>Rating</h3>{[0, 8, 7, 6].map(r => <button className="rating-row" key={r} onClick={() => setRating(r)}><span>{r ? `${r} &` : 'Any rating'}</span><i className={rating === r ? 'checked' : ''} /></button>)}
    <button className="show-results" onClick={onClose}>Show {count} results</button>
  </aside>;
}
