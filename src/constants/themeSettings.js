import { buildSemanticThemeVars } from './ui.js';

export const APPEARANCE_MODES = [
  { id: 'glass', label: 'System', desc: 'Balanced translucent Spectrum surfaces.', font: 'Inter' },
  { id: 'minimal', label: 'Minimal', desc: 'Cleaner surfaces with less blur and animation.', font: 'Inter' },
  { id: 'neon', label: 'Luxe', desc: 'Iridescent borders and cinematic accents.', font: 'Inter' },
  { id: 'archive', label: 'Cinematic', desc: 'Poster-forward panels with soft contrast.', font: 'Inter' },
  { id: 'pixelated', label: 'Compact', desc: 'Dense readable controls with low effects.', font: 'Inter' },
];

export const normalizeAppearanceMode = (appearanceMode = 'glass') => {
  if (appearanceMode === 'neo') return 'neon';
  return APPEARANCE_MODES.some(mode => mode.id === appearanceMode) ? appearanceMode : 'glass';
};

export const CHARACTER_THEMES = [
  { id: 'spectrum-prime', label: 'Spectrum Prime', swatch: '#ff375f', dcLabel: 'Spectrum Prime', dcSwatch: '#38bdf8' },
  { id: 'monarch-dark', label: 'Monarch Dark', swatch: '#b83280', dcLabel: 'Monarch Dark', dcSwatch: '#f59e0b' },
  { id: 'aurora-light', label: 'Aurora Light', swatch: '#fb7185', dcLabel: 'Aurora Light', dcSwatch: '#0ea5e9' },
  { id: 'cosmic-teal', label: 'Cosmic Teal', swatch: '#14b8a6', dcLabel: 'Cosmic Teal', dcSwatch: '#22d3ee' },
  { id: 'infinity-rose', label: 'Infinity Rose', swatch: '#ec4899', dcLabel: 'Infinity Rose', dcSwatch: '#a78bfa' },
  { id: 'iron-man', label: 'Spectrum Prime', swatch: '#ff375f', dcLabel: 'Spectrum Prime', dcSwatch: '#38bdf8' },
  { id: 'captain-marvel', label: 'Aurora Light', swatch: '#38bdf8', dcLabel: 'Aurora Light', dcSwatch: '#60a5fa' },
  { id: 'black-panther', label: 'Monarch Dark', swatch: '#8b5cf6', dcLabel: 'Monarch Dark', dcSwatch: '#facc15' },
  { id: 'ant-man', label: 'Infinity Rose', swatch: '#ff5da8', dcLabel: 'Infinity Rose', dcSwatch: '#fb7185' },
  { id: 'doctor-strange', label: 'Cosmic Teal', swatch: '#9d5bff', dcLabel: 'Cosmic Teal', dcSwatch: '#14b8a6' },
  { id: 'spider-man', label: 'Spectrum Prime', swatch: '#e53a4d', dcLabel: 'Spectrum Prime', dcSwatch: '#0ea5e9' },
  { id: 'thor', label: 'Cosmic Teal', swatch: '#3ea9ff', dcLabel: 'Cosmic Teal', dcSwatch: '#14b8a6' },
  { id: 'scarlet-witch', label: 'Infinity Rose', swatch: '#c61b59', dcLabel: 'Infinity Rose', dcSwatch: '#ec4899' },
  { id: 'winter-soldier', label: 'Monarch Dark', swatch: '#8fa0b8', dcLabel: 'Monarch Dark', dcSwatch: '#94a3b8' },
  { id: 'captain-america', label: 'Aurora Light', swatch: '#3b5fa4', dcLabel: 'Aurora Light', dcSwatch: '#3b82f6' },
  { id: 'daredevil', label: 'Monarch Dark', swatch: '#bf0615', dcLabel: 'Monarch Dark', dcSwatch: '#b91c1c' },
  { id: 'panther-tech', label: 'Cosmic Teal', swatch: '#6bb0bf', dcLabel: 'Cosmic Teal', dcSwatch: '#22c55e' },
  { id: 'marvel-red', label: 'Spectrum Prime', swatch: '#e23636', dcLabel: 'Spectrum Prime', dcSwatch: '#1d4ed8' },
  { id: 'hela', label: 'Cosmic Teal', swatch: '#49a561', dcLabel: 'Cosmic Teal', dcSwatch: '#16a34a' },
];

const PALETTES = {
  'spectrum-prime': { a: '#ff375f', b: '#8b5cf6', c: '#38bdf8', d: '#facc15' },
  'monarch-dark': { a: '#b83280', b: '#5b214a', c: '#9f1239', d: '#f59e0b' },
  'aurora-light': { a: '#fb7185', b: '#c4b5fd', c: '#7dd3fc', d: '#f9a8d4' },
  'cosmic-teal': { a: '#14b8a6', b: '#22d3ee', c: '#10b981', d: '#8b5cf6' },
  'infinity-rose': { a: '#fb7185', b: '#ec4899', c: '#7c3aed', d: '#fbbf24' },
  'iron-man': { a: '#ff375f', b: '#8b5cf6', c: '#38bdf8', d: '#facc15' },
  'captain-marvel': { a: '#38bdf8', b: '#8b5cf6', c: '#facc15', d: '#ff375f' },
  'black-panther': { a: '#8b5cf6', b: '#a855f7', c: '#38bdf8', d: '#facc15' },
  'ant-man': { a: '#ff5da8', b: '#8b5cf6', c: '#38bdf8', d: '#facc15' },
  'doctor-strange': { a: '#9d5bff', b: '#14b8a6', c: '#38bdf8', d: '#facc15' },
  'spider-man': { a: '#e53a4d', b: '#8b5cf6', c: '#0ea5e9', d: '#facc15' },
  'thor': { a: '#3ea9ff', b: '#14b8a6', c: '#8b5cf6', d: '#facc15' },
  'scarlet-witch': { a: '#c61b59', b: '#ec4899', c: '#7c3aed', d: '#fbbf24' },
  'winter-soldier': { a: '#94a3b8', b: '#64748b', c: '#38bdf8', d: '#facc15' },
  'captain-america': { a: '#3b82f6', b: '#8b5cf6', c: '#ef4444', d: '#facc15' },
  'daredevil': { a: '#bf0615', b: '#8b5cf6', c: '#38bdf8', d: '#f59e0b' },
  'panther-tech': { a: '#14b8a6', b: '#6bb0bf', c: '#8b5cf6', d: '#facc15' },
  'marvel-red': { a: '#e23636', b: '#8b5cf6', c: '#38bdf8', d: '#facc15' },
  'hela': { a: '#49a561', b: '#14b8a6', c: '#8b5cf6', d: '#facc15' },
};

export const resolveThemeTokens = ({ appearanceMode = 'glass', characterTheme = 'spectrum-prime', darkMode = true } = {}) => {
  const vars = buildSemanticThemeVars(darkMode);
  const palette = PALETTES[characterTheme] || PALETTES['spectrum-prime'];
  const normalized = normalizeAppearanceMode(appearanceMode);
  const blur = normalized === 'minimal' || normalized === 'pixelated' ? '0px' : normalized === 'neon' ? '18px' : '16px';
  return {
    ...vars,
    '--s-accent': palette.a,
    '--s-accent-2': palette.b,
    '--s-accent-3': palette.c,
    '--s-accent-4': palette.d,
    '--s-gradient': `linear-gradient(135deg, ${palette.a}, ${palette.b}, ${palette.c}, ${palette.d})`,
    '--theme-accent': palette.a,
    '--theme-accent-alt': palette.b,
    '--accent-1': palette.a,
    '--accent-2': palette.b,
    '--glow-color': palette.a,
    '--glow-soft': `color-mix(in srgb, ${palette.a} 18%, transparent)`,
    '--glow-strong': `color-mix(in srgb, ${palette.b} 24%, transparent)`,
    '--fx-blur': blur,
    '--fx-shadow-2': 'var(--shadow-lift)',
    '--fx-border-width': '1px',
    '--theme-texture': 'none',
    '--texture-overlay': 'none',
    '--theme-panel-overlay': 'linear-gradient(145deg, var(--s-surface), var(--s-glass))',
    '--theme-style-edge': normalized,
  };
};
