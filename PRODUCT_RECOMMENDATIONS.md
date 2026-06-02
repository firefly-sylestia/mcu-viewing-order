# MCU Viewing Order — Important Features & Fixes

## Top Features to Add

1. **Cross-device sync (optional account or anonymous cloud backup)**
   - Why: right now progress is local-only; users lose data when switching phones or reinstalling.
   - MVP: add export/import JSON to cloud storage links and "Sync code".

2. **"Continue Watching" smart queue**
   - Why: users want the next 1–3 best items quickly.
   - MVP: show next unwatched entries based on current filters + prerequisites.

3. **Release calendar + upcoming MCU reminders**
   - Why: users care about what is next in theaters/Disney+.
   - MVP: an Upcoming tab with release date, platform, countdown, and "notify me" toggle.

4. **Spoiler-safe mode**
   - Why: descriptions can spoil reveals.
   - MVP: blur descriptions/posters by default until a "Reveal" tap.

5. **Shared watch plans**
   - Why: couples/friends watch together and want a shared checklist.
   - MVP: generate a shareable plan link with selected list mode, filters, and watched states.

6. **Time-to-finish estimator**
   - Why: helps users choose what to watch tonight/weekend.
   - MVP: display total runtime remaining for selected filters and "7-hour weekend plan" cards.

## Highest-Priority Fixes

1. **Data freshness and canonical source control**
   - Fix: move the giant inline list from `src/App.jsx` into versioned data files (`src/data/*.json`).
   - Benefit: safer updates, easier QA, fewer merge conflicts.

2. **Search/filter UX reset friction**
   - Fix: add a persistent "Reset all filters" action and chips for active filters.
   - Benefit: users recover quickly from zero-result states.

3. **Storage resilience**
   - Fix: add save versioning + migration and corrupted-localStorage fallback messaging.
   - Benefit: prevents silent data loss after schema changes.

4. **Performance on long lists**
   - Fix: virtualize long item lists and lazy-load metadata.
   - Benefit: smoother scroll and lower memory use on older Android devices.

5. **Accessibility baseline**
   - Fix: ensure focus states, ARIA labels for icon-only buttons, contrast validation, and keyboard navigation.
   - Benefit: better usability and app-store quality standards.

6. **Testing and release guardrails**
   - Fix: add unit tests for filtering/sorting/progress math and a smoke e2e test for save/load.
   - Benefit: reduces regressions when updating MCU entries.

## Suggested Implementation Order (2–3 sprints)

### Sprint 1 (stability)
- Extract data files + schema.
- Add filter reset + active filter chips.
- Add storage migration and error handling.

### Sprint 2 (usability)
- Continue Watching queue.
- Time-to-finish estimator.
- Spoiler-safe mode.

### Sprint 3 (growth)
- Release calendar + reminders.
- Shared watch plans.
- Optional cloud sync.
