const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const SESSION_KEY = 'mcu-supabase-session-v1';

export function readSession() {
  try { const value = localStorage.getItem(SESSION_KEY); return value ? JSON.parse(value) : null; }
  catch { return null; }
}
export function saveSession(session) {
  try { if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); }
  catch (error) { console.warn('Unable to persist Supabase session:', error); }
}
function makeError(payload, fallback) {
  return new Error(payload?.msg || payload?.message || payload?.error_description || payload?.error || fallback || 'Supabase request failed.');
}
async function request(path, options = {}, token) {
  if (!configured) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw makeError(payload, `Supabase request failed (${response.status}).`);
  return payload;
}
function normalizeSession(payload) {
  if (!payload?.access_token || !payload?.user) return null;
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type || 'bearer',
    expires_at: payload.expires_at || Math.floor(Date.now() / 1000) + (payload.expires_in || 3600),
    user: payload.user,
  };
}
let refreshPromise = null;
export async function getValidSession() {
  let session = readSession();
  if (!session?.access_token) return null;
  if (session.expires_at * 1000 > Date.now() + 60_000) return session;
  if (!session.refresh_token) { saveSession(null); return null; }
  if (!refreshPromise) {
    refreshPromise = request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }),
    }).then((payload) => {
      session = normalizeSession(payload); saveSession(session); return session;
    }).catch((error) => { saveSession(null); throw error; }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}
export async function signUpWithEmail(email, password, displayName = '') {
  const payload = await request('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password, data: { display_name: displayName } }) });
  const session = normalizeSession(payload);
  if (session) saveSession(session);
  return { session, needsConfirmation: !session };
}
export async function signInWithEmail(email, password) {
  const payload = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
  const session = normalizeSession(payload);
  if (!session) throw new Error('Sign-in succeeded but no session was returned.');
  saveSession(session); return session;
}
export async function signOut() {
  const session = await getValidSession().catch(() => null);
  try { if (session?.access_token) await request('/auth/v1/logout', { method: 'POST' }, session.access_token); }
  finally { saveSession(null); }
}
export async function sendPasswordReset(email) {
  await request(`/auth/v1/recover?redirect_to=${encodeURIComponent(`${window.location.origin}/?auth=reset`)}`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
export async function changePassword(password) {
  const session = await getValidSession();
  if (!session?.access_token) throw new Error('Your reset link has expired. Request a new password reset email.');
  const payload = await request('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) }, session.access_token);
  if (payload) saveSession({ ...session, user: payload });
  return payload;
}
export async function supabaseDataRequest(path, options = {}) {
  const session = await getValidSession();
  if (!session?.access_token) throw new Error('Please sign in again to sync your data.');
  return request(path, options, session.access_token);
}
export function consumeRecoverySession() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (params.get('type') !== 'recovery' || !params.get('access_token')) return false;
  saveSession({
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    token_type: params.get('token_type') || 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + Number(params.get('expires_in') || 3600),
    user: readSession()?.user || null,
  });
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return true;
}
export async function hydrateRecoverySession() {
  const session = readSession();
  if (!session?.access_token || session.user?.id) return session;
  const user = await request('/auth/v1/user', {}, session.access_token);
  const next = { ...session, user }; saveSession(next); return next;
}
