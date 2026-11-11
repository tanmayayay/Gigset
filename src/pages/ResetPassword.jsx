import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ArrowRight, Link2Off, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/ui';
import './email-verified.css';

/* Where a "reset your password" email lands (#access_token=…&type=recovery).
   supabase-js has already turned that link into a signed-in session, so all that is left is choosing a new password. */
export default function ResetPassword({ onDone }) {
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => { if (live) { setValid(!!data.session); setReady(true); } });
    return () => { live = false; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.length < 6) { setError('Use at least 6 characters.'); return; }
    if (pw !== pw2) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: pw });
      if (err) throw err;
      setDone(true);
    } catch (x) {
      const m = (x?.message || '').toLowerCase();
      setError(m.includes('different from the old') ? 'Pick a password you have not used before.' : (x?.message || 'Could not update your password. Please try again.'));
    } finally { setBusy(false); }
  };

  const card = (children) => (
    <div className="ev-wrap">
      <motion.div className="ev-card" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
        <Logo />
        {children}
      </motion.div>
    </div>
  );

  if (!ready) return card(<div style={{ padding: '28px 0' }}><Loader2 className="spin" size={28} /></div>);

  if (!valid) {
    return card(
      <>
        <div className="ev-tick ev-tick--error"><Link2Off size={40} strokeWidth={2.4} /></div>
        <h1>This link has expired</h1>
        <p className="ev-lead">Password reset links only work once, for a short time.</p>
        <p className="ev-sub">Go back to sign in and choose “Forgot password?” to get a fresh one.</p>
        <button className="ev-cta" onClick={onDone}>Back to TheGigSet <ArrowRight size={18} /></button>
      </>,
    );
  }

  if (done) {
    return card(
      <>
        <div className="ev-tick"><Check size={44} strokeWidth={3.2} /></div>
        <h1>Password updated</h1>
        <p className="ev-lead">You&rsquo;re signed in with your new password.</p>
        <button className="ev-cta" onClick={onDone}>Continue to TheGigSet <ArrowRight size={18} /></button>
      </>,
    );
  }

  return card(
    <form className="rp-form" onSubmit={submit}>
      <div className="ev-tick"><KeyRound size={38} strokeWidth={2.4} /></div>
      <h1>Choose a new password</h1>
      <p className="ev-lead">Pick something you&rsquo;ll remember. At least 6 characters.</p>
      <label htmlFor="rp-1">New password</label>
      <input id="rp-1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      <label htmlFor="rp-2">Confirm password</label>
      <input id="rp-2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      {error && <p className="rp-err" role="alert">{error}</p>}
      <button className="ev-cta" type="submit" disabled={busy || !pw || !pw2}>{busy ? 'Saving…' : <>Update password <ArrowRight size={18} /></>}</button>
    </form>,
  );
}
