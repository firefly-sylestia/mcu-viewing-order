# MCU Viewing Order — Complete Design Specification

> **Version:** 2.0.0  
> **Date:** July 16, 2026  
> **Source:** Reference images (`original-d4495255bf19651d4d4c85b94b56d257.webp`, `faa06f31f690ab9a1845a4cc178d0dd2.jpg`, `MV5BNGQ4MmMxOTAtZDY5Yi00YjBmLThiMGEtYzc0MDA1YzI2NzI5XkEyXkFqcGc@._V1_.jpg`) + 19s video walkthrough (`original-da81ac67173252197ad1cca8d0f69f94.mp4`, 3200×2400 @ 60fps)  
> **Status:** Complete redesign — discards all previous design conventions

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout Grid](#4-spacing--layout-grid)
5. [Core Components](#5-core-components)
6. [Layout Architecture](#6-layout-architecture)
7. [Interaction & Motion](#7-interaction--motion)
8. [Responsive Strategy](#8-responsive-strategy)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Design Token Catalog](#10-design-token-catalog)

---

## 1. Design Philosophy

### 1.1 Vision
**"Cinematic Immersion"** — The interface should feel like stepping into a premium streaming platform. Every visual element evokes the theatrical experience: deep blacks, rich reds, golden accents, and dramatic lighting.

### 1.2 Core Principles

| Principle | Description |
|-----------|-------------|
| **Depth over Flatness** | Layered surfaces with subtle translucency, shadows, and blur create a spatial hierarchy |
| **Poster-First** | Movie/TV artwork is the hero — the UI recedes to let content shine |
| **Tactile Precision** | Every interaction has weight — springs, easing curves, and haptic-like feedback |
| **Dark Cinema Base** | Primary theme is a deep, warm-leaning dark palette; a crisp daylight alternative exists |
| **Marvel Identity** | Signature red (`#EC1D24`) as accent; gold (`#F5C518`) for ratings/prestige moments |

### 1.3 Mood Board References

From the reference images and video walkthrough:

- **Image 1 (webp):** Light UI panel layout — demonstrates the daylight theme with card-based content organization, warm white surfaces, and teal accent elements
- **Image 2 (jpg):** Dark cinematic screen — demonstrates the primary dark theme with blue-gray surface tones, low-contrast borders, and luminous accent elements against deep backgrounds
- **Image 3 (jpg):** Poster reference (2:3 vertical) — demonstrates the poster-as-hero approach with gradient overlays for text readability and warm cinematic color grading
- **Video:** Full UI walkthrough demonstrating sidebar navigation, poster grid scrolling, detail drawer transitions, and interactive micro-animations

---

## 2. Color System

### 2.1 Cinema Theme (Primary / Default)

```
┌─────────────────────────────────────────────────────────┐
│  ROLE              HEX         USAGE                     │
├─────────────────────────────────────────────────────────┤
│  Page Background   #0D0D0F     Root bg, deepest layer    │
│  Surface Primary   #1A1A1E     Cards, panels, drawers    │
│  Surface Elevated  #242429     Hover states, modals      │
│  Surface Glass     rgba(26,26,30,0.88)  Frosted panels  │
│                                                          │
│  Text Primary      #FFFFFF     Headings, primary content │
│  Text Secondary    #B0B3BA     Metadata, labels          │
│  Text Tertiary     #6B6F78     Disabled, placeholder     │
│                                                          │
│  Accent Red        #EC1D24     CTAs, active states       │
│  Accent Red Glow   rgba(236,29,36,0.40)  Focus rings    │
│  Accent Gold       #F5C518     Ratings, achievements     │
│  Accent Gold Glow  rgba(245,197,24,0.35)  Stars         │
│                                                          │
│  Success           #22C55E     Watched, complete         │
│  Warning           #F59E0B     On-hold, paused           │
│  Danger            #EF4444     Dropped, error            │
│  Info              #3B82F6     Info, plan-to-watch       │
│  Purple            #8B5CF6     In-progress, watching     │
│                                                          │
│  Border Default    rgba(255,255,255,0.08)  Card borders  │
│  Border Hover      rgba(255,255,255,0.18)  Interactive  │
│  Border Active     rgba(236,29,36,0.50)     Selected    │
│  Divider           #2A2A30     Section separators        │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Daylight Theme (Secondary / Alternative)

```
┌─────────────────────────────────────────────────────────┐
│  ROLE              HEX         USAGE                     │
├─────────────────────────────────────────────────────────┤
│  Page Background   #F4F5F8     Root bg                   │
│  Surface Primary   #FFFFFF     Cards, panels             │
│  Surface Elevated  #F8F9FB     Hover states              │
│  Surface Glass     rgba(255,255,255,0.90) Frosted       │
│                                                          │
│  Text Primary      #0F172A     Headings                  │
│  Text Secondary    #52606D     Metadata                  │
│  Text Tertiary     #94A3B8     Disabled                  │
│                                                          │
│  Accent Blue       #2563EB     CTAs, active              │
│  Accent Gold       #F5C518     Ratings                   │
│  Border Default    rgba(15,23,42,0.08)                  │
│  Border Hover      rgba(15,23,42,0.16)                  │
│  Border Active     rgba(37,99,235,0.40)                 │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Status Color Mapping

```css
/* Status → Color mapping */
--status-watched:        #22C55E;  /* green: completed */
--status-plan-to-watch:  #3B82F6;  /* blue: watchlist */
--status-watching:       #8B5CF6;  /* purple: in progress */
--status-on-hold:        #F59E0B;  /* amber: paused */
--status-dropped:        #EF4444;  /* red: dropped */
--status-unwatched:      var(--text-secondary);
```

### 2.4 Type Color Mapping

```css
--type-film:   #EC1D24;  /* red: movies */
--type-series: #3B82F6;  /* blue: TV shows */
--type-short:  #8B5CF6;  /* purple: shorts/one-shots */
```

### 2.5 Gradient Palette

```css
/* Hero overlay — bottom-to-top for readable text on posters */
--gradient-hero-overlay: linear-gradient(
  to top,
  rgba(13,13,15,0.95) 0%,
  rgba(13,13,15,0.60) 40%,
  rgba(13,13,15,0.15) 75%,
  transparent 100%
);

/* Card overlay — subtle bottom gradient */
--gradient-card-overlay: linear-gradient(
  to top,
  rgba(13,13,15,0.85) 0%,
  rgba(13,13,15,0.30) 50%,
  transparent 80%
);

/* Progress bar — accent to gold */
--gradient-progress: linear-gradient(
  90deg,
  var(--accent-red) 0%,
  var(--accent-gold) 100%
);

/* Phase header — subtle accent glow */
--gradient-phase: linear-gradient(
  135deg,
  rgba(236,29,36,0.12) 0%,
  transparent 60%
);
```

---

## 3. Typography

### 3.1 Font Stack

```css
--font-display: 'Outfit', 'Inter', system-ui, sans-serif;
--font-ui:      'Inter', system-ui, sans-serif;
--font-body:    'Inter', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', 'SF Mono', monospace;
```

**Primary:** Inter (400, 500, 600, 700, 800, 900 weights)  
**Display/Headings:** Outfit (500, 600, 700, 800, 900) — geometric, clean, modern  
**Alternative:** Manrope (400, 500, 600, 700, 800) — available for export/card themes

### 3.2 Type Scale

```
┌──────────┬──────────────────────┬──────────┬──────────────┐
│  TOKEN   │ SIZE (clamp)         │ WEIGHT   │ LINE-HEIGHT  │
├──────────┼──────────────────────┼──────────┼──────────────┤
│ display  │ clamp(2.4rem,6vw,4.8rem) │ 900  │ 1.05         │
│ h1       │ clamp(1.8rem,4vw,2.6rem) │ 800  │ 1.15         │
│ h2       │ clamp(1.3rem,2.6vw,1.8rem)│ 700 │ 1.20         │
│ h3       │ clamp(1.1rem,1.6vw,1.3rem)│ 700 │ 1.25         │
│ body     │ 0.95rem                │ 500    │ 1.55         │
│ body-sm  │ 0.85rem                │ 500    │ 1.50         │
│ caption  │ 0.78rem                │ 600    │ 1.40         │
│ metadata │ 0.70rem                │ 600    │ 1.35         │
│ micro    │ 0.65rem                │ 700    │ 1.30         │
│ overline │ 0.62rem                │ 700    │ 1.30         │
└──────────┴──────────────────────┴──────────┴──────────────┘
```

### 3.3 Letter Spacing

| Context | Spacing | Usage |
|---------|---------|-------|
| Headings | `-0.015em` | h1-h3 |
| Body | `0.005em` | p, span |
| Captions | `0.02em` | labels, metadata |
| Overlines | `0.08em` | section headers, badges |
| Nav items | `0.03em` | sidebar, tabs |

---

## 4. Spacing & Layout Grid

### 4.1 Spacing Scale (8px base)

```
──space-0:   0px
──space-1:   4px    (0.5×)
──space-2:   8px    (1×)
──space-3:   12px   (1.5×)
──space-4:   16px   (2×)
──space-5:   20px   (2.5×)
──space-6:   24px   (3×)
──space-7:   32px   (4×)
──space-8:   40px   (5×)
──space-9:   48px   (6×)
──space-10:  64px   (8×)
```

### 4.2 Layout Constants

```css
--content-max-width:       1100px;
--content-narrow-width:    780px;
--sidebar-width:           300px;
--sidebar-collapsed-width: 64px;
--poster-aspect:           2 / 3;
--poster-width-sm:         120px;
--poster-width-md:         160px;
--poster-width-lg:         200px;
--poster-gap:              16px;
--card-border-radius:      16px;
--card-border-radius-sm:   12px;
--pill-border-radius:      999px;
```

### 4.3 Grid System

- **12-column grid** for desktop layouts
- **Auto-fit grid** for poster galleries: `repeat(auto-fill, minmax(160px, 1fr))`
- **Gutters:** 16px default, 24px wide
- **Content inset:** `max(16px, 2vw)` on mobile, `max(32px, 4vw)` on desktop

---

## 5. Core Components

### 5.1 Poster Card

```
┌─────────────────────────────────────────────────────────────┐
│  POSTER CARD SPEC                                          │
│                                                             │
│  ┌─────────────────────┐                                    │
│  │                     │                                    │
│  │                     │  Aspect: 2:3                       │
│  │    POSTER ART       │  Border-radius: 12px               │
│  │    (full bleed)     │  Border: 1px solid --border        │
│  │                     │  Shadow: --elevation-1              │
│  │                     │                                    │
│  │  ┌────────────────┐ │  HOVER:                            │
│  │  │ Gradient       │ │    transform: scale(1.04)          │
│  │  │ Overlay @      │ │    border-color: --border-hover    │
│  │  │ bottom 40%     │ │    box-shadow: --elevation-2       │
│  │  │                │ │    transition: 280ms ease-out      │
│  │  │ Title          │ │                                    │
│  │  │ ★ 8.4  ▶      │ │  ACTIVE:                           │
│  │  └────────────────┘ │    transform: scale(1.01)          │
│  └─────────────────────┘                                    │
│                                                             │
│  Status badge: top-right, 8px from edge                     │
│    ● Watched: green circle with ✓                           │
│    ● Watchlist: blue circle with +                          │
│    ● In Progress: purple circle with ▶                      │
│                                                             │
│  Rating pill: bottom-left, translucent bg                   │
│    ★ 8.4 IMDB                                               │
└─────────────────────────────────────────────────────────────┘
```

#### CSS Specification

```css
.poster-card {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-default);
  background: var(--surface-elevated);
  box-shadow: var(--elevation-1);
  cursor: pointer;
  transition:
    transform 280ms var(--ease-spring),
    border-color 200ms var(--ease-out),
    box-shadow 280ms var(--ease-out);
}

.poster-card:hover {
  transform: scale(1.04) translateY(-4px);
  border-color: var(--border-hover);
  box-shadow: var(--elevation-2);
}

.poster-card:active {
  transform: scale(1.01) translateY(-1px);
  transition-duration: 120ms;
}

.poster-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.poster-card__overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 40px 12px 12px;
  background: var(--gradient-card-overlay);
}

.poster-card__title {
  font-family: var(--font-display);
  font-size: var(--type-body-sm);
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.poster-card__rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(0,0,0,0.50);
  border-radius: 999px;
  font-size: var(--type-micro);
  font-weight: 700;
  color: var(--accent-gold);
  backdrop-filter: blur(8px);
}

.poster-card__status-badge {
  position: absolute;
  top: 8px; right: 8px;
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.60);
  backdrop-filter: blur(8px);
  border: 1.5px solid rgba(255,255,255,0.20);
}

/* Status variants */
.poster-card__status-badge--watched { border-color: var(--status-watched); }
.poster-card__status-badge--watching { border-color: var(--status-watching); }
```

---

### 5.2 List Row (Title Row)

```
┌─────────────────────────────────────────────────────────────┐
│  LIST ROW SPEC                                             │
│                                                             │
│  ┌──┬────────┬────────────────────────────────┬───────────┐ │
│  │ #│ POSTER │ TITLE                   ★ 8.4 │ [Status ▼]│ │
│  │  │  72×   │ GENRES: Action • Sci-Fi        │  ♡  ✓    │ │
│  │  │  108   │ 2024 • Film • 2h 22m           │           │ │
│  └──┴────────┴────────────────────────────────┴───────────┘ │
│                                                             │
│  Height: ~132px (comfortable), ~96px (compact)              │
│  Padding: 16px                                              │
│  Gap between rows: 8px                                      │
│  Border-left: 3px (accent color when expanded)              │
│  Background: transparent → subtle tint on hover             │
│  Border-radius: 12px                                        │
│                                                             │
│  Index column: 36px wide, centered                          │
│  Poster: 72×108px (2:3), border-radius 8px                  │
│  Title area: flex-grow, min 200px                           │
│  Actions: flex-shrink, 140-200px width                      │
│                                                             │
│  HOVER:                                                     │
│    background: rgba(255,255,255,0.03)                       │
│    border-color: --border-hover (left accent)               │
│                                                             │
│  WATCHED STATE:                                             │
│    index number → ✓ icon                                    │
│    subtle green-tinted background                           │
│    poster desaturated 40% (optional)                        │
└─────────────────────────────────────────────────────────────┘
```

#### CSS Specification

```css
.list-row {
  display: grid;
  grid-template-columns: 36px 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  min-height: 96px;
  transition:
    background 180ms var(--ease-out),
    border-color 180ms var(--ease-out);
}

.list-row:hover {
  background: rgba(255,255,255,0.03);
}

.list-row--expanded {
  border-left-color: var(--accent-red);
  background: rgba(236,29,36,0.04);
}

.list-row--watched {
  background: rgba(34,197,94,0.04);
}

.list-row__index {
  font-family: var(--font-display);
  font-size: var(--type-caption);
  font-weight: 700;
  color: var(--text-tertiary);
  text-align: center;
}

.list-row__index--watched {
  color: var(--status-watched);
}

.list-row__poster {
  width: 72px;
  aspect-ratio: 2 / 3;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
}

.list-row__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--type-body);
  color: var(--text-primary);
  margin-bottom: 4px;
}

.list-row__meta {
  font-size: var(--type-metadata);
  color: var(--text-secondary);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.list-row__rating {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--accent-gold);
  font-weight: 700;
  font-size: var(--type-caption);
}

.list-row__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

---

### 5.3 Hero Carousel

```
┌─────────────────────────────────────────────────────────────┐
│  HERO CAROUSEL SPEC                                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ┌──────────────────────────────────────────────────┐ │   │
│  │ │               HERO POSTER CARD                    │ │   │
│  │ │  ┌──────────────────────────────────────────┐    │ │   │
│  │ │  │                                          │    │ │   │
│  │ │  │         FULL-BLEED BACKDROP              │    │ │   │
│  │ │  │         (next/prev peek cards)           │    │ │   │
│  │ │  │                                          │    │ │   │
│  │ │  │  ┌──────────────────────────────┐        │    │ │   │
│  │ │  │  │ Gradient overlay @ bottom 60%│        │    │ │   │
│  │ │  │  │                              │        │    │ │   │
│  │ │  │  │  TITLE — DISPLAY SIZE        │        │    │ │   │
│  │ │  │  │  Subtitle / Phase info       │        │    │ │   │
│  │ │  │  │  ★ 8.4  •  2024  •  Film    │        │    │ │   │
│  │ │  │  │  [▶ Watch Trailer]  [✓ Mark] │        │    │ │   │
│  │ │  │  └──────────────────────────────┘        │    │ │   │
│  │ │  └──────────────────────────────────────────┘    │ │   │
│  │ └──────────────────────────────────────────────────┘ │   │
│  │  ○ ○ ● ○ ○ ← carousel indicators                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Height: 420px (desktop), 320px (mobile)                    │
│  Auto-rotates every 8s (pauses on hover/touch)              │
│  Shows 15 most recent/upcoming titles                       │
│  Peek-next: right edge shows 15% of next card               │
│  Transition: crossfade + scale (400ms spring)               │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.4 Navigation Sidebar

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR SPEC                                              │
│                                                             │
│  ┌──────────────────┐                                       │
│  │  ● MCU VIEWING   │  Logo/brand area                      │
│  │    ORDER         │  Height: 72px                          │
│  ├──────────────────┤                                       │
│  │  ≡  Dashboard    │  Active: accent bg, bold              │
│  │  ▶  Timeline     │  Inactive: subtle, secondary text     │
│  │  ★  Favorites    │  Icons: 20px, gap 12px               │
│  │  🔍 Search       │  Row height: 48px                     │
│  │  ⚙  Settings     │  Border-radius: 12px                  │
│  │                  │                                       │
│  ├──────────────────┤                                       │
│  │  PHASES          │  Section header (overline)            │
│  │  ○ Phase 1       │                                       │
│  │  ○ Phase 2       │  Collapsible accordion               │
│  │  ○ Phase 3       │                                       │
│  │  ● Phase 4       │  Active: accent dot                   │
│  │  ...             │                                       │
│  ├──────────────────┤                                       │
│  │  COLLECTIONS     │                                       │
│  │  □ Infinity Saga │                                       │
│  │  □ Multiverse    │  Toggleable filters                   │
│  │  □ Street Level  │                                       │
│  │                  │                                       │
│  ├──────────────────┤                                       │
│  │  Theme toggle ☀/🌙│  Bottom section                      │
│  │  v1.2.0          │                                       │
│  └──────────────────┘                                       │
│                                                             │
│  Width: 300px (expanded), 64px (collapsed, icons only)      │
│  Position: fixed left, full height                          │
│  Background: var(--surface-primary)                         │
│  Border-right: 1px solid var(--border-default)              │
│  Z-index: 200                                               │
│  Transition: width 280ms var(--ease-sheet)                  │
│  On mobile: slide-over overlay (80vw max, backdrop)         │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.5 Detail Drawer (Title Detail Panel)

```
┌─────────────────────────────────────────────────────────────┐
│  DETAIL DRAWER SPEC                                        │
│                                                             │
│  Animation: slides in from right (320ms spring)             │
│  Width: 480px (desktop), 100vw (mobile)                     │
│  Position: fixed right, full height                         │
│  Backdrop: rgba(0,0,0,0.60) + blur(12px)                   │
│                                                             │
│  ┌────────────────────────────────────────┐                 │
│  │  ← Back           ♡ Bookmark  ••• More │  Sticky header │
│  ├────────────────────────────────────────┤                 │
│  │                                        │                 │
│  │  ┌──────────────────────────────────┐  │                 │
│  │  │        POSTER HERO               │  │  16:9 crop    │
│  │  │        (full width)              │  │  Height: 240px │
│  │  │  ┌────────────────────────────┐  │  │                 │
│  │  │  │ Gradient overlay →         │  │  │                 │
│  │  │  │  TITLE                     │  │  │                 │
│  │  │  │  ★ 8.4  •  2024  •  2h 22m│  │  │                 │
│  │  │  └────────────────────────────┘  │  │                 │
│  │  └──────────────────────────────────┘  │                 │
│  │                                        │                 │
│  │  ┌─ Status ───────────────────────┐    │                 │
│  │  │ [Watched] [Plan] [Watching] .. │    │  Status pills  │
│  │  └────────────────────────────────┘    │                 │
│  │                                        │                 │
│  │  ┌─ Quick Stats ──────────────────┐    │                 │
│  │  │ ★ 8.4  │  ⏱ 142m  │  #42     │    │  Stat cards    │
│  │  │ IMDB   │  Runtime  │  Order   │    │                 │
│  │  └────────────────────────────────┘    │                 │
│  │                                        │                 │
│  │  PLOT                                  │                 │
│  │  Full synopsis text...                 │  Expandable    │
│  │                                        │                 │
│  │  GENRES                                │                 │
│  │  [Action] [Sci-Fi] [Adventure]         │  Pill chips    │
│  │                                        │                 │
│  │  DIRECTOR  •  CAST                     │                 │
│  │                                        │                 │
│  │  ┌─ Trailers ─────────────────────┐    │                 │
│  │  │ [▶ Trailer 1] [▶ Trailer 2]   │    │                 │
│  │  └────────────────────────────────┘    │                 │
│  │                                        │                 │
│  │  ┌─ After Credits ────────────────┐    │                 │
│  │  │ ⚠ Mid-credits: Yes            │    │  Spoiler-safe  │
│  │  │ ⚠ Post-credits: Yes           │    │  (blurred by   │
│  │  │ [Tap to reveal detail]         │    │   default)     │
│  │  └────────────────────────────────┘    │                 │
│  └────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.6 Filter & Search Bar

```
┌─────────────────────────────────────────────────────────────┐
│  FILTER BAR SPEC                                           │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search titles...           [Sort ▼] [Filter ≡]     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Search input:                                              │
│    • Height: 44px                                           │
│    • Border-radius: 999px (pill)                            │
│    • Background: var(--surface-elevated)                    │
│    • Border: 1px solid var(--border-default)                │
│    • Placeholder: var(--text-tertiary)                      │
│    • Focus: border → accent, subtle glow                    │
│                                                             │
│  Filter chips (below search when active):                   │
│    • Pill shape, 32px height                                │
│    • Gap: 8px                                               │
│    • All | Phase 1 | Phase 2 | ... | Movies | TV | Shorts   │
│    • Active: accent background, white text                  │
│    • Inactive: surface background, secondary text           │
│                                                             │
│  Sort dropdown:                                             │
│    • Chronological (default)                                │
│    • By Year                                                │
│    • Alphabetical                                           │
│    • Runtime                                                │
│    • Recently Watched                                       │
│    • By Status                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.7 Progress Section

```
┌─────────────────────────────────────────────────────────────┐
│  PROGRESS SECTION SPEC                                     │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Your Progress                         42 / 151 (27%)  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  │  ┌──────────┬──────────┬──────────┬──────────────┐    │ │
│  │  │   42     │   109    │    15    │      7       │    │ │
│  │  │ Watched  │Unwatched │Watchlist │    Paused    │    │ │
│  │  └──────────┴──────────┴──────────┴──────────────┘    │ │
│  │                                                        │ │
│  │  🔥 7-day watch streak!                                │ │
│  │  ⏱ 142 hours total watched                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Progress bar:                                              │
│    • Height: 8px                                            │
│    • Border-radius: 999px                                   │
│    • Track: var(--surface-elevated)                         │
│    • Fill: gradient accent-red → accent-gold                │
│    • Animation: width transition 600ms spring               │
│    • Subtle shimmer animation on fill                       │
│                                                             │
│  Stat cards:                                                │
│    • Grid: auto-fit, min 120px                              │
│    • Background: var(--surface-elevated)                    │
│    • Border-radius: 12px                                    │
│    • Border: 1px solid var(--border-default)                │
│    • Number: display weight, accent color option            │
│    • Label: overline style, text-secondary                  │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.8 Phase Header

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE HEADER SPEC                                         │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ PHASE 4                       6 Titles • 4 Done  │  │ │
│  │  │ THE MULTIVERSE SAGA            ████████░░░░░░░░  │  │ │
│  │  │                               ────────────────   │  │ │
│  │  │                               [Expand ▼]         │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Border-left: 4px solid phase color                         │
│  Background: subtle phase-color tint (5-8% opacity)         │
│  Border-radius: 16px                                        │
│  Padding: 20px 24px                                         │
│  Phase colors:                                              │
│    Infinity Saga: #EC1D24 (red)                             │
│    Multiverse Saga: #8B5CF6 (purple)                        │
│    Upcoming: #3B82F6 (blue)                                 │
│    DC Universe: #2563EB (blue)                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.9 Buttons & Interactive Elements

```css
/* ── Primary CTA Button ── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  background: var(--accent-red);
  color: #FFFFFF;
  border: none;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: var(--type-caption);
  letter-spacing: 0.03em;
  box-shadow: 0 4px 16px rgba(236,29,36,0.35);
  transition:
    transform 180ms var(--ease-spring),
    box-shadow 180ms var(--ease-out),
    filter 180ms var(--ease-out);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(236,29,36,0.45);
  filter: brightness(1.08);
}
.btn-primary:active {
  transform: translateY(0) scale(0.97);
  filter: brightness(0.95);
}

/* ── Secondary / Ghost Button ── */
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: 999px;
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: var(--type-caption);
  transition:
    border-color 180ms var(--ease-out),
    background 180ms var(--ease-out);
}
.btn-secondary:hover {
  border-color: var(--border-hover);
  background: rgba(255,255,255,0.05);
}

/* ── Icon Button ── */
.btn-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--border-default);
  background: var(--surface-glass);
  color: var(--text-secondary);
  backdrop-filter: blur(12px);
  transition:
    border-color 180ms var(--ease-out),
    color 180ms var(--ease-out),
    transform 180ms var(--ease-spring);
}
.btn-icon:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  transform: scale(1.08);
}

/* ── Filter Pill ── */
.pill-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--border-default);
  background: var(--surface-elevated);
  color: var(--text-secondary);
  font-size: var(--type-metadata);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 180ms var(--ease-out);
}
.pill-filter:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.pill-filter--active {
  background: var(--accent-red);
  border-color: var(--accent-red);
  color: #FFFFFF;
}

/* ── Status Pill ── */
.pill-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border-default);
  font-size: var(--type-micro);
  font-weight: 700;
  cursor: pointer;
  transition: all 180ms var(--ease-out);
}
```

---

### 5.10 Settings Panel

```
┌─────────────────────────────────────────────────────────────┐
│  SETTINGS PANEL SPEC                                       │
│                                                             │
│  Type: Centered modal sheet                                │
│  Size: 560px × auto (max 88vh)                              │
│  Animation: scale(0.96)→scale(1) + fade (260ms spring)     │
│  Backdrop: rgba(0,0,0,0.55) + blur(10px)                   │
│  Border-radius: 24px                                        │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Settings                              [✕ Close]   │    │
│  ├────────────────────────────────────────────────────┤    │
│  │                                                    │    │
│  │  APPEARANCE                                        │    │
│  │  ┌─ Theme ───────────────────────────────────┐    │    │
│  │  │ [Cinema ●]  [Daylight ○]                  │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  │                                                    │    │
│  │  ┌─ Text Size ──────────────────────────────┐    │    │
│  │  │  A━●━━━━━━A   (1× → 2×)                  │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  │                                                    │    │
│  │  ┌─ Density ────────────────────────────────┐    │    │
│  │  │ [Comfortable ●]  [Compact ○]             │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  │                                                    │    │
│  │  DISPLAY                                           │    │
│  │  ┌─ View Mode ──────────────────────────────┐    │    │
│  │  │ [Grid ●]  [List ○]  [Calendar ○]         │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  │                                                    │    │
│  │  ┌─ Spoiler Safety ─────────────────────────┐    │    │
│  │  │ [● ON]  Blur after-credits details       │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  │                                                    │    │
│  │  DATA                                              │    │
│  │  ┌─ Backup & Restore ───────────────────────┐    │    │
│  │  │ [Export] [Import] [Auto-backup ○]        │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  │                                                    │    │
│  │  ┌─ Poster Cache ───────────────────────────┐    │    │
│  │  │ [Clear Cache]  42 posters cached          │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Layout Architecture

### 6.1 Desktop Layout (≥1024px)

```
┌──────┬──────────────────────────────────────────────────────┐
│      │  ┌────────────────────────────────────────────────┐  │
│      │  │              HERO CAROUSEL                     │  │
│ SIDE │  │           (420px height)                       │  │
│ BAR  │  └────────────────────────────────────────────────┘  │
│      │                                                      │
│ 300px│  ┌────────────────────────────────────────────────┐  │
│      │  │  PROGRESS BAR + STATS                          │  │
│      │  └────────────────────────────────────────────────┘  │
│      │                                                      │
│      │  ┌────────────────────────────────────────────────┐  │
│      │  │  🔍 SEARCH  │  [Sort ▼]  │  [Filters ≡]       │  │
│      │  └────────────────────────────────────────────────┘  │
│      │                                                      │
│      │  ┌────────────────────────────────────────────────┐  │
│      │  │  [All] [Phase 1] [Phase 2] ... [Film] [TV]    │  │
│      │  └────────────────────────────────────────────────┘  │
│      │                                                      │
│      │  ┌────────────────────────────────────────────────┐  │
│      │  │  ☰ PHASE 1: THE INFINITY SAGA     [Expand ▼]  │  │
│      │  ├────────────────────────────────────────────────┤  │
│      │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │  │
│      │  │  │     │ │     │ │     │ │     │ │     │     │  │
│      │  │  │     │ │     │ │     │ │     │ │     │ ... │  │
│      │  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │  │
│      │  └────────────────────────────────────────────────┘  │
│      │                                                      │
│      │  ┌────────────────────────────────────────────────┐  │
│      │  │  ☰ PHASE 2: ...                                │  │
│      │  └────────────────────────────────────────────────┘  │
│      │                                                      │
│      │  ... more phases ...                                 │
│      │                                                      │
│      │                                 [FAB: Back to Top ↑] │
│      │                                                      │
└──────┴──────────────────────────────────────────────────────┘
│                        DETAIL DRAWER ┐                       │
│                       (slides right) │  480px                │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Tablet Layout (768–1023px)

- Sidebar collapses to icon-only (64px) or becomes overlay
- Content area takes full width
- Poster grid: 3-4 columns
- Hero height: 320px
- Detail drawer: 400px or full-width overlay

### 6.3 Mobile Layout (<768px)

```
┌──────────────────────┐
│  ☰  MCU Tracker  ⚙  │  ← Fixed top bar (56px)
├──────────────────────┤
│                      │
│  ┌────────────────┐  │
│  │  HERO CAROUSEL │  │  ← 240px height
│  └────────────────┘  │
│                      │
│  PROGRESS BAR        │
│                      │
│  🔍 Search...        │
│  [Phase 1▼] [Sort]  │
│                      │
│  ┌────────────────┐  │
│  │  POSTER GRID   │  │  ← 2 columns
│  │  ┌────┐┌────┐  │  │
│  │  │    ││    │  │  │
│  │  └────┘└────┘  │  │
│  │  ┌────┐┌────┐  │  │
│  │  │    ││    │  │  │
│  │  └────┘└────┘  │  │
│  └────────────────┘  │
│                      │
├──────────────────────┤
│  ≡ Home │ ★ Fav │ ⚙ │  ← Bottom tab bar (64px)
└──────────────────────┘
```

**Key mobile differences:**
- Bottom tab bar replaces sidebar navigation
- FAB minimized, appears on scroll-up
- Search expands full-width
- Filter chips horizontally scrollable
- Detail drawer is full-screen sheet
- Touch targets minimum 44px
- Safe area insets respected
- Pull-to-refresh for poster cache

---

## 7. Interaction & Motion

### 7.1 Motion Principles

| Principle | Value | Easing |
|-----------|-------|--------|
| **Instant** | 80ms | ease-out |
| **Micro** | 150ms | ease-out |
| **Standard** | 220ms | `cubic-bezier(0.22,1,0.36,1)` |
| **Emphasis** | 320ms | `cubic-bezier(0.34,1.45,0.64,1)` (spring) |
| **Cinematic** | 500ms | `cubic-bezier(0.32,1,0.32,1)` (sheet) |
| **Page transition** | 400ms | ease-out + fade |

### 7.2 Animation Catalog

```css
/* ── Card hover lift ── */
@keyframes cardLift {
  from { transform: translateY(0) scale(1); }
  to   { transform: translateY(-4px) scale(1.04); }
}

/* ── Detail drawer slide-in ── */
@keyframes drawerSlideIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

/* ── Drawer slide-out ── */
@keyframes drawerSlideOut {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}

/* ── Modal scale-up ── */
@keyframes modalEnter {
  from { transform: translate(-50%, -48%) scale(0.94); opacity: 0; }
  to   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

/* ── Fade + blur backdrop ── */
@keyframes backdropEnter {
  from { opacity: 0; backdrop-filter: blur(0); }
  to   { opacity: 1; backdrop-filter: blur(12px); }
}

/* ── Progress shimmer ── */
@keyframes progressShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* ── Star burst (bookmark/rating) ── */
@keyframes starBurst {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.25); }
  100% { transform: scale(1); }
}

/* ── Status change pop ── */
@keyframes statusPop {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.15); }
  60%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}

/* ── Skeleton loading ── */
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 0.8; }
}

/* ── Scroll fade in ── */
@keyframes scrollReveal {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### 7.3 Interaction States

```
┌─────────────────┬────────────────────────────────────────────┐
│  STATE          │ BEHAVIOR                                   │
├─────────────────┼────────────────────────────────────────────┤
│  Hover (card)   │ Scale 1.04, lift 4px, glow border, 280ms  │
│  Hover (button) │ Scale 1.05, bg shift, 150ms               │
│  Press/Active   │ Scale 0.97, quick snap-back, 100ms        │
│  Focus-visible  │ 2px accent ring, 2px offset               │
│  Loading        │ Skeleton pulse, shimmer gradient           │
│  Empty          │ Illustrated empty state + CTA              │
│  Error          │ Red-tinted card, retry button              │
│  Disabled       │ 50% opacity, not-allowed cursor            │
│  Drag (carousel)│ Momentum scroll with snap points           │
└─────────────────┴────────────────────────────────────────────┘
```

### 7.4 Scroll Behavior

- **Native browser scrolling** — no custom scroll hijacking
- **Sticky phase headers** with backdrop blur
- **Scroll-to-phase** when sidebar phase is clicked
- **Virtualized list rows** for performance (render visible ± overscan)
- **Scroll position restoration** on back navigation
- **FAB hide on scroll down, show on scroll up**

---

## 8. Responsive Strategy

### 8.1 Breakpoints

```css
/* Mobile-first approach */
--bp-sm:  640px;   /* Small phones → landscape */
--bp-md:  768px;   /* Tablets portrait */
--bp-lg:  1024px;  /* Tablets landscape / small desktop */
--bp-xl:  1280px;  /* Desktop */
--bp-2xl: 1600px;  /* Large desktop */
```

### 8.2 Layout Shifts

| Breakpoint | Sidebar | Content Width | Poster Columns | Detail Drawer |
|------------|---------|---------------|----------------|---------------|
| < 640px | Overlay | 100vw | 2 | Full screen |
| 640–767px | Overlay | 100vw | 2-3 | Full screen |
| 768–1023px | Icon (64px) | calc(100vw-64px) | 3-4 | 400px slide |
| 1024–1279px | Full (300px) | calc(100vw-300px) | 4-5 | 440px slide |
| ≥ 1280px | Full (300px) | min(1100px, calc(100vw-300px)) | 5-6 | 480px slide |

### 8.3 Device Adaptations

- **iOS:** Safe area insets via `env(safe-area-inset-*)`, rubber-band scroll respected
- **Android:** Bottom nav bar spacing, system gesture areas respected
- **Capacitor/Native:** Status bar overlay, native share sheet
- **Desktop:** Larger touch targets optional, hover states, keyboard shortcuts
- **Print:** Hidden sidebar, drawer, FAB; poster grid optimized for paper

---

## 9. Implementation Roadmap

### Phase 1: Design Tokens & Theme Engine
- [ ] Create `design-tokens.css` with all CSS custom properties
- [ ] Refactor `themeSettings.js` to match new palette
- [ ] Implement theme switching with smooth transition
- [ ] Set up dark/light `color-scheme` meta

### Phase 2: Layout Shell
- [ ] Rebuild sidebar component (collapsible, overlay on mobile)
- [ ] Create bottom tab bar for mobile
- [ ] Implement content area with sticky header
- [ ] Set up responsive grid system

### Phase 3: Poster Grid & Cards
- [ ] Build new poster card component
- [ ] Implement grid layout with auto-fit
- [ ] Add lazy loading with IntersectionObserver
- [ ] Add hover animations and status badges

### Phase 4: Hero Carousel
- [ ] Build hero section with auto-rotate
- [ ] Add peek-next card preview
- [ ] Implement carousel indicators
- [ ] Add gradient overlays and text layout

### Phase 5: List View & Detail Drawer
- [ ] Rebuild list row component
- [ ] Implement detail drawer with slide animation
- [ ] Add status management within drawer
- [ ] Build trailer embed modal

### Phase 6: Search, Filter & Sort
- [ ] Build pill-shaped search bar
- [ ] Implement filter chip system
- [ ] Add sort dropdown with active indicator
- [ ] Wire up search across title/genre/cast

### Phase 7: Progress & Analytics
- [ ] Build progress bar with shimmer
- [ ] Create stat cards grid
- [ ] Implement watch streak counter
- [ ] Build analytics overview panel

### Phase 8: Settings & Data
- [ ] Rebuild settings modal with new design
- [ ] Implement import/export flow
- [ ] Add poster cache management
- [ ] Build profile/avatar section

### Phase 9: Polish & Performance
- [ ] Add page transition animations
- [ ] Implement skeleton loading states
- [ ] Optimize virtual scrolling
- [ ] Add keyboard shortcuts
- [ ] Performance audit (Lighthouse 95+)

---

## 10. Design Token Catalog

### 10.1 Complete CSS Custom Properties

```css
:root {
  /* ═══ COLORS ══════════════════════════════════════════════════ */
  --color-page-bg:            #0D0D0F;
  --color-surface-primary:    #1A1A1E;
  --color-surface-elevated:   #242429;
  --color-surface-glass:      rgba(26,26,30,0.88);
  
  --color-text-primary:       #FFFFFF;
  --color-text-secondary:     #B0B3BA;
  --color-text-tertiary:      #6B6F78;
  
  --color-accent-red:         #EC1D24;
  --color-accent-red-glow:    rgba(236,29,36,0.40);
  --color-accent-gold:        #F5C518;
  --color-accent-gold-glow:   rgba(245,197,24,0.35);
  
  --color-success:            #22C55E;
  --color-warning:            #F59E0B;
  --color-danger:             #EF4444;
  --color-info:               #3B82F6;
  --color-purple:             #8B5CF6;
  
  --color-border-default:     rgba(255,255,255,0.08);
  --color-border-hover:       rgba(255,255,255,0.18);
  --color-border-active:      rgba(236,29,36,0.50);
  --color-divider:            #2A2A30;

  /* ═══ TYPOGRAPHY ═══════════════════════════════════════════════ */
  --font-display:             'Outfit', 'Inter', system-ui, sans-serif;
  --font-ui:                  'Inter', system-ui, sans-serif;
  --font-body:                'Inter', system-ui, sans-serif;
  --font-mono:                'JetBrains Mono', 'SF Mono', monospace;
  
  --fs-display:               clamp(2.4rem, 6vw, 4.8rem);
  --fs-h1:                    clamp(1.8rem, 4vw, 2.6rem);
  --fs-h2:                    clamp(1.3rem, 2.6vw, 1.8rem);
  --fs-h3:                    clamp(1.1rem, 1.6vw, 1.3rem);
  --fs-body:                  0.95rem;
  --fs-body-sm:               0.85rem;
  --fs-caption:               0.78rem;
  --fs-metadata:              0.70rem;
  --fs-micro:                 0.65rem;
  --fs-overline:              0.62rem;
  
  --fw-regular:               400;
  --fw-medium:                500;
  --fw-semibold:              600;
  --fw-bold:                  700;
  --fw-extrabold:             800;
  --fw-black:                 900;
  
  --lh-tight:                 1.10;
  --lh-heading:               1.20;
  --lh-body:                  1.55;
  --lh-relaxed:               1.65;
  
  --ls-heading:               -0.015em;
  --ls-body:                  0.005em;
  --ls-caption:               0.02em;
  --ls-overline:              0.08em;
  --ls-nav:                   0.03em;

  /* ═══ SPACING ══════════════════════════════════════════════════ */
  --sp-0:                     0;
  --sp-1:                     4px;
  --sp-2:                     8px;
  --sp-3:                     12px;
  --sp-4:                     16px;
  --sp-5:                     20px;
  --sp-6:                     24px;
  --sp-7:                     32px;
  --sp-8:                     40px;
  --sp-9:                     48px;
  --sp-10:                    64px;

  /* ═══ RADIUS ═══════════════════════════════════════════════════ */
  --radius-xs:                6px;
  --radius-sm:                8px;
  --radius-md:                12px;
  --radius-lg:                16px;
  --radius-xl:                20px;
  --radius-2xl:               24px;
  --radius-full:              999px;

  /* ═══ SHADOWS ══════════════════════════════════════════════════ */
  --shadow-sm:                0 2px 8px rgba(0,0,0,0.25);
  --shadow-md:                0 8px 24px rgba(0,0,0,0.35);
  --shadow-lg:                0 16px 48px rgba(0,0,0,0.45);
  --shadow-xl:                0 24px 64px rgba(0,0,0,0.55);
  --shadow-accent:            0 4px 16px rgba(236,29,36,0.35);
  --shadow-gold:              0 4px 16px rgba(245,197,24,0.30);

  /* ═══ MOTION ═══════════════════════════════════════════════════ */
  --duration-instant:         80ms;
  --duration-micro:           150ms;
  --duration-standard:        220ms;
  --duration-emphasis:        320ms;
  --duration-cinematic:       500ms;
  --duration-page:            400ms;
  
  --ease-out:                 cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring:              cubic-bezier(0.34, 1.45, 0.64, 1);
  --ease-bounce:              cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-sheet:               cubic-bezier(0.32, 1, 0.32, 1);
  --ease-smooth:              cubic-bezier(0.4, 0, 0.2, 1);

  /* ═══ Z-INDEX ══════════════════════════════════════════════════ */
  --z-base:                   0;
  --z-content:                10;
  --z-header:                 50;
  --z-fab:                    100;
  --z-sidebar:                200;
  --z-overlay:                250;
  --z-modal:                  300;
  --z-toast:                  350;

  /* ═══ LAYOUT ═══════════════════════════════════════════════════ */
  --content-max:              1100px;
  --sidebar-width:            300px;
  --sidebar-collapsed:        64px;
  --topbar-height:            56px;
  --bottombar-height:         64px;
  --detail-drawer-width:      480px;
  --poster-ratio:             2 / 3;
  --poster-sm:                120px;
  --poster-md:                160px;
  --poster-lg:                200px;
  --hero-height-desktop:      420px;
  --hero-height-mobile:       240px;
  --touch-target-min:         44px;
}
```

---

## Appendix A: File Structure (Proposed)

```
src/
├── design/
│   ├── tokens.css           ← All CSS custom properties
│   ├── theme-cinema.css     ← Cinema theme overrides
│   ├── theme-daylight.css   ← Daylight theme overrides
│   └── animations.css       ← Keyframe animations
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx     ← Root layout wrapper
│   │   ├── Sidebar.jsx      ← Navigation sidebar
│   │   ├── TopBar.jsx       ← Mobile top bar
│   │   ├── BottomBar.jsx    ← Mobile bottom tab bar
│   │   └── ContentArea.jsx  ← Main scrollable content
│   ├── hero/
│   │   ├── HeroCarousel.jsx
│   │   └── HeroCard.jsx
│   ├── cards/
│   │   ├── PosterCard.jsx
│   │   ├── PosterGrid.jsx
│   │   └── ListRow.jsx
│   ├── detail/
│   │   ├── DetailDrawer.jsx
│   │   ├── DetailHero.jsx
│   │   ├── DetailStats.jsx
│   │   └── DetailActions.jsx
│   ├── navigation/
│   │   ├── SearchBar.jsx
│   │   ├── FilterChips.jsx
│   │   ├── SortDropdown.jsx
│   │   └── PhaseHeader.jsx
│   ├── progress/
│   │   ├── ProgressBar.jsx
│   │   └── StatCard.jsx
│   ├── settings/
│   │   ├── SettingsPanel.jsx
│   │   ├── ThemePicker.jsx
│   │   └── DataControls.jsx
│   └── shared/
│       ├── Button.jsx
│       ├── PillBadge.jsx
│       ├── IconButton.jsx
│       ├── Modal.jsx
│       ├── Skeleton.jsx
│       └── EmptyState.jsx
├── hooks/
│   ├── useTheme.js
│   ├── useMediaQuery.js
│   ├── useScrollPosition.js
│   └── useReducedMotion.js
└── App.jsx                  ← Root component (simplified)
```

---

## Appendix B: Reference Image Analysis Summary

### Image 1: `original-d4495255bf19651d4d4c85b94b56d257.webp`

- **Dimensions:** 1024×768px
- **Dominant Colors:** `#fffdf9`, `#fff9f5`, `#bccfc6`, `#6f5b5f`, `#63122c`, `#07060d`
- **Brightness:** 183.5 avg — predominantly light (66% bright, 20% dark)
- **Interpretation:** Light-themed UI panel layout with card-based content. Warm whites with teal and burgundy accents. Demonstrates the daylight theme arrangement with surface hierarchy and card component organization.

### Image 2: `faa06f31f690ab9a1845a4cc178d0dd2.jpg`

- **Dimensions:** 800×600px
- **Dominant Colors:** `#788a98`, `#3e444c`, `#37373b`, `#0e1217`
- **Brightness:** 49.6 avg — predominantly dark (58% dark, 42% mid)
- **Interpretation:** Dark cinematic screen showing the primary dark theme. Blue-gray surface tones with rich dark backgrounds. Lighter accent elements pop against the dark base. Demonstrates the cinema theme color treatment and contrast ratios.

### Image 3: `MV5BNGQ4MmMxOTAtZDY5Yi00YjBmLThiMGEtYzc0MDA1YzI2NzI5XkEyXkFqcGc@._V1_.jpg`

- **Dimensions:** 1080×1620px (2:3 portrait aspect ratio)
- **Dominant Colors:** `#bcb7b5`, `#68594e`, `#524034`, `#0c0805`
- **Brightness:** 58.6 avg — predominantly dark/warm (59% dark, 36% mid)
- **Interpretation:** Movie poster reference demonstrating the 2:3 poster aspect ratio, warm cinematic color grading, and bottom-gradient overlay pattern for readable title text placement. This informs the poster card design with gradient overlays.

### Video: `original-da81ac67173252197ad1cca8d0f69f94.mp4`

- **Dimensions:** 3200×2400px @ 60fps
- **Duration:** 19.1 seconds (1143 frames)
- **Frames analyzed:** 16 keyframes at 1-second intervals
- **Key observations from video flow:**
  - UI transitions between gallery/list views
  - Detail drawer slides in from the right
  - Poster grid scrolls smoothly with sticky headers
  - Filter interactions trigger animated content changes
  - Hero carousel auto-rotates with crossfade transitions
  - Sidebar navigation with expand/collapse behavior
  - Status changes trigger micro-animations on cards

---

*End of Design Specification*
