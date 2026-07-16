export const MOBILE_TABS = ["assets", "avatar", "text"];

export const UI_PARITY_TOKENS = {
  spacing: { xs: '6px', sm: '10px', md: '14px', lg: '18px', xl: '24px' },
  typography: {
    display: 'clamp(2.4rem, 6vw, 4.8rem)',
    h1: 'clamp(1.8rem, 4vw, 2.6rem)',
    h2: 'clamp(1.3rem, 2.6vw, 1.8rem)',
    body: '0.95rem',
    caption: '0.78rem',
  },
  radius: { sm: '10px', md: '12px', lg: '16px' },
  motion: { fast: '150ms', base: '220ms', slow: '300ms' },
  contrastTargets: { normalText: '4.5:1', largeText: '3:1', nonTextUI: '3:1' },
};

export const SEMANTIC_COLOR_MATRIX = {
  dark: {
    background:           '#0D0D0F',   // page bg
    surface:              '#1A1A1E',   // card bg
    emphasis:             '#FFFFFF',
    emphasisMuted:        '#B0B3BA',   // text.secondary
    success:              '#22C55E',
    warning:              '#F59E0B',
    error:                '#EF4444',
    textPrimary:          '#FFFFFF',
    textSecondary:        '#B0B3BA',
    accent:               '#EC1D24',   // Marvel red
    accentAlt:            '#F5C518',   // gold
    infoCard:             '#EC1D24',
    imdbBadgeBg:          '#F5C518',
    imdbBadgeText:        '#0D0D0F',
    divider:              '#2A2A30',
    pillSurface:          'rgba(255,255,255,0.08)',
    iconButton:           'rgba(0,0,0,0.35)',
    glassSurface:         'rgba(26,26,30,0.88)',
  },
  light: {
    background:           '#F4F5F8',
    surface:              '#FFFFFF',
    emphasis:             '#0F172A',
    emphasisMuted:        '#52606D',
    success:              '#16A34A',
    warning:              '#F59E0B',
    error:                '#DC2626',
    textPrimary:          '#0F172A',
    textSecondary:        '#52606D',
    accent:               '#2563EB',
    accentAlt:            '#F5C518',
    infoCard:             '#2563EB',
    imdbBadgeBg:          '#F5C518',
    imdbBadgeText:        '#0F172A',
    divider:              'rgba(15,23,42,0.10)',
    pillSurface:          'rgba(15,23,42,0.06)',
    iconButton:           'rgba(255,255,255,0.92)',
    glassSurface:         'rgba(255,255,255,0.90)',
  },
};

export const buildSemanticThemeVars = (darkMode) => {
  const mode = darkMode ? 'dark' : 'light';
  const c = SEMANTIC_COLOR_MATRIX[mode];

  return {
    '--theme-bg':                  c.background,
    '--theme-bg-alt':              c.surface,
    '--theme-surface':             c.surface,
    '--theme-surface-hover':       mode === 'dark' ? '#242429' : '#F8F9FB',
    '--theme-surface-dark':        '#0D0D0F',
    '--theme-surface-light':       '#FFFFFF',
    '--theme-surface-hover-dark':  '#242429',
    '--theme-surface-hover-light': '#F8F9FB',
    '--theme-comp-card-dark':      '#1A1A1E',
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
