import React, { useState, useRef } from 'react';
import { X, LogIn, UserPlus, Eye } from 'lucide-react';
import { configured } from '../firebase';

export default function AuthModal({ onClose, onLogin, onSignup, onGoogleSignIn, onAnonymousSignIn, loading: authLoading }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!configured) { setError('Firebase not configured. Add VITE_FIREBASE_* env vars.'); return; }
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onSignup(email, password);
      onClose();
    } catch (err) {
      setError(err.message?.replace('Firebase: ', '').replace('Error ', '') || 'Something went wrong');
    }
    setBusy(false);
  };

  const handleProviderSignIn = async (fn) => {
    if (!configured) { setError('Firebase not configured. Add VITE_FIREBASE_* env vars.'); return; }
    setError('');
    setBusy(true);
    try {
      await fn();
      onClose();
    } catch (err) {
      const msg = (err.message || '').replace('Firebase: ', '').replace('Error ', '').replace(/^\(auth\//, '').replace(/[.)]+$/, '');
      if (msg.includes('popup-closed-by-user')) {
        setError('Sign-in popup was closed. Please try again.');
      } else if (msg.includes('popup-blocked')) {
        setError('Pop-up blocked. Please allow pop-ups for this site.');
      } else if (msg.includes('cancelled-popup-request') || msg.includes('popup')) {
        setError('Sign-in window was closed. Try again or use email instead.');
      } else if (msg.includes('unauthorized-domain')) {
        setError('This domain is not authorized for Google sign-in. Contact the site owner.');
      } else {
        setError(msg || 'Sign-in failed. Please try again.');
      }
    }
    setBusy(false);
  };

  return (
    <div className="detail-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <article className="auth-modal" role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Log in' : 'Sign up'}>
        <button className="detail-close" onClick={onClose} aria-label="Close"><X size={21} /></button>
        <div className="auth-header">
          <div className="auth-icon">{mode === 'login' ? <LogIn size={32} /> : <UserPlus size={32} />}</div>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p>{mode === 'login' ? 'Log in to sync your data across devices.' : 'Sign up to save your progress in the cloud.'}</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <div className="auth-divider"><span>or continue with</span></div>

        <button type="button" className="auth-google-btn" onClick={() => handleProviderSignIn(onGoogleSignIn)} disabled={busy}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{busy ? 'Signing in…' : 'Sign in with Google'}</span>
        </button>

        <button type="button" className="auth-anonymous-btn" onClick={() => handleProviderSignIn(onAnonymousSignIn)} disabled={busy}>
          <Eye size={20} />
          <span>{busy ? 'Signing in…' : 'Continue as guest'}</span>
        </button>
        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </article>
    </div>
  );
}
