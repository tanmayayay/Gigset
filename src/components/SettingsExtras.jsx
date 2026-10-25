import { useEffect, useState } from 'react';
import { Copy, Share2, Bell, Mail, Ban, SlidersHorizontal } from 'lucide-react';
import { Profiles } from '../lib/api';
import { birthError } from '../lib/age';
import { Avatar } from './ui';
import { Account, Safety } from '../lib/api';
import { inviteLink } from '../lib/ref';
import { enablePush, disablePush, pushState } from '../lib/push';
import { useStore } from '../store/store';
import './growth.css';

export function InviteBlock() {
  const { pushToast } = useStore();
  const [r, setR] = useState(null);
  useEffect(() => { Account.referral().then(setR).catch(() => setR(false)); }, []);
  if (r === false) return null;
  const link = r ? inviteLink(r.code) : '';
  const copy = async () => { try { await navigator.clipboard.writeText(link); pushToast('Invite link copied.'); } catch { pushToast('Could not copy.', 'error'); } };
  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: 'Join me on Gigset', text: 'Gigset is where India’s music and live-event people connect and book each other.', url: link }); else copy(); }
    catch (e) { if (e?.name !== 'AbortError') copy(); }
  };
  return (
    <div className="settings-block">
      <h4>Invite your network</h4>
      <div className="inv-card">
        <p className="set-note" style={{ margin: 0 }}>Bring the artists, venues and organisers you work with. Everyone who joins through your link is credited to you.</p>
        {r ? (
          <>
            <div className="inv-code"><code>{r.code}</code>
              <button className="btn btn-ghost btn-sm" onClick={copy}><Copy size={14} /> Copy link</button>
              <button className="btn btn-blue btn-sm" onClick={share}><Share2 size={14} /> Share</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {r.invited > 0 ? <>You have invited <b>{r.invited}</b> {r.invited === 1 ? 'person' : 'people'}{r.recent?.length ? `, most recently ${r.recent.map((p) => p.name).slice(0, 2).join(' and ')}` : ''}.</> : 'No one has joined with your link yet.'}
            </div>
          </>
        ) : <div className="shimmer-strip" style={{ height: 44, borderRadius: 10 }} />}
      </div>
    </div>
  );
}

export function AlertsBlock() {
  const { pushToast } = useStore();
  const [p, setP] = useState(null);
  const [push, setPush] = useState('off');
  useEffect(() => {
    Account.prefs().then(setP).catch(() => setP(false));
    pushState().then(setPush);
  }, []);
  if (p === false) return null;
  const toggle = async (k) => {
    const next = !p[k];
    setP({ ...p, [k]: next });
    try { await Account.setPrefs({ [k]: next }); } catch (e) { setP({ ...p, [k]: !next }); pushToast(e.message, 'error'); }
  };
  const togglePush = async () => {
    try {
      if (push === 'on') { await disablePush(); setPush('off'); pushToast('Browser notifications turned off on this device.'); }
      else { await enablePush(); setPush('on'); pushToast('Browser notifications are on for this device.'); }
    } catch (e) { pushToast(e.message, 'error'); setPush(await pushState()); }
  };
  return (
    <div className="settings-block">
      <h4>Email &amp; browser alerts</h4>
      {!p ? <div className="shimmer-strip" style={{ height: 90, borderRadius: 10 }} /> : (
        <>
          <div className="toggle-row"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={15} /> Email me about booking requests &amp; reviews</span>
            <button className={`switch${p.emailAlerts ? ' on' : ''}`} onClick={() => toggle('emailAlerts')} aria-label="Email alerts" disabled={!p.emailAvailable} /></div>
          <div className="toggle-row"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={15} /> Weekly summary (views, followers, new gigs)</span>
            <button className={`switch${p.weeklyDigest ? ' on' : ''}`} onClick={() => toggle('weeklyDigest')} aria-label="Weekly summary" disabled={!p.emailAvailable} /></div>
          <div className="toggle-row"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Bell size={15} /> Notifications on this device (messages, requests)</span>
            <button className={`switch${push === 'on' ? ' on' : ''}`} onClick={togglePush} aria-label="Browser notifications" disabled={push === 'unsupported' || !p.pushAvailable} /></div>
          {!p.emailAvailable && <p className="set-note">Email alerts are not switched on yet.</p>}
          {push === 'unsupported' && <p className="set-note">This browser can&apos;t show notifications. On iPhone, add Gigset to your Home Screen first.</p>}
          {push === 'blocked' && <p className="set-note">Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then try again.</p>}
          {p.emailAvailable && !p.hasEmail && <p className="set-note">We don&apos;t have an email for you yet. Sign out and in again to add it.</p>}
        </>
      )}
    </div>
  );
}

export function BlockedBlock() {
  const { pushToast } = useStore();
  const [items, setItems] = useState(null);
  useEffect(() => { Safety.blocks().then((r) => setItems(r.items || [])).catch(() => setItems([])); }, []);
  if (!items?.length) return null;
  const unblock = async (p) => {
    try { await Safety.unblock(p.id); setItems((l) => l.filter((x) => x.id !== p.id)); pushToast(`Unblocked ${p.name}.`); } catch (e) { pushToast(e.message, 'error'); }
  };
  return (
    <div className="settings-block">
      <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Ban size={15} /> Blocked people</h4>
      {items.map((p) => (
        <div className="mini-list-item" key={p.id} style={{ cursor: 'default' }}>
          <Avatar name={p.name} src={p.avatarUrl} size={30} />
          <div><b>{p.name}</b><span>{[p.stakeholderType, p.city].filter(Boolean).join(' · ')}</span></div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => unblock(p)}>Unblock</button>
        </div>
      ))}
    </div>
  );
}

const LEVEL_TEXT = {
  gentle: 'Your stories are picked to be suitable for all ages.',
  teen: 'Your stories are picked to suit your age.',
  standard: 'Your stories are picked to suit a general audience.',
  open: 'You are seeing every story.',
};

export function ContentBlock() {
  const { user, refreshProfile, pushToast } = useStore();
  const c = user?.content;
  const [birth, setBirth] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user || !c) return null;
  const save = async (body, msg) => {
    setBusy(true);
    try { await Profiles.update(user.id, body); await refreshProfile(); pushToast(msg); }
    catch (e) { pushToast(e.message || 'Could not save.', 'error'); }
    finally { setBusy(false); }
  };
  const err = birthError(birth);
  return (
    <div className="settings-block">
      <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SlidersHorizontal size={15} /> Content comfort</h4>
      <p className="set-note" style={{ marginTop: 0 }}>{LEVEL_TEXT[c.level] || LEVEL_TEXT.standard}</p>
      {!c.hasBirthDate ? (
        <div className="field">
          <label htmlFor="set-birth">Add your date of birth</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input id="set-birth" type="date" value={birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirth(e.target.value)} />
            <button className="btn btn-blue btn-sm" disabled={!birth || !!err || busy} onClick={() => save({ birthDate: birth }, 'Saved. Your stories now suit your age.')}>Save</button>
          </div>
          <small style={{ color: err ? 'var(--danger, #ff6b6b)' : 'var(--text-faint)' }}>{err || 'It can only be set once and is never shown to anyone.'}</small>
        </div>
      ) : c.adult ? (
        <div className="toggle-row">
          <span>Show all stories, including strong language and mature themes</span>
          <button className={`switch${c.open ? ' on' : ''}`} aria-label="Show all stories" disabled={busy}
            onClick={() => save({ contentOpen: !c.open }, c.open ? 'Back to the general selection.' : 'Showing all stories.')} />
        </div>
      ) : null}
    </div>
  );
}
