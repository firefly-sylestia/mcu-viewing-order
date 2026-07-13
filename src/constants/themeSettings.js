/**
 * Theme settings are centralized here so you can edit palettes without touching App logic.
 */

export const THEME_CHOICES = [
  { id: 'classic', label: 'Iron Man', dcLabel: 'Superman', swatch: '#d4372f', dcSwatch: '#2f7fff' },
  { id: 'cosmic', label: 'Capt. Marvel', dcLabel: 'Blue Beetle', swatch: '#4d7bff', dcSwatch: '#3d8cff' },
  { id: 'vibranium', label: 'Black Panther', dcLabel: 'Nightwing', swatch: '#7e5dff', dcSwatch: '#4aa4ff' },
  { id: 'quantum', label: 'Ant-Man', dcLabel: 'The Flash', swatch: '#ff5da8', dcSwatch: '#ff3b3b' },
  { id: 'mystic', label: 'Dr. Strange', dcLabel: 'Zatanna', swatch: '#9f66ff', dcSwatch: '#6c63ff' },
  { id: 'web-slinger', label: 'Spider-Man', dcLabel: 'Red Hood', swatch: '#df3f4c', dcSwatch: '#d64b4b' },
  { id: 'god-of-thunder', label: 'Thor', dcLabel: 'Aquaman', swatch: '#3ca6ff', dcSwatch: '#1ea7a0' },
  { id: 'scarlet-witch', label: 'Scarlet Witch', dcLabel: 'Raven', swatch: '#c61b59', dcSwatch: '#6a3cc9' },
  { id: 'winter-soldier', label: 'Winter Soldier', dcLabel: 'Batman', swatch: '#8fa0b8', dcSwatch: '#64748b' },
  { id: 'captain-america', label: 'Captain America', dcLabel: 'Wonder Woman', swatch: '#3b5fa4', dcSwatch: '#355f9f' },
  { id: 'daredevil', label: 'Daredevil', dcLabel: 'Harley Quinn', swatch: '#bf0615', dcSwatch: '#d42b6a' },
  { id: 'panther-tech', label: 'Panther Tech', dcLabel: 'Cyborg', swatch: '#6bb0bf', dcSwatch: '#35a4c6' },
  { id: 'marvel-red', label: 'Marvel Red', dcLabel: 'Shazam', swatch: '#e23636', dcSwatch: '#d97706' },
  { id: 'hela', label: 'Hela', dcLabel: 'Green Lantern', swatch: '#49a561', dcSwatch: '#2ea44f' },
];

export const THEME_PALETTES = {
  classic: { accent: '#5b8dff', accentAlt: '#7a67ff', darkSurface: 'rgba(28,10,9,0.90)', lightSurface: 'rgba(255,246,244,0.96)', darkSurfaceHover: 'rgba(44,14,12,0.94)', lightSurfaceHover: 'rgba(255,236,232,0.97)', darkCompCard: 'rgba(26,9,8,0.88)', lightCompCard: 'rgba(255,248,246,0.95)' },
  cosmic: { accent: '#6b8dff', accentAlt: '#71d0ff', darkSurface: 'rgba(7,12,32,0.90)', lightSurface: 'rgba(243,247,255,0.96)', darkSurfaceHover: 'rgba(10,16,44,0.94)', lightSurfaceHover: 'rgba(232,240,255,0.97)', darkCompCard: 'rgba(6,11,30,0.88)', lightCompCard: 'rgba(245,249,255,0.95)' },
  vibranium: { accent: '#7f7bff', accentAlt: '#4db6ff', darkSurface: 'rgba(13,7,28,0.90)', lightSurface: 'rgba(248,244,255,0.96)', darkSurfaceHover: 'rgba(20,10,42,0.94)', lightSurfaceHover: 'rgba(238,230,255,0.97)', darkCompCard: 'rgba(12,6,26,0.88)', lightCompCard: 'rgba(250,246,255,0.95)' },
  quantum: { accent: '#ff5da8', accentAlt: '#67f2ff', darkSurface: 'rgba(26,7,18,0.90)', lightSurface: 'rgba(255,243,251,0.96)', darkSurfaceHover: 'rgba(38,9,26,0.94)', lightSurfaceHover: 'rgba(255,230,246,0.97)', darkCompCard: 'rgba(24,6,17,0.88)', lightCompCard: 'rgba(255,246,253,0.95)' },
  mystic: { accent: '#9f66ff', accentAlt: '#ff7b39', darkSurface: 'rgba(15,7,28,0.90)', lightSurface: 'rgba(250,244,255,0.96)', darkSurfaceHover: 'rgba(22,10,40,0.94)', lightSurfaceHover: 'rgba(240,230,255,0.97)', darkCompCard: 'rgba(14,6,26,0.88)', lightCompCard: 'rgba(252,247,255,0.95)' },
  'web-slinger': { accent: '#df3f4c', accentAlt: '#2b7bdf', darkSurface: 'rgba(24,7,9,0.90)', lightSurface: 'rgba(255,244,245,0.96)', darkSurfaceHover: 'rgba(36,9,12,0.94)', lightSurfaceHover: 'rgba(255,232,234,0.97)', darkCompCard: 'rgba(22,6,8,0.88)', lightCompCard: 'rgba(255,247,248,0.95)' },
  'god-of-thunder': { accent: '#3ca6ff', accentAlt: '#f0f6ff', darkSurface: 'rgba(5,12,26,0.90)', lightSurface: 'rgba(243,250,255,0.96)', darkSurfaceHover: 'rgba(7,17,36,0.94)', lightSurfaceHover: 'rgba(226,244,255,0.97)', darkCompCard: 'rgba(4,10,24,0.88)', lightCompCard: 'rgba(245,252,255,0.95)' },
  'scarlet-witch': { accent: '#c61b59', accentAlt: '#ff7cb5', darkSurface: 'rgba(24,5,12,0.90)', lightSurface: 'rgba(255,242,247,0.96)', darkSurfaceHover: 'rgba(36,6,18,0.94)', lightSurfaceHover: 'rgba(255,228,238,0.97)', darkCompCard: 'rgba(22,4,11,0.88)', lightCompCard: 'rgba(255,245,250,0.95)' },
  'winter-soldier': { accent: '#8fa0b8', accentAlt: '#4b596f', darkSurface: 'rgba(7,10,16,0.90)', lightSurface: 'rgba(244,247,252,0.96)', darkSurfaceHover: 'rgba(10,14,22,0.94)', lightSurfaceHover: 'rgba(230,237,248,0.97)', darkCompCard: 'rgba(6,9,15,0.88)', lightCompCard: 'rgba(246,249,254,0.95)' },
  'captain-america': { accent: '#3b5fa4', accentAlt: '#9b3430', darkSurface: 'rgba(23,27,49,0.92)', lightSurface: 'rgba(254,254,254,0.96)', darkSurfaceHover: 'rgba(31,38,64,0.94)', lightSurfaceHover: 'rgba(174,183,194,0.34)', darkCompCard: 'rgba(23,27,49,0.88)', lightCompCard: 'rgba(254,254,254,0.95)' },
  daredevil: { accent: '#BF0615', accentAlt: '#A61731', darkSurface: 'rgba(64,1,1,0.92)', lightSurface: 'rgba(255,242,243,0.96)', darkSurfaceHover: 'rgba(78,4,4,0.94)', lightSurfaceHover: 'rgba(255,228,230,0.98)', darkCompCard: 'rgba(64,1,1,0.88)', lightCompCard: 'rgba(255,246,247,0.95)' },
  'panther-tech': { accent: '#6BB0BF', accentAlt: '#3B3F8C', darkSurface: 'rgba(26,27,27,0.92)', lightSurface: 'rgba(243,244,248,0.96)', darkSurfaceHover: 'rgba(38,40,49,0.94)', lightSurfaceHover: 'rgba(232,234,242,0.97)', darkCompCard: 'rgba(26,27,27,0.88)', lightCompCard: 'rgba(246,247,252,0.95)' },
  'marvel-red': { accent: '#e23636', accentAlt: '#f78f3f', darkSurface: 'rgba(0,0,0,0.92)', lightSurface: 'rgba(255,245,245,0.96)', darkSurfaceHover: 'rgba(18,18,18,0.94)', lightSurfaceHover: 'rgba(255,233,233,0.97)', darkCompCard: 'rgba(14,14,14,0.88)', lightCompCard: 'rgba(255,248,248,0.95)' },
  hela: { accent: '#49a561', accentAlt: '#d0d500', darkSurface: 'rgba(3,11,9,0.92)', lightSurface: 'rgba(242,248,244,0.96)', darkSurfaceHover: 'rgba(20,45,39,0.94)', lightSurfaceHover: 'rgba(231,243,235,0.97)', darkCompCard: 'rgba(13,34,28,0.88)', lightCompCard: 'rgba(246,251,247,0.95)' },
};

export const getActiveThemeVars = (themeMode, darkMode) => {
  const p = THEME_PALETTES[themeMode] || THEME_PALETTES.classic;
  const mode = darkMode ? 'dark' : 'light';
  return {
    '--theme-accent': p.accent,
    '--theme-accent-alt': p.accentAlt,
    '--theme-accent-glow': darkMode ? `color-mix(in srgb, ${p.accent} 42%, transparent)` : `color-mix(in srgb, ${p.accent} 24%, transparent)`,
    '--theme-surface': `var(--theme-surface-${mode})`,
    '--theme-surface-hover': `var(--theme-surface-hover-${mode})`,
    '--comp-card-bg': `var(--theme-comp-card-${mode})`,
  };
};
