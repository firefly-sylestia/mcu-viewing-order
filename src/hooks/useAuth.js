import { useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, configured } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    // Consume any pending redirect sign-in result on mount (fallback for popup-blocked browsers)
    getRedirectResult(auth).catch((err) => {
      console.warn('Redirect sign-in result error:', err.code);
    });
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, email: u.email } : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = useCallback(async (email, password) => {
    if (!configured) throw new Error('Firebase not configured');
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signup = useCallback(async (email, password) => {
    if (!configured) throw new Error('Firebase not configured');
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const googleSignIn = useCallback(async () => {
    if (!configured || !auth) throw new Error('Firebase not configured');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      // Fall back to redirect-based sign-in when the popup is blocked
      if (err.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider);
        // Page will navigate away — no need to throw or handle further
        return;
      }
      throw err;
    }
  }, []);

  const anonymousSignIn = useCallback(async () => {
    if (!configured) throw new Error('Firebase not configured');
    await signInAnonymously(auth);
  }, []);

  const logout = useCallback(async () => {
    if (!configured) return;
    await signOut(auth);
  }, []);

  return { user, loading, login, signup, googleSignIn, anonymousSignIn, logout, configured };
}
