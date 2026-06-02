import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookmarkPlus,
  Check,
  ChevronRight,
  Clock3,
  Command,
  Eye,
  Film,
  Gauge,
  Grid2X2,
  Home,
  Info,
  Layers3,
  Library,
  ListFilter,
  Monitor,
  Moon,
  Palette,
  Play,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Tv,
  X,
  Zap,
} from 'lucide-react';
import { RAW, PHASES } from './data/mcuData';
import './styles/marvel-spectrum.css';

const STORAGE_KEYS = {
  theme: 'marvel-spectrum-theme',
  accent: 'marvel-spectrum-accent',
  density: 'marvel-spectrum-density',
  motion: 'marvel-spectrum-motion',
  background: 'marvel-spectrum-background',
  progress: 'marvel-spectrum-progress',
};

const NAV_ITEMS = [
  { id: '/', label: 'Home', short: 'Home', icon: Home },
  { id: '/orders', label: 'Watch Orders', short: 'Orders', icon: Play },
  { id: '/timeline', label: 'Timeline', short: 'Timeline', icon: Layers3 },
  { id: '/collection', label: 'Collection', short: 'Search', icon: Library },
  { id: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
];

const TYPE_META = {
  film: { label: 'Movie', icon: Film },
  series: { label: 'Show', icon: Tv },
  short: { label: 'Special', icon: Zap },
};

const ORDER_DEFINITIONS = [
  {
    id: 'release',
    name: 'Release Order',
    bestFor: 'First-time viewers',
    difficulty: 'Easy',
    tone: 'crimson',
    description: 'Watch the MCU as audiences experienced it, with reveals and post-credit momentum preserved.',
  },
  {
    id: 'timeline',
    name: 'Timeline Order',
    bestFor: 'Chronology explorers',
    difficulty: 'Balanced',
    tone: 'cyan',
    description: 'Follow the in-universe flow from origin stories through multiverse escalation.',
  },
  {
    id: 'saga',
    name: 'Saga Order',
    bestFor: 'Arc-focused marathons',
    difficulty: 'Guided',
    tone: 'violet',
    description: 'Move through phases and sagas with more context around era shifts and story payoffs.',
  },
  {
    id: 'character',
    name: 'Character Arc Order',
    bestFor: 'Hero deep dives',
    difficulty: 'Curated',
    tone: 'emerald',
    description: 'Trace important character paths, teams, and crossover threads without losing the main arc.',
  },
  {
    id: 'custom',
    name: 'Custom Spectrum',
    bestFor: 'Personal journeys',
    difficulty: 'Flexible',
    tone: 'spectrum',
    description: 'Build a lightweight path from favorites, essentials, and whatever you want to revisit next.',
  },
];

function readStoredJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in hardened browsers; the app still works in memory.
  }
}

function getPath() {
  const path = window.location.pathname;
  return NAV_ITEMS.some((item) => item.id === path) ? path : '/';
}

function useRoute() {
  const [route, setRoute] = useState(getPath);

  useEffect(() => {
    const onPop = () => setRoute(getPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to) => {
    if (to === route) return;
    window.history.pushState({}, '', to);
    setRoute(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [route]);

  return [route, navigate];
}

function useThemeSettings() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEYS.theme) || 'dark');
  const [accent, setAccent] = useState(() => localStorage.getItem(STORAGE_KEYS.accent) || 'spectrum');
  const [density, setDensity] = useState(() => localStorage.getItem(STORAGE_KEYS.density) || 'comfortable');
  const [motion, setMotion] = useState(() => localStorage.getItem(STORAGE_KEYS.motion) || 'auto');
  const [background, setBackground] = useState(() => localStorage.getItem(STORAGE_KEYS.background) || 'balanced');

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedTheme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
    root.dataset.theme = resolvedTheme;
    root.dataset.accent = accent;
    root.dataset.density = density;
    root.dataset.motion = motion;
    root.dataset.background = background;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    localStorage.setItem(STORAGE_KEYS.accent, accent);
    localStorage.setItem(STORAGE_KEYS.density, density);
    localStorage.setItem(STORAGE_KEYS.motion, motion);
    localStorage.setItem(STORAGE_KEYS.background, background);
  }, [theme, accent, density, motion, background]);

  return { theme, setTheme, accent, setAccent, density, setDensity, motion, setMotion, background, setBackground };
}

function ButterflyMark({ className = '' }) {
  return (
    <span className={`butterfly-mark ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function SpectrumBackground() {
  return (
    <div className="spectrum-background" aria-hidden="true">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="wing-glow wing-left" />
      <div className="wing-glow wing-right" />
      <div className="spectrum-dust" />
    </div>
  );
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`ms-button ms-button--${variant} ${className}`} {...props}>{children}</button>;
}

function Badge({ children, tone = 'neutral', icon: Icon }) {
  return <span className={`ms-badge ms-badge--${tone}`}>{Icon ? <Icon size={14} /> : null}{children}</span>;
}

function ProgressRing({ value, label = 'complete' }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress-ring" style={{ '--progress': clamped }} role="img" aria-label={`${clamped}% ${label}`}>
      <div className="progress-ring__inner">
        <strong>{clamped}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Layout({ route, navigate, settings, children, openSearch }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SpectrumBackground />
      <div className="app-shell">
        <aside className="side-rail" aria-label="Primary">
          <button className="brand-block" onClick={() => navigate('/')} aria-label="Marvel Spectrum home">
            <ButterflyMark />
            <span>Marvel<br />Spectrum</span>
          </button>
          <nav className="rail-nav">
            {NAV_ITEMS.map((item) => <NavButton key={item.id} item={item} active={route === item.id} navigate={navigate} />)}
          </nav>
          <div className="rail-card">
            <Sparkles size={18} />
            <strong>Next in your spectrum</strong>
            <span>Pick a path and continue with cinematic context.</span>
          </div>
        </aside>

        <header className="top-nav">
          <button className="brand-inline" onClick={() => navigate('/')} aria-label="Marvel Spectrum home">
            <ButterflyMark />
            <span>Marvel Spectrum</span>
          </button>
          <nav className="top-links" aria-label="Main links">
            {NAV_ITEMS.slice(0, 4).map((item) => (
              <button key={item.id} className={route === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)}>{item.label}</button>
            ))}
          </nav>
          <div className="top-actions">
            <button className="search-trigger" onClick={openSearch}><Search size={17} />Search <kbd>/</kbd></button>
            <button className="icon-button" onClick={() => settings.setTheme(settings.theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">
              {settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Button variant="glass" onClick={() => navigate('/orders')}>Start Watching</Button>
          </div>
        </header>

        <main id="main-content" className="main-stage" tabIndex="-1">{children}</main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Mobile primary">
        {NAV_ITEMS.map((item) => <NavButton key={item.id} item={item} active={route === item.id} navigate={navigate} mobile />)}
      </nav>
    </>
  );
}

function NavButton({ item, active, navigate, mobile = false }) {
  const Icon = item.icon;
  return (
    <button className={`nav-button ${active ? 'is-active' : ''}`} onClick={() => navigate(item.id)} aria-current={active ? 'page' : undefined}>
      <Icon size={mobile ? 20 : 19} />
      <span>{mobile ? item.short : item.label}</span>
    </button>
  );
}

function HomePage({ entries, progress, navigate, setActiveOrder, toggleWatched }) {
  const stats = useStats(entries, progress);
  const nextUp = entries.find((entry) => !progress[entry.id]) || entries[0];
  const featured = PHASES.slice(0, 6);

  return (
    <div className="page-flow home-page">
      <section className="hero-grid reveal-in">
        <div className="hero-panel">
          <Badge tone="spectrum" icon={Sparkles}>Cinematic Butterfly Spectrum</Badge>
          <h1>Your Cinematic Path Through the Marvel Universe</h1>
          <p>Choose release order, timeline order, saga arcs, or your own custom journey through the MCU — with progress, filters, and a polished guide that feels as magical as the stories.</p>
          <div className="hero-actions">
            <Button onClick={() => navigate('/orders')}>Start Watching <ArrowRight size={18} /></Button>
            <Button variant="secondary" onClick={() => navigate('/timeline')}>Explore Timeline</Button>
          </div>
          <div className="hero-chips" aria-label="Available features">
            {['Timeline Order', 'Release Order', 'Saga Mode', 'Progress Tracking', 'Light / Dark'].map((chip) => <span key={chip}>{chip}</span>)}
          </div>
        </div>
        <div className="hero-orbit" aria-label="Marvel Spectrum preview cards">
          <div className="orbit-card orbit-card--large">
            <ButterflyMark />
            <span>Recommended Path</span>
            <strong>Release Order</strong>
            <button onClick={() => { setActiveOrder('release'); navigate('/orders'); }}>Begin <ChevronRight size={16} /></button>
          </div>
          <div className="orbit-card"><span>Current Saga</span><strong>{stats.currentSaga}</strong></div>
          <div className="orbit-card"><span>Next Up</span><strong>{nextUp.title}</strong></div>
        </div>
      </section>

      <section className="bento-grid" aria-label="Viewing dashboard">
        <article className="bento-card bento-card--progress">
          <div>
            <Badge tone="cyan" icon={Gauge}>Your Progress</Badge>
            <h2>{stats.watched} watched</h2>
            <p>Every completed title updates your path and unlocks a softer spectrum glow.</p>
          </div>
          <ProgressRing value={stats.percent} />
        </article>
        <article className="bento-card">
          <Badge tone="gold" icon={Star}>Recommended</Badge>
          <h2>Start with Release Order</h2>
          <p>Best for preserving reveals, audience context, and post-credit momentum.</p>
          <Button variant="secondary" onClick={() => navigate('/orders')}>Compare orders</Button>
        </article>
        <article className="bento-card">
          <Badge tone="violet" icon={Layers3}>Next Up</Badge>
          <h2>{nextUp.title}</h2>
          <p>{nextUp.desc}</p>
          <div className="card-actions">
            <Button variant="ghost" onClick={() => navigate('/timeline')}>Open timeline</Button>
            <Button variant="secondary" onClick={() => toggleWatched(nextUp.id)}>Mark watched</Button>
          </div>
        </article>
        <article className="bento-card bento-card--filters">
          <Badge tone="pink" icon={ListFilter}>Quick Filters</Badge>
          <div className="quick-filter-grid">
            {['Movies', 'Shows', 'Specials', 'Essentials'].map((item) => <button key={item} onClick={() => navigate('/collection')}>{item}</button>)}
          </div>
        </article>
      </section>

      <SectionHeader eyebrow="Choose your path" title="A watch-order system for every kind of marathon" text="Each order has a distinct rhythm, complexity level, and story purpose." />
      <div className="order-card-grid">
        {ORDER_DEFINITIONS.map((order) => <OrderCard key={order.id} order={order} entries={entries} select={() => { setActiveOrder(order.id); navigate('/orders'); }} />)}
      </div>

      <SectionHeader eyebrow="Featured MCU eras" title="Phases that unfold like spectrum wings" text="Move through compact eras, saga-wide arcs, and future-facing chapters without losing your place." />
      <div className="era-grid">
        {featured.map((phase) => <PhaseCard key={phase.id} phase={phase} entries={entries.filter((entry) => entry.phase === phase.id)} />)}
      </div>

      <section className="timeline-preview">
        <div>
          <Badge tone="cyan" icon={Clock3}>Interactive Preview</Badge>
          <h2>Timeline movement without the overwhelm</h2>
          <p>Phase separators, type filters, density controls, and progress actions keep long MCU lists readable on every screen.</p>
          <Button onClick={() => navigate('/timeline')}>Open timeline <ArrowRight size={18} /></Button>
        </div>
        <div className="mini-timeline">
          {entries.slice(0, 8).map((entry) => <span key={entry.id} className={progress[entry.id] ? 'is-complete' : ''}>{entry.title}</span>)}
        </div>
      </section>

      <section className="final-cta">
        <ButterflyMark />
        <h2>Your cinematic path is ready</h2>
        <p>Let Marvel Spectrum guide your next watch session with a calm, premium, and accessible viewing dashboard.</p>
        <Button onClick={() => navigate('/orders')}>Start your journey</Button>
      </section>
    </div>
  );
}

function OrdersPage({ entries, activeOrder, setActiveOrder, navigate, progress }) {
  const selected = ORDER_DEFINITIONS.find((order) => order.id === activeOrder) || ORDER_DEFINITIONS[0];
  const preview = getOrderEntries(entries, activeOrder).slice(0, 7);

  return (
    <div className="page-flow">
      <PageHero eyebrow="Watch Orders" title="Choose how your Marvel story unfolds" text="Compare curated viewing paths, understand who each path is best for, and start a route with a clear preview." />
      <div className="orders-layout">
        <section className="order-card-grid order-card-grid--page">
          {ORDER_DEFINITIONS.map((order) => (
            <OrderCard key={order.id} order={order} entries={entries} selected={order.id === activeOrder} select={() => setActiveOrder(order.id)} />
          ))}
        </section>
        <aside className="order-preview-panel">
          <Badge tone={selected.tone} icon={BadgeCheck}>Selected Path</Badge>
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
          <div className="comparison-list">
            <span><strong>{preview.length}</strong> preview titles</span>
            <span><strong>{entries.filter((entry) => progress[entry.id]).length}</strong> already watched</span>
            <span><strong>{selected.difficulty}</strong> complexity</span>
          </div>
          <ol className="preview-list">
            {preview.map((entry) => <li key={entry.id}><span>{entry.title}</span><small>{entry.year} · Phase {entry.phase}</small></li>)}
          </ol>
          <Button onClick={() => navigate('/timeline')}>View this order <ArrowRight size={18} /></Button>
        </aside>
      </div>
    </div>
  );
}

function TimelinePage({ entries, progress, toggleWatched, openDetails, activeOrder, setActiveOrder }) {
  const [type, setType] = useState('all');
  const [density, setDensity] = useState('comfortable');
  const ordered = getOrderEntries(entries, activeOrder).filter((entry) => type === 'all' || entry.type === type);

  return (
    <div className="page-flow">
      <PageHero eyebrow="Timeline" title="A glowing path through every phase" text="Filter, change density, and mark progress from a timeline built for long-form Marvel watching." />
      <FilterBar>
        <Segmented value={activeOrder} setValue={setActiveOrder} options={[['timeline', 'Timeline'], ['release', 'Release'], ['saga', 'Phase']]} />
        <Segmented value={type} setValue={setType} options={[['all', 'All'], ['film', 'Movies'], ['series', 'Shows'], ['short', 'Specials']]} />
        <Segmented value={density} setValue={setDensity} options={[['compact', 'Compact'], ['comfortable', 'Comfort'], ['cinematic', 'Cinematic']]} />
      </FilterBar>
      <section className={`timeline timeline--${density}`}>
        {ordered.map((entry, index) => <TimelineEntry key={entry.id} entry={entry} index={index} watched={Boolean(progress[entry.id])} toggleWatched={toggleWatched} openDetails={openDetails} />)}
      </section>
    </div>
  );
}

function CollectionPage({ entries, progress, toggleWatched, openDetails }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [phase, setPhase] = useState('all');
  const [sort, setSort] = useState('release');
  const [view, setView] = useState('grid');
  const deferredQuery = query.toLowerCase().trim();

  const filtered = useMemo(() => {
    const list = entries.filter((entry) => {
      const matchesType = type === 'all' || entry.type === type;
      const matchesPhase = phase === 'all' || String(entry.phase) === phase;
      const haystack = `${entry.title} ${entry.desc} ${entry.prereq}`.toLowerCase();
      return matchesType && matchesPhase && (!deferredQuery || haystack.includes(deferredQuery));
    });
    return list.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'phase') return a.phase - b.phase || a.order - b.order;
      return a.year - b.year || a.order - b.order;
    });
  }, [entries, type, phase, sort, deferredQuery]);

  return (
    <div className="page-flow">
      <PageHero eyebrow="Collection" title="Search the MCU spectrum" text="A fast, filterable library with premium cards, clear metadata, and poster-style gradient artwork when official imagery is not available." />
      <div className="library-command-bar">
        <label className="search-field">
          <Search size={19} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stories, phases, prerequisites…" />
        </label>
        <Button variant="secondary" onClick={() => { setQuery(''); setType('all'); setPhase('all'); }}>Reset filters</Button>
      </div>
      <FilterBar>
        <Segmented value={type} setValue={setType} options={[['all', 'All'], ['film', 'Movies'], ['series', 'Shows'], ['short', 'Specials']]} />
        <select className="select-control" value={phase} onChange={(event) => setPhase(event.target.value)} aria-label="Filter by phase">
          <option value="all">All phases</option>
          {PHASES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <Segmented value={sort} setValue={setSort} options={[['release', 'Release'], ['title', 'Title'], ['phase', 'Phase']]} />
        <Segmented value={view} setValue={setView} options={[['grid', 'Grid'], ['list', 'List'], ['compact', 'Compact']]} />
      </FilterBar>
      {filtered.length ? (
        <section className={`library-grid library-grid--${view}`}>
          {filtered.map((entry) => <EntryCard key={entry.id} entry={entry} watched={Boolean(progress[entry.id])} toggleWatched={toggleWatched} openDetails={openDetails} />)}
        </section>
      ) : (
        <EmptyState title="No stories found in this spectrum." text="Try clearing filters or searching another title, phase, or character thread." action="Browse all entries" onAction={() => { setQuery(''); setType('all'); setPhase('all'); }} />
      )}
    </div>
  );
}

function SettingsPage({ settings, progress, entries, resetProgress }) {
  const watched = entries.filter((entry) => progress[entry.id]).length;
  return (
    <div className="page-flow settings-page">
      <PageHero eyebrow="Settings" title="Tune the atmosphere" text="Theme, motion, density, and progress controls are grouped into calm panels with immediate feedback." />
      <div className="settings-grid">
        <SettingsCard icon={Palette} title="Appearance" text="Dark and light modes use separate semantic palettes, not simple inversion.">
          <RadioCards value={settings.theme} setValue={settings.setTheme} options={[['dark', 'Dark', Moon], ['light', 'Light', Sun], ['system', 'System', Monitor]]} />
          <RadioCards value={settings.accent} setValue={settings.setAccent} options={[['spectrum', 'Spectrum'], ['crimson', 'Crimson'], ['cyan', 'Cosmic Blue'], ['violet', 'Aurora Violet'], ['gold', 'Gold']]} />
        </SettingsCard>
        <SettingsCard icon={Sparkles} title="Motion + atmosphere" text="Decorative movement stays subtle and automatically respects reduced-motion preferences.">
          <Segmented value={settings.motion} setValue={settings.setMotion} options={[['auto', 'Auto'], ['reduced', 'Reduced'], ['enhanced', 'Enhanced']]} />
          <Segmented value={settings.background} setValue={settings.setBackground} options={[['minimal', 'Minimal'], ['balanced', 'Balanced'], ['cinematic', 'Cinematic']]} />
        </SettingsCard>
        <SettingsCard icon={Grid2X2} title="Viewing preferences" text="Choose how dense cards and timelines should feel on this device.">
          <Segmented value={settings.density} setValue={settings.setDensity} options={[['compact', 'Compact'], ['comfortable', 'Comfort'], ['cinematic', 'Cinematic']]} />
          <div className="setting-note"><Check size={16} /> Descriptions, runtime placeholders, and phase grouping remain visible where supported.</div>
        </SettingsCard>
        <SettingsCard icon={RotateCcw} title="Progress" text="Progress is stored locally in this browser for a lightweight private experience.">
          <div className="progress-summary"><ProgressRing value={(watched / entries.length) * 100} /><span><strong>{watched}</strong> of {entries.length} titles watched</span></div>
          <Button variant="danger" onClick={resetProgress}>Reset progress</Button>
        </SettingsCard>
      </div>
    </div>
  );
}

function OrderCard({ order, entries, selected = false, select }) {
  const preview = getOrderEntries(entries, order.id).slice(0, 4);
  return (
    <article className={`order-card order-card--${order.tone} ${selected ? 'is-selected' : ''}`} tabIndex="0" onClick={select} onKeyDown={(event) => { if (event.key === 'Enter') select(); }}>
      <div className="order-card__top">
        <Badge tone={order.tone}>{order.difficulty}</Badge>
        {selected ? <Badge tone="success" icon={Check}>Selected</Badge> : null}
      </div>
      <h3>{order.name}</h3>
      <p>{order.description}</p>
      <div className="order-meta"><span>Best for {order.bestFor}</span><span>{entries.length} entries</span></div>
      <div className="title-stack">{preview.map((entry) => <span key={entry.id}>{entry.title}</span>)}</div>
      <Button variant={selected ? 'primary' : 'secondary'}>Start this path</Button>
    </article>
  );
}

function PhaseCard({ phase, entries }) {
  return (
    <article className="phase-card" style={{ '--phase-color': phase.color }}>
      <span className="phase-number">0{phase.id}</span>
      <h3>{phase.name}</h3>
      <strong>{phase.tagline}</strong>
      <p>{phase.summary}</p>
      <span>{entries.length} titles in this spectrum</span>
    </article>
  );
}

function TimelineEntry({ entry, index, watched, toggleWatched, openDetails }) {
  const type = TYPE_META[entry.type] || TYPE_META.film;
  const TypeIcon = type.icon;
  return (
    <article className={`timeline-entry ${watched ? 'is-watched' : ''}`} style={{ '--delay': `${Math.min(index * 18, 240)}ms` }}>
      <div className="timeline-node"><ButterflyMark /></div>
      <div className="timeline-card">
        <div className="timeline-card__meta"><Badge tone={watched ? 'success' : 'neutral'} icon={watched ? Check : TypeIcon}>{watched ? 'Watched' : type.label}</Badge><span>{entry.year} · Phase {entry.phase}</span></div>
        <h3>{entry.title}</h3>
        <p>{entry.desc}</p>
        <div className="card-actions">
          <Button variant="ghost" onClick={() => openDetails(entry)}>Details</Button>
          <Button variant={watched ? 'secondary' : 'primary'} onClick={() => toggleWatched(entry.id)}>{watched ? 'Undo watched' : 'Mark watched'}</Button>
        </div>
      </div>
    </article>
  );
}

function EntryCard({ entry, watched, toggleWatched, openDetails }) {
  const type = TYPE_META[entry.type] || TYPE_META.film;
  const Icon = type.icon;
  return (
    <article className={`entry-card ${watched ? 'is-watched' : ''}`}>
      <div className="poster-art" data-phase={entry.phase}><span>{entry.title.split(' ').slice(0, 2).map((word) => word[0]).join('')}</span></div>
      <div className="entry-card__body">
        <div className="entry-card__meta"><Badge tone={watched ? 'success' : 'neutral'} icon={watched ? Check : Icon}>{watched ? 'Watched' : type.label}</Badge><span>Phase {entry.phase}</span></div>
        <h3>{entry.title}</h3>
        <p>{entry.desc}</p>
        <div className="entry-card__footer">
          <span>{entry.year}{entry.episodes ? ` · ${entry.episodes} eps` : ''}</span>
          <div className="icon-row">
            <button className="icon-button" onClick={() => toggleWatched(entry.id)} aria-label={watched ? `Mark ${entry.title} unwatched` : `Mark ${entry.title} watched`}><Check size={17} /></button>
            <button className="icon-button" onClick={() => openDetails(entry)} aria-label={`Open details for ${entry.title}`}><Info size={17} /></button>
          </div>
        </div>
      </div>
    </article>
  );
}

function DetailDrawer({ entry, onClose, progress, toggleWatched }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!entry) return undefined;
    const previous = document.activeElement;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    setTimeout(() => closeRef.current?.focus(), 0);
    return () => { window.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [entry, onClose]);

  if (!entry) return null;
  const watched = Boolean(progress[entry.id]);
  const type = TYPE_META[entry.type] || TYPE_META.film;
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button ref={closeRef} className="icon-button drawer-close" onClick={onClose} aria-label="Close details"><X size={20} /></button>
        <div className="detail-hero"><ButterflyMark /><Badge tone={watched ? 'success' : 'violet'} icon={watched ? Check : Eye}>{watched ? 'Watched' : 'Not started'}</Badge></div>
        <h2 id="detail-title">{entry.title}</h2>
        <div className="detail-meta"><span>{type.label}</span><span>{entry.year}</span><span>Phase {entry.phase}</span>{entry.episodes ? <span>{entry.episodes} episodes</span> : null}</div>
        <p>{entry.desc}</p>
        <section>
          <h3>Viewing context</h3>
          <p>Prerequisites: {entry.prereq || 'None listed'}</p>
          <p>Appears in release, timeline, saga, and custom spectrum paths.</p>
        </section>
        <div className="drawer-actions">
          <Button onClick={() => toggleWatched(entry.id)}>{watched ? 'Undo watched' : 'Mark watched'}</Button>
          <Button variant="secondary"><BookmarkPlus size={17} /> Add to custom order</Button>
        </div>
      </aside>
    </div>
  );
}

function CommandPalette({ open, onClose, entries, navigate, openDetails, settings }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const titleResults = entries.filter((entry) => !q || entry.title.toLowerCase().includes(q)).slice(0, 7).map((entry) => ({ type: 'entry', label: entry.title, meta: `Phase ${entry.phase} · ${entry.year}`, entry }));
    const routeResults = NAV_ITEMS.filter((item) => !q || item.label.toLowerCase().includes(q)).map((item) => ({ type: 'route', label: item.label, meta: 'Open destination', route: item.id }));
    const actionResults = [
      { type: 'action', label: 'Switch theme', meta: 'Toggle dark and light mode', action: () => settings.setTheme(settings.theme === 'light' ? 'dark' : 'light') },
      { type: 'action', label: 'Start Release Order', meta: 'Open Watch Orders', action: () => navigate('/orders') },
    ].filter((item) => !q || item.label.toLowerCase().includes(q));
    return [...routeResults, ...actionResults, ...titleResults];
  }, [entries, navigate, query, settings]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.key === '/' || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) && !open) {
        event.preventDefault();
        onClose(true);
      }
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);
  if (!open) return null;

  const runResult = (result) => {
    if (result.type === 'entry') openDetails(result.entry);
    if (result.type === 'route') navigate(result.route);
    if (result.type === 'action') result.action();
    onClose();
  };

  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <label className="palette-input"><Command size={20} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, routes, settings…" /></label>
        <div className="palette-results">
          {results.length ? results.map((result) => <button key={`${result.type}-${result.label}`} onClick={() => runResult(result)}><span>{result.label}</span><small>{result.meta}</small></button>) : <EmptyState title="No stories found in this spectrum." text="Try another title, route, or command." />}
        </div>
      </section>
    </div>
  );
}

function FilterBar({ children }) { return <div className="filter-bar">{children}</div>; }
function Segmented({ value, setValue, options }) { return <div className="segmented-control">{options.map(([id, label]) => <button key={id} className={value === id ? 'is-active' : ''} onClick={() => setValue(id)}>{label}</button>)}</div>; }
function RadioCards({ value, setValue, options }) { return <div className="radio-card-grid">{options.map(([id, label, Icon]) => <button key={id} className={value === id ? 'is-active' : ''} onClick={() => setValue(id)}>{Icon ? <Icon size={18} /> : <span className={`swatch swatch--${id}`} />}<span>{label}</span></button>)}</div>; }
function SettingsCard({ icon: Icon, title, text, children }) { return <section className="settings-card"><Icon size={22} /><h2>{title}</h2><p>{text}</p><div className="settings-card__controls">{children}</div></section>; }
function SectionHeader({ eyebrow, title, text }) { return <div className="section-header"><Badge tone="spectrum">{eyebrow}</Badge><h2>{title}</h2><p>{text}</p></div>; }
function PageHero({ eyebrow, title, text }) { return <section className="page-hero"><Badge tone="spectrum">{eyebrow}</Badge><h1>{title}</h1><p>{text}</p></section>; }
function EmptyState({ title, text, action, onAction }) { return <div className="empty-state"><ButterflyMark /><h2>{title}</h2><p>{text}</p>{action ? <Button variant="secondary" onClick={onAction}>{action}</Button> : null}</div>; }

function useStats(entries, progress) {
  return useMemo(() => {
    const watched = entries.filter((entry) => progress[entry.id]).length;
    const percent = entries.length ? (watched / entries.length) * 100 : 0;
    const latestWatched = entries.filter((entry) => progress[entry.id]).at(-1);
    const currentSaga = latestWatched?.phase <= 3 ? 'Infinity Saga' : latestWatched ? 'Multiverse Saga' : 'Infinity Saga';
    return { watched, percent, currentSaga };
  }, [entries, progress]);
}

function getOrderEntries(entries, order) {
  const copy = [...entries];
  if (order === 'release') return copy.sort((a, b) => a.year - b.year || a.order - b.order);
  if (order === 'character') return copy.sort((a, b) => Number(b.essential) - Number(a.essential) || a.phase - b.phase || a.order - b.order);
  if (order === 'saga') return copy.sort((a, b) => a.phase - b.phase || a.year - b.year || a.order - b.order);
  if (order === 'custom') return copy.filter((entry) => entry.essential).sort((a, b) => a.phase - b.phase || a.order - b.order);
  return copy.sort((a, b) => a.order - b.order);
}

export default function App() {
  const [route, navigate] = useRoute();
  const settings = useThemeSettings();
  const entries = useMemo(() => RAW.filter((entry) => !entry.hidden), []);
  const [progress, setProgress] = useState(() => readStoredJSON(STORAGE_KEYS.progress, {}));
  const [activeOrder, setActiveOrder] = useState('release');
  const [detailEntry, setDetailEntry] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => writeStoredJSON(STORAGE_KEYS.progress, progress), [progress]);

  const toggleWatched = useCallback((id) => {
    setProgress((current) => {
      const next = { ...current };
      if (next[id]) delete next[id];
      else next[id] = new Date().toISOString();
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => setProgress({}), []);
  const openSearch = useCallback(() => setPaletteOpen(true), []);
  const closeSearch = useCallback((force) => setPaletteOpen(Boolean(force)), []);

  let page = <HomePage entries={entries} progress={progress} navigate={navigate} setActiveOrder={setActiveOrder} toggleWatched={toggleWatched} />;
  if (route === '/orders') page = <OrdersPage entries={entries} activeOrder={activeOrder} setActiveOrder={setActiveOrder} navigate={navigate} progress={progress} />;
  if (route === '/timeline') page = <TimelinePage entries={entries} progress={progress} toggleWatched={toggleWatched} openDetails={setDetailEntry} activeOrder={activeOrder} setActiveOrder={setActiveOrder} />;
  if (route === '/collection') page = <CollectionPage entries={entries} progress={progress} toggleWatched={toggleWatched} openDetails={setDetailEntry} />;
  if (route === '/settings') page = <SettingsPage settings={settings} progress={progress} entries={entries} resetProgress={resetProgress} />;

  return (
    <Layout route={route} navigate={navigate} settings={settings} openSearch={openSearch}>
      {page}
      <DetailDrawer entry={detailEntry} onClose={() => setDetailEntry(null)} progress={progress} toggleWatched={toggleWatched} />
      <CommandPalette open={paletteOpen} onClose={closeSearch} entries={entries} navigate={navigate} openDetails={setDetailEntry} settings={settings} />
    </Layout>
  );
}
