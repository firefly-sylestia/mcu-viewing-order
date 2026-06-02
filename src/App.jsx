import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Circle,
  Command,
  Compass,
  Film,
  Grid3X3,
  Home,
  Layers3,
  Moon,
  Play,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Tv,
  X,
  Zap,
} from 'lucide-react';
import { ESSENTIAL_LIST, PHASES } from './data/mcuData';
import './styles/spectrum.css';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'orders', label: 'Orders', icon: Compass },
  { id: 'timeline', label: 'Timeline', icon: Layers3 },
  { id: 'collection', label: 'Collection', icon: Grid3X3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const TYPE_META = {
  film: { label: 'Movie', icon: Film, accent: 'var(--accent-danger)' },
  series: { label: 'Show', icon: Tv, accent: 'var(--accent-cyan)' },
  short: { label: 'Special', icon: Zap, accent: 'var(--accent-violet)' },
};

const ORDER_DEFS = [
  {
    id: 'timeline',
    name: 'Timeline Order',
    bestFor: 'Lore-first explorers',
    difficulty: 'Balanced',
    tone: 'cyan',
    description: 'Follow the internal MCU chronology from early-era origins through multiverse fallout.',
    sort: (a, b) => a.order - b.order,
  },
  {
    id: 'release',
    name: 'Release Order',
    bestFor: 'First-time viewers',
    difficulty: 'Easy',
    tone: 'crimson',
    description: 'Experience reveals, credits scenes, and saga momentum the way audiences originally did.',
    sort: (a, b) => a.year - b.year || a.order - b.order,
  },
  {
    id: 'saga',
    name: 'Saga Order',
    bestFor: 'Arc-focused marathons',
    difficulty: 'Guided',
    tone: 'violet',
    description: 'Group stories into cinematic eras with phase breaks and arc summaries.',
    sort: (a, b) => a.phase - b.phase || a.order - b.order,
  },
  {
    id: 'character',
    name: 'Character Arc Order',
    bestFor: 'Hero deep dives',
    difficulty: 'Curated',
    tone: 'emerald',
    description: 'Start with anchor characters, then branch into teams, legacies, and cosmic chapters.',
    sort: (a, b) => Number(b.essential) - Number(a.essential) || a.phase - b.phase || a.order - b.order,
  },
  {
    id: 'custom',
    name: 'Custom Spectrum',
    bestFor: 'Rewatch planners',
    difficulty: 'Flexible',
    tone: 'gold',
    description: 'A lightweight sandbox for building a personal cinematic path from every title.',
    sort: (a, b) => a.title.localeCompare(b.title),
  },
];

const SETTINGS = {
  theme: ['System', 'Dark', 'Light'],
  accent: ['Spectrum', 'Crimson', 'Cosmic Blue', 'Aurora Violet', 'Gold'],
  background: ['Minimal', 'Balanced', 'Cinematic'],
  motion: ['Auto', 'Reduced', 'Enhanced'],
  density: ['Compact', 'Comfortable', 'Cinematic'],
};

const STORAGE_KEYS = {
  theme: 'marvel-spectrum-theme',
  accent: 'marvel-spectrum-accent',
  progress: 'marvel-spectrum-progress',
};

const getStoredSet = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.progress) || '[]'));
  } catch {
    return new Set();
  }
};

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

function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`btn btn--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

function SpectrumBackground({ intensity = 'balanced' }) {
  return (
    <div className={`spectrum-bg spectrum-bg--${intensity}`} aria-hidden="true">
      <div className="wing wing--left" />
      <div className="wing wing--right" />
      <div className="orb orb--red" />
      <div className="orb orb--cyan" />
      <div className="orb orb--gold" />
      <div className="spectrum-speckles" />
    </div>
  );
}

function TopNav({ route, onRoute, theme, setTheme, progressPercent, openSearch }) {
  return (
    <header className="top-nav">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <button className="brand" onClick={() => onRoute('home')} aria-label="Marvel Spectrum home">
        <ButterflyMark />
        <span className="brand__text">Marvel <strong>Spectrum</strong></span>
      </button>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${route === item.id ? 'is-active' : ''}`}
            onClick={() => onRoute(item.id)}
            aria-current={route === item.id ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="nav-actions">
        <button className="search-trigger" onClick={openSearch} aria-label="Open command search">
          <Search size={17} />
          <span>Search</span>
          <kbd>/</kbd>
        </button>
        <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle color theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="progress-pill" aria-label={`${progressPercent}% watched`}>
          <span style={{ '--progress': `${progressPercent}%` }} />
          {progressPercent}%
        </div>
      </div>
    </header>
  );
}

function SideRail({ route, onRoute, selectedOrder }) {
  return (
    <aside className="side-rail" aria-label="Desktop shortcuts">
      <div className="rail-progress-card">
        <span className="eyebrow">Active path</span>
        <strong>{selectedOrder.name}</strong>
        <small>{selectedOrder.bestFor}</small>
      </div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.id} className={`rail-item ${route === item.id ? 'is-active' : ''}`} onClick={() => onRoute(item.id)}>
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

function MobileBottomNav({ route, onRoute }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.id} className={route === item.id ? 'is-active' : ''} onClick={() => onRoute(item.id)}>
            <Icon size={19} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function ProgressWing({ percent }) {
  return (
    <div className="progress-wing" style={{ '--pct': `${percent}%` }} role="img" aria-label={`${percent}% complete`}>
      <ButterflyMark />
      <strong>{percent}%</strong>
      <span>watched</span>
    </div>
  );
}

function HeroSection({ onRoute, selectedOrder, entries, progressPercent }) {
  const next = entries.find((item) => !item.watched) || entries[0];
  return (
    <section className="hero-section section-reveal">
      <div className="hero-copy">
        <Badge tone="spectrum"><Sparkles size={14} /> Cinematic Butterfly Spectrum</Badge>
        <h1>Your Cinematic Path Through the Marvel Universe</h1>
        <p>
          Choose release order, timeline order, saga arcs, or your own custom journey through the MCU with a premium guide that keeps every phase, show, special, and watch status in view.
        </p>
        <div className="hero-actions">
          <Button onClick={() => onRoute('orders')}>Start Watching <ArrowRight size={18} /></Button>
          <Button variant="secondary" onClick={() => onRoute('timeline')}>Explore Timeline</Button>
        </div>
        <div className="hero-chips">
          {['Timeline Order', 'Release Order', 'Saga Mode', 'Progress Tracking', 'Dark / Light Themes'].map((chip) => <span key={chip}>{chip}</span>)}
        </div>
      </div>
      <div className="hero-bento" aria-label="Viewing dashboard preview">
        <article className="bento-card bento-card--large glow-card">
          <span className="eyebrow">Recommended path</span>
          <h2>{selectedOrder.name}</h2>
          <p>{selectedOrder.description}</p>
          <Button variant="glass" onClick={() => onRoute('orders')}>Begin <ChevronRight size={16} /></Button>
        </article>
        <article className="bento-card bento-card--progress">
          <ProgressWing percent={progressPercent} />
        </article>
        <article className="bento-card">
          <span className="eyebrow">Current saga</span>
          <h3>{next?.phase <= 3 ? 'Infinity Saga' : 'Multiverse Saga'}</h3>
          <p>{next?.title}</p>
        </article>
        <article className="bento-card bento-card--next">
          <span className="eyebrow">Next in your spectrum</span>
          <h3>{next?.title}</h3>
          <p>Phase {next?.phase} · {TYPE_META[next?.type]?.label || 'Title'} · {next?.year}</p>
        </article>
      </div>
    </section>
  );
}

function PathCards({ selectedOrderId, setSelectedOrderId, onRoute }) {
  return (
    <section className="content-section section-reveal">
      <div className="section-heading">
        <span className="eyebrow">Choose your viewing path</span>
        <h2>Every order has a different kind of magic.</h2>
        <p>Pick a path based on how you want the MCU to unfold: discovery, chronology, saga arcs, character focus, or a personal rewatch map.</p>
      </div>
      <div className="order-grid">
        {ORDER_DEFS.map((order) => (
          <article key={order.id} className={`order-card order-card--${order.tone} ${selectedOrderId === order.id ? 'is-selected' : ''}`} tabIndex="0">
            <div className="order-card__top">
              <Badge tone={order.tone}>{order.difficulty}</Badge>
              <Circle size={14} fill="currentColor" />
            </div>
            <h3>{order.name}</h3>
            <p>{order.description}</p>
            <dl>
              <div><dt>Best for</dt><dd>{order.bestFor}</dd></div>
              <div><dt>Entries</dt><dd>{ESSENTIAL_LIST.length}</dd></div>
            </dl>
            <div className="preview-stack">
              {ESSENTIAL_LIST.slice().sort(order.sort).slice(0, 4).map((item) => <span key={item.id}>{item.title}</span>)}
            </div>
            <div className="card-actions">
              <Button variant="secondary" onClick={() => setSelectedOrderId(order.id)}>Select</Button>
              <Button variant="ghost" onClick={() => { setSelectedOrderId(order.id); onRoute('timeline'); }}>View Order</Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EraShowcase({ entries, onPhase }) {
  return (
    <section className="content-section section-reveal">
      <div className="section-heading section-heading--row">
        <div>
          <span className="eyebrow">Featured MCU eras</span>
          <h2>Phase rooms with cinematic context.</h2>
        </div>
        <Badge tone="gold"><Star size={14} /> Saga-ready</Badge>
      </div>
      <div className="era-grid">
        {PHASES.map((phase) => {
          const count = entries.filter((item) => item.phase === phase.id).length;
          return (
            <button className="era-card" key={phase.id} onClick={() => onPhase(phase.id)} style={{ '--phase': phase.color }}>
              <span>Phase {phase.id}</span>
              <h3>{phase.tagline}</h3>
              <p>{phase.summary}</p>
              <strong>{count} titles</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TimelinePreview({ entries, toggleWatched }) {
  return (
    <section className="content-section section-reveal">
      <div className="section-heading">
        <span className="eyebrow">Interactive timeline preview</span>
        <h2>A glowing path through phases, releases, and arcs.</h2>
      </div>
      <div className="timeline-strip">
        {entries.slice(0, 10).map((item) => (
          <TimelineNode key={item.id} item={item} onToggle={() => toggleWatched(item.id)} compact />
        ))}
      </div>
    </section>
  );
}

function HomePage(props) {
  return (
    <>
      <HeroSection {...props} />
      <PathCards {...props} />
      <EraShowcase entries={props.entries} onPhase={() => props.onRoute('timeline')} />
      <TimelinePreview entries={props.entries} toggleWatched={props.toggleWatched} />
      <section className="final-cta section-reveal">
        <ButterflyMark />
        <h2>Your cinematic path is ready.</h2>
        <p>Track progress, shift order modes, filter by story type, and continue through the MCU without losing the thread.</p>
        <Button onClick={() => props.onRoute('orders')}>Choose Your Path <ArrowRight size={18} /></Button>
      </section>
    </>
  );
}

function OrdersPage({ selectedOrderId, setSelectedOrderId, onRoute }) {
  const selected = ORDER_DEFS.find((order) => order.id === selectedOrderId) || ORDER_DEFS[0];
  return (
    <main className="page-stack section-reveal">
      <PageHeader eyebrow="Watch orders" title="Choose how the universe unfolds." description="Compare guided MCU viewing paths with clear complexity, entry previews, and start-ready actions." />
      <div className="sticky-filter-bar">
        {ORDER_DEFS.map((order) => <button key={order.id} className={selectedOrderId === order.id ? 'is-active' : ''} onClick={() => setSelectedOrderId(order.id)}>{order.name}</button>)}
      </div>
      <PathCards selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} onRoute={onRoute} />
      <section className="comparison-panel">
        <div>
          <span className="eyebrow">Selected spectrum</span>
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
        </div>
        <div className="comparison-grid">
          <Metric label="Best for" value={selected.bestFor} />
          <Metric label="Complexity" value={selected.difficulty} />
          <Metric label="Entries" value={ESSENTIAL_LIST.length} />
          <Metric label="Preview" value={ESSENTIAL_LIST.slice().sort(selected.sort)[0]?.title} />
        </div>
        <Button onClick={() => onRoute('timeline')}>Start This Path <Play size={17} /></Button>
      </section>
    </main>
  );
}

function TimelineNode({ item, onToggle, compact = false, openDetails }) {
  const meta = TYPE_META[item.type] || TYPE_META.film;
  const Icon = meta.icon;
  return (
    <article className={`timeline-node ${compact ? 'timeline-node--compact' : ''} ${item.watched ? 'is-watched' : ''}`}>
      <button className="status-button" onClick={onToggle} aria-label={`Mark ${item.title} ${item.watched ? 'unwatched' : 'watched'}`}>
        {item.watched ? <Check size={16} /> : <Circle size={16} />}
      </button>
      <div className="node-card">
        <div className="node-meta"><Badge tone="neutral"><Icon size={13} /> {meta.label}</Badge><span>Phase {item.phase}</span><span>{item.year}</span></div>
        <h3>{item.title}</h3>
        {!compact && <p>{item.desc}</p>}
        {!compact && <div className="node-actions"><Button variant="ghost" onClick={() => openDetails(item)}>Details</Button><Button variant="secondary" onClick={onToggle}>{item.watched ? 'Undo watched' : 'Mark watched'}</Button></div>}
      </div>
    </article>
  );
}

function TimelinePage({ entries, toggleWatched, openDetails, selectedOrderId, setSelectedOrderId }) {
  const [type, setType] = useState('all');
  const [density, setDensity] = useState('comfortable');
  const filtered = entries.filter((item) => type === 'all' || item.type === type);
  return (
    <main className="page-stack section-reveal">
      <PageHeader eyebrow="Interactive timeline" title="A luminous story path, phase by phase." description="Switch order modes, filter story types, and mark progress directly on the timeline." />
      <div className="toolbar-panel">
        <div className="segmented" role="group" aria-label="Order mode">
          {ORDER_DEFS.slice(0, 3).map((order) => <button key={order.id} className={selectedOrderId === order.id ? 'is-active' : ''} onClick={() => setSelectedOrderId(order.id)}>{order.name}</button>)}
        </div>
        <div className="filter-row">
          {['all', 'film', 'series', 'short'].map((value) => <button key={value} className={type === value ? 'is-active' : ''} onClick={() => setType(value)}>{value === 'all' ? 'All' : TYPE_META[value]?.label}</button>)}
          {['compact', 'comfortable', 'cinematic'].map((value) => <button key={value} className={density === value ? 'is-active' : ''} onClick={() => setDensity(value)}>{value}</button>)}
        </div>
      </div>
      <div className={`timeline-list timeline-list--${density}`}>
        {filtered.map((item) => <TimelineNode key={item.id} item={item} onToggle={() => toggleWatched(item.id)} openDetails={openDetails} />)}
      </div>
    </main>
  );
}

function CollectionPage({ entries, toggleWatched, openDetails }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('release');
  const visible = useMemo(() => entries
    .filter((item) => type === 'all' || item.type === type)
    .filter((item) => `${item.title} ${item.desc} Phase ${item.phase}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'phase' ? a.phase - b.phase || a.order - b.order : a.year - b.year || a.order - b.order), [entries, query, type, sort]);
  return (
    <main className="page-stack section-reveal">
      <PageHeader eyebrow="Collection" title="Search the MCU spectrum." description="A fast library for movies, shows, specials, phases, watched status, and chronology." />
      <div className="library-controls">
        <label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, phases, descriptions…" /></label>
        <div className="filter-row">
          {['all', 'film', 'series', 'short'].map((value) => <button key={value} className={type === value ? 'is-active' : ''} onClick={() => setType(value)}>{value === 'all' ? 'All stories' : TYPE_META[value]?.label}</button>)}
          {['release', 'title', 'phase'].map((value) => <button key={value} className={sort === value ? 'is-active' : ''} onClick={() => setSort(value)}>Sort: {value}</button>)}
        </div>
      </div>
      {visible.length ? <div className="collection-grid">{visible.map((item) => <EntryCard key={item.id} item={item} toggleWatched={toggleWatched} openDetails={openDetails} />)}</div> : <EmptyState title="No stories found in this spectrum." text="Try clearing filters or searching another title, phase, hero, or saga." action="Clear filters" onAction={() => { setQuery(''); setType('all'); }} />}
    </main>
  );
}

function EntryCard({ item, toggleWatched, openDetails }) {
  const meta = TYPE_META[item.type] || TYPE_META.film;
  const Icon = meta.icon;
  return (
    <article className={`entry-card ${item.watched ? 'is-watched' : ''}`}>
      <div className="poster-art" style={{ '--phase-hue': `${item.phase * 48}deg` }}><span>{item.phase}</span></div>
      <div className="entry-card__body">
        <div className="node-meta"><Badge><Icon size={13} /> {meta.label}</Badge><span>{item.year}</span></div>
        <h3>{item.title}</h3>
        <p>{item.desc}</p>
        <div className="entry-card__actions">
          <button onClick={() => toggleWatched(item.id)} className="watch-toggle">{item.watched ? <Check size={16} /> : <Circle size={16} />} {item.watched ? 'Watched' : 'Mark watched'}</button>
          <button onClick={() => openDetails(item)}>Details</button>
        </div>
      </div>
    </article>
  );
}

function SettingsPage({ theme, setTheme, accent, setAccent, resetProgress }) {
  return (
    <main className="page-stack section-reveal">
      <PageHeader eyebrow="Settings" title="Tune the spectrum to your comfort." description="Theme, motion, density, accessibility, and progress controls in one calm control room." />
      <div className="settings-grid">
        <SettingsCard title="Appearance" icon={Sparkles}>
          <RadioTiles label="Theme" options={SETTINGS.theme} value={theme} onChange={(value) => setTheme(value.toLowerCase())} />
          <RadioTiles label="Accent style" options={SETTINGS.accent} value={accent} onChange={setAccent} />
          <RadioTiles label="Background intensity" options={SETTINGS.background} value="Balanced" />
        </SettingsCard>
        <SettingsCard title="Motion & accessibility" icon={ShieldCheck}>
          <RadioTiles label="Motion" options={SETTINGS.motion} value="Auto" />
          <ToggleLine title="Reduced transparency" text="Use stronger solid panels where blur may reduce readability." />
          <ToggleLine title="Keyboard hints" text="Show shortcuts in command search and navigation surfaces." defaultChecked />
        </SettingsCard>
        <SettingsCard title="Viewing preferences" icon={SlidersHorizontal}>
          <RadioTiles label="Card density" options={SETTINGS.density} value="Comfortable" />
          <ToggleLine title="Show runtime" text="Display runtime and episode counts when data is available." defaultChecked />
          <ToggleLine title="Group by phase" text="Keep timeline chapters separated with sticky phase labels." defaultChecked />
        </SettingsCard>
        <SettingsCard title="Progress" icon={BadgeCheck}>
          <p className="settings-copy">Export/import hooks can be attached here. For now, progress is safely stored on this device.</p>
          <Button variant="danger" onClick={resetProgress}>Reset progress</Button>
        </SettingsCard>
      </div>
    </main>
  );
}

function SettingsCard({ title, icon: Icon, children }) {
  return <section className="settings-card"><h2><Icon size={19} /> {title}</h2>{children}</section>;
}

function RadioTiles({ label, options, value, onChange = () => {} }) {
  return <div className="radio-group"><span>{label}</span><div>{options.map((option) => <button key={option} className={String(value).toLowerCase() === String(option).toLowerCase() ? 'is-active' : ''} onClick={() => onChange(option)}>{option}</button>)}</div></div>;
}

function ToggleLine({ title, text, defaultChecked = false }) {
  const [checked, setChecked] = useState(defaultChecked);
  return <label className="toggle-line"><span><strong>{title}</strong><small>{text}</small></span><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><i /></label>;
}

function DetailDrawer({ item, onClose, toggleWatched }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!item) return undefined;
    closeRef.current?.focus();
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);
  if (!item) return null;
  const meta = TYPE_META[item.type] || TYPE_META.film;
  const Icon = meta.icon;
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button ref={closeRef} className="icon-btn drawer-close" onClick={onClose} aria-label="Close details"><X size={18} /></button>
        <div className="drawer-art"><ButterflyMark /></div>
        <Badge tone="spectrum"><Icon size={14} /> {meta.label}</Badge>
        <h2 id="detail-title">{item.title}</h2>
        <p>{item.desc}</p>
        <div className="comparison-grid">
          <Metric label="Phase" value={`Phase ${item.phase}`} />
          <Metric label="Release year" value={item.year} />
          <Metric label="Timeline position" value={`#${item.order}`} />
          <Metric label="Status" value={item.watched ? 'Watched' : 'Not started'} />
        </div>
        <Button onClick={() => toggleWatched(item.id)}>{item.watched ? 'Undo watched' : 'Mark watched'} <Check size={17} /></Button>
      </aside>
    </div>
  );
}

function CommandPalette({ open, onClose, entries, onRoute, openDetails }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const results = entries.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 7);
  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="command-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command search">
        <label><Command size={18} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, orders, phases, settings…" /></label>
        <div className="quick-actions">
          {NAV_ITEMS.map((item) => <button key={item.id} onClick={() => { onRoute(item.id); onClose(); }}>{item.label}</button>)}
        </div>
        <div className="command-results">
          {results.map((item) => <button key={item.id} onClick={() => { openDetails(item); onClose(); }}><span>{item.title}</span><small>Phase {item.phase} · {item.year}</small></button>)}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ title, text, action, onAction }) {
  return <section className="empty-state"><ButterflyMark /><h2>{title}</h2><p>{text}</p><Button variant="secondary" onClick={onAction}>{action}</Button></section>;
}

function PageHeader({ eyebrow, title, description }) {
  return <section className="page-header"><Badge tone="spectrum">{eyebrow}</Badge><h1>{title}</h1><p>{description}</p></section>;
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

export default function App() {
  const preferredDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEYS.theme) || (preferredDark ? 'dark' : 'light'));
  const [accent, setAccentState] = useState(() => localStorage.getItem(STORAGE_KEYS.accent) || 'Spectrum');
  const [route, setRoute] = useState('home');
  const [selectedOrderId, setSelectedOrderId] = useState('timeline');
  const [watched, setWatched] = useState(getStoredSet);
  const [detailItem, setDetailItem] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const effectiveTheme = theme === 'system' ? (preferredDark ? 'dark' : 'light') : theme;
  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.dataset.accent = accent.toLowerCase().replace(/\s+/g, '-');
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    localStorage.setItem(STORAGE_KEYS.accent, accent);
  }, [theme, effectiveTheme, accent]);

  useEffect(() => {
    const onKey = (event) => {
      const isCommand = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
      if (event.key === '/' || isCommand) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          event.preventDefault();
          setSearchOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectedOrder = ORDER_DEFS.find((order) => order.id === selectedOrderId) || ORDER_DEFS[0];
  const entries = useMemo(() => ESSENTIAL_LIST.slice().sort(selectedOrder.sort).map((item) => ({ ...item, watched: watched.has(item.id) })), [selectedOrder, watched]);
  const progressPercent = Math.round((watched.size / ESSENTIAL_LIST.length) * 100);
  const toggleWatched = (id) => setWatched((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify([...next]));
    return next;
  });
  const resetProgress = () => {
    setWatched(new Set());
    localStorage.removeItem(STORAGE_KEYS.progress);
  };
  const openDetails = (item) => setDetailItem(item);
  const setTheme = (value) => setThemeState(value);
  const setAccent = (value) => setAccentState(value);

  const pageProps = { entries, selectedOrder, selectedOrderId, setSelectedOrderId, onRoute: setRoute, toggleWatched, openDetails, progressPercent };
  return (
    <div className="spectrum-app">
      <SpectrumBackground intensity="cinematic" />
      <TopNav route={route} onRoute={setRoute} theme={effectiveTheme} setTheme={setTheme} progressPercent={progressPercent} openSearch={() => setSearchOpen(true)} />
      <SideRail route={route} onRoute={setRoute} selectedOrder={selectedOrder} />
      <main id="main-content" className="app-main" tabIndex="-1">
        {route === 'home' && <HomePage {...pageProps} />}
        {route === 'orders' && <OrdersPage {...pageProps} />}
        {route === 'timeline' && <TimelinePage {...pageProps} />}
        {route === 'collection' && <CollectionPage {...pageProps} />}
        {route === 'settings' && <SettingsPage theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} resetProgress={resetProgress} />}
      </main>
      <MobileBottomNav route={route} onRoute={setRoute} />
      <DetailDrawer item={detailItem} onClose={() => setDetailItem(null)} toggleWatched={toggleWatched} />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} entries={entries} onRoute={setRoute} openDetails={openDetails} />
    </div>
  );
}
