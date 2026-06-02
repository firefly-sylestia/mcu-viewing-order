# Deep Links and Fluid UI Notes

## Supported deep links

- `/home` opens the default home/hero timeline experience.
- `/search` opens the full-library search experience.
- `/search?q=iron%20man` opens search with the query restored in the search box.
- `/search?q=loki&type=series` restores both the query and the Series filter.
- `/series` opens the Series browse surface from the sidebar.
- `/series/:slug` opens a series detail card directly.
- `/phase` opens the phase view across all phases.
- `/phase/:id` opens a specific phase view.
- `/settings` opens the settings overlay.
- `/analytics` opens the analytics overlay.
- `/movie/:slug` opens a film/short detail card directly.

## Fluid UI implementation checklist

- Keep search URL updates as `replaceState` while the user types so browser history is not flooded.
- Defer search filtering work with React deferred values so keystrokes stay responsive.
- Animate only compositor-friendly properties (`opacity` and `transform`) for high-frequency UI.
- Disable expensive blur/filter layers in performance mode, phase mode, small screens, and reduced-motion contexts.
- Use `content-visibility`, containment, lazy poster loading, and capped poster decode tracking for long timelines.
- Keep subtle interaction feedback on buttons/cards while avoiding layout-triggering animations.
