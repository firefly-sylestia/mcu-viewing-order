import React from 'react';
import { Bookmark, Check, ChevRight, Clock, PlayCircle, Star } from '../../constants/icons.jsx';
import './ArchiveCard.css';

const STATUS_LABELS = {
  watched: 'Completed',
  watching: 'Watching',
  'plan-to-watch': 'Watchlist',
  'on-hold': 'Paused',
  dropped: 'Dropped',
  unwatched: 'Unwatched',
};

export default function ArchiveCard({
  item,
  poster,
  rating,
  status,
  isBookmarked,
  isWatched,
  releaseStatus,
  onOpenDetail,
  onSetStatus,
  onToggleBookmark,
  variant = 'shelf',
  selected = false,
}) {
  const title = item?.title || 'Untitled';
  const statusValue = status || item?.status || 'unwatched';
  const watched = Boolean(isWatched || statusValue === 'watched');
  const runtime = item?.runtime || (item?.episodes ? `${item.episodes} ep` : (item?.type === 'short' ? 'Short' : item?.type === 'series' ? 'Series' : 'Film'));

  const open = (event) => {
    event.currentTarget.blur?.();
    onOpenDetail?.(item);
  };

  return (
    <article
      className={`archive-card archive-card--${variant}`}
      data-status={statusValue}
      data-selected={selected}
      data-watched={watched}
      data-bookmarked={Boolean(isBookmarked)}
    >
      <button className="archive-card__poster-button" type="button" onClick={open} aria-label={`Open ${title} details`}>
        <span className="archive-card__poster-wrap">
          {poster ? <img className="archive-card__poster" src={poster} alt={`${title} poster`} loading={variant === 'hero' ? 'eager' : 'lazy'} /> : <span className="archive-card__poster archive-card__poster--empty">{title}</span>}
          {watched && <span className="archive-card__watched"><Check size={13} /> Watched</span>}
          {releaseStatus && <span className="archive-card__release">{releaseStatus}</span>}
        </span>
      </button>

      <div className="archive-card__body">
        <button className="archive-card__title" type="button" onClick={open}>
          <span>{title}</span>
          <ChevRight size={13} aria-hidden />
        </button>
        <div className="archive-card__meta" aria-label="Title metadata">
          <span>{item?.year || 'TBA'}</span>
          <span>{item?.type || 'title'}</span>
          <span>Phase {item?.phase || '—'}</span>
        </div>
        <div className="archive-card__chips">
          <span className="archive-card__chip"><PlayCircle size={12} /> {STATUS_LABELS[statusValue] || statusValue}</span>
          <span className="archive-card__chip"><Star size={12} /> {rating || '—'}</span>
          <span className="archive-card__chip"><Clock size={12} /> {runtime}</span>
        </div>
      </div>

      <div className="archive-card__actions" aria-label={`${title} quick actions`}>
        <button type="button" className="archive-card__action" onClick={() => onSetStatus?.(item.id, watched ? 'unwatched' : 'watched')}>
          <Check size={13} /> {watched ? 'Undo' : 'Done'}
        </button>
        <button type="button" className="archive-card__action" data-active={Boolean(isBookmarked)} onClick={() => onToggleBookmark?.(item.id)}>
          <Bookmark size={13} /> {isBookmarked ? 'Pinned' : 'Pin'}
        </button>
      </div>
    </article>
  );
}
