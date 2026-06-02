import React, { useEffect, useRef } from 'react';
import { Bookmark, Download, Heart, Info, PlayCircle, Upload, X } from '../../constants/icons.jsx';
import './DetailDrawer.css';

export default function DetailDrawer({ open, item, poster, loading, detailData, releaseLabel, releaseStatus, typeLabel, statusLabel, rating, isBookmarked, afterCredits, collections = [], prerequisites, plot, liked, onClose, onSetStatus, onToggleBookmark, onOpenTrailer, onOpenImdb, onShare, onExport, onToggleLike }) {
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    requestAnimationFrame(() => drawerRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus?.());
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled);
      if (!focusable.length) return;
      const [first] = focusable; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocusRef.current?.focus?.(); };
  }, [open, onClose]);
  if (!open || !item) return null;
  return (
    <div className="spectrum-detail librarian-detail" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <aside className="spectrum-detail__sheet librarian-detail__drawer" role="dialog" aria-modal="true" aria-label={`${item.title} details`} ref={drawerRef}>
        <span className="spectrum-detail__handle" aria-hidden="true" />
        <div className="spectrum-detail__hero">
          <div className="spectrum-detail__poster">
            {loading && <div className="librarian-detail__skeleton" aria-hidden="true" />}
            {!loading && poster && <img src={poster} alt={`${item.title} poster`} />}
            {!loading && !poster && <div className="librarian-detail__fallback">{item.title}</div>}
          </div>
          <div className="spectrum-detail__intro">
            <div className="spectrum-detail__topbar"><span>Title Detail</span><button type="button" onClick={onClose} aria-label="Close details"><X size={17}/></button></div>
            <p className="spectrum-detail__eyebrow">Phase {item.phase} · {typeLabel} {releaseStatus ? `· ${releaseStatus}` : ''}</p>
            <h2>{item.title}</h2>
            <div className="spectrum-detail__meta"><span>{releaseLabel || item.year}</span><span>{statusLabel}</span><span>★ {rating || detailData?.imdbRating || '—'}</span></div>
            <div className="spectrum-detail__actions">
              <button onClick={() => onSetStatus?.(item.id, item.status === 'watched' ? 'unwatched' : 'watched')}>{item.status === 'watched' ? 'Mark Unwatched' : 'Mark Watched'}</button>
              <button data-active={isBookmarked} onClick={() => onToggleBookmark?.(item.id)}><Bookmark size={14}/>{isBookmarked ? 'Saved' : 'Save'}</button>
              <button onClick={onOpenTrailer}><PlayCircle size={14}/>Trailer</button>
              <button onClick={onOpenImdb}><Info size={14}/>IMDb</button>
            </div>
          </div>
        </div>
        <div className="spectrum-detail__content">
          <section className="spectrum-detail__section"><h3>Story Brief</h3><p>{plot || detailData?.Plot || item.desc || 'Metadata loading…'}</p></section>
          <section className="spectrum-detail__section"><h3>Watch Guide</h3><dl><div><dt>Prerequisites</dt><dd>{prerequisites || item.prereq || 'None tracked'}</dd></div><div><dt>After credits</dt><dd>{afterCredits?.count ?? 'Unknown'} · {afterCredits?.advice || 'review after credits'}</dd></div><div><dt>Connects to</dt><dd>{afterCredits?.connectsTo?.length ? afterCredits.connectsTo.join(', ') : 'No explicit setup tracked'}</dd></div></dl></section>
          <section className="spectrum-detail__section"><h3>Rooms</h3><div className="librarian-detail__chips">{collections.length ? collections.map(collection => <span key={collection.id}>{collection.title}</span>) : <span>No room membership detected</span>}</div></section>
          <div className="spectrum-detail__footer-actions"><button data-active={liked} onClick={onToggleLike}><Heart size={14}/>{liked ? 'Liked' : 'Like'}</button><button onClick={onShare}><Upload size={14}/>Share</button><button onClick={onExport}><Download size={14}/>Export</button></div>
        </div>
      </aside>
    </div>
  );
}
