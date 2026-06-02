import React, { useEffect, useRef } from 'react';
import { Bookmark, Download, Heart, Info, PlayCircle, Upload, X } from '../../constants/icons.jsx';
import './DetailDrawer.css';

export default function DetailDrawer({
  open,
  item,
  poster,
  loading,
  detailData,
  releaseLabel,
  releaseStatus,
  typeLabel,
  statusLabel,
  rating,
  isBookmarked,
  afterCredits,
  collections = [],
  prerequisites,
  plot,
  liked,
  onClose,
  onSetStatus,
  onToggleBookmark,
  onOpenTrailer,
  onOpenImdb,
  onShare,
  onExport,
  onToggleLike,
}) {
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const drawer = drawerRef.current;
    requestAnimationFrame(() => {
      const target = drawer?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      target?.focus?.();
    });
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key !== 'Tab' || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div className="librarian-detail" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <aside className="librarian-detail__drawer archive-drawer" role="dialog" aria-modal="true" aria-label={`${item.title} details`} ref={drawerRef}>
        <div className="librarian-detail__topbar">
          <span>Librarian Detail Drawer</span>
          <button type="button" onClick={onClose} aria-label="Close details"><X size={15} /></button>
        </div>
        <div className="librarian-detail__poster">
          {loading && <div className="librarian-detail__skeleton" aria-hidden="true" />}
          {!loading && poster && <img src={poster} alt={`${item.title} poster`} />}
          {!loading && !poster && <div className="librarian-detail__fallback">{item.title}</div>}
          {releaseStatus && <span>{releaseStatus}</span>}
        </div>
        <div className="librarian-detail__content">
          <p className="librarian-detail__eyebrow">Phase {item.phase} · {typeLabel}</p>
          <h2>{item.title}</h2>
          <div className="librarian-detail__meta"><span>{releaseLabel || item.year}</span><span>{statusLabel}</span><span>★ {rating || detailData?.imdbRating || '—'}</span></div>
          <div className="librarian-detail__actions">
            <button onClick={() => onSetStatus?.(item.id, item.status === 'watched' ? 'unwatched' : 'watched')}>{item.status === 'watched' ? 'Mark Unwatched' : 'Mark Watched'}</button>
            <button data-active={isBookmarked} onClick={() => onToggleBookmark?.(item.id)}><Bookmark size={13} /> {isBookmarked ? 'Pinned' : 'Pin'}</button>
            <button onClick={onOpenTrailer}><PlayCircle size={13} /> Trailer</button>
            <button onClick={onOpenImdb}><Info size={13} /> IMDb</button>
          </div>
          <section><h3>Story Brief</h3><p>{plot || detailData?.Plot || item.desc || 'Metadata loading…'}</p></section>
          <section><h3>Watch Intel</h3><dl><div><dt>Prerequisites</dt><dd>{prerequisites || item.prereq || 'None tracked'}</dd></div><div><dt>Post-credit scenes</dt><dd>{afterCredits?.count ?? 'Unknown'} · {afterCredits?.advice || 'review after credits'}</dd></div><div><dt>Connects to</dt><dd>{afterCredits?.connectsTo?.length ? afterCredits.connectsTo.join(', ') : 'No explicit setup tracked'}</dd></div></dl></section>
          <section><h3>Collection Membership</h3><div className="librarian-detail__chips">{collections.length ? collections.map((collection) => <span key={collection.id}>{collection.title}</span>) : <span>No room membership detected</span>}</div></section>
          <div className="librarian-detail__footer-actions">
            <button data-active={liked} onClick={onToggleLike}><Heart size={13} /> {liked ? 'Liked' : 'Like'}</button>
            <button onClick={onShare}><Upload size={13} /> Share</button>
            <button onClick={onExport}><Download size={13} /> Export</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
