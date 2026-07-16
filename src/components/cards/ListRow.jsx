import React, { memo } from 'react';
import { ChevRight, ChevDown, Bookmark } from '../../constants/icons';
import './ListRow.css';

/**
 * ListRow — cinematic title row per DESIGN_SPEC Section 5.2.
 *
 * Drop-in replacement for MemoizedTitleRow. Accepts the same props API
 * but renders with cinema design tokens, 2:3 poster, and proper spacing.
 */
export const ListRow = memo(function ListRow({
  item,
  idx,
  ph,
  T,
  typeMeta,
  statusMeta,
  releaseStatus,
  releaseStatusStyleObj,
  releaseStatusText,
  releaseLabel,
  poster,
  genres,
  isExpanded,
  isWatched,
  isBookmarked,
  statusDropdown,
  rating,
  onOpenDetail,
  onSetStatus,
  onToggleBookmark,
  onOpenStatus,
  bulkSelectMode = false,
  isSelected = false,
  onToggleSelected,
  statusLabelOverride = null,
  isDesktopViewport = false,
}) {
  const StatusIcon = statusMeta.Icon;
  const TypeIcon = typeMeta.Icon;
  const RowStatusIcon = statusMeta.Icon;
  const hideWatchToggle = releaseStatus === 'upcoming';

  return (
    <div
      className={`list-row ${isExpanded ? 'is-expanded' : ''} ${isWatched ? 'is-watched' : ''} type-${item.type} row-status-${item.status}`}
      style={{ '--phase-color': ph?.color, '--phase-glow': ph?.glow }}
    >
      {/* ── Index / Checkbox ──────────────────────────────────────── */}
      <div className={`list-row__index ${isWatched ? 'is-watched' : ''}`}>
        {bulkSelectMode ? (
          <input
            type="checkbox"
            checked={isSelected}
            aria-label={`Select ${item.title}`}
            onChange={(event) => onToggleSelected(item.id, event.target.checked)}
            onClick={(event) => event.stopPropagation()}
            className="list-row__checkbox"
          />
        ) : (
          idx + 1
        )}
      </div>

      {/* ── Poster ────────────────────────────────────────────────── */}
      <div className="list-row__poster">
        {poster ? (
          <img
            className="list-row__poster-img"
            src={poster}
            alt={`${item.title} poster`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="list-row__poster-fallback">
            {item.title?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* ── Title + Meta ──────────────────────────────────────────── */}
      <button
        className="list-row__title-btn"
        onClick={() => onOpenDetail(item)}
        aria-label={`View details for ${item.title}`}
      >
        <div className="list-row__title-line">
          <span className="list-row__title">{item.title}</span>
          <ChevRight size={10} className="list-row__chevron" />
        </div>

        <div className="list-row__meta">
          {item.episodes && (
            <span className="list-row__chip">{item.episodes} EP</span>
          )}
          <span
            className="list-row__chip list-row__chip--type"
            style={{ color: typeMeta.color }}
          >
            <TypeIcon size={8} />
            {typeMeta.label}
          </span>
          <span className="list-row__chip">{item.year || releaseLabel}</span>
          <span
            className="list-row__chip list-row__chip--release"
            style={{
              color: releaseStatusStyleObj.color,
              background: releaseStatusStyleObj.background,
              borderColor: releaseStatusStyleObj.border,
            }}
          >
            {releaseStatusText}
          </span>
          {!item.essential && (
            <span className="list-row__chip list-row__chip--optional">OPT</span>
          )}
        </div>

        <div className="list-row__genres">
          {genres?.join(' • ').toUpperCase()}
        </div>
      </button>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className={`list-row__actions ${isDesktopViewport ? 'is-desktop' : ''}`}>

        {/* Rating */}
        <div className="list-row__rating">
          <span className="list-row__star">★</span>
          <span>{rating || '—'}</span>
        </div>

        {/* Status dropdown */}
        <button
          aria-label={`Open status menu for ${item.title}`}
          aria-haspopup="menu"
          aria-expanded={statusDropdown === item.id}
          onClick={(event) => onOpenStatus(event, item.id)}
          className={`list-row__status-btn status-shade-${item.status}`}
        >
          <span className="list-row__status-label">
            <RowStatusIcon size={10} />
            {statusLabelOverride || statusMeta.label}
          </span>
          <ChevDown
            size={10}
            className={`list-row__status-chevron ${statusDropdown === item.id ? 'is-open' : ''}`}
          />
        </button>

        {/* Bookmark */}
        <button
          className={`list-row__bookmark-btn ${isDesktopViewport ? 'is-desktop' : ''}`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          onClick={() => onToggleBookmark(item.id)}
          data-bookmarked={isBookmarked}
        >
          <Bookmark size={11} />
        </button>

        {/* Watch toggle */}
        {!hideWatchToggle && (
          <button
            aria-label={isWatched ? `Mark ${item.title} as unwatched` : `Mark ${item.title} as watched`}
            title={isWatched ? 'Mark unwatched' : 'Mark watched'}
            onClick={(event) => {
              event.stopPropagation();
              onSetStatus(item.id, isWatched ? 'unwatched' : 'watched');
            }}
            className="list-row__watch-toggle"
          >
            <RowStatusIcon size={12} />
          </button>
        )}
      </div>
    </div>
  );
});

// Custom comparison for memo — same as original areTitleRowPropsEqual
const areListRowPropsEqual = (prev, next) => (
  prev.item === next.item
  && prev.idx === next.idx
  && prev.ph === next.ph
  && prev.T === next.T
  && prev.typeMeta === next.typeMeta
  && prev.statusMeta === next.statusMeta
  && prev.releaseStatus === next.releaseStatus
  && prev.releaseStatusText === next.releaseStatusText
  && prev.releaseLabel === next.releaseLabel
  && prev.poster === next.poster
  && prev.genres === next.genres
  && prev.isExpanded === next.isExpanded
  && prev.isWatched === next.isWatched
  && prev.isBookmarked === next.isBookmarked
  && prev.statusDropdown === next.statusDropdown
  && prev.rating === next.rating
  && prev.bulkSelectMode === next.bulkSelectMode
  && prev.isSelected === next.isSelected
  && prev.statusLabelOverride === next.statusLabelOverride
  && prev.isDesktopViewport === next.isDesktopViewport
);

export const MemoizedListRow = React.memo(ListRow, areListRowPropsEqual);
export default ListRow;
