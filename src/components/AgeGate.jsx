import { useState } from 'react';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { Logo } from './ui';
import { Profiles } from '../lib/api';
import { birthError, ageOf, MIN_AGE } from '../lib/age';
import { useStore } from '../store/store';
import './agegate.css';

/**
 * The very first thing after signing in: how old are you? We use it to keep what each person sees suited to their age.
 * It blocks the rest of the app until it is saved (the date is stored once and never shown to anyone).
 */
export default function AgeGate() {
  const { userId, refreshProfile, signOut, pushToast } = useStore();
  const [birth, setBirth] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const err = birthError(birth);
  const tooYoung = !!birth && ageOf(birth) != null && ageOf(birth) >= 0 && ageOf(birth) < MIN_AGE;
  const today = new Date().toISOString().slice(0, 10);

  const save = async (e) => {
    e.preventDefault();
    if (!birth || err || !confirm || busy) return;
    setBusy(true);
    try {
      await Profiles.update(userId, { birthDate: birth });
      await refreshProfile();
    } catch (x) {
      pushToast(x.message || 'Could not save your birth date.', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="ag-root" role="dialog" aria-modal="true" aria-labelledby="ag-title">
      <form className="ag-card" onSubmit={save}>
        <Logo size={26} />
        <div className="ag-icon"><ShieldCheck size={22} /></div>
        <h1 id="ag-title">First, when were you born?</h1>
        <p className="ag-lead">TheGigSet shows different content to different ages, so we need your date of birth before anything else. It is never shown to anyone.</p>
        <label className="ag-label" htmlFor="ag-birth"><CalendarDays size={14} /> Date of birth</label>
        <input id="ag-birth" type="date" value={birth} max={today} min="1900-01-01" onChange={(e) => { setBirth(e.target.value); setConfirm(false); }} autoComplete="bday" autoFocus />
        {err && <p className="ag-err" role="alert">{err}</p>}
        {tooYoung ? (
          <p className="ag-err" role="alert">You need to be {MIN_AGE} or older to use TheGigSet. Come back when you are!</p>
        ) : (
          <label className="ag-check">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} disabled={!birth || !!err} />
            <span>This is my real date of birth. I understand I can&apos;t change it later.</span>
          </label>
        )}
        <button className="btn btn-blue ag-go" type="submit" disabled={!birth || !!err || !confirm || busy || tooYoung}>{busy ? 'Saving…' : 'Continue'}</button>
        <button type="button" className="ag-out" onClick={() => signOut()}>Sign out</button>
      </form>
    </div>
  );
}
