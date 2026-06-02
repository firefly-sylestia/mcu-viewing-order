import React, { useEffect, useState } from 'react';
import { Bookmark, ChevRight, Film, Layers, Menu, Search, Settings, Star, X, Zap } from '../../constants/icons.jsx';
import './NavigationShell.css';

const defaultDestinations = [
  { id: 'home', label: 'Home', meta: 'Curated next steps', Icon: Star, group: 'Navigation', primary: true },
  { id: 'library', label: 'Library', meta: 'Full archive catalog', Icon: Film, group: 'Navigation', primary: true },
  { id: 'collections', label: 'Collections', meta: 'Themed archive rooms', Icon: Layers, group: 'Navigation', primary: true },
  { id: 'search', label: 'Search', meta: 'Command catalog', Icon: Search, group: 'Navigation', primary: true },
  { id: 'progress', label: 'Progress', meta: 'Stats and exports', Icon: Bookmark, group: 'Navigation', primary: false },
  { id: 'settings', label: 'More', meta: 'Preferences and data', Icon: Settings, group: 'App', primary: false },
];

const controlStyle = (darkMode, pillBorder) => ({
  '--nav-control-bg': darkMode ? 'rgba(8,12,28,0.92)' : 'rgba(255,255,255,0.94)',
  '--nav-control-text': darkMode ? '#f5fffd' : '#0f172a',
  '--nav-control-border': darkMode ? 'rgba(255,255,255,0.22)' : pillBorder,
});

export const FloatingNavigationControls = React.memo(function FloatingNavigationControls({ darkMode, pillBorder, controlsHidden = false, menuOpen = false, moreOpen = false, onToggle, onOpenSearch, onOpenSettings }) {
  return (
    <nav className="navigation-control-cluster" style={controlsHidden ? { opacity: 0, pointerEvents: 'none', visibility: 'hidden' } : undefined} aria-label="Floating command controls">
      <button className="theme-btn navigation-control-btn" type="button" onClick={onToggle} aria-label={menuOpen ? 'Close Sidebar Hub' : 'Open Sidebar Hub'} aria-expanded={menuOpen} aria-controls="sidebar-hub" title="Sidebar Hub" style={controlStyle(darkMode, pillBorder)} data-open={menuOpen}><Menu size={19} aria-hidden="true" /><span>Hub</span></button>
      <button className="theme-btn navigation-control-btn" type="button" onClick={onOpenSearch} aria-label="Open search command catalog" title="Search" style={controlStyle(darkMode, pillBorder)}><Search size={18} aria-hidden="true" /><span>Search</span></button>
      <button className="theme-btn navigation-control-btn" type="button" onClick={onOpenSettings} aria-label={moreOpen ? 'Close More panel' : 'Open More panel'} aria-expanded={moreOpen} aria-controls="more-command-panel" title="More" style={controlStyle(darkMode, pillBorder)} data-open={moreOpen}><Settings size={18} aria-hidden="true" /><span>More</span></button>
    </nav>
  );
});

export const NavigationShell = React.memo(React.forwardRef(function NavigationShell({
  open,
  darkMode,
  performanceMode,
  pillBorder,
  surfaceBorder,
  onToggle,
  onClose,
  onOpenSettings,
  onDismissBackdrop,
  controlsHidden = false,
  destinations = defaultDestinations,
  activeDestination = 'home',
  progressBadges = {},
  onNavigate,
  universeLabel = 'MARVEL Spectrum',
  universeMeta = 'Viewing order command center',
  quickActions = [],
  universeControls = null,
  appActions = [],
  children,
}, ref) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

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

  const runDestination = (destination) => {
    if (destination.id === 'settings') onOpenSettings?.();
    else onNavigate?.(destination.id);
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
  const primaryDock = destinations.filter((d) => d.primary).slice(0, 4);
  const destinationGroups = ['Navigation', 'Viewing', 'App'].map(group => [group, destinations.filter(d => (d.group || 'Navigation') === group)]).filter(([, rows]) => rows.length);
  const actionButton = (action) => {
    const Icon = action.Icon || Zap;
    return <button key={action.id || action.label} type="button" className="sidebar-command-btn" aria-pressed={action.active || undefined} data-active={Boolean(action.active)} onClick={() => { action.onClick?.(); setMobileMoreOpen(false); }}><Icon size={16} /><span><strong>{action.label}</strong>{action.meta && <small>{action.meta}</small>}</span>{action.badge && <b>{action.badge}</b>}</button>;
  };

  const HubContent = ({ mobile = false }) => (
    <div className="sidebar-hub">
      <section className="sidebar-hub__brand">
        <span>{universeLabel}</span>
        <strong>Sidebar Hub</strong>
        <small>{universeMeta}</small>
      </section>

      {destinationGroups.map(([group, rows]) => (
        <section className="sidebar-hub__group" key={group} aria-label={`${group} commands`}>
          <div className="sidebar-hub__group-title"><span>{group}</span><small>{group === 'Navigation' ? 'Move through the app' : group === 'Viewing' ? 'Control the current order' : 'Preferences and tools'}</small></div>
          <div className="sidebar-hub__stack">
            {rows.map((destination) => {
              const Icon = destination.Icon;
              const active = activeDestination === destination.id;
              return <button key={destination.id} type="button" className="archive-rail__destination" data-active={active} aria-current={active ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={18} /><span><strong>{destination.label}</strong>{destination.meta && <small>{destination.meta}</small>}</span>{progressBadges[destination.id] != null && <b>{progressBadges[destination.id]}</b>}<ChevRight size={13} className="archive-rail__chev" /></button>;
            })}
          </div>
        </section>
      ))}

      {quickActions.length > 0 && <section className="sidebar-hub__group"><div className="sidebar-hub__group-title"><span>Quick Actions</span><small>Viewing, filters, and catalog shortcuts</small></div><div className="sidebar-hub__stack">{quickActions.map(actionButton)}</div></section>}
      {universeControls && <section className="sidebar-hub__group"><div className="sidebar-hub__group-title"><span>Universe</span><small>Switch context and language</small></div>{universeControls}</section>}
      <section className="sidebar-hub__group sidebar-hub__themes"><div className="sidebar-hub__group-title"><span>Styles & Themes</span><small>Active style and accent controls</small></div>{children}</section>
      {appActions.length > 0 && <section className="sidebar-hub__group"><div className="sidebar-hub__group-title"><span>App & Data</span><small>Backup, export, settings</small></div><div className="sidebar-hub__stack">{appActions.map(actionButton)}</div></section>}
      {mobile && <button className="sidebar-hub__close-wide" type="button" onClick={() => setMobileMoreOpen(false)}><X size={14} /> Close Hub</button>}
    </div>
  );

  return (
    <>
      <FloatingNavigationControls darkMode={darkMode} pillBorder={pillBorder} controlsHidden={controlsHidden} menuOpen={open || mobileMoreOpen} moreOpen={activeDestination === 'settings'} onToggle={handleControlToggle} onOpenSearch={openSearch} onOpenSettings={onOpenSettings} />
      {open && <button className="navigation-backdrop" data-state="open" type="button" aria-label="Collapse Sidebar Hub" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onDismissBackdrop?.(); onClose?.(); }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }} />}
      <aside id="sidebar-hub" ref={ref} data-state={open ? 'open' : 'closed'} aria-label="Sidebar Hub" className="navigation-shell archive-rail" style={{ '--navigation-bg': darkMode ? 'rgba(8,12,28,0.92)' : 'rgba(248,251,255,0.94)', '--navigation-border': surfaceBorder, '--navigation-shadow': darkMode ? 'var(--elevation-surface-3)' : 'var(--elevation-surface-2)', '--navigation-blur': performanceMode ? 'none' : 'blur(14px)' }}>
        <div className="navigation-shell__topbar"><span>Command Center</span><button className="navigation-close-btn" type="button" onClick={onClose} aria-label="Collapse Sidebar Hub"><X size={14} /></button></div>
        <HubContent />
      </aside>

      <nav className="archive-mobile-dock" aria-label="Mobile primary navigation">
        {primaryDock.map((destination) => { const Icon = destination.Icon; return <button key={destination.id} type="button" data-active={activeDestination === destination.id} aria-current={activeDestination === destination.id ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={18} /><span>{destination.label}</span></button>; })}
        <button type="button" data-active={mobileMoreOpen} aria-expanded={mobileMoreOpen} aria-controls="mobile-sidebar-hub" onClick={() => setMobileMoreOpen(true)}><Menu size={18} /><span>Hub</span></button>
      </nav>
      {mobileMoreOpen && <div className="archive-command-sheet" role="dialog" aria-modal="true" aria-label="Mobile Sidebar Hub" id="mobile-sidebar-hub"><button className="archive-command-sheet__backdrop" aria-label="Close Sidebar Hub" onClick={() => setMobileMoreOpen(false)} /><div className="archive-command-sheet__panel"><div className="archive-command-sheet__head"><strong>Sidebar Hub</strong><button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close Sidebar Hub"><X size={14} /></button></div><HubContent mobile /></div></div>}
    </>
  );
}));

export default NavigationShell;
