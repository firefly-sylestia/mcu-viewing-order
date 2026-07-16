import React from 'react';
import './ProgressSection.css';

/**
 * Cinema Progress Section — Phase 7
 * - Shimmer-animated progress bar with gradient fill
 * - Stat cards grid: watched count, watch streak, total hours
 * - Per-phase mini progress bars
 */
const ProgressSection = React.memo(function ProgressSection({
  pct = 0,
  totalWatched = 0,
  totalEntries = 0,
  watchStreak = 0,
  totalHours = 0,
  phaseStats = [],
  darkMode = true,
}) {
  const pctRounded = Math.round(pct);

  if (totalEntries === 0) return null;

  return (
    <section className="progress-cinema" aria-label="Progress overview">
      {/* ── Header + percentage ──────────────────────────────────────── */}
      <div className="progress-cinema-header">
        <h3 className="progress-cinema-title">Your MCU Journey</h3>
        <span className="progress-cinema-pct">
          {pctRounded}
          <small>%</small>
        </span>
      </div>

      {/* ── Shimmer progress bar ─────────────────────────────────────── */}
      <div className="progress-cinema-track" role="progressbar" aria-valuenow={pctRounded} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="progress-cinema-fill"
          style={{ width: `${pctRounded}%` }}
        />
        <div className="progress-cinema-shimmer" />
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="progress-cinema-stats">
        <div className="stat-card stat-card--red">
          <span className="stat-card-num">{totalWatched}</span>
          <span className="stat-card-label">Watched</span>
          <span className="stat-card-sub">of {totalEntries} titles</span>
        </div>
        <div className="stat-card stat-card--gold">
          <span className="stat-card-num">{watchStreak}</span>
          <span className="stat-card-label">Day Streak</span>
          <span className="stat-card-sub">consecutive days</span>
        </div>
        <div className="stat-card stat-card--muted">
          <span className="stat-card-num">{totalHours}h</span>
          <span className="stat-card-label">Total Hours</span>
          <span className="stat-card-sub">across all titles</span>
        </div>
      </div>

      {/* ── Phase mini-bars ──────────────────────────────────────────── */}
      {phaseStats.length > 0 && (
        <div className="progress-cinema-phases">
          {phaseStats.map((ph, i) => (
            <div key={ph.phase ?? i} className="phase-mini">
              <div className="phase-mini-header">
                <span className="phase-mini-label" style={ph.color ? { color: ph.color } : undefined}>
                  {ph.label ?? ph.phase}
                </span>
                <span className="phase-mini-pct">
                  {ph.watched}/{ph.total}
                </span>
              </div>
              <div className="phase-mini-track">
                <div
                  className="phase-mini-fill"
                  style={{
                    width: `${ph.total > 0 ? Math.round((ph.watched / ph.total) * 100) : 0}%`,
                    background: ph.color
                      ? `linear-gradient(90deg, ${ph.color}, color-mix(in srgb, ${ph.color} 60%, var(--color-accent-gold)))`
                      : undefined,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

export default ProgressSection;
