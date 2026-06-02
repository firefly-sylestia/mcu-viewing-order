# Adding New MCU Titles (Easy Workflow)

1. Open `src/data/mcuData.js`.
2. Add a new object in `ESSENTIAL_LIST` or `ADDITIONAL_LIST` (or keep in `UPCOMING_PLACEHOLDERS` as hidden).
3. Set:
   - `id`: next free integer (check `TITLE_ID_LIST.md`).
   - `order`: normally same as `id` unless custom ordering needed.
   - `phase`: editable (1-6).
   - `title`, `year`, `type`, `desc`.
4. Add poster mapping in `public/posters/posters.json` under `byId`.
5. Drop poster image in `public/posters/`.

## Auto-show hidden prepared IDs
Entries in `UPCOMING_PLACEHOLDERS` remain hidden until BOTH are true:
- poster exists in `posters.json`/`public/posters`
- `desc` is filled (non-empty)

Then they automatically appear in the app.
