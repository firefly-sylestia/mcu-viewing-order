/**
 * Theme settings — centralized so palettes can be edited without touching App logic.
 *
 * Two core moods:
 *   • cinema  — primary, dark, Marvel red (#EC1D24) accent, gold (#F5C518) ratings.
 *   • daylight — secondary, light, blue (#2563EB) accent. Calm alternative.
 */

export const THEME_CHOICES = [
  { id: 'cinema',   swatch: '#EC1D24', label: 'Cinema',   dcLabel: 'Cinema' },
  { id: 'daylight', swatch: '#2563EB', label: 'Daylight', dcLabel: 'Daylight' },
];

export const THEME_PALETTES = {
  cinema: {
    accent:              '#EC1D24',       // primary CTA + info card
    accentAlt:           '#F5C518',       // gold / IMDB / ratings
    surface:             '#111116',       // card / panel bg
    surfaceAlt:          '#06050A',       // page bg (deepest layer)
    surfaceHover:        '#1C1C24',       // hover states
    surfaceTranslucent:  'rgba(255,255,255,0.05)',
    iconButtonBg:        'rgba(0,0,0,0.50)',
    pillBg:              'rgba(255,255,255,0.07)',
    glassBg:             'rgba(17,17,22,0.94)',
    infoCardBg:          '#EC1D24',
    imdbBg:              '#F5C518',
    imdbText:            '#0D0D0F',
    divider:             '#1E1E28',
    onDark:              '#F2F2F7',
    onDarkMuted:         '#B8BAC2',
    border:              'rgba(255,255,255,0.07)',
    borderSoft:          'rgba(255,255,255,0.05)',
    shadow:              'rgba(0,0,0,0.55)',
  },
  daylight: {
    accent:              '#2563EB',
    accentAlt:           '#F5C518',
    surface:             '#FFFFFF',
    surfaceAlt:          '#F4F5F8',
    surfaceHover:        '#F8F9FB',
    surfaceTranslucent:  'rgba(15,23,42,0.04)',
    iconButtonBg:        'rgba(255,255,255,0.92)',
    pillBg:              'rgba(15,23,42,0.06)',
    glassBg:             'rgba(255,255,255,0.90)',
    infoCardBg:          '#2563EB',
    imdbBg:              '#F5C518',
    imdbText:            '#0F172A',
    divider:             'rgba(15,23,42,0.10)',
    onDark:              '#0F172A',
    onDarkMuted:         '#52606D',
    border:              'rgba(15,23,42,0.08)',
    borderSoft:          'rgba(15,23,42,0.06)',
    shadow:              'rgba(15,23,42,0.12)',
  },
};

export const getActiveThemeVars = (themeMode, darkMode) => {
  const id = themeMode === 'daylight' ? 'daylight' : 'cinema';
  const p = THEME_PALETTES[id];
  const forceDark = id === 'cinema' ? true : !darkMode;

  const baseVars = {
    '--theme-accent':              p.accent,
    '--theme-accent-alt':          p.accentAlt,
    '--theme-accent-glow':         id === 'cinema'
      ? 'rgba(236,29,36,0.55)'
      : 'rgba(37,99,235,0.30)',
    '--theme-alt-glow':            id === 'cinema'
      ? 'rgba(245,197,24,0.45)'
      : 'rgba(245,197,24,0.30)',
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

    // Status background tint
    '--theme-watched-bg':          id === 'cinema'
      ? 'rgba(34,197,94,0.14)'
      : 'rgba(22,163,74,0.10)',

    // Page-base aliases
    '--bg':                        p.surfaceAlt,
    '--bg-alt':                    p.surface,
    '--bg-elevated':               p.surfaceHover,
    '--bg-card':                   p.surface,
    '--bg-glass':                  p.glassBg,
    '--text':                      p.onDark,
    '--text-h':                    p.onDark,
    '--text-dim':                  p.onDarkMuted,
    '--text-muted':                p.onDarkMuted,
    '--border':                    p.border,
    '--border-soft':               p.borderSoft,
    '--border-hover':              id === 'cinema'
      ? 'rgba(255,255,255,0.20)'
      : 'rgba(15,23,42,0.16)',
    '--accent':                    p.accent,
    '--gold':                      p.accentAlt,
    '--pill-surface':              p.pillBg,
    '--surface-translucent':       p.surfaceTranslucent,

    // Theme-aware aliases
    '--theme-bg':                  p.surfaceAlt,
    '--theme-bg-alt':              p.surface,
    '--theme-text':                p.onDark,
    '--theme-text-primary':        p.onDark,
    '--theme-text-secondary':      p.onDarkMuted,
    '--theme-text-muted':          p.onDarkMuted,
  };
  return baseVars;
};
