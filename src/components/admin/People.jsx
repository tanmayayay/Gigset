import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, BadgeCheck, ShieldOff, ShieldCheck, Crown, Star, Send, Trash2, ExternalLink, X } from 'lucide-react';
import { Avatar, Modal } from '../ui';
import { Admin } from '../../lib/api';
import { roleLabel } from '../../lib/profileSchema';
import { useStore } from '../../store/store';

const FILTERS = [['', 'Everyone'], ['new', 'New this week'], ['pending', 'Wants verification'], ['verified', 'Verified'], ['founding', 'Founding members'], ['suspended', 'Suspended'], ['admins', 'Admins']];
const when = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function Confirm({ title, text, action, danger, onYes, onClose, children }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ margin: '0 0 12px', color: 'var(--text-dim)', fontSize: 14 }}>{text}</p>
      {children}
      <div className="modal-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-blue'}`} disabled={busy} onClick={async () => { setBusy(true); try { await onYes(); } finally { setBusy(false); } }}>{busy ? 'Working…' : action}</button>
      </div>
    </Modal>
  );
}

function Detail({ id, onClose, onChanged }) {
  const { pushToast, userId } = useStore();
  const [u, setU] = useState(null);
  const [ask, setAsk] = useState(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState({ title: '', body: '' });
  const load = useCallback(() => Admin.user(id).then(setU).catch((e) => pushToast(e.message, 'error')), [id, pushToast]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn, ok) => { try { await fn(); pushToast(ok); await load(); onChanged(); setAsk(null); } catch (e) { pushToast(e.message, 'error'); } };
  if (!u) return <Modal title="Person" onClose={onClose}><div className="shimmer-strip" style={{ height: 160, borderRadius: 12 }} /></Modal>;
  const me = u.id === userId;
  return (
    <Modal title={u.name} onClose={onClose} wide>
      <div className="ad-person">
        <Avatar name={u.name} src={u.avatarUrl} size={56} />
        <div>
          <b>{u.name}</b>
          <span>{roleLabel(u.stakeholderType)}{u.city ? ` · ${u.city}` : ''} · joined {when(u.createdAt)}</span>
          <span>{u.email || 'No email on file'}{u.lastActive ? ` · last seen ${u.lastActive}` : ''}</span>
          <div className="ad-badges">
            {u.role === 'ADMIN' && <i className="gold">Admin</i>}{u.verificationStatus === 'VERIFIED' && <i className="blue">Verified</i>}{u.verificationStatus === 'PENDING' && <i>Wants verification</i>}
            {u.foundingMember && <i className="gold">Founding member</i>}{u.suspendedAt && <i className="red">Suspended</i>}
          </div>
        </div>
        <Link className="btn btn-ghost btn-sm" to={`/profile/${u.id}`}><ExternalLink size={14} /> Open profile</Link>
      </div>
      {u.suspendedAt && <p className="ad-note">Suspended: {u.suspendReason}</p>}
      {u.bio && <p className="ad-bio">{u.bio}</p>}
      <div className="ad-mini">{[['Posts', u._count.posts], ['Followers', u._count.followers], ['Following', u._count.following], ['Bookings sent', u._count.bookingsRequested], ['Bookings received', u._count.bookingsHosted], ['Reports they made', u._count.reportsMade]].map(([l, v]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      {u.reportsAgainst.length > 0 && <><h4 className="ad-h4">Reports against them ({u.reportsAgainst.length})</h4>{u.reportsAgainst.map((r) => <p key={r.id} className="ad-line"><b>{r.reason}</b> {r.details || ''}<span>{r.status}</span></p>)}</>}
      {u.recentPosts.length > 0 && <><h4 className="ad-h4">Latest posts</h4>{u.recentPosts.map((p) => <p key={p.id} className="ad-line">{p.body.slice(0, 120)}<span>{when(p.createdAt)}</span></p>)}</>}

      <h4 className="ad-h4">What do you want to do?</h4>
      <div className="ad-actions">
        {u.verificationStatus === 'VERIFIED'
          ? <button className="btn btn-ghost btn-sm" onClick={() => run(() => Admin.userAction(u.id, 'verify', { status: 'UNVERIFIED' }), 'Badge removed.')}><BadgeCheck size={14} /> Remove badge</button>
          : <button className="btn btn-blue btn-sm" onClick={() => run(() => Admin.userAction(u.id, 'verify', { status: 'VERIFIED' }), 'Verified.')}><BadgeCheck size={14} /> Give verified badge</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => run(() => Admin.userAction(u.id, 'founding', { on: !u.foundingMember }), u.foundingMember ? 'Removed.' : 'Marked as founding member.')}><Star size={14} /> {u.foundingMember ? 'Remove founding badge' : 'Make founding member'}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setAsk('message')}><Send size={14} /> Send a message</button>
        {!me && (u.role === 'ADMIN'
          ? <button className="btn btn-ghost btn-sm" onClick={() => setAsk('demote')}><Crown size={14} /> Remove admin access</button>
          : <button className="btn btn-ghost btn-sm" onClick={() => setAsk('promote')}><Crown size={14} /> Make admin</button>)}
        {!me && u.role !== 'ADMIN' && (u.suspendedAt
          ? <button className="btn btn-blue btn-sm" onClick={() => run(() => Admin.userAction(u.id, 'unsuspend'), 'Account restored.')}><ShieldCheck size={14} /> Restore account</button>
          : <button className="btn btn-danger btn-sm" onClick={() => setAsk('suspend')}><ShieldOff size={14} /> Suspend</button>)}
        {!me && u.role !== 'ADMIN' && <button className="btn btn-danger btn-sm" onClick={() => setAsk('delete')}><Trash2 size={14} /> Delete account</button>}
      </div>

      {ask === 'suspend' && <Confirm title={`Suspend ${u.name}?`} text="They are signed out and cannot use Gigset until you restore them. Their posts stay up." action="Suspend" danger onClose={() => setAsk(null)} onYes={() => run(() => Admin.userAction(u.id, 'suspend', { reason: text }), 'Suspended.')}>
        <input className="ad-input" placeholder="Reason (they will see this)" value={text} onChange={(e) => setText(e.target.value)} /></Confirm>}
      {ask === 'delete' && <Confirm title={`Delete ${u.name} for good?`} text={`This permanently removes their account, posts, messages and bookings. It cannot be undone. Type their name (${u.name}) to confirm.`} action="Delete forever" danger onClose={() => setAsk(null)} onYes={async () => { try { await Admin.deleteUser(u.id, text); pushToast('Account deleted.'); onChanged(); onClose(); } catch (e) { pushToast(e.message, 'error'); } }}>
        <input className="ad-input" placeholder="Type their name" value={text} onChange={(e) => setText(e.target.value)} /></Confirm>}
      {ask === 'promote' && <Confirm title={`Make ${u.name} an admin?`} text="They will be able to do everything you can in this console, including suspending people and deleting content." action="Make admin" onClose={() => setAsk(null)} onYes={() => run(() => Admin.userAction(u.id, 'role', { role: 'ADMIN' }), 'They are now an admin.')} />}
      {ask === 'demote' && <Confirm title={`Remove ${u.name}'s admin access?`} text="They keep their normal account." action="Remove access" onClose={() => setAsk(null)} onYes={() => run(() => Admin.userAction(u.id, 'role', { role: 'USER' }), 'Admin access removed.')} />}
      {ask === 'message' && <Confirm title={`Message ${u.name}`} text="They will get a notification in the app." action="Send" onClose={() => setAsk(null)} onYes={() => run(() => Admin.userAction(u.id, 'message', msg), 'Sent.')}>
        <input className="ad-input" placeholder="Title" value={msg.title} onChange={(e) => setMsg({ ...msg, title: e.target.value })} /><textarea className="ad-input" placeholder="Message" value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} /></Confirm>}
    </Modal>
  );
}

export default function People({ preset }) {
  const { pushToast } = useStore();
  const [q, setQ] = useState(preset?.search || '');
  const [filter, setFilter] = useState(preset?.filter || '');
  const [type, setType] = useState(preset?.type || '');
  const [data, setData] = useState(null);
  const [skip, setSkip] = useState(0);
  const [open, setOpen] = useState(null);
  const take = 25;
  const load = useCallback(() => {
    Admin.users({ search: q, filter, type, take, skip }).then(setData).catch((e) => pushToast(e.message, 'error'));
  }, [q, filter, type, skip, pushToast]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const reset = (fn) => (v) => { fn(v); setSkip(0); };
  return (
    <div className="ad-stack">
      <div className="ad-row-head"><div><h2>People</h2><p>Everyone who has signed up. Click a person to verify, message, suspend or remove them.</p></div>
        <button className="btn btn-ghost btn-sm" onClick={() => Admin.exportUsers().catch((e) => pushToast(e.message, 'error'))}><Download size={14} /> Download list (CSV)</button></div>
      <div className="ad-filters">
        <span className="ad-search"><Search size={15} /><input className="ad-input" placeholder="Search by name, email or city" value={q} onChange={(e) => reset(setQ)(e.target.value)} /></span>
        <select className="ad-input" value={type} onChange={(e) => reset(setType)(e.target.value)}><option value="">All roles</option>{['PERFORMER', 'VENUE', 'BUYER', 'CREW', 'INSTITUTION'].map((t) => <option key={t} value={t}>{roleLabel(t)}</option>)}</select>
      </div>
      <div className="ad-chips">{FILTERS.map(([v, l]) => <button key={v} className={filter === v ? 'on' : ''} onClick={() => reset(setFilter)(v)}>{l}</button>)}{(type || q || filter) && <button onClick={() => { setQ(''); setFilter(''); setType(''); setSkip(0); }}><X size={12} /> Clear</button>}</div>
      <div className="ad-table">
        {!data ? <div className="shimmer-strip" style={{ height: 200, borderRadius: 12 }} /> : data.items.length === 0 ? <p className="ad-empty">Nobody matches.</p> : data.items.map((u) => (
          <button key={u.id} className="ad-trow" onClick={() => setOpen(u.id)}>
            <Avatar name={u.name} src={u.avatarUrl} size={36} />
            <span className="ad-tmain"><b>{u.name}</b><i>{u.email || 'no email'}</i></span>
            <span className="ad-tcol">{roleLabel(u.stakeholderType)}<i>{u.city || '—'}</i></span>
            <span className="ad-tcol">{u._count.posts} posts<i>{u._count.followers} followers</i></span>
            <span className="ad-tcol">{when(u.createdAt)}</span>
            <span className="ad-badges">{u.role === 'ADMIN' && <i className="gold">Admin</i>}{u.verificationStatus === 'VERIFIED' && <i className="blue">Verified</i>}{u.verificationStatus === 'PENDING' && <i>Pending</i>}{u.suspendedAt && <i className="red">Suspended</i>}</span>
          </button>
        ))}
      </div>
      {data && data.total > take && <div className="ad-pager"><button className="btn btn-ghost btn-sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - take))}>Previous</button><span>{skip + 1}–{Math.min(skip + take, data.total)} of {data.total}</span><button className="btn btn-ghost btn-sm" disabled={skip + take >= data.total} onClick={() => setSkip(skip + take)}>Next</button></div>}
      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
