export const APPEARANCE_MODES = [
  { id: 'glass', label: 'Luxe Glass', desc: 'Soft translucent panels with iridescent spectrum edges.', font: 'System Sans' },
  { id: 'minimal', label: 'Quiet Focus', desc: 'Reduced surfaces, high readability, minimal shimmer.', font: 'System Sans' },
  { id: 'neon', label: 'Spectrum Glow', desc: 'A controlled cinematic accent treatment for dark rooms.', font: 'System Sans' },
  { id: 'archive', label: 'Studio Pearl', desc: 'Warm light-room catalog surfaces and calm contrast.', font: 'System Sans' },
  { id: 'pixelated', label: 'Data Saver', desc: 'Lowest effect level with crisp edges and no blur.', font: 'System Sans' },
];

export const normalizeAppearanceMode = (appearanceMode = 'glass') => (appearanceMode === 'neo' ? 'neon' : appearanceMode);

export const CHARACTER_THEMES = [
  { id: 'iron-man', label: 'Spectrum Prime', swatch: '#ff375f', dcLabel: 'Spectrum Prime', dcSwatch: '#38bdf8' },
  { id: 'captain-marvel', label: 'Aurora Light', swatch: '#38bdf8', dcLabel: 'Aurora Light', dcSwatch: '#7dd3fc' },
  { id: 'black-panther', label: 'Monarch Dark', swatch: '#8b5cf6', dcLabel: 'Monarch Dark', dcSwatch: '#a78bfa' },
  { id: 'ant-man', label: 'Infinity Rose', swatch: '#fb7185', dcLabel: 'Infinity Rose', dcSwatch: '#fb7185' },
  { id: 'doctor-strange', label: 'Cosmic Teal', swatch: '#2dd4bf', dcLabel: 'Cosmic Teal', dcSwatch: '#2dd4bf' },
  { id: 'spider-man', label: 'Crimson Wing', swatch: '#ef4444', dcLabel: 'Blue Wing', dcSwatch: '#3b82f6' },
  { id: 'thor', label: 'Sky Relic', swatch: '#60a5fa', dcLabel: 'Tide Relic', dcSwatch: '#14b8a6' },
  { id: 'scarlet-witch', label: 'Ultraviolet', swatch: '#c026d3', dcLabel: 'Ultraviolet', dcSwatch: '#c026d3' },
  { id: 'winter-soldier', label: 'Silver Dust', swatch: '#94a3b8', dcLabel: 'Silver Dust', dcSwatch: '#94a3b8' },
  { id: 'captain-america', label: 'Prism Blue', swatch: '#2563eb', dcLabel: 'Prism Blue', dcSwatch: '#2563eb' },
  { id: 'daredevil', label: 'Ruby Ember', swatch: '#be123c', dcLabel: 'Ruby Ember', dcSwatch: '#be123c' },
  { id: 'panther-tech', label: 'Emerald Vein', swatch: '#10b981', dcLabel: 'Emerald Vein', dcSwatch: '#10b981' },
  { id: 'marvel-red', label: 'Warm Gold', swatch: '#f59e0b', dcLabel: 'Warm Gold', dcSwatch: '#f59e0b' },
  { id: 'hela', label: 'Aurora Green', swatch: '#22c55e', dcLabel: 'Aurora Green', dcSwatch: '#22c55e' },
];

const PALETTES = {
  'iron-man': { accent: '#ff375f', accent2: '#8b5cf6', accent3: '#38bdf8', gold: '#facc15' },
  'captain-marvel': { accent: '#38bdf8', accent2: '#c4b5fd', accent3: '#fb7185', gold: '#fde68a' },
  'black-panther': { accent: '#8b5cf6', accent2: '#a21caf', accent3: '#f43f5e', gold: '#f59e0b' },
  'ant-man': { accent: '#fb7185', accent2: '#d946ef', accent3: '#7c3aed', gold: '#fbbf24' },
  'doctor-strange': { accent: '#14b8a6', accent2: '#38bdf8', accent3: '#8b5cf6', gold: '#facc15' },
  'spider-man': { accent: '#ef4444', accent2: '#2563eb', accent3: '#38bdf8', gold: '#f59e0b' },
  thor: { accent: '#60a5fa', accent2: '#22d3ee', accent3: '#818cf8', gold: '#facc15' },
  'scarlet-witch': { accent: '#c026d3', accent2: '#fb7185', accent3: '#7c3aed', gold: '#f59e0b' },
  'winter-soldier': { accent: '#94a3b8', accent2: '#64748b', accent3: '#38bdf8', gold: '#eab308' },
  'captain-america': { accent: '#2563eb', accent2: '#ef4444', accent3: '#60a5fa', gold: '#f8fafc' },
  daredevil: { accent: '#be123c', accent2: '#ef4444', accent3: '#71717a', gold: '#f59e0b' },
  'panther-tech': { accent: '#10b981', accent2: '#22d3ee', accent3: '#8b5cf6', gold: '#bef264' },
  'marvel-red': { accent: '#f59e0b', accent2: '#ff375f', accent3: '#8b5cf6', gold: '#fde047' },
  hela: { accent: '#22c55e', accent2: '#84cc16', accent3: '#14b8a6', gold: '#d9f99d' },
};

export const THEME_TOKEN_MAP = PALETTES;

export const resolveThemeTokens = ({ appearanceMode = 'glass', characterTheme = 'iron-man', darkMode = true }) => {
  const normalizedMode = normalizeAppearanceMode(appearanceMode);
  const palette = PALETTES[characterTheme] || PALETTES['iron-man'];
  const isLight = !darkMode;
  const blur = normalizedMode === 'pixelated' || normalizedMode === 'minimal' ? 0 : normalizedMode === 'neon' ? 10 : 16;
  const bg = isLight ? '#f8f5ff' : '#080a12';
  const bgAlt = isLight ? '#fff8f2' : '#101322';
  const surface = isLight ? 'rgba(255,255,255,.72)' : 'rgba(255,255,255,.065)';
  const surfaceStrong = isLight ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.095)';
  const text = isLight ? '#181525' : '#f8f7ff';
  const text2 = isLight ? '#3d365a' : '#d8d7e8';
  const muted = isLight ? '#6d6684' : '#9da3bb';
  const border = isLight ? 'rgba(20,20,40,.12)' : 'rgba(255,255,255,.12)';
  const shadowRgb = isLight ? '91 72 126' : '2 6 23';

  return {
    '--bg-base': bg,
    '--bg-elevated': bgAlt,
    '--surface-1': surface,
    '--surface-2': surfaceStrong,
    '--surface-3': `color-mix(in srgb, ${surfaceStrong} 86%, ${palette.accent})`,
    '--text-primary': text,
    '--text-secondary': text2,
    '--text-muted': muted,
    '--accent-1': palette.accent,
    '--accent-2': palette.accent2,
    '--accent-3': palette.accent3,
    '--theme-accent': palette.accent,
    '--theme-accent-alt': palette.accent2,
    '--theme-bg': bg,
    '--theme-bg-alt': bgAlt,
    '--theme-app-bg': `linear-gradient(135deg, ${bg}, ${bgAlt})`,
    '--app-bg-base': bg,
    '--app-bg-vignette': `color-mix(in srgb, ${palette.accent2} ${isLight ? 12 : 18}%, transparent)`,
    '--theme-surface': surface,
    '--theme-surface-hover': surfaceStrong,
    '--theme-surface-strong': surfaceStrong,
    '--theme-border': border,
    '--theme-text': text,
    '--theme-text-primary': text,
    '--theme-text-secondary': text2,
    '--theme-text-muted': muted,
    '--theme-shadow-rgb': shadowRgb,
    '--edge-color': border,
    '--edge-highlight': isLight ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.18)',
    '--glow-color': palette.accent,
    '--glow-soft': `color-mix(in srgb, ${palette.accent} ${isLight ? 18 : 24}%, transparent)`,
    '--glow-strong': `color-mix(in srgb, ${palette.accent2} ${isLight ? 22 : 30}%, transparent)`,
    '--radius-sm': '12px',
    '--radius-md': '18px',
    '--radius-lg': '26px',
    '--radius-xl': '34px',
    '--font-display-mode': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--font-ui-mode': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--font-body-mode': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--font-marvel-display': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--font-marvel-ui': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--font-marvel-body': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--motion-fast': '140ms',
    '--motion-normal': '240ms',
    '--motion-slow': '420ms',
    '--theme-hover-scale': 1.006,
    '--fx-blur': `${blur}px`,
    '--fx-shadow-2': `0 24px 70px rgb(${shadowRgb} / ${isLight ? .14 : .34})`,
    '--fx-border-width': '1px',
    '--theme-texture': 'none',
    '--texture-overlay': 'none',
    '--theme-panel-overlay': `linear-gradient(145deg, ${surface}, ${surfaceStrong})`,
    '--theme-style-edge': 'spectrum',
  };
};
