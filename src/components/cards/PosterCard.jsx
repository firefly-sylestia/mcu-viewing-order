import React, { memo, useState, useCallback } from 'react';
import { Star } from '../../constants/icons';
import './PosterCard.css';

const STATUS_BADGE_CONFIG = {
  watched: { className: 'is-watched' },
  'plan-to-watch': { className: 'is-watchlist' },
  watching: { className: 'is-watching' },
  'on-hold': { className: 'is-on-hold' },
  dropped: { className: 'is-dropped' },
  unwatched: { className: '' },
};

const STATUS_BADGE_LABELS = {
  watched: '✓',
  'plan-to-watch': '+',
  watching: '▶',
  'on-hold': '⏸',
  dropped: '✕',
  unwatched: '',
};

/**
 * PosterCard — cinematic poster card with 2:3 aspect ratio.
 *
 * Features:
 *   - Full-bleed poster image with bottom gradient overlay
 *   - Status badge (top-right) for watched/watching/plan-to-watch
 *   - Rating pill (bottom-left) with star icon
 *   - Title visible through gradient overlay
 *   - Hover: scale(1.04) + lift + glow border
 *   - Active: scale(1.01) snap-back
 */
const PosterCard = memo(function PosterCard({
  src,
  alt = '',
  title = '',
  rating = null,
  status = 'unwatched',
  year = null,
  typeLabel = null,
  typeColor = null,
  eager = false,
  onClick,
  className = '',
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const badge = STATUS_BADGE_CONFIG[status] || STATUS_BADGE_CONFIG.unwatched;
  const badgeLabel = STATUS_BADGE_LABELS[status] || '';
  const hasBadge = status !== 'unwatched';

  const handleLoad = useCallback(() => setImgLoaded(true), []);
  const handleError = useCallback(() => setImgError(true), []);

  return (
    <article
      className={`poster-card ${badge.className} ${className}`.trim()}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={title || alt}
    >
      {/* Poster image */}
      <div className={`poster-card__image-wrap ${imgLoaded ? 'is-loaded' : ''} ${imgError ? 'is-error' : ''}`}>
        {!imgError && (
          <img
            className="poster-card__image"
            src={src}
            alt={alt || title}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
        {/* Skeleton shimmer while loading */}
        {!imgLoaded && !imgError && (
          <div className="poster-card__skeleton" aria-hidden="true" />
        )}
        {/* Fallback when image fails */}
        {imgError && (
          <div className="poster-card__fallback" aria-hidden="true">
            <span className="poster-card__fallback-text">{title?.charAt(0) || '?'}</span>
          </div>
        )}
      </div>

      {/* Status badge — top right */}
      {hasBadge && (
        <div className="poster-card__status-badge" aria-label={`Status: ${status}`}>
          <span className="poster-card__status-icon">{badgeLabel}</span>
        </div>
      )}

      {/* Gradient overlay — bottom */}
      <div className="poster-card__overlay">
        {rating != null && (
          <div className="poster-card__rating">
            <Star size={10} />
            <span>{typeof rating === 'number' ? rating.toFixed(1) : rating}</span>
          </div>
        )}

        {title && (
          <h3 className="poster-card__title">{title}</h3>
        )}

        {(year || typeLabel) && (
          <div className="poster-card__meta">
            {year && <span className="poster-card__year">{year}</span>}
            {typeLabel && (
              <span
                className="poster-card__type"
                style={typeColor ? { color: typeColor } : undefined}
              >
                {typeLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

export default PosterCard;
