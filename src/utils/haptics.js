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

const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
// Resolve support at call time; browsers can expose vibration only after activation.
export const hapticsSupported = canVibrate();
export const isHapticsSupported = () => canVibrate();

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
  // Check at call time: some mobile browsers expose vibration only after the
  // page has become active, so a module-load capability snapshot can go stale.
  if (!enabled || !canVibrate()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
};

/** Refined, restrained feedback: short pulses feel crisp rather than buzzy. */
export const hapticTap = (ms = 10) => buzz(Math.min(ms, 12));
/** A slightly more defined selection pulse for meaningful choices. */
export const hapticSelect = (ms = 14) => buzz(Math.min(ms, 16));
/** A quiet two-part confirmation for completed actions. */
export const hapticSuccess = () => buzz([8, 28, 14]);
/** Clear but brief warning pulse for destructive or blocked actions. */
export const hapticWarning = () => buzz(22);
/** Barely-there scroll tick; deliberately much softer than a normal tap. */
export const hapticScroll = () => buzz(13);
/** Soft boundary pulse when the page reaches its top or bottom. */
export const hapticScrollEdge = () => buzz(8);
