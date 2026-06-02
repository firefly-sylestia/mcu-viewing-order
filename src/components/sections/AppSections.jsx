import React from 'react';

const shellStyles = `
.app-sections-shell{width:min(1440px,calc(100% - 1.5rem));margin-inline:auto;padding-block:clamp(1rem,2vw,2rem);display:grid;gap:clamp(1rem,2vw,1.5rem)}
.app-sections-shell :is(.section-surface,.section-modal){border-radius:var(--r-xl);border:1px solid var(--s-border);background:linear-gradient(145deg,var(--s-glass),var(--s-surface));color:var(--s-text);box-shadow:var(--shadow-soft);backdrop-filter:var(--blur-glass)}
.section-surface{padding:clamp(1rem,2vw,1.5rem)}.section-header-shell{position:sticky;top:.75rem;z-index:40}.section-filter-bar{position:sticky;top:5.2rem;z-index:35}.section-phase-list{min-height:min(42vh,500px)}.section-settings-panel{position:sticky;top:.75rem;align-self:start}.section-modal{width:min(920px,calc(100% - 1rem));margin-inline:auto;padding:clamp(1rem,2vw,1.5rem)}@media(max-width:1024px){.section-header-shell,.section-filter-bar,.section-settings-panel{position:static}}@media(prefers-reduced-motion:reduce){.app-sections-shell :is(.section-surface,.section-modal){transition:none}}
`;
const wrap = (Tag, className, children, landmarkProps = {}) => (<Tag className={`section-surface ${className}`.trim()} {...landmarkProps}>{children}</Tag>);
export const HeaderShell = ({ children }) => (<><style>{shellStyles}</style><main className="app-sections-shell" aria-label="Marvel Spectrum app layout">{wrap('header', 'section-header-shell', children, { role: 'banner' })}</main></>);
export const HeroBackdrop = ({ children }) => <section className="section-hero-backdrop" aria-hidden="true">{children}</section>;
export const HeroCarousel = ({ children }) => <section className="section-hero-carousel section-surface" aria-label="Featured Spectrum highlights">{children}</section>;
export const FloatingQuickControls = ({ children }) => <aside className="section-floating-controls section-surface" aria-label="Quick controls">{children}</aside>;
export const FilterBar = ({ children }) => wrap('section', 'section-filter-bar', children, { 'aria-label': 'Timeline command filters' });
export const PhaseList = ({ children }) => wrap('section', 'section-phase-list', children, { 'aria-label': 'Cinematic timeline chapters' });
export const SettingsPanel = ({ children }) => wrap('aside', 'section-settings-panel', children, { 'aria-label': 'Spectrum Studio settings' });
export const DetailModal = ({ children }) => <section role="dialog" aria-modal="true" className="section-modal" aria-label="Spectrum detail sheet">{children}</section>;
