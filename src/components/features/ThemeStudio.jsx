import React from 'react';
import { APPEARANCE_MODES, normalizeAppearanceMode } from '../../constants/themeSettings';
import './ThemeStudio.css';

export default function ThemeStudio({
  appearanceMode,
  onAppearanceChange,
  themeChoices,
  themeMode,
  onThemeChange,
  title = 'Universe Style',
  compact = false,
}) {
  const activeAppearance = normalizeAppearanceMode(appearanceMode);

  return (
    <div className={`theme-studio ${compact ? 'theme-studio--compact' : ''}`}>
      <div className="theme-studio__header">
        <div>
          <p className="theme-studio__eyebrow">Visual system</p>
          <h3>{title}</h3>
        </div>
        <span className="theme-studio__mode-chip">{APPEARANCE_MODES.find(mode => mode.id === activeAppearance)?.font || 'Modern UI'}</span>
      </div>

      <div className="theme-style-grid" aria-label="Appearance styles">
        {APPEARANCE_MODES.filter(mode => ['glass', 'neon', 'minimal', 'pixelated'].includes(mode.id)).map(mode => {
          const isActive = activeAppearance === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              className={`theme-style-card theme-style-card--${mode.id} ${isActive ? 'is-active' : ''}`}
              onClick={() => onAppearanceChange(mode.id)}
              aria-pressed={isActive}
            >
              <span className="theme-style-card__visual" aria-hidden="true"><i /><b /><em /></span>
              <span className="theme-style-card__copy">
                <strong>{mode.label}</strong>
                {!compact && <small>{mode.desc}</small>}
                <span>{mode.font}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="theme-accent-grid" aria-label="Character accent themes">
        {themeChoices.map(({ id, displayLabel, displaySwatch }) => {
          const isActive = themeMode === id;
          return (
            <button
              key={id}
              type="button"
              className={`theme-accent-card ${isActive ? 'is-active' : ''}`}
              onClick={() => onThemeChange(id)}
              aria-pressed={isActive}
            >
              <span className="theme-accent-card__swatch" style={{ '--swatch': displaySwatch }} />
              <span>{displayLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
