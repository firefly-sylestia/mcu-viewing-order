import React from 'react';
import { Bookmark, Check, ChevRight, Clock, PlayCircle, Star } from '../../constants/icons.jsx';
import './ArchiveCard.css';

const STATUS_LABELS = { watched: 'Watched', watching: 'Watching', 'plan-to-watch': 'Watchlist', 'on-hold': 'Paused', dropped: 'Dropped', unwatched: 'Unwatched' };

export default function ArchiveCard({ item, poster, rating, status, isBookmarked, isWatched, releaseStatus, onOpenDetail, onSetStatus, onToggleBookmark, variant = 'shelf', selected = false }) {
  const title = item?.title || 'Untitled';
  const statusValue = status || item?.status || 'unwatched';
  const watched = Boolean(isWatched || statusValue === 'watched');
  const runtime = item?.runtime || (item?.episodes ? `${item.episodes} ep` : item?.type === 'short' ? 'Short' : item?.type === 'series' ? 'Series' : 'Film');
  const open = () => onOpenDetail?.(item);
  return (
    <article className={`archive-card spectrum-title-card spectrum-title-card--${variant}`} data-status={statusValue} data-selected={selected} data-watched={watched} data-bookmarked={Boolean(isBookmarked)}>
      <button className="archive-card__poster-button spectrum-title-card__poster" type="button" onClick={open} aria-label={`Open ${title} details`}>
        {poster ? <img src={poster} alt={`${title} poster`} loading={variant === 'hero' ? 'eager' : 'lazy'} /> : <span className="archive-card__poster--empty">{title}</span>}
        <span className="spectrum-title-card__fold" aria-hidden="true" />
        {watched && <span className="archive-card__watched spectrum-status-badge"><Check size={12} /> Watched</span>}
        {releaseStatus && <span className="archive-card__release spectrum-status-badge">{releaseStatus}</span>}
      </button>
      <div className="archive-card__body spectrum-title-card__content">
        <button className="archive-card__title" type="button" onClick={open}><span>{title}</span><ChevRight size={14} aria-hidden /></button>
        <div className="archive-card__meta"><span>{item?.year || 'TBA'}</span><span>{item?.type || 'Title'}</span><span>Phase {item?.phase || '—'}</span></div>
        <div className="archive-card__chips"><span><PlayCircle size={12}/>{STATUS_LABELS[statusValue] || statusValue}</span><span><Star size={12}/>{rating || '—'}</span><span><Clock size={12}/>{runtime}</span></div>
      </div>
      <div className="archive-card__actions spectrum-title-card__actions" aria-label={`${title} quick actions`}>
        <button type="button" onClick={() => onSetStatus?.(item.id, watched ? 'unwatched' : 'watched')}><Check size={13}/>{watched ? 'Undo' : 'Done'}</button>
        <button type="button" data-active={Boolean(isBookmarked)} onClick={() => onToggleBookmark?.(item.id)}><Bookmark size={13}/>{isBookmarked ? 'Saved' : 'Save'}</button>
      </div>
    </article>
  );
}
