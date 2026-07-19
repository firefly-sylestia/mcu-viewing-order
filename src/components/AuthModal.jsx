import React, { useState, useRef } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { configured } from '../firebase';

export default function AuthModal({ onClose, onLogin, onSignup, loading: authLoading }) {
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
      setError(err.message?.replace('Firebase: ', '') || 'Something went wrong');
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
