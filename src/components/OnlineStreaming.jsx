import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Clapperboard, Film, Search, Tv, Play, Star } from 'lucide-react';
import { apiUrl } from '../utils/apiBase';

const CATEGORIES = [
  { id: 'trending', label: 'Trending' },
  { id: 'movies', label: 'Movies' },
  { id: 'tv', label: 'TV shows' },
  { id: 'now-playing', label: 'Now playing' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'on-air', label: 'On the air' },
  { id: 'airing-today', label: 'Airing today' },
  { id: 'top-rated', label: 'Top rated' },
  { id: 'marvel', label: 'MCU' },
  { id: 'dc', label: 'DC' },
];

export default function OnlineStreaming({ onBack, onPlay }) {
  const [category, setCategory] = useState('trending');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pendingScrollTopRef = useRef(null);
  useLayoutEffect(() => {
    if (pendingScrollTopRef.current == null) return;
    const top = pendingScrollTopRef.current;
    pendingScrollTopRef.current = null;
    window.scrollTo(0, top);
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(apiUrl(`/api/tmdb/catalogue?category=${encodeURIComponent(category)}&page=${page}`), { cache: 'force-cache' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Catalogue is temporarily unavailable.')))
      .then(data => { if (!cancelled) setItems(previous => page===1 ? (Array.isArray(data.results)?data.results:[]) : [...previous,...(data.results||[]).filter(item=>!previous.some(old=>old.type===item.type&&old.id===item.id))]); })
      .catch(reason => { if (!cancelled) { setItems([]); setError(reason.message || 'Could not load titles.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category, page, refreshToken]);

  useEffect(() => { const term=query.trim(); if(term.length<2){setSearchResults([]);setSearchLoading(false);return undefined;} let active=true; const timer=window.setTimeout(()=>{setSearchLoading(true);fetch(apiUrl('/api/tmdb/search?q='+encodeURIComponent(term))).then(response=>response.ok?response.json():Promise.reject(new Error('Search unavailable'))).then(data=>{if(active)setSearchResults(data.results||[]);}).catch(()=>{if(active)setSearchResults([]);}).finally(()=>{if(active)setSearchLoading(false);});},280); return()=>{active=false;window.clearTimeout(timer);}; },[query]);

  const visible = useMemo(() => query.trim().length>=2 ? searchResults : items, [items, query, searchResults]);

  const heading = CATEGORIES.find(entry => entry.id === category)?.label || 'Trending';
  return <main className="online-catalogue">
    <header className="online-catalogue-head">
      <button type="button" className="online-back" onClick={onBack} aria-label="Back"><ArrowLeft size={19}/></button>
      <div><span>INCURSION · DISCOVER</span><h1>Online streaming</h1><p>Explore movies and series beyond the timelines.</p></div>
    </header>
    <div className="online-catalogue-tools">
      <label className="online-search"><Search size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find a title in this collection"/></label>
      <div className="online-categories" role="tablist" aria-label="Catalogue categories">
        {CATEGORIES.map(entry=><button type="button" key={entry.id} role="tab" aria-selected={category===entry.id} className={category===entry.id?'active':''} onClick={()=>{setCategory(entry.id);setPage(1);setItems([]);}}>{entry.label}</button>)}
      </div>
    </div>
    <section className="online-catalogue-section">
      <div className="online-section-title"><div><span>THE COLLECTION</span><h2>{heading}</h2></div><small>{loading||searchLoading?'Loading…':`${visible.length} titles`}</small></div>
      {loading||searchLoading ? <div className="online-loading"><span/>Curating your catalogue…</div> : error ? <div className="online-empty"><Clapperboard size={24}/><p>{error}</p><button onClick={()=>{setItems([]);setPage(1);setRefreshToken(value=>value+1);}}>Try again</button></div> : visible.length ? <div className="online-grid">
        {visible.map(item=><article className="online-title" key={`${item.type}-${item.id}`}>
          <button type="button" className="online-poster" onClick={()=>onPlay(item)} aria-label={`Watch ${item.title}`}>
            {item.poster?<img src={item.poster} alt="" loading="lazy"/>:<span><Film size={24}/></span>}
            <i><Play size={17} fill="currentColor"/></i>
          </button>
          <div className="online-title-copy"><strong>{item.title}</strong><span>{item.year || 'Date TBA'} · {item.type==='tv'?'Series':'Movie'}</span><small>{item.rating?<><Star size={11} fill="currentColor"/> {item.rating}</>:'Rating unavailable'}</small></div>
        </article>)}
      </div> : <div className="online-empty"><Tv size={24}/><p>No titles match that search.</p></div>}
      {query.trim().length<2 && visible.length>0 && <button type="button" className="online-load-more" disabled={loading||page>=20} onClick={()=>{pendingScrollTopRef.current=window.scrollY;setPage(value=>Math.min(20,value+1));}}>{loading?'Loading…':page>=20?'End of catalogue':'Load more titles'}</button>}
    </section>
    <p className="online-attribution">Catalogue metadata and artwork provided by TMDB. Incursion is not endorsed or certified by TMDB.</p>
  </main>;
}
