import React from 'react';
import { APPEARANCE_MODES, normalizeAppearanceMode } from '../../constants/themeSettings';
import './ThemeStudio.css';

export default function ThemeStudio({ appearanceMode, onAppearanceChange, themeChoices = [], themeMode, onThemeChange, title = 'Spectrum Studio', compact = false }) {
  const activeAppearance = normalizeAppearanceMode(appearanceMode);
  const effectModes = [
    { id: 'minimal', label: 'Minimal', desc: 'Less motion, no blur' },
    { id: 'glass', label: 'Balanced', desc: 'Soft glass and shimmer' },
    { id: 'neon', label: 'Expressive', desc: 'Luxe iridescent accents' },
  ];
  return (
    <div className={`theme-studio spectrum-theme-studio ${compact ? 'theme-studio--compact' : ''}`}>
      <div className="theme-studio__header"><div><p className="theme-studio__eyebrow">Spectrum Studio</p><h3>{title}</h3></div><span className="theme-studio__mode-chip">Live preview</span></div>
      <div className="spectrum-theme-preview" aria-label="Theme preview"><span className="spectrum-orb"/><div><strong>Marvel Spectrum</strong><small>Sample card · selected chip · soft glass</small></div><button type="button">Preview</button></div>
      <div className="theme-style-grid" aria-label="Animation and glass level">
        {effectModes.map(mode => <button key={mode.id} type="button" className={`theme-style-card ${activeAppearance === mode.id ? 'is-active' : ''}`} onClick={() => onAppearanceChange?.(mode.id)} aria-pressed={activeAppearance === mode.id}><span className="theme-style-card__visual"><i/><b/><em/></span><span className="theme-style-card__copy"><strong>{mode.label}</strong>{!compact && <small>{mode.desc}</small>}<span>{APPEARANCE_MODES.find(m => m.id === mode.id)?.font || 'Inter'}</span></span></button>)}
      </div>
      <div className="theme-accent-grid" aria-label="Spectrum palettes">
        {themeChoices.map(({ id, displayLabel, displaySwatch }) => <button key={id} type="button" className={`theme-accent-card ${themeMode === id ? 'is-active' : ''}`} onClick={() => onThemeChange?.(id)} aria-pressed={themeMode === id}><span className="theme-accent-card__swatch" style={{ '--swatch': displaySwatch }}/><span>{displayLabel}</span></button>)}
      </div>
    </div>
  );
}
