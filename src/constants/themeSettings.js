/**
 * Theme settings are centralized here so you can edit palettes without touching App logic.
 */

export const THEME_CHOICES = [
  { id: 'classic', label: 'Iron Man', dcLabel: 'Superman', swatch: '#da1e37', dcSwatch: '#2f80ed' },
  { id: 'cosmic', label: 'Capt. Marvel', dcLabel: 'Blue Beetle', swatch: '#a11d33', dcSwatch: '#1367c8' },
  { id: 'vibranium', label: 'Black Panther', dcLabel: 'Nightwing', swatch: '#85182a', dcSwatch: '#0d4f9c' },
  { id: 'quantum', label: 'Ant-Man', dcLabel: 'The Flash', swatch: '#bd1f36', dcSwatch: '#2f80ed' },
  { id: 'mystic', label: 'Dr. Strange', dcLabel: 'Zatanna', swatch: '#641220', dcSwatch: '#0b3a78' },
  { id: 'web-slinger', label: 'Spider-Man', dcLabel: 'Red Hood', swatch: '#c71f37', dcSwatch: '#1367c8' },
  { id: 'god-of-thunder', label: 'Thor', dcLabel: 'Aquaman', swatch: '#e5383b', dcSwatch: '#0d4f9c' },
  { id: 'scarlet-witch', label: 'Scarlet Witch', dcLabel: 'Raven', swatch: '#a71e34', dcSwatch: '#08204a' },
  { id: 'winter-soldier', label: 'Winter Soldier', dcLabel: 'Batman', swatch: '#b1a7a6', dcSwatch: '#6f89aa' },
  { id: 'captain-america', label: 'Captain America', dcLabel: 'Wonder Woman', swatch: '#ba181b', dcSwatch: '#0d4f9c' },
  { id: 'daredevil', label: 'Daredevil', dcLabel: 'Harley Quinn', swatch: '#660708', dcSwatch: '#2f80ed' },
  { id: 'panther-tech', label: 'Panther Tech', dcLabel: 'Cyborg', swatch: '#d3d3d3', dcSwatch: '#7ab7ff' },
  { id: 'marvel-red', label: 'Marvel Red', dcLabel: 'Shazam', swatch: '#da1e37', dcSwatch: '#1367c8' },
  { id: 'hela', label: 'Hela', dcLabel: 'Green Lantern', swatch: '#b21e35', dcSwatch: '#0b3a78' },
];

export const THEME_PALETTES = {
  classic: { accent: '#da1e37', accentAlt: '#a11d33', darkSurface: 'rgba(22,26,29,0.92)', lightSurface: 'rgba(245,243,244,0.96)', darkSurfaceHover: 'rgba(100,18,32,0.94)', lightSurfaceHover: 'rgba(255,255,255,0.98)', darkCompCard: 'rgba(100,18,32,0.34)', lightCompCard: 'rgba(255,255,255,0.95)' },
  cosmic: { accent: '#a11d33', accentAlt: '#c71f37', darkSurface: 'rgba(100,18,32,0.90)', lightSurface: 'rgba(245,243,244,0.96)', darkSurfaceHover: 'rgba(133,24,42,0.94)', lightSurfaceHover: 'rgba(255,246,247,0.97)', darkCompCard: 'rgba(110,20,35,0.36)', lightCompCard: 'rgba(255,248,248,0.95)' },
  vibranium: { accent: '#85182a', accentAlt: '#bd1f36', darkSurface: 'rgba(22,26,29,0.92)', lightSurface: 'rgba(245,243,244,0.96)', darkSurfaceHover: 'rgba(100,18,32,0.94)', lightSurfaceHover: 'rgba(255,244,245,0.97)', darkCompCard: 'rgba(100,18,32,0.34)', lightCompCard: 'rgba(255,248,248,0.95)' },
  quantum: { accent: '#bd1f36', accentAlt: '#e5383b', darkSurface: 'rgba(102,7,8,0.88)', lightSurface: 'rgba(255,245,246,0.96)', darkSurfaceHover: 'rgba(164,22,26,0.9)', lightSurfaceHover: 'rgba(255,235,237,0.98)', darkCompCard: 'rgba(102,7,8,0.42)', lightCompCard: 'rgba(255,248,248,0.95)' },
  mystic: { accent: '#641220', accentAlt: '#a71e34', darkSurface: 'rgba(11,9,10,0.92)', lightSurface: 'rgba(245,243,244,0.96)', darkSurfaceHover: 'rgba(100,18,32,0.9)', lightSurfaceHover: 'rgba(255,245,246,0.97)', darkCompCard: 'rgba(100,18,32,0.32)', lightCompCard: 'rgba(255,248,248,0.95)' },
  'web-slinger': { accent: '#c71f37', accentAlt: '#da1e37', darkSurface: 'rgba(102,7,8,0.9)', lightSurface: 'rgba(255,245,245,0.96)', darkSurfaceHover: 'rgba(164,22,26,0.92)', lightSurfaceHover: 'rgba(255,235,235,0.97)', darkCompCard: 'rgba(102,7,8,0.42)', lightCompCard: 'rgba(255,248,248,0.95)' },
  'god-of-thunder': { accent: '#e5383b', accentAlt: '#d3d3d3', darkSurface: 'rgba(22,26,29,0.92)', lightSurface: 'rgba(245,243,244,0.96)', darkSurfaceHover: 'rgba(102,7,8,0.9)', lightSurfaceHover: 'rgba(255,238,238,0.97)', darkCompCard: 'rgba(100,18,32,0.3)', lightCompCard: 'rgba(255,248,248,0.95)' },
  'scarlet-witch': { accent: '#a71e34', accentAlt: '#e01e37', darkSurface: 'rgba(100,18,32,0.9)', lightSurface: 'rgba(255,242,245,0.96)', darkSurfaceHover: 'rgba(133,24,42,0.94)', lightSurfaceHover: 'rgba(255,228,234,0.97)', darkCompCard: 'rgba(100,18,32,0.38)', lightCompCard: 'rgba(255,245,248,0.95)' },
  'winter-soldier': { accent: '#b1a7a6', accentAlt: '#85182a', darkSurface: 'rgba(22,26,29,0.92)', lightSurface: 'rgba(245,243,244,0.96)', darkSurfaceHover: 'rgba(35,31,32,0.94)', lightSurfaceHover: 'rgba(232,228,229,0.97)', darkCompCard: 'rgba(22,26,29,0.70)', lightCompCard: 'rgba(255,255,255,0.95)' },
  'captain-america': { accent: '#ba181b', accentAlt: '#d3d3d3', darkSurface: 'rgba(102,7,8,0.9)', lightSurface: 'rgba(254,254,254,0.96)', darkSurfaceHover: 'rgba(164,22,26,0.92)', lightSurfaceHover: 'rgba(211,211,211,0.34)', darkCompCard: 'rgba(102,7,8,0.4)', lightCompCard: 'rgba(254,254,254,0.95)' },
  daredevil: { accent: '#660708', accentAlt: '#a4161a', darkSurface: 'rgba(11,9,10,0.94)', lightSurface: 'rgba(255,242,243,0.96)', darkSurfaceHover: 'rgba(102,7,8,0.92)', lightSurfaceHover: 'rgba(255,228,230,0.98)', darkCompCard: 'rgba(102,7,8,0.36)', lightCompCard: 'rgba(255,246,247,0.95)' },
  'panther-tech': { accent: '#d3d3d3', accentAlt: '#b1a7a6', darkSurface: 'rgba(22,26,29,0.92)', lightSurface: 'rgba(245,243,244,0.96)', darkSurfaceHover: 'rgba(35,38,40,0.94)', lightSurfaceHover: 'rgba(232,232,232,0.97)', darkCompCard: 'rgba(22,26,29,0.72)', lightCompCard: 'rgba(255,255,255,0.95)' },
  'marvel-red': { accent: '#da1e37', accentAlt: '#85182a', darkSurface: 'rgba(100,18,32,0.94)', lightSurface: 'rgba(255,245,245,0.96)', darkSurfaceHover: 'rgba(133,24,42,0.95)', lightSurfaceHover: 'rgba(255,235,235,0.97)', darkCompCard: 'rgba(100,18,32,0.42)', lightCompCard: 'rgba(255,248,248,0.95)' },
  hela: { accent: '#b21e35', accentAlt: '#e01e37', darkSurface: 'rgba(22,26,29,0.92)', lightSurface: 'rgba(242,248,244,0.96)', darkSurfaceHover: 'rgba(100,18,32,0.9)', lightSurfaceHover: 'rgba(255,239,240,0.97)', darkCompCard: 'rgba(100,18,32,0.34)', lightCompCard: 'rgba(255,248,248,0.95)' },
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
