import React, { useEffect, useState } from 'react';
import { Bookmark, ChevRight, Film, Layers, Menu, Search, Settings, Star, Tv, X, Zap } from '../../constants/icons.jsx';
import { useScrollDirection } from '../../hooks/useScrollDirection.js';
import './NavigationShell.css';

const defaultDestinations = [
  { id: 'home', label: 'Home', meta: 'Dashboard overview', Icon: Star, primary: true },
  { id: 'library', label: 'Watch Order', meta: 'Chronological release matrix', Icon: Film, primary: true },
  { id: 'collections', label: 'Timeline', meta: 'Phases, eras, and arcs', Icon: Layers, primary: true },
  { id: 'search', label: 'Characters', meta: 'Search story nodes', Icon: Search, primary: true },
  { id: 'teams', label: 'Teams', meta: 'Collections and alliances', Icon: Tv, primary: false, route: 'collections' },
  { id: 'progress', label: 'Phases', meta: 'Completion intelligence', Icon: Bookmark, primary: false },
  { id: 'settings', label: 'Settings', meta: 'Theme, backup, profile', Icon: Settings, primary: true },
];

function SpectrumMark({ small = false }) {
  return (
    <span className={`spectrum-mark ${small ? 'spectrum-mark--small' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 44" role="img">
        <defs>
          <linearGradient id="spectrum-wing-a" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent-cyan)" />
            <stop offset="0.48" stopColor="var(--accent-morpho)" />
            <stop offset="1" stopColor="var(--accent-violet)" />
          </linearGradient>
        </defs>
        <path className="spectrum-mark__wing spectrum-mark__wing--left" d="M31 21C21 4 8 2 2 10c-6 10 4 28 25 29 5-5 7-11 4-18Z" fill="url(#spectrum-wing-a)" />
        <path className="spectrum-mark__wing spectrum-mark__wing--right" d="M33 21C43 4 56 2 62 10c6 10-4 28-25 29-5-5-7-11-4-18Z" fill="url(#spectrum-wing-a)" />
        <path d="M32 12c3 5 3 15 0 25-3-10-3-20 0-25Z" fill="var(--text-primary)" opacity=".82" />
        <path d="M17 13c7 3 11 8 13 16M47 13c-7 3-11 8-13 16" stroke="rgba(255,255,255,.56)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function WingDivider() {
  return <div className="wing-divider" aria-hidden="true"><span /><i /><span /></div>;
}

export const FloatingNavigationControls = React.memo(function FloatingNavigationControls({ controlsHidden = false, menuOpen = false, onToggle, onOpenSearch, onOpenSettings }) {
  return (
    <nav className="navigation-control-cluster spectrum-glass" style={controlsHidden ? { opacity: 0, pointerEvents: 'none', visibility: 'hidden' } : undefined} aria-label="Floating command controls">
      <button className="navigation-control-btn" type="button" onClick={onToggle} aria-label={menuOpen ? 'Close command center' : 'Open command center'} aria-expanded={menuOpen} aria-controls="sidebar-hub" data-open={menuOpen}><Menu size={18} aria-hidden="true" /><span>Hub</span></button>
      <button className="navigation-control-btn" type="button" onClick={onOpenSearch} aria-label="Open command catalog"><Search size={18} aria-hidden="true" /><span>Search</span></button>
      <button className="navigation-control-btn" type="button" onClick={onOpenSettings} aria-label="Open settings"><Settings size={18} aria-hidden="true" /><span>Settings</span></button>
    </nav>
  );
});

export const NavigationShell = React.memo(React.forwardRef(function NavigationShell({
  open,
  onToggle,
  onClose,
  onOpenSettings,
  onDismissBackdrop,
  controlsHidden = false,
  destinations = defaultDestinations,
  activeDestination = 'home',
  progressBadges = {},
  onNavigate,
  universeLabel = 'Marvel Spectrum',
  universeMeta = 'Cinematic viewing command center',
  quickActions = [],
  universeControls = null,
  appActions = [],
  children,
}, ref) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { shouldShowNav } = useScrollDirection();

  useEffect(() => {
    if (!open && !mobileMoreOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMobileMoreOpen(false);
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mobileMoreOpen, onClose]);

  const routeFor = (destination) => destination.route || destination.id;
  const runDestination = (destination) => {
    const target = routeFor(destination);
    if (target === 'settings') onOpenSettings?.();
    else onNavigate?.(target);
    setMobileMoreOpen(false);
  };
  const handleControlToggle = () => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches) {
      setMobileMoreOpen(true);
      return;
    }
    onToggle?.();
  };
  const openSearch = () => onNavigate?.('search');
  const primaryDock = ['home', 'library', 'collections', 'search', 'settings'].map((id) => destinations.find((d) => d.id === id)).filter(Boolean);
  const isActive = (destination) => activeDestination === routeFor(destination) || activeDestination === destination.id;
  const actionButton = (action) => {
    const Icon = action.Icon || Zap;
    return <button key={action.id || action.label} type="button" className="sidebar-command-btn" aria-pressed={action.active || undefined} data-active={Boolean(action.active)} onClick={() => { action.onClick?.(); setMobileMoreOpen(false); }}><Icon size={16} /><span><strong>{action.label}</strong>{action.meta && <small>{action.meta}</small>}</span>{action.badge && <b>{action.badge}</b>}</button>;
  };

  const NavStack = ({ mobile = false }) => (
    <div className="sidebar-hub">
      <section className="sidebar-hub__brand">
        <SpectrumMark />
        <span>{universeLabel}</span>
        <strong>Marvel Spectrum</strong>
        <small>{universeMeta}</small>
      </section>
      <WingDivider />

      <section className="sidebar-hub__group" aria-label="Primary pages">
        <div className="sidebar-hub__stack">
          {destinations.map((destination) => {
            const Icon = destination.Icon;
            const active = isActive(destination);
            return <button key={destination.id} type="button" className="archive-rail__destination" title={collapsed ? destination.label : undefined} data-active={active} aria-current={active ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={19} /><span><strong>{destination.label}</strong>{destination.meta && <small>{destination.meta}</small>}</span>{progressBadges[destination.id] != null && <b>{progressBadges[destination.id]}</b>}<ChevRight size={13} className="archive-rail__chev" /></button>;
          })}
        </div>
      </section>

      {quickActions.length > 0 && <section className="sidebar-hub__group"><div className="sidebar-hub__group-title"><span>Mission Controls</span><small>Contextual viewing actions</small></div><div className="sidebar-hub__stack">{quickActions.map(actionButton)}</div></section>}
      {universeControls && <section className="sidebar-hub__group"><div className="sidebar-hub__group-title"><span>Universe</span><small>Context and language</small></div>{universeControls}</section>}
      <section className="sidebar-hub__group sidebar-hub__themes"><div className="sidebar-hub__group-title"><span>Spectrum Style</span><small>Glass or minimal density</small></div>{children}</section>
      {appActions.length > 0 && <section className="sidebar-hub__group"><div className="sidebar-hub__group-title"><span>Data Systems</span><small>Backup and metadata</small></div><div className="sidebar-hub__stack">{appActions.map(actionButton)}</div></section>}
      {mobile && <button className="sidebar-hub__close-wide" type="button" onClick={() => setMobileMoreOpen(false)}><X size={14} /> Close Command Center</button>}
    </div>
  );

  return (
    <>
      <FloatingNavigationControls controlsHidden={controlsHidden} menuOpen={open || mobileMoreOpen} onToggle={handleControlToggle} onOpenSearch={openSearch} onOpenSettings={onOpenSettings} />
      {open && <button className="navigation-backdrop" data-state="open" type="button" aria-label="Collapse command center" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onDismissBackdrop?.(); onClose?.(); }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }} />}
      <aside id="sidebar-hub" ref={ref} data-state={open ? 'open' : 'closed'} data-collapsed={collapsed} aria-label="Marvel Spectrum command center" className="navigation-shell spectrum-glass">
        <button className="navigation-collapse-btn" type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevRight size={15} /> : <X size={14} />}</button>
        <NavStack />
      </aside>

      <nav className="archive-mobile-dock spectrum-glass" data-visible={shouldShowNav} aria-label="Mobile primary navigation">
        {primaryDock.map((destination) => { const Icon = destination.Icon; const active = isActive(destination); return <button key={destination.id} type="button" data-active={active} aria-current={active ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={19} /><span>{destination.label}</span></button>; })}
      </nav>
      {mobileMoreOpen && <div className="archive-command-sheet" role="dialog" aria-modal="true" aria-label="Mobile command center" id="mobile-sidebar-hub"><button className="archive-command-sheet__backdrop" aria-label="Close command center" onClick={() => setMobileMoreOpen(false)} /><div className="archive-command-sheet__panel spectrum-glass"><div className="archive-command-sheet__head"><strong><SpectrumMark small /> Marvel Spectrum</strong><button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close command center"><X size={14} /></button></div><NavStack mobile /></div></div>}
    </>
  );
}));

export default NavigationShell;
