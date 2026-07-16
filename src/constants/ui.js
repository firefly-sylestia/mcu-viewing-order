export const MOBILE_TABS = ["assets", "avatar", "text"];

export const UI_PARITY_TOKENS = {
  spacing: { xs: '6px', sm: '10px', md: '14px', lg: '18px', xl: '24px' },
  typography: {
    display: 'clamp(2.4rem, 6vw, 4.75rem)',
    h1: 'clamp(1.7rem, 4vw, 2.5rem)',
    h2: 'clamp(1.25rem, 3vw, 1.75rem)',
    body: '1rem',
    caption: '0.78rem',
  },
  radius: { sm: '10px', md: '12px', lg: '16px' },
  motion: { fast: '150ms', base: '220ms', slow: '300ms' },
  contrastTargets: { normalText: '4.5:1', largeText: '3:1', nonTextUI: '3:1' },
};

export const SEMANTIC_COLOR_MATRIX = {
  dark: {
    background:           '#17181A',   // bg.screen.dark (spec)
    surface:              '#030303',   // bg.card.black
    emphasis:             '#FFFFFF',
    emphasisMuted:        '#9AA0A6',   // text.secondary.onDark
    success:              '#22C55E',
    warning:              '#F2C545',
    error:                '#EF4444',
    textPrimary:          '#FFFFFF',   // text.primary.onDark
    textSecondary:        '#9AA0A6',
    accent:               '#D23026',   // accent.red.primary
    accentAlt:            '#F2C545',   // accent.gold
    infoCard:             '#D23026',
    imdbBadgeBg:          '#F9D142',
    imdbBadgeText:        '#0A0A0A',
    divider:              '#3A3B3D',
    pillSurface:          'rgba(255,255,255,0.08)',
    iconButton:           'rgba(0,0,0,0.35)',
    glassSurface:         'rgba(20,20,22,0.90)',
  },
  light: {
    background:           '#F4F5F8',
    surface:              '#FFFFFF',
    emphasis:             '#0F172A',
    emphasisMuted:        '#52606D',
    success:              '#16A34A',
    warning:              '#F2C545',
    error:                '#DC2626',
    textPrimary:          '#0F172A',
    textSecondary:        '#52606D',
    accent:               '#2563EB',
    accentAlt:            '#F2C545',
    infoCard:             '#D23026',
    imdbBadgeBg:          '#F9D142',
    imdbBadgeText:        '#0A0A0A',
    divider:              'rgba(15,23,42,0.10)',
    pillSurface:          'rgba(15,23,42,0.06)',
    iconButton:           'rgba(255,255,255,0.92)',
    glassSurface:         'rgba(255,255,255,0.92)',
  },
};

export const buildSemanticThemeVars = (darkMode) => {
  const mode = darkMode ? 'dark' : 'light';
  const c = SEMANTIC_COLOR_MATRIX[mode];

  return {
    '--theme-bg':                  c.background,
    '--theme-bg-alt':              c.surface,
    '--theme-surface':             c.surface,
    '--theme-surface-hover':       `color-mix(in srgb, ${c.surface} 86%, ${c.emphasis})`,
    '--theme-surface-dark':        '#17181A',
    '--theme-surface-light':       '#FFFFFF',
    '--theme-surface-hover-dark':  'rgba(28,29,31,0.96)',
    '--theme-surface-hover-light': 'rgba(238,241,246,1)',
    '--theme-comp-card-dark':      '#030303',
    '--theme-comp-card-light':     '#FFFFFF',
    '--theme-text':                c.textPrimary,
    '--theme-text-primary':        c.textPrimary,
    '--theme-text-secondary':      c.textSecondary,
    '--theme-text-muted':          c.textSecondary,
    '--theme-success':             c.success,
    '--theme-warning':             c.warning,
    '--theme-danger':              c.error,
    '--theme-info-card':           c.infoCard,
    '--theme-accent':              c.accent,
    '--theme-accent-alt':          c.accentAlt,
    '--theme-imdb-bg':             c.imdbBadgeBg,
    '--theme-imdb-text':           c.imdbBadgeText,
    '--theme-divider':             c.divider,
    '--theme-pill-surface':        c.pillSurface,
    '--theme-icon-button':         c.iconButton,
    '--theme-glass':               c.glassSurface,
  };
};

export const UI_TOKENS = {
  panel:  { level1: 'var(--ui-panel-1)', level2: 'var(--ui-panel-2)' },
  border: { soft: 'var(--ui-border-soft)', strong: 'var(--ui-border-strong)' },
  shadow: { level1: 'var(--ui-shadow-1)', level2: 'var(--ui-shadow-2)' },
  spacing: {
    xs: 'var(--ui-space-1)', sm: 'var(--ui-space-2)', md: 'var(--ui-space-3)', lg: 'var(--ui-space-4)',
  },
  radius: { sm: 'var(--ui-radius-sm)', md: 'var(--ui-radius-md)', lg: 'var(--ui-radius-lg)' },
};
