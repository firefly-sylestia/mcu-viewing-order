import React, { useMemo, useState } from 'react';
import { Search, SlidersH, X } from '../../constants/icons.jsx';
import { matchesSearch } from '../../utils/searchUtils.js';
import ArchiveCard from './ArchiveCard.jsx';
import './CommandCatalog.css';

const setOrNull = (current, value) => current === value ? null : value;
const chipLabel = (value) => String(value || '').replace(/-/g, ' ');

export default function CommandCatalog({
  items = [],
  search,
  setSearch,
  searchScope,
  sortBy,
  setSortBy,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  activePhase,
  setActivePhase,
  essentialOnly,
  setEssOnly,
  watchedOnly,
  setWatchedOnly,
  autoHideStatuses,
  setAutoHideStatuses,
  releaseFilter = 'all',
  setReleaseFilter,
  timelineMode,
  setTimelineMode,
  timelineModes = [],
  collections = [],
  activeCollectionId,
  setActiveCollectionId,
  phases = [],
  posterSrc,
  getRating,
  releaseStatusFor,
  onOpenDetail,
  onSetStatus,
  onToggleBookmark,
  bookmarks = {},
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const resultItems = useMemo(() => {
    const q = search || '';
    return items.filter((item) => matchesSearch(item, q, {}, searchScope)).sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'year') return (a.year || 0) - (b.year || 0);
      if (sortBy === 'runtime') return (a.episodes || (a.type === 'film' ? 2.3 : 6)) - (b.episodes || (b.type === 'film' ? 2.3 : 6));
      if (sortBy === 'watched') return (b.watchedDate || '').localeCompare(a.watchedDate || '');
      if (sortBy === 'status') return String(a.status).localeCompare(String(b.status));
      return (a.order || 0) - (b.order || 0);
    });
  }, [items, search, searchScope, sortBy]);

  const activeChips = [
    typeFilter && ['Type', typeFilter, () => setTypeFilter(null)],
    statusFilter && ['Status', statusFilter, () => setStatusFilter(null)],
    activePhase && ['Phase', activePhase, () => setActivePhase(0)],
    activeCollectionId && ['Collection', collections.find(c => c.id === activeCollectionId)?.title || activeCollectionId, () => setActiveCollectionId(null)],
    releaseFilter !== 'all' && ['Release', releaseFilter, () => setReleaseFilter?.('all')],
    essentialOnly && ['Essentials', 'on', () => setEssOnly(false)],
    watchedOnly && ['Watched', 'only', () => setWatchedOnly(false)],
    autoHideStatuses && ['Auto hide', 'complete', () => setAutoHideStatuses(false)],
  ].filter(Boolean);

  const Facets = () => (
    <div className="command-catalog__facets">
      <div className="command-catalog__facet-group"><span>Type</span>{['film', 'series', 'short'].map(type => <button key={type} data-active={typeFilter === type} onClick={() => setTypeFilter(setOrNull(typeFilter, type))}>{chipLabel(type)}</button>)}</div>
      <div className="command-catalog__facet-group"><span>Status</span>{['watching', 'plan-to-watch', 'watched', 'unwatched'].map(status => <button key={status} data-active={statusFilter === status} onClick={() => setStatusFilter(setOrNull(statusFilter, status))}>{chipLabel(status)}</button>)}</div>
      <div className="command-catalog__facet-group"><span>Phase</span><button data-active={!activePhase} onClick={() => setActivePhase(0)}>All</button>{phases.map(phase => <button key={phase.id} data-active={activePhase === phase.id} onClick={() => setActivePhase(activePhase === phase.id ? 0 : phase.id)}>{phase.name}</button>)}</div>
      <div className="command-catalog__facet-group"><span>Saga</span>{timelineModes.map(mode => <button key={mode.id} data-active={timelineMode === mode.id} onClick={() => setTimelineMode?.(mode.id)}>{mode.label}</button>)}</div>
      <div className="command-catalog__facet-group"><span>Release</span>{['all', 'released', 'upcoming'].map(value => <button key={value} data-active={releaseFilter === value} onClick={() => setReleaseFilter?.(value)}>{chipLabel(value)}</button>)}</div>
      <div className="command-catalog__facet-group"><span>Collection</span>{collections.slice(0, 8).map(collection => <button key={collection.id} data-active={activeCollectionId === collection.id} onClick={() => setActiveCollectionId(activeCollectionId === collection.id ? null : collection.id)}>{collection.title}</button>)}</div>
      <div className="command-catalog__facet-group"><span>Runtime</span>{['order', 'runtime', 'year', 'title', 'watched', 'status'].map(value => <button key={value} data-active={sortBy === value} onClick={() => setSortBy(value)}>{chipLabel(value)}</button>)}</div>
      <div className="command-catalog__facet-group"><span>Rating</span><button data-active={essentialOnly} onClick={() => setEssOnly(!essentialOnly)}>Essentials</button><button data-active={watchedOnly} onClick={() => setWatchedOnly(!watchedOnly)}>Watched only</button><button data-active={autoHideStatuses} onClick={() => setAutoHideStatuses(!autoHideStatuses)}>Hide complete</button></div>
    </div>
  );

  return (
    <section className="command-catalog archive-surface" aria-label="Command Catalog search">
      <div className="command-catalog__hero">
        <p>Command Catalog</p>
        <h1>Search the archive with facets.</h1>
        <label className="command-catalog__search">
          <Search size={20} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find titles, characters, phases, stingers…" autoComplete="off" />
          <button type="button" onClick={() => setMobileFiltersOpen(true)}><SlidersH size={16} /> Filters</button>
        </label>
        <div className="command-catalog__active-chips">
          {activeChips.map(([kind, value, remove]) => <button key={`${kind}-${value}`} onClick={remove}>{kind}: {chipLabel(value)} <X size={12} /></button>)}
        </div>
      </div>

      <div className="command-catalog__desktop-facets"><Facets /></div>
      {mobileFiltersOpen && <div className="command-catalog__sheet" role="dialog" aria-label="Catalog filters"><div><button className="command-catalog__sheet-close" onClick={() => setMobileFiltersOpen(false)}><X size={14} /> Close</button><Facets /><button className="command-catalog__show-results" onClick={() => setMobileFiltersOpen(false)}>Show {resultItems.length} Results</button></div></div>}

      <div className="command-catalog__result-head"><strong>{resultItems.length} Results</strong><span>Sorting stays scoped to the current catalog result set.</span></div>
      {resultItems.length ? (
        <div className="command-catalog__grid">
          {resultItems.map(item => <ArchiveCard key={item.id} item={item} poster={posterSrc?.(item)} rating={getRating?.(item)} status={item.status} isBookmarked={Boolean(bookmarks[item.id])} isWatched={item.status === 'watched'} releaseStatus={releaseStatusFor?.(item)} onOpenDetail={onOpenDetail} onSetStatus={onSetStatus} onToggleBookmark={onToggleBookmark} variant="grid" />)}
        </div>
      ) : (
        <div className="command-catalog__empty"><strong>No catalog matches.</strong><span>Try clearing a chip, switching collections, or browsing Essentials and After-Credits rooms.</span><button onClick={() => { setSearch(''); setTypeFilter(null); setStatusFilter(null); setActivePhase(0); setEssOnly(false); setWatchedOnly(false); setActiveCollectionId(null); }}>Clear focused filters</button></div>
      )}
    </section>
  );
}
