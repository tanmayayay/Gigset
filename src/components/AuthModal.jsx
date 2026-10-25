import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { useStore } from '../store/store';
import { isSupabaseConfigured } from '../lib/supabase';
import { Logo } from './ui';

/**
 * Real sign-in / sign-up via Supabase Auth (email + password).
 * Props: { open: bool, onClose: fn, initialTab?: 'signin' | 'signup' }
 */
export default function AuthModal({ open, onClose, initialTab = 'signin' }) {
  const { signIn, signUp, pushToast } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checkEmail, setCheckEmail] = useState(false);

  // Whenever the modal is opened, reset to the requested tab.
  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError('');
      setCheckEmail(false);
      setBusy(false);
    }
  }, [open, initialTab]);

  const reset = () => {
    setError('');
    setCheckEmail(false);
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (tab === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (tab === 'signin') {
        await signIn(email.trim(), password);
        pushToast('Welcome back to Gigset.');
        close();
        navigate('/home');
      } else {
        const data = await signUp(email.trim(), password);
        if (data.session) {
          // Email auto-confirmed (or confirmation disabled) — straight to onboarding.
          pushToast('Account created — tell us who you are.');
          close();
          navigate('/onboarding');
        } else {
          // Confirmation email sent — user verifies, then signs in.
          setCheckEmail(true);
        }
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="auth-modal"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Sign in to Gigset"
          >
            <button className="close-x auth-close" onClick={close} aria-label="Close">×</button>
            <div className="auth-brand"><Logo size={30} /></div>
            <h3>{tab === 'signin' ? 'Welcome back to Gigset' : 'Join Gigset'}</h3>
            <p className="auth-sub">
              {tab === 'signin'
                ? 'Sign in to your network, gigs and messages.'
                : 'Create your account — then set up your profile.'}
            </p>

            {!isSupabaseConfigured && (
              <p className="auth-fine" style={{ color: 'var(--danger, #c0392b)' }}>
                Auth is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.
              </p>
            )}

            <div className="auth-tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'signin'} className={tab === 'signin' ? 'active' : ''} onClick={() => { setTab('signin'); reset(); }}>
                <Mail size={14} /> Sign in
              </button>
              <button role="tab" aria-selected={tab === 'signup'} className={tab === 'signup' ? 'active' : ''} onClick={() => { setTab('signup'); reset(); }}>
                <UserPlus size={14} /> Create account
              </button>
            </div>

            {checkEmail ? (
              <div>
                <p className="auth-sub" style={{ marginTop: 8 }}>
                  We sent a confirmation link to <b>{email}</b>. Click it, then sign in here.
                </p>
                <button className="btn btn-ghost auth-submit" onClick={() => { setTab('signin'); reset(); }}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="field">
                  <label htmlFor="auth-email">Email address</label>
                  <input id="auth-email" type="email" placeholder="you@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="field">
                  <label htmlFor="auth-pass">Password</label>
                  <input id="auth-pass" type="password" placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} />
                </div>
                {error && <p className="auth-fine" style={{ color: 'var(--danger, #c0392b)' }}>{error}</p>}
                <button type="submit" className="btn btn-blue auth-submit" disabled={busy || !isSupabaseConfigured}>
                  {busy ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />}
                  {tab === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              </form>
            )}

            <p className="auth-fine">Real accounts — your profile, posts, gigs and messages are stored securely.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function friendlyAuthError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Wrong email or password. Try again, or create an account.';
  if (msg.includes('user already registered')) return 'This email already has an account — sign in instead.';
  if (msg.includes('email not confirmed')) return 'Please confirm your email first (check your inbox), then sign in.';
  if (msg.includes('password')) return err.message;
  return err?.message || 'Something went wrong. Please try again.';
}
