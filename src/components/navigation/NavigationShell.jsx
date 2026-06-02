import React, { useEffect, useState } from 'react';
import { Bookmark, ChevRight, Film, Layers, Menu, Search, Settings, Star, X, Zap } from '../../constants/icons.jsx';
import './NavigationShell.css';

const defaultDestinations = [
  { id: 'home', label: 'Home', meta: 'Landing dashboard', Icon: Star, group: 'Navigation', primary: true },
  { id: 'library', label: 'Timeline', meta: 'Cinematic chapters', Icon: Layers, group: 'Navigation', primary: true },
  { id: 'collections', label: 'Library', meta: 'Spectrum rooms', Icon: Film, group: 'Navigation', primary: true },
  { id: 'progress', label: 'Progress', meta: 'Journey stats', Icon: Bookmark, group: 'Navigation', primary: true },
  { id: 'search', label: 'Search', meta: 'Command Center', Icon: Search, group: 'Viewing', primary: false },
  { id: 'settings', label: 'Studio', meta: 'Settings and themes', Icon: Settings, group: 'App', primary: false },
];

export const FloatingNavigationControls = React.memo(function FloatingNavigationControls({ controlsHidden = false, menuOpen = false, moreOpen = false, onToggle, onOpenSearch, onOpenSettings }) {
  return (
    <nav className="spectrum-command-cluster" style={controlsHidden ? { opacity: 0, pointerEvents: 'none', visibility: 'hidden' } : undefined} aria-label="Marvel Spectrum quick controls">
      <button className="spectrum-control-btn" type="button" onClick={onToggle} aria-label={menuOpen ? 'Close Spectrum Rail' : 'Open Spectrum Rail'} aria-expanded={menuOpen} aria-controls="sidebar-hub" data-open={menuOpen}><Menu size={18} aria-hidden="true" /><span>Rail</span></button>
      <button className="spectrum-control-btn spectrum-control-btn--search" type="button" onClick={onOpenSearch} aria-label="Open Spectrum Command Center"><Search size={18} aria-hidden="true" /><span>Search</span></button>
      <button className="spectrum-control-btn" type="button" onClick={onOpenSettings} aria-label={moreOpen ? 'Close Spectrum Studio' : 'Open Spectrum Studio'} aria-expanded={moreOpen} aria-controls="more-command-panel" data-open={moreOpen}><Settings size={18} aria-hidden="true" /><span>Studio</span></button>
    </nav>
  );
});

export const NavigationShell = React.memo(React.forwardRef(function NavigationShell({
  open,
  performanceMode,
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
  universeMeta = 'Cinematic path command center',
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
    return <button key={action.id || action.label} type="button" className="spectrum-rail-action" aria-pressed={action.active || undefined} data-active={Boolean(action.active)} onClick={() => { action.onClick?.(); setMobileMoreOpen(false); }}><Icon size={16} /><span><strong>{action.label}</strong>{action.meta && <small>{action.meta}</small>}</span>{action.badge && <b>{action.badge}</b>}</button>;
  };

  const HubContent = ({ mobile = false }) => (
    <div className="spectrum-rail__content">
      <section className="spectrum-rail__brand" aria-label="Marvel Spectrum">
        <span className="spectrum-orb" aria-hidden="true" />
        <div><p>{universeLabel}</p><strong>Marvel Spectrum</strong><small>{universeMeta}</small></div>
      </section>

      {destinationGroups.map(([group, rows]) => (
        <section className="spectrum-rail__group" key={group} aria-label={`${group} commands`}>
          <div className="spectrum-rail__group-title"><span>{group}</span><small>{group === 'Navigation' ? 'Move through your path' : group === 'Viewing' ? 'Find and filter quickly' : 'Tune the studio'}</small></div>
          <div className="spectrum-rail__stack">
            {rows.map((destination) => {
              const Icon = destination.Icon;
              const active = activeDestination === destination.id;
              return <button key={destination.id} type="button" className="spectrum-rail__destination" data-active={active} aria-current={active ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={18} /><span><strong>{destination.label}</strong>{destination.meta && <small>{destination.meta}</small>}</span>{progressBadges[destination.id] != null && <b>{progressBadges[destination.id]}</b>}<ChevRight size={13} className="spectrum-rail__chev" /></button>;
            })}
          </div>
        </section>
      ))}

      {quickActions.length > 0 && <section className="spectrum-rail__group"><div className="spectrum-rail__group-title"><span>Quick Actions</span><small>Journey shortcuts</small></div><div className="spectrum-rail__stack">{quickActions.map(actionButton)}</div></section>}
      {universeControls && <section className="spectrum-rail__group"><div className="spectrum-rail__group-title"><span>Universe</span><small>Switch context</small></div>{universeControls}</section>}
      <section className="spectrum-rail__group"><div className="spectrum-rail__group-title"><span>Spectrum Studio</span><small>Theme palette and mode</small></div>{children}</section>
      {appActions.length > 0 && <section className="spectrum-rail__group"><div className="spectrum-rail__group-title"><span>Data & Backup</span><small>Exports and cache</small></div><div className="spectrum-rail__stack">{appActions.map(actionButton)}</div></section>}
      {mobile && <button className="spectrum-sheet__close-wide" type="button" onClick={() => setMobileMoreOpen(false)}><X size={14} /> Close</button>}
    </div>
  );

  return (
    <>
      <FloatingNavigationControls controlsHidden={controlsHidden} menuOpen={open || mobileMoreOpen} moreOpen={activeDestination === 'settings'} onToggle={handleControlToggle} onOpenSearch={openSearch} onOpenSettings={onOpenSettings} />
      {open && <button className="spectrum-nav-backdrop" data-state="open" type="button" aria-label="Collapse Spectrum Rail" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onDismissBackdrop?.(); onClose?.(); }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }} />}
      <aside id="sidebar-hub" ref={ref} data-state={open ? 'open' : 'closed'} data-performance={performanceMode ? 'reduced' : 'standard'} aria-label="Spectrum Rail" className="spectrum-rail navigation-shell">
        <div className="spectrum-rail__topbar"><span>Spectrum Rail</span><button className="spectrum-icon-button" type="button" onClick={onClose} aria-label="Collapse Spectrum Rail"><X size={14} /></button></div>
        <HubContent />
      </aside>

      <nav className="spectrum-bottom-nav" aria-label="Mobile primary navigation">
        {primaryDock.map((destination) => { const Icon = destination.Icon; return <button key={destination.id} type="button" data-active={activeDestination === destination.id} aria-current={activeDestination === destination.id ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={19} /><span>{destination.label}</span></button>; })}
        <button type="button" data-active={mobileMoreOpen} aria-expanded={mobileMoreOpen} aria-controls="mobile-sidebar-hub" onClick={() => setMobileMoreOpen(true)}><Menu size={19} /><span>More</span></button>
      </nav>
      {mobileMoreOpen && <div className="spectrum-mobile-sheet" role="dialog" aria-modal="true" aria-label="Spectrum Rail" id="mobile-sidebar-hub"><button className="spectrum-mobile-sheet__backdrop" aria-label="Close Spectrum Rail" onClick={() => setMobileMoreOpen(false)} /><div className="spectrum-mobile-sheet__panel"><div className="spectrum-mobile-sheet__head"><strong>Marvel Spectrum</strong><button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close Spectrum Rail"><X size={14} /></button></div><HubContent mobile /></div></div>}
    </>
  );
}));

export default NavigationShell;
