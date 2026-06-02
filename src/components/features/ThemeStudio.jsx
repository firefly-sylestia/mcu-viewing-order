import React from 'react';
import { APPEARANCE_MODES, normalizeAppearanceMode } from '../../constants/themeSettings';
import './ThemeStudio.css';

const MODE_LABELS = { glass: 'Luxe', minimal: 'Minimal', neon: 'Expressive', archive: 'Pearl', pixelated: 'Data Saver' };

export default function ThemeStudio({ appearanceMode, onAppearanceChange, themeChoices = [], themeMode, onThemeChange, title = 'Spectrum Studio', compact = false }) {
  const activeAppearance = normalizeAppearanceMode(appearanceMode);
  return (
    <div className={`spectrum-theme-studio ${compact ? 'spectrum-theme-studio--compact' : ''}`}>
      <div className="spectrum-theme-studio__header"><div><p>Appearance</p><h3>{title}</h3></div><span>{MODE_LABELS[activeAppearance] || 'Balanced'}</span></div>
      <div className="spectrum-theme-preview" aria-hidden="true"><div className="spectrum-theme-preview__wing" /><div><strong>Marvel Spectrum</strong><span>Sample card</span></div><b>Selected</b></div>
      <div className="spectrum-style-grid" aria-label="Glass and animation level">
        {APPEARANCE_MODES.map(mode => {
          const isActive = activeAppearance === mode.id;
          return <button key={mode.id} type="button" className="spectrum-style-card" data-active={isActive} onClick={() => onAppearanceChange(mode.id)} aria-pressed={isActive}><span className="spectrum-style-card__visual" aria-hidden="true" /><span><strong>{mode.label}</strong>{!compact && <small>{mode.desc}</small>}<em>{mode.font}</em></span></button>;
        })}
      </div>
      <div className="spectrum-accent-grid" aria-label="Theme palette">
        {themeChoices.map(({ id, displayLabel, displaySwatch }) => {
          const isActive = themeMode === id;
          return <button key={id} type="button" className="spectrum-accent-card" data-active={isActive} onClick={() => onThemeChange(id)} aria-pressed={isActive}><span style={{ '--swatch': displaySwatch }} /><strong>{displayLabel}</strong></button>;
        })}
      </div>
    </div>
  );
}
