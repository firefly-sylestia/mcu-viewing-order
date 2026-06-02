import React, { useEffect, useState } from 'react';
import { Bookmark, Film, Layers, Menu, Search, Settings, Star, X, Zap, Check } from '../../constants/icons.jsx';
import './NavigationShell.css';

const defaultDestinations = [
  { id: 'home', label: 'Home', meta: 'Landing dashboard', Icon: Star, group: 'Navigation', primary: true },
  { id: 'library', label: 'Timeline', meta: 'Cinematic watch order', Icon: Layers, group: 'Navigation', primary: true },
  { id: 'collections', label: 'Library', meta: 'Collection rooms', Icon: Film, group: 'Navigation', primary: true },
  { id: 'progress', label: 'Progress', meta: 'Journey stats', Icon: Bookmark, group: 'Navigation', primary: true },
  { id: 'search', label: 'Search', meta: 'Command Center', Icon: Search, group: 'Tools', primary: false },
  { id: 'settings', label: 'Settings', meta: 'Spectrum Studio', Icon: Settings, group: 'Tools', primary: false },
];

export const FloatingNavigationControls = React.memo(function FloatingNavigationControls({ controlsHidden = false, menuOpen = false, moreOpen = false, onToggle, onOpenSearch, onOpenSettings }) {
  return (
    <nav className="navigation-control-cluster spectrum-floating-controls" style={controlsHidden ? { opacity: 0, pointerEvents: 'none', visibility: 'hidden' } : undefined} aria-label="Spectrum quick controls">
      <button className="navigation-control-btn" type="button" onClick={onToggle} aria-label={menuOpen ? 'Close Spectrum Rail' : 'Open Spectrum Rail'} aria-expanded={menuOpen}><Menu size={18} /><span>Menu</span></button>
      <button className="navigation-control-btn" type="button" onClick={onOpenSearch} aria-label="Open Command Center"><Search size={18} /><span>Search</span></button>
      <button className="navigation-control-btn" type="button" onClick={onOpenSettings} aria-label={moreOpen ? 'Close Spectrum Studio' : 'Open Spectrum Studio'} aria-expanded={moreOpen}><Settings size={18} /><span>Studio</span></button>
    </nav>
  );
});

export const NavigationShell = React.memo(React.forwardRef(function NavigationShell({
  open,
  controlsHidden = false,
  destinations = defaultDestinations,
  activeDestination = 'home',
  progressBadges = {},
  onNavigate,
  onToggle,
  onClose,
  onOpenSettings,
  universeLabel = 'Marvel Spectrum',
  universeMeta = 'Cinematic timeline guide',
  quickActions = [],
  universeControls = null,
  appActions = [],
  children,
}, ref) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    if (!open && !mobileMoreOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') { setMobileMoreOpen(false); onClose?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mobileMoreOpen, onClose]);

  const runDestination = (destination) => {
    if (destination.id === 'settings') onOpenSettings?.();
    else onNavigate?.(destination.id);
    setMobileMoreOpen(false);
  };
  const primaryDock = destinations.filter(d => d.primary).slice(0, 5);
  const moreDestinations = destinations.filter(d => !d.primary);
  const actionButton = (action) => {
    const Icon = action.Icon || Zap;
    return (
      <button key={action.id || action.label} type="button" className="spectrum-rail__action" aria-pressed={action.active || undefined} data-active={Boolean(action.active)} onClick={() => { action.onClick?.(); setMobileMoreOpen(false); }}>
        <Icon size={17} /><span><strong>{action.label}</strong>{action.meta && <small>{action.meta}</small>}</span>{action.badge && <b>{action.badge}</b>}
      </button>
    );
  };

  const RailContent = ({ mobile = false }) => (
    <div className="spectrum-rail__content">
      <div className="spectrum-rail__brand">
        <span className="spectrum-orb" aria-hidden="true" />
        <div><strong>Marvel Spectrum</strong><small>{universeLabel}</small></div>
      </div>
      <button type="button" className="spectrum-command-pill" onClick={() => onNavigate?.('search')}><Search size={17}/><span>Command Center</span></button>
      <div className="spectrum-rail__nav" aria-label="Primary destinations">
        {destinations.map(destination => {
          const Icon = destination.Icon;
          const active = activeDestination === destination.id || (activeDestination === 'collections' && destination.id === 'library');
          return <button key={destination.id} type="button" className="spectrum-rail__item" data-active={active} aria-current={active ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={19}/><span><strong>{destination.label}</strong><small>{destination.meta}</small></span>{active && <i aria-hidden="true" />}{progressBadges[destination.id] && <b>{progressBadges[destination.id]}</b>}</button>;
        })}
      </div>
      <section className="spectrum-rail__panel" aria-label="Current universe"><span>Spectrum</span><strong>{universeMeta}</strong>{universeControls}</section>
      {!!quickActions.length && <section className="spectrum-rail__stack" aria-label="Quick actions"><p>Quick Moves</p>{quickActions.map(actionButton)}</section>}
      {!!appActions.length && <section className="spectrum-rail__stack" aria-label="App actions"><p>Tools</p>{appActions.map(actionButton)}</section>}
      {children}
      {mobile && <button type="button" className="spectrum-sheet__close" onClick={() => setMobileMoreOpen(false)}><X size={16}/> Close</button>}
    </div>
  );

  return (
    <>
      <aside ref={ref} id="sidebar-hub" className={`spectrum-nav spectrum-rail ${open ? 'is-open' : ''}`} aria-label="Spectrum Rail">
        <RailContent />
      </aside>
      <FloatingNavigationControls controlsHidden={controlsHidden} menuOpen={open} moreOpen={mobileMoreOpen} onToggle={() => {
        if (window.matchMedia?.('(max-width: 880px)').matches) setMobileMoreOpen(true);
        else onToggle?.();
      }} onOpenSearch={() => onNavigate?.('search')} onOpenSettings={onOpenSettings} />
      <nav className="spectrum-bottom-nav" aria-label="Mobile navigation" style={controlsHidden ? { opacity: 0, pointerEvents: 'none' } : undefined}>
        {primaryDock.map(destination => {
          const Icon = destination.Icon;
          const active = activeDestination === destination.id || (activeDestination === 'collections' && destination.id === 'library');
          return <button key={destination.id} type="button" data-active={active} aria-current={active ? 'page' : undefined} onClick={() => runDestination(destination)}><Icon size={19}/><span>{destination.label}</span>{active && <i/>}</button>;
        })}
        <button type="button" data-active={activeDestination === 'settings'} onClick={() => setMobileMoreOpen(true)}><Menu size={19}/><span>More</span></button>
      </nav>
      {mobileMoreOpen && <div className="spectrum-mobile-sheet" role="dialog" aria-modal="true" aria-label="Spectrum navigation"><div className="spectrum-mobile-sheet__panel"><span className="spectrum-sheet-handle" /> <RailContent mobile /> <div className="spectrum-mobile-more">{moreDestinations.map(d => <button key={d.id} onClick={() => runDestination(d)}><d.Icon size={16}/>{d.label}</button>)}</div></div></div>}
    </>
  );
}));

export default NavigationShell;
