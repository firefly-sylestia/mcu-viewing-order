# Spacing & Typography Spec

Source of truth is `UI_TOKENS.spacing` and `UI_TOKENS.radius` from `src/constants/ui.js`.

## Token mapping
- `space-xs` = `UI_TOKENS.spacing.xs` (`--ui-space-1` / 6px)
- `space-sm` = `UI_TOKENS.spacing.sm` (`--ui-space-2` / 10px)
- `space-md` = `UI_TOKENS.spacing.md` (`--ui-space-3` / 14px)
- `space-lg` = `UI_TOKENS.spacing.lg` (`--ui-space-4` / 18px)
- `radius-sm` = `UI_TOKENS.radius.sm` (`--ui-radius-sm` / 10px)
- `radius-md` = `UI_TOKENS.radius.md` (`--ui-radius-md` / 12px)
- `radius-lg` = `UI_TOKENS.radius.lg` (`--ui-radius-lg` / 16px)

## Layout rules
- Interactive controls use consistent `min-height` tiers:
  - compact: 32px
  - regular: 38px
  - large: 44px
- List rows use 96px min-height desktop, 84px mobile.
- Panel/card paddings:
  - outer panel: `space-lg`
  - inner control spacing: `space-sm`
  - grouped action rows: `space-xs`

## Typography rules
- Control labels: `var(--type-caption)` with `var(--lh-body)`.
- Row titles and modal titles: `var(--type-subheading)` with `var(--lh-heading)`.
- Secondary metadata: `var(--type-metadata)` with `var(--lh-body)`.

## Theme & interaction
- Both color modes keep same spacing/radius rhythm.
- Focus states: 2px accent outline with token radius.
- Hover/active animations stay subtle (`120–220ms`) and only use translateY(-1px) / opacity / shadow changes.
