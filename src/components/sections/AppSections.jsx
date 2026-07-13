import React from 'react';

const shellStyles = `
.app-sections-shell {
  --section-gap: clamp(0.95rem, 1.5vw, 1.25rem);
  --section-radius: clamp(1rem, 1.6vw, 1.3rem);
  --section-pad: clamp(0.95rem, 1.3vw, 1.2rem);
  width: min(1220px, calc(100% - 1.2rem));
  margin-inline: auto;
  padding-block: clamp(0.8rem, 1.8vw, 1.35rem) clamp(1.1rem, 2.5vw, 1.9rem);
  display: grid;
  gap: var(--section-gap);
}

.app-sections-shell :is(.section-surface, .section-modal) {
  border-radius: var(--section-radius);
  border: 1px solid var(--border);
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface-3) 90%, transparent), var(--surface-2));
  color: var(--text);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(14px) saturate(1.06);
  transition: transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out), border-color 180ms var(--ease-out);
}

.app-sections-shell :is(.section-surface, .section-modal):hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}

.app-sections-shell :is(.section-surface, .section-modal):focus-within {
  border-color: var(--border-active);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 24%, transparent), var(--shadow-md);
}

.section-surface { padding: var(--section-pad); }
.section-header-shell { position: sticky; top: 0.6rem; z-index: 40; }
.section-filter-bar { position: sticky; top: 4.8rem; z-index: 35; }
.section-phase-list { min-height: min(42vh, 500px); }
.section-settings-panel { position: sticky; top: 0.6rem; align-self: start; }
.section-modal { width: min(900px, calc(100% - 1rem)); margin-inline: auto; padding: clamp(1rem, 1.6vw, 1.45rem); }

@media (max-width: 1024px) {
  .app-sections-shell { width: min(100%, calc(100% - 0.6rem)); }
  .section-header-shell,
  .section-filter-bar,
  .section-settings-panel { position: static; }
}

@media (prefers-reduced-motion: reduce) {
  .app-sections-shell :is(.section-surface, .section-modal) { transition: none; }
}
`;

const wrap = (Tag, className, children, landmarkProps = {}) => (
  <Tag className={`section-surface ${className}`.trim()} {...landmarkProps}>
    {children}
  </Tag>
);

export const HeaderShell = ({ children }) => (
  <>
    <style>{shellStyles}</style>
    <main className="app-sections-shell" aria-label="MCU viewing order app layout">
      {wrap('header', 'section-header-shell', children, { role: 'banner' })}
    </main>
  </>
);

export const HeroBackdrop = ({ children }) => <section className="section-hero-backdrop" aria-hidden="true">{children}</section>;
export const HeroCarousel = ({ children }) => <section className="section-hero-carousel section-surface" aria-label="Featured timeline highlights">{children}</section>;
export const FloatingQuickControls = ({ children }) => <aside className="section-floating-controls section-surface" aria-label="Quick controls">{children}</aside>;
export const FilterBar = ({ children }) => wrap('section', 'section-filter-bar', children, { 'aria-label': 'Filter options' });
export const PhaseList = ({ children }) => wrap('section', 'section-phase-list', children, { 'aria-label': 'Phase watchlist' });
export const SettingsPanel = ({ children }) => wrap('aside', 'section-settings-panel', children, { 'aria-label': 'Application settings' });
export const DetailModal = ({ children }) => (
  <section role="dialog" aria-modal="true" className="section-modal" aria-label="Item detail modal">
    {children}
  </section>
);
