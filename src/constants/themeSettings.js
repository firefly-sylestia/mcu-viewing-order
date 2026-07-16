/**
 * Theme settings — centralized so palettes can be edited without touching App logic.
 *
 * The MCU/DC tracker is now built around two core moods:
 *   • cinema  — primary, dark, red accent, gold ratings. Streaming-app aesthetic.
 *   • daylight — secondary, light, soft blue accent. Calm alternative.
 */

export const THEME_CHOICES = [
  { id: 'cinema',   swatch: '#D23026', label: 'Cinema',   dcLabel: 'Cinema' },
  { id: 'daylight', swatch: '#2563EB', label: 'Daylight', dcLabel: 'Daylight' },
];

export const THEME_PALETTES = {
  cinema: {
    accent:   '#D23026',          // primary CTA + info card
    accentAlt: '#F2C545',         // gold / IMDB / ratings
    surface:          'rgba(3,3,3,0.96)',         // phone card / hero bases
    surfaceAlt:       'rgba(23,24,26,1.00)',     // page bg
    surfaceHover:     'rgba(28,29,31,0.96)',
    surfaceTranslucent:'rgba(255,255,255,0.06)',
    iconButtonBg:     'rgba(0,0,0,0.35)',
    pillBg:           'rgba(255,255,255,0.08)',
    glassBg:          'rgba(20,20,22,0.90)',
    infoCardBg:       '#D23026',
    imdbBg:           '#F9D142',
    imdbText:         '#0A0A0A',
    divider:          '#3A3B3D',
    onDark:           '#FFFFFF',
    onDarkMuted:      '#9AA0A6',
    border:           'rgba(255,255,255,0.10)',
    borderSoft:       'rgba(255,255,255,0.06)',
    shadow:           'rgba(0,0,0,0.40)',
  },
  daylight: {
    accent:   '#2563EB',
    accentAlt: '#F2C545',
    surface:          '#FFFFFF',
    surfaceAlt:       '#F4F5F8',
    surfaceHover:     '#EEF1F6',
    surfaceTranslucent:'rgba(15,23,42,0.04)',
    iconButtonBg:     'rgba(255,255,255,0.92)',
    pillBg:           'rgba(15,23,42,0.06)',
    glassBg:          'rgba(255,255,255,0.92)',
    infoCardBg:       '#D23026',
    imdbBg:           '#F9D142',
    imdbText:         '#0A0A0A',
    divider:          'rgba(15,23,42,0.10)',
    onDark:           '#0F172A',
    onDarkMuted:      '#52606D',
    border:           'rgba(15,23,42,0.10)',
    borderSoft:       'rgba(15,23,42,0.06)',
    shadow:           'rgba(15,23,42,0.16)',
  },
};

export const getActiveThemeVars = (themeMode, darkMode) => {
  const id = themeMode === 'daylight' ? 'daylight' : 'cinema';
  const p = THEME_PALETTES[id];
  const forceDark = id === 'cinema' ? true : !darkMode;
  // The cinema mood is permanently dark; only daylight responds to the darkMode toggle.
  // Both branches emit the full set of --theme-* vars (including --bg / --text base aliases) so
  // the page surfaces visibly flip when the user toggles the theme picker.
  const baseVars = {
    '--theme-accent':              p.accent,
    '--theme-accent-alt':          p.accentAlt,
    '--theme-accent-glow':         id === 'cinema' ? 'rgba(210,48,38,0.45)' : 'rgba(37,99,235,0.30)',
    '--theme-alt-glow':            id === 'cinema' ? 'rgba(242,197,69,0.40)' : 'rgba(242,197,69,0.35)',
    '--theme-surface':             p.surface,
    '--theme-surface-alt':         p.surfaceAlt,
    '--theme-surface-hover':       p.surfaceHover,
    '--theme-surface-translucent': p.surfaceTranslucent,
    '--theme-pill-bg':             p.pillBg,
    '--theme-icon-button-bg':      p.iconButtonBg,
    '--theme-glass-bg':            p.glassBg,
    '--theme-info-card-bg':        p.infoCardBg,
    '--theme-imdb-bg':             p.imdbBg,
    '--theme-imdb-text':           p.imdbText,
    '--theme-divider':             p.divider,
    '--theme-on-dark':             p.onDark,
    '--theme-on-dark-muted':       p.onDarkMuted,
    '--theme-border':              p.border,
    '--theme-border-soft':         p.borderSoft,
    '--theme-shadow':              p.shadow,
    '--comp-card-bg':              p.surface,
    // Compat: legacy keys the rest of the JS still sets via buildSemanticThemeVars
    '--theme-bg':                  p.surfaceAlt,
    '--theme-bg-alt':              p.surface,
    '--theme-text-primary':        p.onDark,
    '--theme-text-secondary':      p.onDarkMuted,
    '--theme-text':                p.onDark,
    '--theme-text-muted':          p.onDarkMuted,
    // Page-base aliases that drive --bg/--text in :root
    '--bg':                        p.surfaceAlt,
    '--bg-alt':                    p.surface,
    '--bg-elevated':               p.surface,
    '--bg-card':                   p.surface,
    '--bg-glass':                  p.glassBg,
    '--text':                      p.onDark,
    '--text-h':                    p.onDark,
    '--text-dim':                  p.onDarkMuted,
    '--text-muted':                p.onDarkMuted,
    '--border':                    p.border,
    '--border-soft':               p.borderSoft,
    '--border-hover':              id === 'cinema' ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.18)',
    '--accent':                    p.accent,
    '--gold':                      p.accentAlt,
    '--pill-surface':              p.pillBg,
    '--surface-translucent':       p.surfaceTranslucent,
  };
  return baseVars;
};
