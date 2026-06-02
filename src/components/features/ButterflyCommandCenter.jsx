import React from 'react';
import { Search, Film, Tv, Star, Bookmark, Check, PlayCircle, Layers, Heart, SlidersH, X } from '../../constants/icons';

const typeIcon = (type) => (type === 'series' ? Tv : type === 'film' ? Film : Layers);
const statusLabel = (status) => ({ watched: 'Completed', watching: 'Watching', 'plan-to-watch': 'Watchlist', 'on-hold': 'Paused', dropped: 'Dropped' }[status] || 'Unwatched');

const StatPill = ({ label, value }) => (
  <span className="butterfly-stat-pill"><strong>{value}</strong><small>{label}</small></span>
);

const PosterWing = ({ item, src, index, onOpenDetail }) => (
  <button
    type="button"
    className={`butterfly-poster-wing wing-${index}`}
    onClick={() => item && onOpenDetail(item)}
    aria-label={item ? `Open ${item.title}` : 'Featured poster'}
  >
    <img src={src} alt={item?.title || 'Featured Marvel poster'} loading={index < 2 ? 'eager' : 'lazy'} decoding="async" />
    <span>{item?.title || 'Featured title'}</span>
  </button>
);

const BentoCard = ({ className = '', eyebrow, title, children, action }) => (
  <article className={`butterfly-bento-card ${className}`}>
    <div className="butterfly-card-head">
      <div>
        {eyebrow && <p className="butterfly-eyebrow">{eyebrow}</p>}
        <h3>{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </article>
);

export default function ButterflyCommandCenter({
  universe,
  activeUniverse,
  switchUniverse,
  items,
  filteredItems,
  heroItems,
  posterSrc,
  pct,
  totalWatched,
  remainingCount,
  nextItem,
  search,
  setSearch,
  timelineMode,
  setTimelineMode,
  timelineModes,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  typeFilter,
  setTypeFilter,
  releaseFilter,
  setReleaseFilter,
  collections,
  bookmarks,
  phases,
  onStartWatching,
  onExploreTimeline,
  onOpenCatalog,
  onOpenAnalytics,
  onOpenSettings,
  onOpenDetail,
  onSetStatus,
  onToggleBookmark,
}) {
  const displayHeroItems = (heroItems?.length ? heroItems : filteredItems.slice(0, 5)).slice(0, 5);
  const watched = totalWatched || 0;
  const remaining = remainingCount ?? Math.max(0, (items?.length || 0) - watched);
  const bookmarkedCount = Object.values(bookmarks || {}).filter(Boolean).length;
  const activeFilters = [
    search ? `Search: ${search}` : '',
    statusFilter ? statusLabel(statusFilter) : '',
    typeFilter ? typeFilter : '',
    releaseFilter && releaseFilter !== 'all' ? releaseFilter : '',
  ].filter(Boolean);

  return (
    <section className="butterfly-command-center" aria-labelledby="butterfly-hero-title">
      <div className="butterfly-aurora" aria-hidden="true"><span className="wing-left" /><span className="wing-right" /><span className="sparkle-field" /></div>

      <div className="butterfly-hero-panel">
        <div className="butterfly-hero-copy">
          <div className="butterfly-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 64 48" role="img"><path d="M31.8 26.5C20 6.5 4.5 2.8 2.8 16.2 1.2 28.8 18.6 33.7 30 28.7M32.2 26.5C44 6.5 59.5 2.8 61.2 16.2c1.6 12.6-15.8 17.5-27.2 12.5M32 22v20M24 43h16" /></svg>
            <span>Butterfly Cinematic Universe</span>
          </div>
          <p className="butterfly-kicker">Premium watch-order command center</p>
          <h1 id="butterfly-hero-title">Marvel Cinematic Universe Watch Order</h1>
          <p className="butterfly-subtitle">Plan your perfect Marvel marathon, track your progress, and explore every story in the order that fits you.</p>
          <div className="butterfly-hero-actions">
            <button type="button" className="butterfly-btn primary" onClick={onStartWatching}><PlayCircle size={18} />Start Watching</button>
            <button type="button" className="butterfly-btn secondary" onClick={onExploreTimeline}><Layers size={18} />Explore Timeline</button>
          </div>
          <div className="butterfly-universe-switcher" aria-label="Universe switcher">
            <button type="button" aria-pressed={universe !== 'dc'} onClick={() => switchUniverse('mcu')}>MCU</button>
            <button type="button" aria-pressed={universe === 'dc'} onClick={() => switchUniverse('dc')}>DC</button>
            <span>{activeUniverse?.subtitle || 'Saga paths'}</span>
          </div>
          <div className="butterfly-progress-strip" aria-label="Progress summary">
            <StatPill label="Watched" value={watched} />
            <StatPill label="Remaining" value={remaining} />
            <StatPill label="Complete" value={`${pct}%`} />
            <span className="butterfly-next-title"><small>Next</small><strong>{nextItem?.title || 'All caught up'}</strong></span>
          </div>
        </div>

        <div className="butterfly-hero-visual" aria-label="Featured poster constellation">
          <div className="butterfly-poster-orbit">
            {displayHeroItems.map((item, index) => <PosterWing key={item?.id || index} item={item} src={posterSrc(item)} index={index} onOpenDetail={onOpenDetail} />)}
          </div>
          <div className="butterfly-completion-ring" style={{ '--pct': pct }}>
            <span>{pct}%</span><small>complete</small>
          </div>
        </div>
      </div>

      <div className="butterfly-command-bar" role="search" aria-label="Search and filter watch order">
        <label className="butterfly-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles, phases, characters…" /></label>
        <label><span>Timeline</span><select value={timelineMode} onChange={(event) => setTimelineMode(event.target.value)}>{timelineModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}</select></label>
        <label><span>Status</span><select value={statusFilter || ''} onChange={(event) => setStatusFilter(event.target.value || null)}><option value="">All statuses</option><option value="unwatched">Unwatched</option><option value="watching">Watching</option><option value="watched">Completed</option><option value="plan-to-watch">Watchlist</option><option value="on-hold">Paused</option><option value="dropped">Dropped</option></select></label>
        <label><span>Sort</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="order">Story order</option><option value="year">Year</option><option value="title">Title</option><option value="runtime">Runtime</option><option value="status">Status</option><option value="watched">Recently watched</option></select></label>
        <button type="button" className="butterfly-reset" onClick={() => { setSearch(''); setStatusFilter(null); setTypeFilter(null); setReleaseFilter('all'); setSortBy('order'); }}><X size={14} />Reset</button>
      </div>

      {activeFilters.length > 0 && <div className="butterfly-active-filters" aria-label="Active filters">{activeFilters.map((filter) => <span key={filter}>{filter}</span>)}<button type="button" onClick={() => { setSearch(''); setStatusFilter(null); setTypeFilter(null); setReleaseFilter('all'); }}>Clear all</button></div>}

      <div className="butterfly-bento-grid">
        <BentoCard className="continue" eyebrow="Continue Watching" title={nextItem?.title || 'Your marathon is complete'} action={<button onClick={onStartWatching}>Open</button>}>
          <p>{nextItem ? `${nextItem.year} • ${nextItem.type} • ${statusLabel(nextItem.status)}` : 'Every visible story is marked complete. Try another timeline mode or collection.'}</p>
          {nextItem && <img src={posterSrc(nextItem)} alt="" loading="lazy" decoding="async" />}
        </BentoCard>
        <BentoCard eyebrow="Watch Order" title={`${filteredItems.length} story nodes`} action={<button onClick={onExploreTimeline}>Timeline</button>}><p>Cinematic cards, compact scanning, and poster-rich browsing are ready from the same command bar.</p></BentoCard>
        <BentoCard eyebrow="Universe" title={activeUniverse?.title || 'Marvel'} action={<button onClick={() => switchUniverse(universe === 'dc' ? 'mcu' : 'dc')}>Switch</button>}><p>Swap universes without losing your progress or filters.</p></BentoCard>
        <BentoCard eyebrow="Timeline Mode" title={(timelineModes.find((mode) => mode.id === timelineMode)?.label) || 'Chronological'} action={<SlidersH size={18} />}><p>Choose release, chronological, character POV, Sony, and other supported paths.</p></BentoCard>
        <BentoCard eyebrow="Search / Filter" title={activeFilters.length ? `${activeFilters.length} active` : 'Ready'} action={<Search size={18} />}><p>No titles match? Clear filters or switch timeline mode for a wider path.</p></BentoCard>
        <BentoCard eyebrow="Stats" title={`${pct}% complete`} action={<button onClick={onOpenAnalytics}>Details</button>}><div className="butterfly-mini-bars"><span style={{ '--bar': `${pct}%` }} /><em>{watched} watched · {remaining} remaining</em></div></BentoCard>
        <BentoCard eyebrow="Library" title={`${collections.length} collections`} action={<button onClick={onOpenCatalog}>Browse</button>}><p>Infinity Saga, Multiverse Saga, Spider-Man, TV series, after-credits paths, and more.</p></BentoCard>
        <BentoCard eyebrow="Favorites" title={`${bookmarkedCount} saved`} action={<Bookmark size={18} />}><p>Keep a watchlist and favorite the stories you want close at hand.</p></BentoCard>
        <BentoCard eyebrow="After Credits" title="Bonus intel" action={<Star size={18} />}><p>Track stingers, trailers, related collections, and quick facts from each detail drawer.</p></BentoCard>
        <BentoCard eyebrow="Theme Studio" title="Dark, light, system" action={<button onClick={onOpenSettings}>Tune</button>}><p>Pearl and midnight palettes share the same cinematic butterfly token system.</p></BentoCard>
      </div>

      <div className="butterfly-timeline-preview" aria-label="Watch order timeline preview">
        <div className="butterfly-section-heading"><p>Elegant story thread</p><h2>Next titles in your selected order</h2></div>
        {filteredItems.slice(0, 8).map((item, index) => {
          const Icon = typeIcon(item.type);
          return (
            <article key={item.id} className={`butterfly-timeline-card ${item.status === 'watched' ? 'is-complete' : ''} ${index === 0 ? 'is-current' : ''}`}>
              <span className="butterfly-node" />
              <img src={posterSrc(item)} alt={`${item.title} poster`} loading="lazy" decoding="async" />
              <div>
                <p className="butterfly-eyebrow">{item.phase ? `Phase ${item.phase}` : 'Story node'} · {item.year}</p>
                <h3>{item.title}</h3>
                <p>{item.prereq || 'No prerequisites listed.'}</p>
                <div className="butterfly-meta-row"><span><Icon size={13} />{item.type}</span><span>{statusLabel(item.status)}</span></div>
              </div>
              <div className="butterfly-card-actions">
                <button type="button" onClick={() => onSetStatus(item.id, item.status === 'watched' ? 'unwatched' : 'watched')} aria-label={`Toggle watched for ${item.title}`}><Check size={15} /></button>
                <button type="button" onClick={() => onToggleBookmark(item.id)} aria-pressed={Boolean(bookmarks?.[item.id])} aria-label={`Toggle bookmark for ${item.title}`}><Heart size={15} /></button>
                <button type="button" onClick={() => onOpenDetail(item)}>Details</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
