# MCU Viewing Order

A clean, modern Marvel Cinematic Universe (MCU) viewing-order tracker.
Browse films, series, shorts, and specials across MCU Phases 1–6 in
chronological watch order, mark what you have seen, filter the list, and keep
your progress saved locally.

The app ships as both a web app (Vite + React) and a native Android app
(Capacitor).

---

## Features

- Complete chronological viewing order across MCU Phases 1–6
- Core and expanded list modes for essential or completionist watch plans
- Status tracking for each title: Watched, Watching, Plan to Watch, On Hold,
  Dropped, and Unwatched
- Quick eye-button toggle for watched/unwatched from each row
- Status dropdown on each row for changing detailed watch state
- Per-phase progress bars and overall completion percentage
- Search by title or prerequisite
- Filter by type, status, watched-only, essentials, phase, and timeline mode
- Sort chronological, by year, alphabetical, runtime, recently watched, or status
- Bookmark, like, rewatch count, progress export/import, and share-card tools
- Poster and metadata caching with optional refresh/export actions
- Premium Marvel-inspired dark UI using Inter/Rajdhani for readability and
  Bangers/Bebas Neue for display headings
- Scroll-stable list rendering tuned to avoid disappearing rows during fast
  up/down scrolling
- Native Android build via Capacitor

---

## Stability and data-safety guardrails

The app now includes defensive metadata fallbacks to prevent startup/render
crashes when a data entry has missing or unknown enum-like fields.

### Covered safeguards

- Safe title-type metadata resolver (fallback label/icon/color)
- Safe watch-status metadata resolver (fallback to `unwatched` semantics)
- Row list rendering uses safe resolvers instead of direct map dereferencing
- Detail and summary surfaces also use the same safe resolvers for consistency

### Why this matters

If a title object is malformed (for example, `type` not in `film|series|short`
or an unknown `status`), the app keeps rendering with graceful defaults instead
of throwing runtime errors like:

- `Cannot read properties of undefined (reading 'color')`
- `Cannot read properties of undefined (reading 'Icon')`

---

## Watch status controls

Each row has two status actions:

1. **Status pill** — opens the status menu so you can choose any watch state.
2. **Eye/status icon** — instantly toggles between `Watched` and `Unwatched`.

Progress is stored in browser local storage under the app's progress cache key,
so refreshing the page keeps your watch state on the same device/browser.

---

## Development

```bash
npm install
npm run dev
```

## Build the web bundle

```bash
npm run build
```

## Build the Android APK

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The signed release variant uses `build-release.sh`.

---

## App identity

| Field           | Value                     |
| --------------- | ------------------------- |
| App name        | MCU Viewing Order         |
| Package / appId | `com.mcuviewingorder.app` |
| Web title       | MCU Viewing Order         |
