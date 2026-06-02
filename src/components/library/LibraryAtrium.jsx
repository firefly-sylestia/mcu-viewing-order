import React, { useMemo } from 'react';
import { Bookmark, Clock, Layers, Search, Star, PlayCircle, ChevRight } from '../../constants/icons.jsx';
import { CHARACTER_POV_TITLE_SETS } from '../../data/timelineModes.js';
import { collectionMatchesItem, getLibraryCollections, phaseCollectionsForUniverse } from '../../data/libraryCollections.js';
import ArchiveCard from './ArchiveCard.jsx';
import CollectionRooms from './CollectionRooms.jsx';
import './LibraryAtrium.css';

function Shelf({ title, kicker, items, empty, renderItem, archival = false }) {
  return (
    <section className={`library-shelf archive-shelf${archival ? ' library-shelf--archival' : ''}`} aria-label={title}>
      <div className="library-shelf__head"><div><p>{kicker}</p><h2>{title}</h2></div><span>{items.length} titles</span></div>
      {items.length ? <div className="library-shelf__rail">{items.map(renderItem)}</div> : <div className="library-shelf__empty">{empty}</div>}
    </section>
  );
}

export default function LibraryAtrium({
  mode = 'library',
  items = [],
  filteredItems = [],
  search,
  setSearch,
  universe = 'mcu',
  phases = [],
  activeCollectionId,
  setActiveCollectionId,
  collections = getLibraryCollections(universe),
  posterSrc,
  getRating,
  releaseStatusFor,
  bookmarks = {},
  historyItems = [],
  timelineMode,
  setTimelineMode,
  timelineModes = [],
  onOpenDetail,
  onSetStatus,
  onToggleBookmark,
  onOpenCatalog,
}) {
  const source = filteredItems.length ? filteredItems : items;
  const essentials = useMemo(() => source.filter((item) => item.essential).slice(0, 18), [source]);
  const continueWatching = useMemo(() => source.filter((item) => item.status === 'watching').slice(0, 18), [source]);
  const watchlist = useMemo(() => source.filter((item) => item.status === 'plan-to-watch').slice(0, 18), [source]);
  const bookmarked = useMemo(() => source.filter((item) => bookmarks[item.id]).slice(0, 18), [source, bookmarks]);
  const recentlyAdded = useMemo(() => [...source].sort((a, b) => (b.year || 0) - (a.year || 0) || (b.order || 0) - (a.order || 0)).slice(0, 18), [source]);
  const recentlyWatched = useMemo(() => (historyItems.length ? historyItems : source.filter((item) => item.watchedDate)).slice(0, 18), [historyItems, source]);
  const postCreditImportant = useMemo(() => collections.find((collection) => collection.id === 'after-credits'), [collections]);
  const postCreditItems = useMemo(() => postCreditImportant ? source.filter((item) => collectionMatchesItem(postCreditImportant, item, { universe })).slice(0, 18) : [], [postCreditImportant, source, universe]);
  const characterArcShelves = useMemo(() => Object.entries(CHARACTER_POV_TITLE_SETS).map(([id, set]) => ({ id, title: `${id[0].toUpperCase()}${id.slice(1)} Arc`, items: source.filter((item) => set.has(item.title)).slice(0, 14) })).filter((shelf) => shelf.items.length), [source]);
  const allCollections = useMemo(() => [...collections, ...phaseCollectionsForUniverse(universe)], [collections, universe]);
  const renderCard = (variant = 'shelf') => (item) => <ArchiveCard key={item.id} item={item} poster={posterSrc?.(item)} rating={getRating?.(item)} status={item.status} isBookmarked={Boolean(bookmarks[item.id])} isWatched={item.status === 'watched'} releaseStatus={releaseStatusFor?.(item)} onOpenDetail={onOpenDetail} onSetStatus={onSetStatus} onToggleBookmark={onToggleBookmark} variant={variant} />;
  const heroItem = continueWatching[0] || watchlist[0] || essentials[0] || source[0];
  const recommended = source.find((item) => item.status !== 'watched' && item.essential) || source.find((item) => item.status !== 'watched') || source[0];
  const featuredCollection = collections.find((collection) => source.some((item) => collectionMatchesItem(collection, item, { universe }))) || collections[0];
  const featuredCollectionItems = featuredCollection ? source.filter((item) => collectionMatchesItem(featuredCollection, item, { universe })).slice(0, 6) : [];
  const lexicon = universe === 'dc'
    ? { home: 'Watchtower Dispatch', next: 'Recommended patrol', essentials: 'Core heroic arcs', featured: 'Featured case file', recent: 'Recent field notes', library: 'DC Archive Vault', sub: 'Browse eras, legacies, Elseworlds, and team paths with dense catalog controls.', search: 'Search heroes, arcs, cities…' }
    : { home: 'Mission Dispatch', next: 'Recommended next mission', essentials: 'Essential saga nodes', featured: 'Featured saga file', recent: 'Recent activity', library: 'Marvel Archive Vault', sub: 'Browse phases, sagas, specials, and character paths with dense catalog controls.', search: 'Search titles, phases, stingers…' };

  if (mode === 'home') {
    return (
      <div className="home-collections" data-universe={universe}>
        <section className="home-collections__hero archive-surface">
          <div className="home-collections__copy">
            <p>{lexicon.home}</p>
            <h1>Pick up the best path from here.</h1>
            <span>Curated shortcuts for what to resume, what matters next, and which collection deserves attention.</span>
            <div className="home-collections__actions">
              <button type="button" onClick={() => heroItem && onOpenDetail?.(heroItem)}><PlayCircle size={17} /> Continue</button>
              <button type="button" onClick={onOpenCatalog}><Search size={17} /> Search archive</button>
            </div>
          </div>
          {heroItem && <button type="button" className="home-feature-card" onClick={() => onOpenDetail?.(heroItem)}>
            <img src={posterSrc?.(heroItem)} alt="" />
            <span><small>Continue watching</small><strong>{heroItem.title}</strong><em>{heroItem.year || 'Timeline'} · {heroItem.status || 'ready'}</em></span>
          </button>}
        </section>

        <section className="home-action-grid" aria-label="Curated home shortcuts">
          {[recommended && { id: 'next', title: lexicon.next, item: recommended, icon: '▶' }, essentials[0] && { id: 'essentials', title: lexicon.essentials, item: essentials[0], icon: '★' }, featuredCollection && { id: 'featured', title: lexicon.featured, collection: featuredCollection, icon: featuredCollection.icon }, recentlyWatched[0] && { id: 'recent', title: lexicon.recent, item: recentlyWatched[0], icon: '↺' }].filter(Boolean).map((card) => (
            <button key={card.id} type="button" className="home-action-card" style={{ '--card-accent': card.collection?.accent || 'var(--theme-accent)' }} onClick={() => card.collection ? setActiveCollectionId?.(card.collection.id) : onOpenDetail?.(card.item)}>
              <span className="home-action-card__icon">{card.icon}</span>
              <span><small>{card.title}</small><strong>{card.collection?.title || card.item?.title}</strong><em>{card.collection ? `${featuredCollectionItems.length} titles ready` : `${card.item?.year || 'Timeline'} · ${card.item?.type || 'title'}`}</em></span>
              <ChevRight size={15} />
            </button>
          ))}
        </section>

        <CollectionRooms collections={collections.slice(0, 6)} items={items} universe={universe} posterSrc={posterSrc} activeCollectionId={activeCollectionId} onSelectCollection={(collection) => setActiveCollectionId?.(collection.id)} variant="home" />
        <Shelf title={lexicon.essentials} kicker="Curated" items={essentials.slice(0, 10)} empty="Your curated essentials will appear here as the archive grows." renderItem={renderCard('shelf')} />
        <Shelf title="Recently Added" kicker="Fresh picks" items={recentlyAdded.slice(0, 10)} empty="No recent titles available." renderItem={renderCard('compact')} />
      </div>
    );
  }

  return (
    <div className="library-atrium" data-universe={universe}>
      <section className="library-atrium__hero archive-surface">
        <div className="library-atrium__hero-copy">
          <p>{lexicon.library}</p>
          <h1>{universe === 'dc' ? 'Structured dossiers for every DC path.' : 'Complete catalog for every watch path.'}</h1>
          <span>{lexicon.sub}</span>
          <label className="library-atrium__search">
            <Search size={19} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} onFocus={onOpenCatalog} placeholder={lexicon.search} />
            <button type="button" onClick={onOpenCatalog}>Command Catalog</button>
          </label>
          <div className="library-atrium__facet-strip" aria-label="Timeline sort facet">
            <span><Layers size={13} /> Sort / POV</span>
            {timelineModes.map((mode) => <button key={mode.id} data-active={timelineMode === mode.id} onClick={() => setTimelineMode?.(mode.id)}>{mode.label}</button>)}
          </div>
        </div>
        {heroItem && <ArchiveCard item={heroItem} poster={posterSrc?.(heroItem)} rating={getRating?.(heroItem)} status={heroItem.status} isBookmarked={Boolean(bookmarks[heroItem.id])} isWatched={heroItem.status === 'watched'} releaseStatus={releaseStatusFor?.(heroItem)} onOpenDetail={onOpenDetail} onSetStatus={onSetStatus} onToggleBookmark={onToggleBookmark} variant="hero" />}
      </section>

      <div className="library-atrium__stats">
        <div><Clock size={16} /><strong>{continueWatching.length}</strong><span>In Progress</span></div>
        <div><Bookmark size={16} /><strong>{bookmarked.length}</strong><span>Pinned Records</span></div>
        <div><Star size={16} /><strong>{essentials.length}</strong><span>Essential Records</span></div>
        <div><Layers size={16} /><strong>{allCollections.length}</strong><span>Archive Rooms</span></div>
      </div>

      <CollectionRooms collections={allCollections} items={items} universe={universe} posterSrc={posterSrc} activeCollectionId={activeCollectionId} onSelectCollection={(collection) => setActiveCollectionId?.(collection.id)} />
      <Shelf archival title="Full Watchlist" kicker="Queue" items={watchlist} empty="Queued titles appear here when marked plan-to-watch." renderItem={renderCard('compact')} />
      <Shelf archival title="Recently Added Records" kicker="Archive index" items={recentlyAdded} empty="No recent titles available." renderItem={renderCard('compact')} />
      <Shelf archival title="Essential Index" kicker={universe === 'dc' ? 'Core heroic records' : 'Core canon records'} items={essentials} empty="No essential titles match current facets." renderItem={renderCard('compact')} />
      {characterArcShelves.map((shelf) => <Shelf archival key={shelf.id} title={shelf.title} kicker="Character file" items={shelf.items} empty="" renderItem={renderCard('compact')} />)}
      <Shelf archival title={universe === 'dc' ? 'Tag Scene / Specials Index' : 'Post-credit Important'} kicker={universe === 'dc' ? 'Bonus dossiers' : 'Stinger map'} items={postCreditItems} empty="No bonus-scene required titles match current facets." renderItem={renderCard('compact')} />
      <Shelf archival title="Recently Watched Archive" kicker="History" items={recentlyWatched} empty="Watched history appears here once you complete titles." renderItem={renderCard('compact')} />
    </div>
  );
}
