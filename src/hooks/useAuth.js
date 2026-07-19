import { useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
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
    if (!configured) throw new Error('Firebase not configured');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
