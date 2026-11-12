import { useState, useEffect, useCallback } from 'react';
import {
  configured, readSession, saveSession, getValidSession, signUpWithEmail,
  signInWithEmail, signOut, sendPasswordReset, changePassword,
  consumeRecoverySession, hydrateRecoverySession,
} from '../supabase';

export function useAuth() {
  const initial = readSession();
  const [user, setUser] = useState(initial?.user?.id ? { id: initial.user.id, uid: initial.user.id, email: initial.user.email } : null);
  const [loading, setLoading] = useState(configured);
  const [recovery, setRecovery] = useState(false);

  const applySession = useCallback((session) => {
    saveSession(session);
    setUser(session?.user?.id ? { id: session.user.id, uid: session.user.id, email: session.user.email, displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || '' } : null);
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return undefined; }
    let alive = true;
    const isRecovery = consumeRecoverySession();
    if (isRecovery) setRecovery(true);
    (async () => {
      try {
        let session = await getValidSession();
        if (isRecovery) session = await hydrateRecoverySession();
        if (alive) applySession(session);
      } catch (error) {
        console.warn('Supabase session restore failed:', error.message);
        if (alive) applySession(null);
      } finally { if (alive) setLoading(false); }
    })();
    const onStorage = (event) => {
      if (event.key !== 'mcu-supabase-session-v1') return;
      try { if (alive) applySession(event.newValue ? JSON.parse(event.newValue) : null); } catch { /* Ignore malformed storage events. */ }
    };
    window.addEventListener('storage', onStorage);
    const refreshTimer = window.setInterval(async () => {
      try { const next = await getValidSession(); if (alive && next) applySession(next); }
      catch { if (alive) applySession(null); }
    }, 45_000);
    return () => { alive = false; window.removeEventListener('storage', onStorage); window.clearInterval(refreshTimer); };
  }, [applySession]);

  const login = useCallback(async (email, password) => {
    const session = await signInWithEmail(email.trim(), password);
    applySession(session); setRecovery(false);
  }, [applySession]);
  const signup = useCallback(async (email, password, displayName = '') => {
    const result = await signUpWithEmail(email.trim(), password, displayName.trim());
    if (result.session) applySession(result.session);
    return result;
  }, [applySession]);
  const logout = useCallback(async () => {
    try { await signOut(); } finally { applySession(null); setRecovery(false); }
  }, [applySession]);
  const resetPassword = useCallback((email) => sendPasswordReset(email.trim()), []);
  const updatePassword = useCallback(async (password) => {
    await changePassword(password);
    const session = await getValidSession();
    applySession(session); setRecovery(false);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [applySession]);

  return { user, loading, login, signup, logout, resetPassword, updatePassword, configured, recovery };
}
