import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, MessageCircle, Plus, CalendarHeart, FileText, Sparkles } from 'lucide-react';
import { Avatar, Verified, EmptyState, Modal } from '../ui';
import { Collabs } from '../../lib/api';
import { roleLabel } from '../../lib/profileSchema';
import { SLOTS, quickTimes, todayIso, vibeOf, whenText } from '../../lib/collab';
import { useStore } from '../../store/store';

const ago = (d) => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 60 ? `${Math.max(m, 1)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

/** The host says yes and shares a few times that work for them. */
function ShareTimes({ req, onClose, onDone }) {
  const { pushToast } = useStore();
  const [opts, setOpts] = useState([]);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('Evening');
  const [busy, setBusy] = useState(false);
  const add = (o) => setOpts((a) => (a.length >= 5 || a.some((x) => x.date === o.date && x.slot === o.slot) ? a : [...a, { date: o.date, slot: o.slot }]));
  const first = req.requester?.name?.split(' ')[0] || 'them';
  const go = async () => {
    setBusy(true);
    try { await Collabs.accept(req.id, opts); pushToast(`You're in. Your chat with ${first} is open.`); onDone(); onClose(); }
    catch (e) { pushToast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title={`Say yes to ${first}`} onClose={onClose}>
      <p className="cr-lead">Share a few times that work for you. {first} picks one. A chat opens for you both right away.</p>
      <div className="cr-quick">{quickTimes().map((q) => <button key={q.label} type="button" onClick={() => add(q)}><Plus size={12} />{q.label}</button>)}</div>
      <div className="cr-add">
        <input type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={slot} onChange={(e) => setSlot(e.target.value)}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</select>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!date} onClick={() => { add({ date, slot }); setDate(''); }}><Plus size={14} /> Add</button>
      </div>
      <div className="cr-chosen">{opts.length === 0 ? <span>Nothing added yet. Tap a suggestion or pick a day.</span> : opts.map((o, i) => <b key={i}>{whenText(o)}<button aria-label="Remove" onClick={() => setOpts((a) => a.filter((_, j) => j !== i))}><X size={12} /></button></b>)}</div>
      <div className="modal-actions"><button className="btn btn-ghost btn-sm" onClick={onClose}>Back</button><button className="btn btn-blue btn-sm" disabled={!opts.length || busy} onClick={go}>{busy ? 'Saving…' : 'Accept and share times'}</button></div>
    </Modal>
  );
}

/** The requester picks one of the offered times. */
function PickTime({ req, onClose, onDone }) {
  const { pushToast } = useStore();
  const [busy, setBusy] = useState(false);
  const first = req.host?.name?.split(' ')[0] || 'them';
  const pick = async (i) => {
    setBusy(true);
    try { await Collabs.choose(req.id, i); pushToast('Locked in ✨'); onDone(); onClose(); }
    catch (e) { pushToast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title={`When works for you and ${first}?`} onClose={onClose}>
      <p className="cr-lead">These are the times {first} shared. Pick one.</p>
      <div className="cr-times">{(req.options || []).map((o, i) => <button key={i} disabled={busy} onClick={() => pick(i)}><CalendarHeart size={16} />{whenText(o)}</button>)}</div>
    </Modal>
  );
}

function Card({ r, me, onAct, children }) {
  const other = r.requesterId === me ? r.host : r.requester;
  const v = vibeOf(r.vibe);
  return (
    <div className="cr-card">
      <div className="cr-top">
        <Avatar name={other?.name || '?'} src={other?.avatarUrl} size={44} />
        <div className="cr-who"><b>{other?.name}{other?.verificationStatus === 'VERIFIED' && <Verified size={13} />}</b><span>{roleLabel(other?.stakeholderType)}{other?.city ? ` · ${other.city}` : ''} · {ago(r.createdAt)}</span></div>
        <span className="cr-vibe">{v.emoji} {v.label}</span>
      </div>
      {r.note && <p className="cr-note">“{r.note}”</p>}
      {children}
    </div>
  );
}

export default function CollabRequests({ onChange }) {
  const { userId, pushToast } = useStore();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [share, setShare] = useState(null);
  const [pick, setPick] = useState(null);
  const load = useCallback(() => Collabs.list().then((r) => { setItems(r.items); onChange?.(r.todo); }).catch((e) => { pushToast(e.message, 'error'); setItems([]); }), [pushToast, onChange]);
  useEffect(() => { load(); }, [load]);
  const act = async (fn, ok) => { try { await fn(); if (ok) pushToast(ok); load(); } catch (e) { pushToast(e.message, 'error'); } };
  if (!items) return <div className="shimmer-strip" style={{ height: 160, borderRadius: 14, marginTop: 14 }} />;

  const incoming = items.filter((r) => r.hostId === userId && r.status === 'PENDING');
  const toPick = items.filter((r) => r.requesterId === userId && r.status === 'OFFERED');
  const waiting = items.filter((r) => (r.requesterId === userId && r.status === 'PENDING') || (r.hostId === userId && r.status === 'OFFERED'));
  const planned = items.filter((r) => r.status === 'SCHEDULED');
  const past = items.filter((r) => ['DECLINED', 'CANCELLED'].includes(r.status)).slice(0, 6);
  const chat = (r) => r.conversationId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/messages?c=${r.conversationId}`)}><MessageCircle size={14} /> Open chat</button>;
  const epk = (r) => r.requesterId !== userId && <a className="btn btn-ghost btn-sm" href={`#/epk/${r.requesterId}?t=${r.epkTemplate}`} target="_blank" rel="noopener noreferrer"><FileText size={14} /> Press kit</a>;

  if (!items.length) return <EmptyState icon={<Sparkles size={22} />} title="No collab requests yet" text="Find someone you vibe with, hit Collab, and it will show up here." />;
  return (
    <div className="cr">
      {incoming.length > 0 && <section><h4>Asking to collab with you</h4>{incoming.map((r) => (
        <Card key={r.id} r={r} me={userId}>
          <div className="cr-act">{epk(r)}<button className="btn btn-ghost btn-sm" onClick={() => act(() => Collabs.decline(r.id), 'No worries, we let them know kindly.')}><X size={14} /> Not now</button><button className="btn btn-blue btn-sm" onClick={() => setShare(r)}><Check size={14} /> Accept</button></div>
        </Card>))}</section>}
      {toPick.length > 0 && <section><h4>They said yes. Pick a time</h4>{toPick.map((r) => (
        <Card key={r.id} r={r} me={userId}>
          <div className="cr-act">{chat(r)}<button className="btn btn-blue btn-sm" onClick={() => setPick(r)}><CalendarHeart size={14} /> Choose a time</button></div>
        </Card>))}</section>}
      {planned.length > 0 && <section><h4>Locked in</h4>{planned.map((r) => (
        <Card key={r.id} r={r} me={userId}>
          <p className="cr-when"><CalendarHeart size={15} /> {whenText(r.chosen)}</p>
          <div className="cr-act">{chat(r)}<button className="btn btn-ghost btn-sm" onClick={() => act(() => Collabs.cancel(r.id), 'Cancelled.')}>Cancel</button></div>
        </Card>))}</section>}
      {waiting.length > 0 && <section><h4>Waiting</h4>{waiting.map((r) => (
        <Card key={r.id} r={r} me={userId}>
          <p className="cr-wait">{r.status === 'PENDING' ? 'Waiting for them to reply.' : 'Waiting for them to pick one of your times.'}</p>
          <div className="cr-act">{chat(r)}<button className="btn btn-ghost btn-sm" onClick={() => act(() => Collabs.cancel(r.id), 'Cancelled.')}>Cancel</button></div>
        </Card>))}</section>}
      {past.length > 0 && <section className="cr-past"><h4>Earlier</h4>{past.map((r) => (
        <Card key={r.id} r={r} me={userId}><p className="cr-wait">{r.status === 'DECLINED' ? 'Not this time.' : 'Cancelled.'}</p></Card>))}</section>}
      {share && <ShareTimes req={share} onClose={() => setShare(null)} onDone={load} />}
      {pick && <PickTime req={pick} onClose={() => setPick(null)} onDone={load} />}
    </div>
  );
}
