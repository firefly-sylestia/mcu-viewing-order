import React, { useEffect, useState } from 'react';
import { X, LogIn, UserPlus, KeyRound } from 'lucide-react';

export default function AuthModal({ onClose, onLogin, onSignup, onResetPassword, onUpdatePassword, configured, recovery = false }) {
  const [mode, setMode] = useState(recovery ? 'update' : 'login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (recovery) setMode('update'); }, [recovery]);

  const submit = async (event) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (!configured) { setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.'); return; }
    if ((mode === 'signup' || mode === 'update') && password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    if (mode === 'update' && password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await onResetPassword(email);
        setSuccess('If an account exists for that email, a password reset link is on its way.');
      } else if (mode === 'update') {
        await onUpdatePassword(password);
        setSuccess('Your password has been updated. You are now signed in.');
        window.setTimeout(onClose, 900);
      } else if (mode === 'login') {
        await onLogin(email, password); onClose();
      } else {
        const result = await onSignup(email, password, displayName.trim());
        if (result?.needsConfirmation) {
          setSuccess('Check your inbox to confirm your email address, then come back to log in.');
          setMode('login'); setPassword('');
        } else onClose();
      }
    } catch (err) {
      setError((err?.message || 'Something went wrong. Please try again.').replace(/^AuthApiError:\s*/i, '').replace(/^Error:\s*/i, ''));
    } finally { setBusy(false); }
  };

  const title = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Choose a new password';
  const description = mode === 'login' ? 'Sign in to keep your watch progress in sync.' : mode === 'signup' ? 'Create an account with your email address.' : mode === 'forgot' ? 'We’ll email you a secure password reset link.' : 'Choose a new password for your account.';

  return (
    <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="auth-modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="detail-close" onClick={onClose} aria-label="Close"><X size={21} /></button>
        <div className="auth-header">
          <div className="auth-icon">{mode === 'signup' ? <UserPlus size={32} /> : mode === 'update' || mode === 'forgot' ? <KeyRound size={32} /> : <LogIn size={32} />}</div>
          <h2>{title}</h2><p>{description}</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && <label><span>Display name</span><input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should people see you?" required maxLength={32} autoComplete="nickname" /></label>}
          {mode !== 'update' && <label><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email" autoFocus /></label>}
          {mode !== 'forgot' && <label><span>{mode === 'update' ? 'New password' : 'Password'}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>}
          {mode === 'update' && <label><span>Confirm new password</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" required minLength={8} autoComplete="new-password" /></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          {success && <p className="auth-success" role="status">{success}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'}</button>
        </form>
        {mode !== 'update' && <p className="auth-switch">
          {mode === 'login' ? <>New here? <button type="button" onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>Create account</button>{' · '}<button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>Forgot password?</button></>
            : mode === 'forgot' ? <>Remembered it? <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Back to login</button></>
              : <>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Log in</button></>}
        </p>}
      </article>
    </div>
  );
}
