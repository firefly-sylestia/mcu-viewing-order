import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { ChevRight, ChevDown, PlayCircle, Check, Star } from '../../constants/icons';
import './HeroCarousel.css';

const AUTO_ROTATE_MS = 8000;
const TRANSITION_MS = 400;

/**
 * HeroCarousel — cinematic hero carousel with crossfade transitions.
 *
 * Per DESIGN_SPEC Section 5.3:
 *   - Full-bleed backdrop crossfades with each slide
 *   - Centered hero card with gradient overlay
 *   - Dot indicators, prev/next navigation
 *   - Auto-rotation (8s), pauses on hover/touch
 *   - Peek-next edge preview (15%)
 *   - Watch Trailer + Mark Watched CTAs
 *   - Desktop: 420px, Mobile: 320px
 */
const HeroCarousel = memo(function HeroCarousel({
  items = [],
  activeIndex: controlledIndex,
  onChange,
  onSelectItem,
  onWatchTrailer,
  onMarkWatched,
  isDesktopViewport = true,
  performanceMode = false,
  darkMode = true,
}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [isPaused, setIsPaused] = useState(false);
  const [exitingSrc, setExitingSrc] = useState(null);
  const [entering, setEntering] = useState(false);

  const intervalRef = useRef(null);
  const enteringTimeoutRef = useRef(null);
  const resumeTimeoutRef = useRef(null);
  const exitTimeoutRef = useRef(null);

  const isControlled = controlledIndex !== undefined;
  const currentIndex = isControlled ? controlledIndex : internalIndex;

  const safeItems = items.length ? items : [];
  const itemCount = safeItems.length;
  const activeItem = safeItems[currentIndex] || null;

  // ── Auto-rotation ──────────────────────────────────────────────────

  const advance = useCallback((dir = 1) => {
    setDirection(dir);
    setEntering(true);
    const nextIdx = ((currentIndex + dir) % itemCount + itemCount) % itemCount;
    if (isControlled) {
      onChange?.(nextIdx);
    } else {
      setInternalIndex(nextIdx);
    }
  }, [currentIndex, itemCount, isControlled, onChange]);

  useEffect(() => {
    if (entering) {
      if (enteringTimeoutRef.current) clearTimeout(enteringTimeoutRef.current);
      enteringTimeoutRef.current = setTimeout(() => setEntering(false), TRANSITION_MS);
      return () => clearTimeout(enteringTimeoutRef.current);
    }
  }, [entering]);

  useEffect(() => {
    if (!itemCount || isPaused) return;
    intervalRef.current = setInterval(() => advance(1), AUTO_ROTATE_MS);
    return () => clearInterval(intervalRef.current);
  }, [currentIndex, itemCount, isPaused, advance]);

  // ── Backdrop crossfade tracking ────────────────────────────────────

  const prevSrcRef = useRef(null);
  useEffect(() => {
    if (activeItem?.src && activeItem.src !== prevSrcRef.current) {
      setExitingSrc(prevSrcRef.current);
      prevSrcRef.current = activeItem.src;
      // Clear exiting backdrop after transition completes
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = setTimeout(() => setExitingSrc(null), 600);
    }
    return () => clearTimeout(exitTimeoutRef.current);
  }, [activeItem?.src]);

  // ── Pause/resume handlers ──────────────────────────────────────────

  const handlePause = useCallback(() => {
    setIsPaused(true);
    clearTimeout(pauseTimeoutRef.current);
  }, []);

  const handleResume = useCallback(() => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setIsPaused(false), 600);
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────

  const handlePrev = useCallback(() => {
    advance(-1);
    handlePause();
    handleResume();
  }, [advance, handlePause, handleResume]);

  const handleNext = useCallback(() => {
    advance(1);
    handlePause();
    handleResume();
  }, [advance, handlePause, handleResume]);

  const handleDotClick = useCallback((idx) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setEntering(true);
    if (isControlled) {
      onChange?.(idx);
    } else {
      setInternalIndex(idx);
    }
    handlePause();
    handleResume();
  }, [currentIndex, isControlled, onChange, handlePause, handleResume]);

  // ── Keyboard ───────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
  }, [handlePrev, handleNext]);

  // ── Empty state ────────────────────────────────────────────────────

  if (!itemCount) {
    return (
      <div className="hero-carousel-shell hero-carousel--empty" aria-label="Hero carousel">
        <div className="hero-carousel-empty">
          <span className="hero-carousel-empty-text">No featured titles yet</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="hero-carousel-shell"
      role="region"
      aria-label="Featured titles carousel"
      aria-roledescription="carousel"
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ── Backdrop layer ──────────────────────────────────────────── */}
      <div className="hero-carousel-backdrop" aria-hidden="true">
        {/* Exiting backdrop */}
        {exitingSrc && exitingSrc !== activeItem?.src && (
          <div
            className="hero-carousel-backdrop-img is-exiting"
            style={{ backgroundImage: `url(${exitingSrc})` }}
          />
        )}
        {/* Active backdrop */}
        {activeItem?.src && (
          <div
            className={`hero-carousel-backdrop-img ${entering ? 'is-entering' : ''}`}
            style={{ backgroundImage: `url(${activeItem.src})` }}
          />
        )}
        {/* Blend layer */}
        <div className="hero-carousel-backdrop-blend" />
      </div>

      {/* ── Main card area ──────────────────────────────────────────── */}
      <div className="hero-carousel-stage">
        {/* Prev nav button */}
        <button
          className="hero-carousel-nav hero-carousel-prev"
          onClick={handlePrev}
          aria-label="Previous slide"
        >
          <ChevRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>

        {/* Active card */}
        {activeItem && (
          <div
            className={`hero-carousel-active-card ${entering ? `is-entering is-entering-${direction > 0 ? 'forward' : 'backward'}` : ''}`}
            onClick={() => onSelectItem?.(activeItem.item || activeItem)}
          >
            {/* Poster */}
            <div className="hero-carousel-active-poster-wrap">
              <img
                className="hero-carousel-active-poster"
                src={activeItem.src}
                alt={activeItem.title || 'Featured poster'}
                draggable={false}
              />

              {/* Gradient overlay */}
              <div className="hero-carousel-overlay">
                {/* Rating badge */}
                {activeItem.rating != null && (
                  <div className="hero-carousel-rating-badge">
                    <Star size={12} />
                    <span>{typeof activeItem.rating === 'number' ? activeItem.rating.toFixed(1) : activeItem.rating}</span>
                    <span className="hero-carousel-rating-src">IMDB</span>
                  </div>
                )}

                {/* Title */}
                <h2 className="hero-carousel-title">{activeItem.title}</h2>

                {/* Meta line */}
                <div className="hero-carousel-meta-line">
                  {activeItem.year && <span>{activeItem.year}</span>}
                  {activeItem.type && <span className="hero-carousel-meta-type" style={activeItem.typeColor ? { color: activeItem.typeColor } : {}}>{activeItem.type}</span>}
                  {activeItem.phase && <span className="hero-carousel-meta-phase">{activeItem.phase}</span>}
                </div>

                {/* Genre pills */}
                {activeItem.genres?.length > 0 && (
                  <div className="hero-carousel-genre-pills">
                    {activeItem.genres.slice(0, 3).map((g) => (
                      <span key={g} className="hero-carousel-genre-pill">{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="hero-carousel-cta-row">
              <button
                className="hero-carousel-cta hero-carousel-cta--primary"
                onClick={(e) => { e.stopPropagation(); onWatchTrailer?.(activeItem); }}
                aria-label="Watch trailer"
              >
                <PlayCircle size={16} />
                <span>Watch Trailer</span>
              </button>
              <button
                className="hero-carousel-cta hero-carousel-cta--secondary"
                onClick={(e) => { e.stopPropagation(); onMarkWatched?.(activeItem); }}
                aria-label="Mark as watched"
              >
                <Check size={16} />
                <span>Mark Watched</span>
              </button>
            </div>
          </div>
        )}

        {/* Next nav button */}
        <button
          className="hero-carousel-nav hero-carousel-next"
          onClick={handleNext}
          aria-label="Next slide"
        >
          <ChevRight size={20} />
        </button>
      </div>

      {/* ── Dot indicators ──────────────────────────────────────────── */}
      <div className="hero-carousel-dots" role="tablist" aria-label="Slide indicators">
        {safeItems.map((_, idx) => (
          <button
            key={idx}
            className={`hero-carousel-dot ${idx === currentIndex ? 'is-active' : ''}`}
            role="tab"
            aria-selected={idx === currentIndex}
            aria-label={`Slide ${idx + 1} of ${itemCount}`}
            onClick={() => handleDotClick(idx)}
          />
        ))}
      </div>
    </div>
  );
});

export default HeroCarousel;
