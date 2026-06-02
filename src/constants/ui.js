export const UI_PARITY_TOKENS = {
  spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
  typography: {
    display: 'clamp(2.4rem, 6vw, 5.8rem)',
    h1: 'clamp(2rem, 4vw, 4rem)',
    h2: 'clamp(1.4rem, 2.4vw, 2.4rem)',
    body: '1rem',
    caption: '0.8125rem',
  },
  radius: { sm: '12px', md: '18px', lg: '26px' },
  motion: { fast: '140ms', base: '240ms', slow: '420ms' },
  contrastTargets: { normalText: '4.5:1', largeText: '3:1', nonTextUI: '3:1' },
};

export const SEMANTIC_COLOR_MATRIX = {
  dark: {
    bg: '#080a12', bgSoft: '#101322', surface: 'rgba(255,255,255,.065)', surfaceRaised: 'rgba(255,255,255,.095)', glass: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.12)', borderStrong: 'rgba(255,255,255,.2)', text: '#f8f7ff', textSoft: '#d8d5ea', textMuted: '#9c96b8', accent: '#ff4d6d', accent2: '#8b5cf6', accent3: '#38bdf8', success: '#42d392', warning: '#facc15', danger: '#fb7185', focus: '#7dd3fc', shadowRgb: '#020617'
  },
  light: {
    bg: '#f8f5ff', bgSoft: '#fff8f2', surface: 'rgba(255,255,255,.72)', surfaceRaised: 'rgba(255,255,255,.9)', glass: 'rgba(255,255,255,.66)', border: 'rgba(26,22,48,.12)', borderStrong: 'rgba(26,22,48,.22)', text: '#181525', textSoft: '#3f3858', textMuted: '#706a87', accent: '#d81b60', accent2: '#7c3aed', accent3: '#0284c7', success: '#047857', warning: '#b45309', danger: '#be123c', focus: '#2563eb', shadowRgb: '#7c5a8f'
  },
};

export const buildSemanticThemeVars = (darkMode = true) => {
  const c = SEMANTIC_COLOR_MATRIX[darkMode ? 'dark' : 'light'];
  return {
    '--s-bg': c.bg,
    '--s-bg-soft': c.bgSoft,
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
    '--s-gradient': 'linear-gradient(135deg, #ff375f, #8b5cf6, #38bdf8, #facc15)',
    '--r-xs': '8px', '--r-sm': '12px', '--r-md': '18px', '--r-lg': '26px', '--r-xl': '34px', '--r-pill': '999px',
    '--space-1': '4px', '--space-2': '8px', '--space-3': '12px', '--space-4': '16px', '--space-5': '20px', '--space-6': '24px', '--space-8': '32px', '--space-10': '40px', '--space-12': '48px',
    '--ease-standard': 'cubic-bezier(.2, 0, 0, 1)', '--ease-soft': 'cubic-bezier(.16, 1, .3, 1)', '--dur-fast': '140ms', '--dur-med': '240ms', '--dur-slow': '420ms',
    '--theme-bg': c.bg, '--theme-app-bg': c.bg, '--app-bg-base': c.bg, '--app-bg-vignette': c.bgSoft,
    '--theme-surface': c.surface, '--theme-surface-hover': c.surfaceRaised, '--theme-surface-strong': c.surfaceRaised,
    '--theme-border': c.border, '--theme-text': c.text, '--theme-text-primary': c.text, '--theme-text-secondary': c.textSoft, '--theme-text-muted': c.textMuted,
    '--theme-accent': c.accent, '--theme-accent-alt': c.accent2, '--theme-success': c.success, '--theme-warning': c.warning, '--theme-danger': c.danger,
    '--bg-base': c.bg, '--bg-elevated': c.surfaceRaised, '--surface-1': c.surface, '--surface-2': c.surfaceRaised, '--surface-3': c.glass,
    '--text-primary': c.text, '--text-secondary': c.textSoft, '--text-muted': c.textMuted, '--accent-1': c.accent, '--accent-2': c.accent2,
    '--radius-sm': '12px', '--radius-md': '18px', '--radius-lg': '26px', '--radius-xl': '34px',
    '--font-marvel-display': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--font-marvel-ui': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--font-marvel-body': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--control-solid-bg': c.surfaceRaised,
    '--theme-watched-bg': darkMode ? 'rgba(66,211,146,.12)' : 'rgba(4,120,87,.1)',
  };
};

export const UI_TOKENS = {
  panel: { level1: 'var(--s-surface)', level2: 'var(--s-surface-raised)' },
  border: { soft: 'var(--s-border)', strong: 'var(--s-border-strong)' },
  shadow: { level1: 'var(--shadow-soft)', level2: 'var(--shadow-lift)' },
  spacing: { xs: 'var(--space-1)', sm: 'var(--space-2)', md: 'var(--space-3)', lg: 'var(--space-4)' },
  radius: { sm: 'var(--r-sm)', md: 'var(--r-md)', lg: 'var(--r-lg)' },
};
