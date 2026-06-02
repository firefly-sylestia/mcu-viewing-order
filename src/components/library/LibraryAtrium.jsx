import React, { useMemo } from 'react';
import { Bookmark, Clock, Layers, Search, Star, PlayCircle, ChevRight } from '../../constants/icons.jsx';
import { CHARACTER_POV_TITLE_SETS } from '../../data/timelineModes.js';
import { collectionMatchesItem, getLibraryCollections, phaseCollectionsForUniverse } from '../../data/libraryCollections.js';
import ArchiveCard from './ArchiveCard.jsx';
import CollectionRooms from './CollectionRooms.jsx';
import './LibraryAtrium.css';

function Shelf({ title, kicker, items, empty, renderItem, archival = false }) {
  return (
    <section className={`spectrum-rail-section${archival ? ' spectrum-rail-section--archival' : ''}`} aria-label={title}>
      <div className="spectrum-rail-section__head"><div><p>{kicker}</p><h2>{title}</h2></div><span>{items.length} titles</span></div>
      {items.length ? <div className="spectrum-rail-section__rail">{items.map(renderItem)}</div> : <div className="spectrum-empty">{empty}</div>}
    </section>
  );
}

export default function LibraryAtrium({ mode = 'library', items = [], filteredItems = [], search, setSearch, universe = 'mcu', activeCollectionId, setActiveCollectionId, collections = getLibraryCollections(universe), posterSrc, getRating, releaseStatusFor, bookmarks = {}, historyItems = [], timelineMode, setTimelineMode, timelineModes = [], onOpenDetail, onSetStatus, onToggleBookmark, onOpenCatalog }) {
  const source = filteredItems.length ? filteredItems : items;
  const watched = source.filter((item) => item.status === 'watched').length;
  const pct = source.length ? Math.round((watched / source.length) * 100) : 0;
  const essentials = useMemo(() => source.filter((item) => item.essential).slice(0, 18), [source]);
  const continueWatching = useMemo(() => source.filter((item) => item.status === 'watching').slice(0, 18), [source]);
  const watchlist = useMemo(() => source.filter((item) => item.status === 'plan-to-watch').slice(0, 18), [source]);
  const bookmarked = useMemo(() => source.filter((item) => bookmarks[item.id]).slice(0, 18), [source, bookmarks]);
  const recentlyAdded = useMemo(() => [...source].sort((a, b) => (b.year || 0) - (a.year || 0) || (b.order || 0) - (a.order || 0)).slice(0, 18), [source]);
  const recentlyWatched = useMemo(() => (historyItems.length ? historyItems : source.filter((item) => item.watchedDate)).slice(0, 18), [historyItems, source]);
  const postCreditImportant = useMemo(() => collections.find((collection) => collection.id === 'after-credits'), [collections]);
  const postCreditItems = useMemo(() => postCreditImportant ? source.filter((item) => collectionMatchesItem(postCreditImportant, item, { universe })).slice(0, 18) : [], [postCreditImportant, source, universe]);
  const characterArcShelves = useMemo(() => Object.entries(CHARACTER_POV_TITLE_SETS).map(([id, set]) => ({ id, title: `${id[0].toUpperCase()}${id.slice(1)} Path`, items: source.filter((item) => set.has(item.title)).slice(0, 14) })).filter((shelf) => shelf.items.length), [source]);
  const allCollections = useMemo(() => [...collections, ...phaseCollectionsForUniverse(universe)], [collections, universe]);
  const renderCard = (variant = 'shelf') => (item) => <ArchiveCard key={item.id} item={item} poster={posterSrc?.(item)} rating={getRating?.(item)} status={item.status} isBookmarked={Boolean(bookmarks[item.id])} isWatched={item.status === 'watched'} releaseStatus={releaseStatusFor?.(item)} onOpenDetail={onOpenDetail} onSetStatus={onSetStatus} onToggleBookmark={onToggleBookmark} variant={variant} />;
  const heroItem = continueWatching[0] || watchlist[0] || essentials[0] || source[0];
  const recommended = source.find((item) => item.status !== 'watched' && item.essential) || source.find((item) => item.status !== 'watched') || source[0];
  const featuredCollection = collections.find((collection) => source.some((item) => collectionMatchesItem(collection, item, { universe }))) || collections[0];
  const featuredCollectionItems = featuredCollection ? source.filter((item) => collectionMatchesItem(featuredCollection, item, { universe })).slice(0, 6) : [];

  if (mode === 'home') {
    return (
      <div className="spectrum-home" data-universe={universe}>
        <section className="spectrum-hero spectrum-wing-lines">
          <div className="spectrum-hero__copy">
            <p className="spectrum-eyebrow">Premium watch-order guide</p>
            <h1>Marvel Spectrum</h1>
            <span>Your cinematic path through every phase, arc, and universe.</span>
            <div className="spectrum-hero__actions">
              <button className="spectrum-button spectrum-button--primary" type="button" onClick={() => heroItem && onOpenDetail?.(heroItem)}><PlayCircle size={17} /> Continue Journey</button>
              <button className="spectrum-button spectrum-button--secondary" type="button" onClick={onOpenCatalog}><Search size={17} /> Explore Timeline</button>
            </div>
            <div className="spectrum-hero__summary"><strong>{pct}% complete</strong><span>{watched}/{source.length} watched</span><span>{bookmarked.length} bookmarked</span></div>
          </div>
          {heroItem && <button type="button" className="spectrum-hero-preview" onClick={() => onOpenDetail?.(heroItem)}>
            <img src={posterSrc?.(heroItem)} alt="" loading="eager" />
            <span><small>Continue Watching</small><strong>{heroItem.title}</strong><em>{heroItem.year || 'Timeline'} · {heroItem.status || 'ready'}</em></span>
          </button>}
        </section>

        <section className="spectrum-bento" aria-label="Spectrum dashboard shortcuts">
          {[recommended && { id: 'next', title: 'Today’s Next Watch', item: recommended, icon: '▶' }, essentials[0] && { id: 'essential', title: 'Next Essential', item: essentials[0], icon: '★' }, featuredCollection && { id: 'collection', title: 'Universe Switch', collection: featuredCollection, icon: featuredCollection.icon }, bookmarked[0] && { id: 'bookmarked', title: 'Bookmarked', item: bookmarked[0], icon: '◆' }, recentlyWatched[0] && { id: 'recent', title: 'Recent Progress', item: recentlyWatched[0], icon: '↺' }].filter(Boolean).map((card) => (
            <button key={card.id} type="button" className="spectrum-bento-card" style={{ '--card-accent': card.collection?.accent || 'var(--s-accent)' }} onClick={() => card.collection ? setActiveCollectionId?.(card.collection.id) : onOpenDetail?.(card.item)}>
              <span className="spectrum-bento-card__icon">{card.icon}</span><span><small>{card.title}</small><strong>{card.collection?.title || card.item?.title}</strong><em>{card.collection ? `${featuredCollectionItems.length} titles` : `${card.item?.year || 'Timeline'} · ${card.item?.type || 'title'}`}</em></span><ChevRight size={15} />
            </button>
          ))}
          <article className="spectrum-bento-card spectrum-bento-card--stat"><small>Phase Progress</small><strong>{pct}%</strong><span className="spectrum-meter"><i style={{ width: `${pct}%` }} /></span></article>
        </section>

        <CollectionRooms collections={collections.slice(0, 6)} items={items} universe={universe} posterSrc={posterSrc} activeCollectionId={activeCollectionId} onSelectCollection={(collection) => setActiveCollectionId?.(collection.id)} variant="home" />
        <Shelf title="Viewing Paths" kicker="Curated" items={essentials.slice(0, 10)} empty="Essential paths will appear here as your library grows." renderItem={renderCard('shelf')} />
        <Shelf title="Upcoming & Recently Added" kicker="Fresh picks" items={recentlyAdded.slice(0, 10)} empty="No recent titles available." renderItem={renderCard('compact')} />
      </div>
    );
  }

  return (
    <div className="spectrum-library" data-universe={universe}>
      <section className="spectrum-library-hero">
        <div className="spectrum-library-hero__copy">
          <p className="spectrum-eyebrow">Spectrum Library</p>
          <h1>Search-first catalog for every watch path.</h1>
          <span>Browse phases, sagas, specials, character paths, collections, and after-credit guides with calm, fast controls.</span>
          <label className="spectrum-search"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} onFocus={onOpenCatalog} placeholder="Search titles, phases, stingers…" /><button type="button" onClick={onOpenCatalog}>Command Center</button></label>
          <div className="spectrum-segmented" aria-label="Viewing style">{timelineModes.map((mode) => <button key={mode.id} data-active={timelineMode === mode.id} onClick={() => setTimelineMode?.(mode.id)}>{mode.label}</button>)}</div>
        </div>
        {heroItem && <ArchiveCard item={heroItem} poster={posterSrc?.(heroItem)} rating={getRating?.(heroItem)} status={heroItem.status} isBookmarked={Boolean(bookmarks[heroItem.id])} isWatched={heroItem.status === 'watched'} releaseStatus={releaseStatusFor?.(heroItem)} onOpenDetail={onOpenDetail} onSetStatus={onSetStatus} onToggleBookmark={onToggleBookmark} variant="hero" />}
      </section>
      <div className="spectrum-stat-grid"><div><Clock size={16} /><strong>{continueWatching.length}</strong><span>In Progress</span></div><div><Bookmark size={16} /><strong>{bookmarked.length}</strong><span>Bookmarked</span></div><div><Star size={16} /><strong>{essentials.length}</strong><span>Essential</span></div><div><Layers size={16} /><strong>{allCollections.length}</strong><span>Rooms</span></div></div>
      <CollectionRooms collections={allCollections} items={items} universe={universe} posterSrc={posterSrc} activeCollectionId={activeCollectionId} onSelectCollection={(collection) => setActiveCollectionId?.(collection.id)} />
      <Shelf archival title="Watchlist" kicker="Queue" items={watchlist} empty="Queued titles appear here when marked plan-to-watch." renderItem={renderCard('compact')} />
      <Shelf archival title="Recently Added" kicker="Timeline" items={recentlyAdded} empty="No recent titles available." renderItem={renderCard('compact')} />
      <Shelf archival title="Essential Guide" kicker="Core path" items={essentials} empty="No essential titles match current facets." renderItem={renderCard('compact')} />
      {characterArcShelves.map((shelf) => <Shelf archival key={shelf.id} title={shelf.title} kicker="Character POV" items={shelf.items} empty="" renderItem={renderCard('compact')} />)}
      <Shelf archival title="After-Credits Guide" kicker="Stinger map" items={postCreditItems} empty="No after-credit titles match current facets." renderItem={renderCard('compact')} />
      <Shelf archival title="Watched History" kicker="Progress" items={recentlyWatched} empty="Watched history appears after you complete titles." renderItem={renderCard('compact')} />
    </div>
  );
}
