import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clapperboard, Film, Search, Tv, Play, Star } from 'lucide-react';
import { apiUrl } from '../utils/apiBase';

const CATEGORIES = [
  { id: 'trending', label: 'Trending' },
  { id: 'movies', label: 'Movies' },
  { id: 'tv', label: 'TV shows' },
  { id: 'marvel', label: 'Marvel' },
  { id: 'dc', label: 'DC' },
];

export default function OnlineStreaming({ onBack, onPlay }) {
  const [category, setCategory] = useState('trending');
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(apiUrl(`/api/tmdb/catalogue?category=${encodeURIComponent(category)}`), { cache: 'force-cache' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Catalogue is temporarily unavailable.')))
      .then(data => { if (!cancelled) setItems(Array.isArray(data.results) ? data.results : []); })
      .catch(reason => { if (!cancelled) { setItems([]); setError(reason.message || 'Could not load titles.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? items.filter(item => item.title?.toLowerCase().includes(term) || item.year?.includes(term)) : items;
  }, [items, query]);

  const heading = CATEGORIES.find(entry => entry.id === category)?.label || 'Trending';
  return <main className="online-catalogue">
    <header className="online-catalogue-head">
      <button type="button" className="online-back" onClick={onBack} aria-label="Back"><ArrowLeft size={19}/></button>
      <div><span>INCURSION · DISCOVER</span><h1>Online streaming</h1><p>Explore movies and series beyond the timelines.</p></div>
    </header>
    <div className="online-catalogue-tools">
      <label className="online-search"><Search size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find a title in this collection"/></label>
      <div className="online-categories" role="tablist" aria-label="Catalogue categories">
        {CATEGORIES.map(entry=><button type="button" key={entry.id} role="tab" aria-selected={category===entry.id} className={category===entry.id?'active':''} onClick={()=>setCategory(entry.id)}>{entry.label}</button>)}
      </div>
    </div>
    <section className="online-catalogue-section">
      <div className="online-section-title"><div><span>THE COLLECTION</span><h2>{heading}</h2></div><small>{loading?'Loading…':`${visible.length} titles`}</small></div>
      {loading ? <div className="online-loading"><span/>Curating your catalogue…</div> : error ? <div className="online-empty"><Clapperboard size={24}/><p>{error}</p><button onClick={()=>setCategory(value=>value)}>Try again</button></div> : visible.length ? <div className="online-grid">
        {visible.map(item=><article className="online-title" key={`${item.type}-${item.id}`}>
          <button type="button" className="online-poster" onClick={()=>onPlay(item)} aria-label={`Watch ${item.title}`}>
            {item.poster?<img src={item.poster} alt="" loading="lazy"/>:<span><Film size={24}/></span>}
            <i><Play size={17} fill="currentColor"/></i>
          </button>
          <div className="online-title-copy"><strong>{item.title}</strong><span>{item.year || 'Date TBA'} · {item.type==='tv'?'Series':'Movie'}</span><small>{item.rating?<><Star size={11} fill="currentColor"/> {item.rating}</>:'Rating unavailable'}</small></div>
        </article>)}
      </div> : <div className="online-empty"><Tv size={24}/><p>No titles match that search.</p></div>}
    </section>
    <p className="online-attribution">Catalogue metadata and artwork provided by TMDB. Incursion is not endorsed or certified by TMDB.</p>
  </main>;
}
