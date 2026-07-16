import React, { memo } from 'react';
import { Film } from '../../constants/icons';
import './CalendarView.css';

/**
 * CalendarView — cinematic release calendar per DESIGN_SPEC.
 *
 * Groups releases by month/quarter/year, renders each entry with
 * date badge, 2:3 poster thumbnail, title, phase/type chips, and
 * release status badges — all using --color-* cinema design tokens.
 */
const CalendarEntry = memo(function CalendarEntry({
  item,
  rawDate,
  label,
  releaseStatus,
  hasRealDate,
  posterUrl,
  formatReleaseDate,
  getReleaseCertainty,
  getSafeTypeMeta,
  onOpenDetail,
}) {
  const typeMeta = getSafeTypeMeta(item.type);
  const isUpcoming = releaseStatus === 'upcoming';

  return (
    <div className={`cal-entry ${isUpcoming ? 'cal-entry--upcoming' : ''}`}>
      {/* ── Date badge ────────────────────────── */}
      <div className={`cal-entry__date ${isUpcoming ? 'cal-entry__date--upcoming' : ''}`}>
        {formatReleaseDate(rawDate, item.year, label, releaseStatus)}
      </div>

      {/* ── Poster ───────────────────────────── */}
      <div className="cal-entry__poster">
        {posterUrl ? (
          <img
            className="cal-entry__poster-img"
            src={posterUrl}
            alt={`${item.title} poster`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="cal-entry__poster-fallback">
            <Film size={16} />
          </div>
        )}
      </div>

      {/* ── Title + meta ──────────────────────── */}
      <button
        className="cal-entry__title-btn"
        onClick={() => onOpenDetail(item)}
        aria-label={`View details for ${item.title}`}
      >
        <span className="cal-entry__title">{item.title}</span>

        <div className="cal-entry__meta">
          <span className="cal-entry__chip cal-entry__chip--phase">
            P{item.phase}
          </span>
          <span
            className="cal-entry__chip cal-entry__chip--type"
            style={{ '--type-color': typeMeta.color }}
          >
            {typeMeta.label}
          </span>
          <span className={`cal-entry__chip cal-entry__chip--status cal-entry__chip--status-${releaseStatus}`}>
            {releaseStatus}
          </span>
          {hasRealDate ? (
            <span className="cal-entry__chip cal-entry__chip--certainty cal-entry__chip--certainty-exact">
              Exact Date
            </span>
          ) : (
            <span className="cal-entry__chip cal-entry__chip--certainty">
              {getReleaseCertainty({ hasRealDate, releaseStatus })}
            </span>
          )}
        </div>
      </button>
    </div>
  );
});

const CalendarView = memo(function CalendarView({
  calendarItems,
  posterSrc,
  openDetail,
  formatReleaseDate,
  getReleaseCertainty,
  getSafeTypeMeta,
}) {
  if (!calendarItems?.grouped || Object.keys(calendarItems.grouped).length === 0) {
    return (
      <section className="cal-view cal-view--empty">
        <div className="cal-view__header">
          <h2 className="cal-view__title">Release Calendar</h2>
        </div>
        <p className="cal-view__empty-text">No releases to show.</p>
      </section>
    );
  }

  return (
    <section className="cal-view">
      {/* ── Header ───────────────────────────────────── */}
      <div className="cal-view__header">
        <h2 className="cal-view__title">Release Calendar</h2>
        <p className="cal-view__subtitle">Grouped by month · quarter · year</p>
      </div>

      {/* ── Groups ───────────────────────────────────── */}
      <div className="cal-view__groups">
        {Object.entries(calendarItems.grouped).map(([group, entries]) => (
          <div key={group} className="cal-group">
            <div className="cal-group__header">
              <span className="cal-group__dot" />
              {group}
              <span className="cal-group__count">{entries.length}</span>
            </div>

            <div className="cal-group__entries">
              {entries.map((entry) => (
                <CalendarEntry
                  key={`${group}-${entry.item.id}`}
                  {...entry}
                  posterUrl={posterSrc(entry.item)}
                  formatReleaseDate={formatReleaseDate}
                  getReleaseCertainty={getReleaseCertainty}
                  getSafeTypeMeta={getSafeTypeMeta}
                  onOpenDetail={openDetail}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

export default CalendarView;
