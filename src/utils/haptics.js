/**
 * Lightweight haptic feedback.
 *
 * Android WebView (and most mobile browsers) expose `navigator.vibrate`, so the
 * app can give tactile confirmation without shipping a native plugin. The
 * preference is persisted under `haptics-enabled` and defaults to on for
 * touch-first devices.
 */

const STORAGE_KEY = 'haptics-enabled';

const readPreference = () => {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'off') return false;
    if (stored === 'on') return true;
  } catch {
    /* storage can be unavailable in private modes */
  }
  if (typeof navigator === 'undefined') return false;
  return Boolean(navigator.vibrate) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

let enabled = readPreference();

export const hapticsSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const getHapticsEnabled = () => enabled;

export const setHapticsEnabled = (next) => {
  enabled = Boolean(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* ignore persistence failures */
  }
  if (enabled) buzz(10);
  return enabled;
};

const buzz = (pattern) => {
  if (!enabled || !hapticsSupported) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* vibration is best-effort */
  }
};

/** Soft confirmation for taps, chips, tabs and toggles. */
export const hapticTap = (ms = 8) => buzz(ms);
/** Slightly stronger confirmation for saving / completing an action. */
export const hapticSelect = (ms = 14) => buzz(ms);
/** Two-beat pulse for success states (marked watched, bookmarked, synced). */
export const hapticSuccess = () => buzz([12, 40, 22]);
/** Single longer buzz for destructive or blocked actions. */
export const hapticWarning = () => buzz(34);
