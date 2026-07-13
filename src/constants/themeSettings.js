export const APPEARANCE_MODES = [
  { id: 'glass', label: 'Glass' },
  { id: 'pixelated', label: 'Pixelated' },
  { id: 'neo', label: 'Neo' },
  { id: 'minimal', label: 'Minimal' },
];

export const CHARACTER_THEMES = [
  { id: 'iron-man', label: 'Iron Man', swatch: '#ed1d24' },
  { id: 'captain-marvel', label: 'Captain Marvel', swatch: '#2d71ff' },
  { id: 'black-panther', label: 'Black Panther', swatch: '#6f4dff' },
  { id: 'ant-man', label: 'Ant-Man', swatch: '#ff5da8' },
  { id: 'doctor-strange', label: 'Doctor Strange', swatch: '#9d5bff' },
  { id: 'spider-man', label: 'Spider-Man', swatch: '#e53a4d' },
  { id: 'thor', label: 'Thor', swatch: '#3ea9ff' },
  { id: 'scarlet-witch', label: 'Scarlet Witch', swatch: '#c61b59' },
  { id: 'winter-soldier', label: 'Winter Soldier', swatch: '#8fa0b8' },
  { id: 'captain-america', label: 'Captain America', swatch: '#3b5fa4' },
  { id: 'daredevil', label: 'Daredevil', swatch: '#bf0615' },
  { id: 'panther-tech', label: 'Panther Tech', swatch: '#6bb0bf' },
  { id: 'marvel-red', label: 'Marvel Red', swatch: '#e23636' },
  { id: 'hela', label: 'Hela', swatch: '#49a561' },
];

const MODE_TOKENS = {
  glass: { effects: { blur: 20, glow: 0.34, shadow: '0 22px 58px rgba(2,8,23,0.34)' }, shape: { radius: [8,14,20,28], edge: 'soft', border: 1 }, motion: { fast: '120ms', normal: '190ms', slow: '280ms', hoverScale: 1.01 }, texture: 'radial-gradient(circle at 0 0, rgba(255,255,255,0.06), transparent 55%)' },
  pixelated: { effects: { blur: 0, glow: 0.12, shadow: '0 10px 0 rgba(2,8,23,0.2)' }, shape: { radius: [0,4,8,10], edge: 'stepped', border: 2 }, motion: { fast: '90ms', normal: '140ms', slow: '200ms', hoverScale: 1.003 }, texture: 'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)' },
  neo: { effects: { blur: 10, glow: 0.46, shadow: '0 18px 48px rgba(2,8,23,0.42)' }, shape: { radius: [10,16,22,30], edge: 'neon', border: 1 }, motion: { fast: '130ms', normal: '210ms', slow: '300ms', hoverScale: 1.02 }, texture: 'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.04), transparent 50%)' },
  minimal: { effects: { blur: 0, glow: 0.1, shadow: '0 8px 24px rgba(2,8,23,0.14)' }, shape: { radius: [6,10,14,20], edge: 'clean', border: 1 }, motion: { fast: '120ms', normal: '170ms', slow: '230ms', hoverScale: 1.008 }, texture: 'none' },
};

const THEME_TOKEN_MAP = {
  'iron-man': { accent: '#ed1d24', accent2: '#f59e0b' },
  'captain-marvel': { accent: '#2d71ff', accent2: '#f4b400' },
  'black-panther': { accent: '#6f4dff', accent2: '#00b9ff' },
  'ant-man': { accent: '#ff5da8', accent2: '#67f2ff' },
  'doctor-strange': { accent: '#9d5bff', accent2: '#ff7a45' },
  'spider-man': { accent: '#e53a4d', accent2: '#2b72ff' },
  thor: { accent: '#3ea9ff', accent2: '#b0d7ff' },
  'scarlet-witch': { accent: '#c61b59', accent2: '#ff7cb5' },
  'winter-soldier': { accent: '#8fa0b8', accent2: '#4b596f' },
  'captain-america': { accent: '#3b5fa4', accent2: '#9b3430' },
  daredevil: { accent: '#bf0615', accent2: '#a61731' },
  'panther-tech': { accent: '#6bb0bf', accent2: '#3b3f8c' },
  'marvel-red': { accent: '#e23636', accent2: '#f78f3f' },
  hela: { accent: '#49a561', accent2: '#d0d500' },
};

export { THEME_TOKEN_MAP };

export const resolveThemeTokens = ({ appearanceMode = 'glass', characterTheme = 'iron-man', darkMode = true }) => {
  const mode = MODE_TOKENS[appearanceMode] || MODE_TOKENS.glass;
  const hero = THEME_TOKEN_MAP[characterTheme] || THEME_TOKEN_MAP['iron-man'];
  const isDark = Boolean(darkMode);
  const bg = isDark ? '#070b14' : '#f4f8ff';
  const surface = isDark ? 'rgba(15,22,36,0.82)' : 'rgba(255,255,255,0.9)';
  const elevated = isDark ? 'rgba(22,30,48,0.94)' : 'rgba(255,255,255,0.98)';
  return {
    '--bg-base': bg, '--bg-elevated': elevated, '--surface-1': surface, '--surface-2': elevated,
    '--text-primary': isDark ? '#f6f8ff' : '#0f172a', '--text-secondary': isDark ? '#c1cbdd' : '#42526b',
    '--accent-1': hero.accent, '--accent-2': hero.accent2,
    '--edge-color': isDark ? 'color-mix(in srgb, #ffffff 15%, transparent)' : 'color-mix(in srgb, #0f172a 12%, transparent)', '--edge-highlight': isDark ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.82)',
    '--glow-color': hero.accent, '--glow-soft': `color-mix(in srgb, ${hero.accent} ${Math.round(mode.effects.glow*45)}%, transparent)`, '--glow-strong': `color-mix(in srgb, ${hero.accent2} ${Math.round(mode.effects.glow*75)}%, transparent)`,
    '--radius-sm': mode.shape.radius[0]+'px', '--radius-md': mode.shape.radius[1]+'px', '--radius-lg': mode.shape.radius[2]+'px', '--radius-xl': mode.shape.radius[3]+'px',
    '--motion-fast': mode.motion.fast, '--motion-normal': mode.motion.normal, '--motion-slow': mode.motion.slow,
    '--fx-blur': mode.effects.blur+'px', '--fx-shadow-2': mode.effects.shadow, '--fx-border-width': mode.shape.border+'px', '--texture-overlay': mode.texture,
  };
};
