import React, { useEffect, useState } from 'react';
import { Bookmark, ChevRight, Film, Layers, Menu, Search, Settings, Star, X, Zap } from '../../constants/icons.jsx';
import { useScrollDirection } from '../../hooks/useScrollDirection.js';
import './NavigationShell.css';

const defaultDestinations = [
  { id: 'home', label: 'Home', meta: 'Mission dashboard', Icon: Star, group: 'Navigation', primary: true },
  { id: 'library', label: 'Watch Order', meta: 'Chronological archive', Icon: Film, group: 'Navigation', primary: true },
  { id: 'collections', label: 'Phases', meta: 'Saga rooms', Icon: Layers, group: 'Navigation', primary: false },
  { id: 'search', label: 'Timeline', meta: 'Command search', Icon: Search, group: 'Navigation', primary: true },
  { id: 'progress', label: 'Characters', meta: 'Progress intel', Icon: Bookmark, group: 'Viewing', primary: true },
  { id: 'settings', label: 'Settings', meta: 'Theme and data', Icon: Settings, group: 'App', primary: true },
];

function MorphoLogo({ compact = false }) {
  return (
    <div className="spectrum-logo" data-compact={compact}>
      <svg className="spectrum-logo__mark" viewBox="0 0 64 48" aria-hidden="true">
        <defs><linearGradient id="morphoLogo" x1="0" x2="1"><stop offset="0" stopColor="var(--accent-cyan)"/><stop offset=".45" stopColor="var(--accent-morpho)"/><stop offset="1" stopColor="var(--accent-violet)"/></linearGradient></defs>
        <path className="wing wing-left" d="M31 22C22 3 5 5 3 20c-2 15 17 21 28 7Z" fill="url(#morphoLogo)"/>
        <path className="wing wing-right" d="M33 22C42 3 59 5 61 20c2 15-17 21-28 7Z" fill="url(#morphoLogo)"/>
        <path d="M32 12c3 6 3 21 0 29-3-8-3-23 0-29Z" fill="var(--text-primary)" opacity=".86"/>
        <path d="M15 15c7 1 12 7 15 14M49 15c-7 1-12 7-15 14" fill="none" stroke="rgba(255,255,255,.58)" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      {!compact && <span><strong>Marvel Spectrum</strong><small>Cinematic intelligence dashboard</small></span>}
    </div>
  );
}

const actionButton = (action, close) => {
  const Icon = action.Icon || Zap;
  return <button key={action.id || action.label} type="button" className="spectrum-nav-action" aria-pressed={action.active || undefined} data-active={Boolean(action.active)} onClick={() => { action.onClick?.(); close?.(); }}><Icon size={16} /><span><strong>{action.label}</strong>{action.meta && <small>{action.meta}</small>}</span>{action.badge && <b>{action.badge}</b>}</button>;
};

export const FloatingNavigationControls = React.memo(function FloatingNavigationControls({ controlsHidden = false, menuOpen = false, moreOpen = false, onToggle, onOpenSearch, onOpenSettings }) {
  return (
    <nav className="navigation-control-cluster spectrum-glass" style={controlsHidden ? { opacity: 0, pointerEvents: 'none', visibility: 'hidden' } : undefined} aria-label="Floating command controls">
      <button className="navigation-control-btn" type="button" onClick={onToggle} aria-label={menuOpen ? 'Close command center' : 'Open command center'} aria-expanded={menuOpen} aria-controls="sidebar-hub" data-open={menuOpen}><Menu size={19} /><span>Hub</span></button>
      <button className="navigation-control-btn" type="button" onClick={onOpenSearch} aria-label="Open timeline search"><Search size={18} /><span>Search</span></button>
      <button className="navigation-control-btn" type="button" onClick={onOpenSettings} aria-label={moreOpen ? 'Close settings' : 'Open settings'} aria-expanded={moreOpen} data-open={moreOpen}><Settings size={18} /><span>Settings</span></button>
    </nav>
  );
});

export const NavigationShell = React.memo(React.forwardRef(function NavigationShell({
  open, darkMode, performanceMode, pillBorder, surfaceBorder, onToggle, onClose, onOpenSettings, onDismissBackdrop,
  controlsHidden = false, destinations = defaultDestinations, activeDestination = 'home', progressBadges = {}, onNavigate,
  universeLabel = 'MARVEL Spectrum', universeMeta = 'Viewing order command center', quickActions = [], universeControls = null, appActions = [], children,
}, ref) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const { shouldShowNav } = useScrollDirection();

  useEffect(() => {
    if (!open && !mobileMoreOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') { setMobileMoreOpen(false); onClose?.(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mobileMoreOpen, onClose]);

  const closeMobile = () => setMobileMoreOpen(false);
  const runDestination = (destination) => {
    if (destination.id === 'settings') onOpenSettings?.(); else onNavigate?.(destination.id);
    closeMobile();
  };
  const handleControlToggle = () => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches) { setMobileMoreOpen(true); return; }
    onToggle?.();
  };
  const primaryDock = destinations.filter((d) => d.primary).slice(0, 5);
  const groups = ['Navigation', 'Viewing', 'App'].map(group => [group, destinations.filter(d => (d.group || 'Navigation') === group)]).filter(([, rows]) => rows.length);
  const HubContent = ({ mobile = false }) => (
    <div className="sidebar-hub">
      <section className="sidebar-hub__brand"><MorphoLogo /><p>{universeLabel}</p><small>{universeMeta}</small></section>
      <div className="wing-divider" aria-hidden="true" />
      {groups.map(([group, rows]) => <section className="sidebar-hub__group" key={group}><div className="sidebar-hub__group-title"><span>{group}</span><small>{group === 'Navigation' ? 'Move through the spectrum' : group === 'Viewing' ? 'Control watch state' : 'Preferences'}</small></div><div className="sidebar-hub__stack">{rows.map((destination) => { const Icon = destination.Icon; const active = activeDestination === destination.id; return <button key={destination.id} type="button" className="archive-rail__destination" data-active={active} aria-current={active ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={18} /><span><strong>{destination.label}</strong>{destination.meta && <small>{destination.meta}</small>}</span>{progressBadges[destination.id] != null && <b>{progressBadges[destination.id]}</b>}<ChevRight size={13} className="archive-rail__chev" /></button>; })}</div></section>)}
      {quickActions.length > 0 && <section className="sidebar-hub__group"><div className="sidebar-hub__group-title"><span>Quick Actions</span><small>Filters and shortcuts</small></div><div className="sidebar-hub__stack">{quickActions.map(a => actionButton(a, closeMobile))}</div></section>}
      {universeControls && <section className="sidebar-hub__group"><div className="sidebar-hub__group-title"><span>Universe</span><small>Switch context</small></div>{universeControls}</section>}
      <section className="sidebar-hub__group sidebar-hub__themes"><div className="sidebar-hub__group-title"><span>Spectrum Style</span><small>Glass / minimal and accent controls</small></div>{children}</section>
      {appActions.length > 0 && <section className="sidebar-hub__group"><div className="sidebar-hub__group-title"><span>App & Data</span><small>Backup, export, setup</small></div><div className="sidebar-hub__stack">{appActions.map(a => actionButton(a, closeMobile))}</div></section>}
      {mobile && <button className="sidebar-hub__close-wide" type="button" onClick={closeMobile}><X size={14} /> Close Command Center</button>}
    </div>
  );

  return <>
    <FloatingNavigationControls controlsHidden={controlsHidden} menuOpen={open || mobileMoreOpen} moreOpen={activeDestination === 'settings'} onToggle={handleControlToggle} onOpenSearch={() => onNavigate?.('search')} onOpenSettings={onOpenSettings} />
    {open && <button className="navigation-backdrop" data-state="open" type="button" aria-label="Collapse command center" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onDismissBackdrop?.(); onClose?.(); }} />}
    <aside id="sidebar-hub" ref={ref} data-state={open ? 'open' : 'closed'} aria-label="Marvel Spectrum command center" className="navigation-shell archive-rail spectrum-glass" style={{ '--navigation-blur': performanceMode ? 'none' : undefined }}>
      <div className="navigation-shell__topbar"><MorphoLogo compact /><span>Command Center</span><button className="navigation-close-btn" type="button" onClick={onClose} aria-label="Collapse command center"><X size={14} /></button></div>
      <HubContent />
    </aside>
    <nav className="archive-mobile-dock spectrum-glass" aria-label="Mobile primary navigation" data-visible={shouldShowNav}>{primaryDock.map((destination) => { const Icon = destination.Icon; return <button key={destination.id} type="button" data-active={activeDestination === destination.id} aria-current={activeDestination === destination.id ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={18} /><span>{destination.label}</span></button>; })}</nav>
    {mobileMoreOpen && <div className="archive-command-sheet" role="dialog" aria-modal="true" aria-label="Mobile command center" id="mobile-sidebar-hub"><button className="archive-command-sheet__backdrop" aria-label="Close command center" onClick={closeMobile} /><div className="archive-command-sheet__panel spectrum-glass"><div className="archive-command-sheet__head"><strong>Marvel Spectrum</strong><button type="button" onClick={closeMobile} aria-label="Close command center"><X size={14} /></button></div><HubContent mobile /></div></div>}
  </>;
}));

export default NavigationShell;
