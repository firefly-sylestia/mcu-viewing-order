export const MOBILE_TABS = ['assets', 'avatar', 'text'];

export const UI_PARITY_TOKENS = {
  spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
  typography: {
    display: 'clamp(2.4rem, 6vw, 5.8rem)',
    h1: 'clamp(2rem, 4vw, 4rem)',
    h2: 'clamp(1.4rem, 2.4vw, 2.4rem)',
    body: '1rem',
    caption: '0.8125rem',
  },
  radius: { xs: '8px', sm: '12px', md: '18px', lg: '26px', xl: '34px', pill: '999px' },
  motion: { fast: '140ms', base: '240ms', slow: '420ms' },
  contrastTargets: { normalText: '4.5:1', largeText: '3:1', nonTextUI: '3:1' },
};

export const SEMANTIC_COLOR_MATRIX = {
  dark: {
    background: '#080a12', backgroundSoft: '#101322', surface: 'rgba(255,255,255,.065)', surfaceRaised: 'rgba(255,255,255,.095)', glass: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.12)', borderStrong: 'rgba(255,255,255,.2)', text: '#f8f7ff', textSoft: '#d8d7e8', textMuted: '#9da3bb', accent: '#ff375f', accent2: '#8b5cf6', accent3: '#38bdf8', success: '#42d392', warning: '#facc15', danger: '#fb7185', focus: '#7dd3fc', shadowRgb: '2 6 23',
  },
  light: {
    background: '#f8f5ff', backgroundSoft: '#fff8f2', surface: 'rgba(255,255,255,.72)', surfaceRaised: 'rgba(255,255,255,.92)', glass: 'rgba(255,255,255,.68)', border: 'rgba(20,20,40,.12)', borderStrong: 'rgba(20,20,40,.2)', text: '#181525', textSoft: '#3d365a', textMuted: '#6d6684', accent: '#e11d48', accent2: '#7c3aed', accent3: '#0284c7', success: '#047857', warning: '#b45309', danger: '#be123c', focus: '#2563eb', shadowRgb: '91 72 126',
  },
};

export const buildSemanticThemeVars = (darkMode) => {
  const c = SEMANTIC_COLOR_MATRIX[darkMode ? 'dark' : 'light'];
  return {
    '--s-bg': c.background,
    '--s-bg-soft': c.backgroundSoft,
    '--s-surface': c.surface,
    '--s-surface-raised': c.surfaceRaised,
    '--s-glass': c.glass,
    '--s-border': c.border,
    '--s-border-strong': c.borderStrong,
    '--s-text': c.text,
    '--s-text-soft': c.textSoft,
    '--s-text-muted': c.textMuted,
    '--s-accent': c.accent,
    '--s-accent-2': c.accent2,
    '--s-accent-3': c.accent3,
    '--s-success': c.success,
    '--s-warning': c.warning,
    '--s-danger': c.danger,
    '--s-focus': c.focus,
    '--s-shadow-rgb': c.shadowRgb,
    '--theme-bg': c.background,
    '--theme-bg-alt': c.backgroundSoft,
    '--theme-surface': c.surface,
    '--theme-surface-hover': c.surfaceRaised,
    '--theme-surface-strong': c.surfaceRaised,
    '--theme-border': c.border,
    '--theme-text': c.text,
    '--theme-text-primary': c.text,
    '--theme-text-secondary': c.textSoft,
    '--theme-text-muted': c.textMuted,
    '--theme-accent': c.accent,
    '--theme-accent-alt': c.accent2,
    '--theme-success': c.success,
    '--theme-warning': c.warning,
    '--theme-danger': c.danger,
  };
};

export const UI_TOKENS = {
  panel: { level1: 'var(--s-surface)', level2: 'var(--s-surface-raised)' },
  border: { soft: 'var(--s-border)', strong: 'var(--s-border-strong)' },
  shadow: { level1: 'var(--shadow-soft)', level2: 'var(--shadow-float)' },
  spacing: { xs: 'var(--space-1)', sm: 'var(--space-2)', md: 'var(--space-3)', lg: 'var(--space-4)' },
  radius: { sm: 'var(--r-sm)', md: 'var(--r-md)', lg: 'var(--r-lg)' },
};
