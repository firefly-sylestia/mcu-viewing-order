export const APPEARANCE_MODES = [
  { id: 'glass', label: 'Glass', desc: 'Frosted depth, soft refraction, editorial display type', font: 'Space Grotesk' },
  { id: 'pixelated', label: 'Pixelated', desc: 'Arcade grid, chunky type, crisp stepped edges', font: 'Pixelify Sans' },
  { id: 'neon', label: 'Neon', desc: 'Electric signage, blacklight grids, outlined circuit panels', font: 'Audiowide' },
  { id: 'minimal', label: 'Minimal', desc: 'Quiet contrast, roomy rhythm, readable UI typography', font: 'Manrope' },
  { id: 'archive', label: 'Archive', desc: 'Cinematic dark archive and light museum card-catalog surfaces', font: 'Space Grotesk' },
];

export const normalizeAppearanceMode = (appearanceMode = 'glass') => (
  appearanceMode === 'neo' ? 'neon' : appearanceMode
);

export const CHARACTER_THEMES = [
  { id: 'iron-man', label: 'Iron Man', swatch: '#ed1d24', dcLabel: 'Superman', dcSwatch: '#2563eb' },
  { id: 'captain-marvel', label: 'Captain Marvel', swatch: '#2d71ff', dcLabel: 'Wonder Woman', dcSwatch: '#dc2626' },
  { id: 'black-panther', label: 'Black Panther', swatch: '#6f4dff', dcLabel: 'Batman', dcSwatch: '#facc15' },
  { id: 'ant-man', label: 'Ant-Man', swatch: '#ff5da8', dcLabel: 'The Flash', dcSwatch: '#f97316' },
  { id: 'doctor-strange', label: 'Doctor Strange', swatch: '#9d5bff', dcLabel: 'Doctor Fate', dcSwatch: '#38bdf8' },
  { id: 'spider-man', label: 'Spider-Man', swatch: '#e53a4d', dcLabel: 'Nightwing', dcSwatch: '#0ea5e9' },
  { id: 'thor', label: 'Thor', swatch: '#3ea9ff', dcLabel: 'Aquaman', dcSwatch: '#14b8a6' },
  { id: 'scarlet-witch', label: 'Scarlet Witch', swatch: '#c61b59', dcLabel: 'Harley Quinn', dcSwatch: '#ec4899' },
  { id: 'winter-soldier', label: 'Winter Soldier', swatch: '#8fa0b8', dcLabel: 'Cyborg', dcSwatch: '#94a3b8' },
  { id: 'captain-america', label: 'Captain America', swatch: '#3b5fa4', dcLabel: 'Justice League', dcSwatch: '#3b82f6' },
  { id: 'daredevil', label: 'Daredevil', swatch: '#bf0615', dcLabel: 'Red Hood', dcSwatch: '#b91c1c' },
  { id: 'panther-tech', label: 'Panther Tech', swatch: '#6bb0bf', dcLabel: 'Lantern Corps', dcSwatch: '#22c55e' },
  { id: 'marvel-red', label: 'Marvel Red', swatch: '#e23636', dcLabel: 'DC Blue', dcSwatch: '#1d4ed8' },
  { id: 'hela', label: 'Hela', swatch: '#49a561', dcLabel: 'Poison Ivy', dcSwatch: '#16a34a' },
];

const MODE_TOKENS = {
  glass: {
    fonts: { display: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', ui: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    effects: { blur: 12, glow: 0.16, shadow: '0 18px 46px color-mix(in srgb, var(--theme-shadow-rgb, #020617) 22%, transparent)' },
    shape: { radius: [16, 22, 30, 38], edge: 'glass', border: 1 },
    motion: { fast: '140ms', normal: '220ms', slow: '320ms', hoverScale: 1.008 },
    texture: 'linear-gradient(135deg, rgba(255,255,255,.16), rgba(255,255,255,.025) 48%, transparent 72%)',
    panelOverlay: 'linear-gradient(145deg, color-mix(in srgb, var(--theme-surface) 72%, transparent), color-mix(in srgb, var(--theme-surface-strong) 54%, transparent))',
  },
  pixelated: {
    fonts: { display: '"Pixelify Sans", "Press Start 2P", system-ui, sans-serif', ui: '"Pixelify Sans", "Rajdhani", system-ui, sans-serif', body: '"Rajdhani", "Outfit", system-ui, sans-serif' },
    effects: { blur: 0, glow: 0.1, shadow: '6px 6px 0 color-mix(in srgb, var(--theme-accent) 22%, transparent), 0 14px 24px rgba(2,8,23,.16)' },
    shape: { radius: [6, 8, 12, 16], edge: 'pixel', border: 2 },
    motion: { fast: '80ms', normal: '140ms', slow: '190ms', hoverScale: 1 },
    texture: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent) 13%, transparent) 1px, transparent 1px), linear-gradient(0deg, color-mix(in srgb, var(--theme-accent-alt) 10%, transparent) 1px, transparent 1px)',
    panelOverlay: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-surface) 90%, transparent), color-mix(in srgb, var(--theme-accent) 9%, var(--theme-surface-strong)))',
  },
  neon: {
    fonts: { display: '"Audiowide", "Rajdhani", system-ui, sans-serif', ui: '"Rajdhani", "Outfit", system-ui, sans-serif', body: '"Rajdhani", "Space Grotesk", system-ui, sans-serif' },
    effects: { blur: 0, glow: 0.7, shadow: '0 0 0 1px color-mix(in srgb, var(--theme-accent) 40%, transparent), 0 0 18px color-mix(in srgb, var(--theme-accent) 30%, transparent), 0 0 48px color-mix(in srgb, var(--theme-accent-alt) 18%, transparent)' },
    shape: { radius: [2, 6, 12, 18], edge: 'neon', border: 1.5 },
    motion: { fast: '110ms', normal: '190ms', slow: '280ms', hoverScale: 1.006 },
    texture: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent) 13%, transparent) 1px, transparent 1px), linear-gradient(0deg, color-mix(in srgb, var(--theme-accent-alt) 10%, transparent) 1px, transparent 1px), radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--theme-accent) 18%, transparent), transparent 28%)',
    panelOverlay: 'linear-gradient(145deg, color-mix(in srgb, var(--theme-bg) 82%, #000), color-mix(in srgb, var(--theme-surface) 88%, #000) 52%, color-mix(in srgb, var(--theme-accent-alt) 9%, var(--theme-bg)))',
  },
  minimal: {
    fonts: { display: '"Manrope", "Outfit", system-ui, sans-serif', ui: '"Manrope", "Outfit", system-ui, sans-serif', body: '"Manrope", "Outfit", system-ui, sans-serif' },
    effects: { blur: 0, glow: 0.04, shadow: '0 10px 28px rgba(15,23,42,.1)' },
    shape: { radius: [10, 14, 18, 24], edge: 'minimal', border: 1 },
    motion: { fast: '120ms', normal: '180ms', slow: '240ms', hoverScale: 1.004 },
    texture: 'none',
    panelOverlay: 'linear-gradient(180deg, var(--theme-surface), var(--theme-surface-strong))',
  },
  archive: {
    fonts: { display: '"Space Grotesk", "Manrope", system-ui, sans-serif', ui: '"Manrope", "Outfit", system-ui, sans-serif', body: '"Manrope", "Outfit", system-ui, sans-serif' },
    effects: { blur: 14, glow: 0.32, shadow: '0 22px 58px color-mix(in srgb, var(--theme-shadow-rgb, #020617) 24%, transparent)' },
    shape: { radius: [18, 24, 32, 42], edge: 'archive', border: 1 },
    motion: { fast: '140ms', normal: '220ms', slow: '300ms', hoverScale: 1.006 },
    texture: 'radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--theme-accent) 16%, transparent), transparent 30%), linear-gradient(135deg, rgba(255,255,255,.10), transparent 42%)',
    panelOverlay: 'linear-gradient(145deg, color-mix(in srgb, var(--theme-surface) 86%, transparent), color-mix(in srgb, var(--theme-bg-alt) 36%, transparent))',
  },
};

const MARVEL_THEME_TOKEN_MAP = {
  'iron-man': { accent: '#f43f3f', accent2: '#f59e0b' },
  'captain-marvel': { accent: '#2d71ff', accent2: '#f4b400' },
  'black-panther': { accent: '#8b5cf6', accent2: '#06b6d4' },
  'ant-man': { accent: '#ff4fa3', accent2: '#22d3ee' },
  'doctor-strange': { accent: '#a855f7', accent2: '#fb7185' },
  'spider-man': { accent: '#ef4444', accent2: '#2563eb' },
  thor: { accent: '#38bdf8', accent2: '#fde68a' },
  'scarlet-witch': { accent: '#e11d48', accent2: '#f472b6' },
  'winter-soldier': { accent: '#94a3b8', accent2: '#475569' },
  'captain-america': { accent: '#3b82f6', accent2: '#ef4444' },
  daredevil: { accent: '#dc2626', accent2: '#991b1b' },
  'panther-tech': { accent: '#67e8f9', accent2: '#6366f1' },
  'marvel-red': { accent: '#e23636', accent2: '#fb923c' },
  hela: { accent: '#22c55e', accent2: '#d9f99d' },
};

const DC_THEME_TOKEN_MAP = {
  'iron-man': { accent: '#2563eb', accent2: '#ef4444' },
  'captain-marvel': { accent: '#dc2626', accent2: '#facc15' },
  'black-panther': { accent: '#facc15', accent2: '#64748b' },
  'ant-man': { accent: '#f97316', accent2: '#facc15' },
  'doctor-strange': { accent: '#38bdf8', accent2: '#f59e0b' },
  'spider-man': { accent: '#0ea5e9', accent2: '#1e3a8a' },
  thor: { accent: '#14b8a6', accent2: '#f59e0b' },
  'scarlet-witch': { accent: '#ec4899', accent2: '#22d3ee' },
  'winter-soldier': { accent: '#94a3b8', accent2: '#38bdf8' },
  'captain-america': { accent: '#3b82f6', accent2: '#f8fafc' },
  daredevil: { accent: '#b91c1c', accent2: '#64748b' },
  'panther-tech': { accent: '#22c55e', accent2: '#a3e635' },
  'marvel-red': { accent: '#1d4ed8', accent2: '#60a5fa' },
  hela: { accent: '#16a34a', accent2: '#bef264' },
};

export const THEME_TOKEN_MAP = MARVEL_THEME_TOKEN_MAP;

const COLOR_MODE_TOKENS = {
  marvel: {
    dark: { bg: '#07050c', bgAlt: '#14080d', surface: 'rgba(25,22,31,.76)', surfaceStrong: 'rgba(40,31,39,.9)', text: '#fff7ed', text2: '#d8c9c1', muted: '#a9958d', border: 'rgba(255,255,255,.12)', shadowRgb: '#07050c' },
    light: { bg: '#fff4e6', bgAlt: '#ffe7df', surface: 'rgba(255,251,246,.84)', surfaceStrong: 'rgba(255,255,255,.96)', text: '#241313', text2: '#664744', muted: '#8a6861', border: 'rgba(127,29,29,.16)', shadowRgb: '#7f1d1d' },
  },
  neon: {
    dark: { bg: '#03000f', bgAlt: '#090525', surface: 'rgba(8, 7, 28, .92)', surfaceStrong: 'rgba(14, 12, 42, .98)', text: '#f8fbff', text2: '#c8f7ff', muted: '#7dd6e9', border: 'rgba(57,255,243,.24)', shadowRgb: '#03000f' },
    light: { bg: '#f8fbff', bgAlt: '#edf5ff', surface: 'rgba(255,255,255,.92)', surfaceStrong: 'rgba(255,255,255,.98)', text: '#101532', text2: '#334465', muted: '#61708c', border: 'rgba(0,99,229,.20)', shadowRgb: '#1e3a8a' },
  },
  archive: {
    dark: { bg: '#050813', bgAlt: '#101624', surface: 'rgba(18,24,38,.78)', surfaceStrong: 'rgba(28,35,52,.94)', text: '#fff8ea', text2: '#d8cdbd', muted: '#a99a86', border: 'rgba(245, 197, 93, .18)', shadowRgb: '#02040b' },
    light: { bg: '#f8f1e5', bgAlt: '#efe3d2', surface: 'rgba(255,252,245,.88)', surfaceStrong: 'rgba(255,255,250,.98)', text: '#221914', text2: '#5f4a3e', muted: '#8a7564', border: 'rgba(146, 64, 14, .18)', shadowRgb: '#92400e' },
  },
  dc: {
    dark: { bg: '#030817', bgAlt: '#061b3a', surface: 'rgba(12,24,48,.76)', surfaceStrong: 'rgba(18,36,70,.9)', text: '#eff6ff', text2: '#bfd8ff', muted: '#8fb4e8', border: 'rgba(147,197,253,.16)', shadowRgb: '#020617' },
    light: { bg: '#eef6ff', bgAlt: '#e7f0ff', surface: 'rgba(248,252,255,.84)', surfaceStrong: 'rgba(255,255,255,.97)', text: '#08162c', text2: '#294365', muted: '#527099', border: 'rgba(37,99,235,.16)', shadowRgb: '#1e3a8a' },
  },
};

export const resolveThemeTokens = ({ appearanceMode = 'glass', characterTheme = 'iron-man', darkMode = true, universe = 'mcu' }) => {
  const normalizedMode = normalizeAppearanceMode(appearanceMode);
  const mode = MODE_TOKENS[normalizedMode] || MODE_TOKENS.glass;
  const universeKey = universe === 'dc' ? 'dc' : 'marvel';
  const brandMap = universeKey === 'dc' ? DC_THEME_TOKEN_MAP : MARVEL_THEME_TOKEN_MAP;
  const hero = brandMap[characterTheme] || brandMap['iron-man'];
  const colorSystemKey = normalizedMode === 'archive' ? 'archive' : (normalizedMode === 'neon' ? 'neon' : universeKey);
  const color = COLOR_MODE_TOKENS[colorSystemKey][darkMode ? 'dark' : 'light'];
  const glowSoftPct = Math.round(mode.effects.glow * 42);
  const glowStrongPct = Math.round(mode.effects.glow * 68);

  return {
    '--bg-base': color.bg,
    '--bg-elevated': color.surfaceStrong,
    '--surface-1': color.surface,
    '--surface-2': color.surfaceStrong,
    '--surface-3': `color-mix(in srgb, ${color.surfaceStrong} 84%, ${hero.accent})`,
    '--text-primary': color.text,
    '--text-secondary': color.text2,
    '--text-muted': color.muted,
    '--accent-1': hero.accent,
    '--accent-2': hero.accent2,
    '--theme-accent': hero.accent,
    '--theme-accent-alt': hero.accent2,
    '--theme-bg': color.bg,
    '--theme-bg-alt': color.bgAlt,
    '--theme-surface': color.surface,
    '--theme-surface-hover': `color-mix(in srgb, ${color.surfaceStrong} 90%, ${hero.accent} 10%)`,
    '--theme-surface-strong': color.surfaceStrong,
    '--theme-border': color.border,
    '--theme-text': color.text,
    '--theme-text-primary': color.text,
    '--theme-text-secondary': color.text2,
    '--theme-text-muted': color.muted,
    '--theme-shadow-rgb': color.shadowRgb,
    '--edge-color': color.border,
    '--edge-highlight': darkMode ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.86)',
    '--glow-color': hero.accent,
    '--glow-soft': `color-mix(in srgb, ${hero.accent} ${glowSoftPct}%, transparent)`,
    '--glow-strong': `color-mix(in srgb, ${hero.accent2} ${glowStrongPct}%, transparent)`,
    '--radius-sm': `${mode.shape.radius[0]}px`,
    '--radius-md': `${mode.shape.radius[1]}px`,
    '--radius-lg': `${mode.shape.radius[2]}px`,
    '--radius-xl': `${mode.shape.radius[3]}px`,
    '--font-display-mode': mode.fonts.display,
    '--font-ui-mode': mode.fonts.ui,
    '--font-body-mode': mode.fonts.body,
    '--font-marvel-display': mode.fonts.display,
    '--font-marvel-ui': mode.fonts.ui,
    '--font-marvel-body': mode.fonts.body,
    '--motion-fast': mode.motion.fast,
    '--motion-normal': mode.motion.normal,
    '--motion-slow': mode.motion.slow,
    '--theme-hover-scale': mode.motion.hoverScale,
    '--fx-blur': `${mode.effects.blur}px`,
    '--fx-shadow-2': mode.effects.shadow,
    '--fx-border-width': `${mode.shape.border}px`,
    '--theme-texture': mode.texture,
    '--texture-overlay': mode.texture,
    '--theme-panel-overlay': mode.panelOverlay,
    '--theme-style-edge': mode.shape.edge,
  };
};
