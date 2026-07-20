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
  motion: { fast: '150ms', base: '200ms', slow: '240ms' },
  contrastTargets: { normalText: '4.5:1', largeText: '3:1', nonTextUI: '3:1' },
};

export const SEMANTIC_COLOR_MATRIX = {
  dark: {
    background: '#0b090a',
    surface: '#161a1d',
    emphasis: '#f5f3f4',
    success: '#4ade80',
    warning: '#facc15',
    error: '#f87171',
    textPrimary: '#f5f3f4',
    textSecondary: '#d3d3d3',
  },
  light: {
    background: '#f5f3f4',
    surface: '#ffffff',
    emphasis: '#161a1d',
    success: '#15803d',
    warning: '#b45309',
    error: '#a4161a',
    textPrimary: '#161a1d',
    textSecondary: '#5c5556',
  },
};

export const buildSemanticThemeVars = (darkMode) => {
  const mode = darkMode ? 'dark' : 'light';
  const c = SEMANTIC_COLOR_MATRIX[mode];

  return {
    '--theme-bg': c.background,
    '--theme-surface': c.surface,
    '--theme-surface-hover': `color-mix(in srgb, ${c.surface} 82%, ${c.emphasis})`,
    '--theme-surface-dark': 'color-mix(in srgb, #161a1d 90%, #0b090a)',
    '--theme-surface-light': 'color-mix(in srgb, #ffffff 90%, #f5f3f4)',
    '--theme-surface-hover-dark': 'color-mix(in srgb, #641220 70%, #161a1d)',
    '--theme-surface-hover-light': 'color-mix(in srgb, #ffffff 88%, #a11d33)',
    '--theme-comp-card-dark': 'color-mix(in srgb, #641220 42%, #161a1d)',
    '--theme-comp-card-light': 'color-mix(in srgb, #ffffff 92%, #f5f3f4)',
    '--theme-text': c.textPrimary,
    '--theme-text-primary': c.textPrimary,
    '--theme-text-secondary': c.textSecondary,
    '--theme-text-muted': c.textSecondary,
    '--theme-success': c.success,
    '--theme-warning': c.warning,
    '--theme-danger': c.error,
  };
};

export const UI_TOKENS = {
  panel: { level1: 'var(--ui-panel-1)', level2: 'var(--ui-panel-2)' },
  border: { soft: 'var(--ui-border-soft)', strong: 'var(--ui-border-strong)' },
  shadow: { level1: 'var(--ui-shadow-1)', level2: 'var(--ui-shadow-2)' },
  spacing: {
    xs: 'var(--ui-space-1)', sm: 'var(--ui-space-2)', md: 'var(--ui-space-3)', lg: 'var(--ui-space-4)',
  },
  radius: { sm: 'var(--ui-radius-sm)', md: 'var(--ui-radius-md)', lg: 'var(--ui-radius-lg)' },
};
