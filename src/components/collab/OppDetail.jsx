import { Check, MapPin, Wallet, CalendarDays, Clock, Music2, Lock, Users as UsersIcon, Bookmark, MessageCircle, Undo2, PartyPopper, Building2 } from 'lucide-react';
import { Modal, Tag, Avatar, Verified } from '../ui';
import { oppMeta, fmtDay, fmtTime } from '../../lib/oppMeta';

function fmtBudget(o) {
  const f = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  if (o.budgetMin != null && o.budgetMax != null) return `${f(o.budgetMin)} – ${f(o.budgetMax)}`;
  if (o.budgetMin != null) return `${f(o.budgetMin)}+`;
  if (o.budgetMax != null) return `Up to ${f(o.budgetMax)}`;
  return null;
}

/**
 * What the viewer can do with a gig, and every choice can be undone:
 *  - not applied      → Apply to perform / I'm attending
 *  - applied/attending → shows it, with an Undo
 *  - shortlisted      → "You're invited" (the buttons switch off), with "Can't make it"
 */
export function OppActions({ app, onApply, onWithdraw, busy, closed }) {
  if (!app) {
    if (closed) return <span className="opp-note">This opportunity is closed.</span>;
    return (
      <>
        <button className="btn btn-sm btn-blue" disabled={busy} onClick={() => onApply('PERFORM')}>Apply to perform</button>
        <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => onApply('ATTEND')}>I&apos;m attending</button>
      </>
    );
  }
  if (app.status === 'SHORTLISTED') {
    return (
      <>
        <span className="opp-invited"><PartyPopper size={14} /> You&apos;re invited</span>
        <button className="btn btn-sm btn-ghost" disabled={busy} onClick={onWithdraw}><Undo2 size={13} /> Can&apos;t make it</button>
      </>
    );
  }
  if (app.status === 'REJECTED') return <span className="opp-note">Not selected this time</span>;
  const attending = app.intent === 'ATTEND';
  return (
    <>
      <span className="opp-state"><Check size={14} /> {attending ? "You're attending" : 'Applied'}</span>
      <button className="btn btn-sm btn-ghost" disabled={busy} onClick={onWithdraw}>
        <Undo2 size={13} /> {attending ? 'Not attending' : 'Withdraw'}
      </button>
    </>
  );
}

function Row({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="od-row"><Icon size={16} /><div><span>{label}</span><b>{children}</b></div></div>
  );
}

export default function OppDetail({ opp, app, userId, saved, onSave, onClose, onApply, onWithdraw, busy, onProfile, onMessage, onManage }) {
  const m = oppMeta(opp);
  const budget = fmtBudget(opp);
  const poster = opp.poster;
  const isMine = poster?.id === userId;
  const extra = m.text && m.text.trim() !== (opp.description || '').trim() ? m.text : '';
  return (
    <Modal title="Event details" onClose={onClose} wide>
      <div className="od">
        <h3 className="od-title">{opp.title}</h3>
        <div className="od-tags">
          {opp.genre && <Tag color="blue">{opp.genre}</Tag>}
          {opp.city && <Tag color="sky"><MapPin size={11} /> {opp.city}</Tag>}
          <Tag color={opp.status === 'OPEN' ? 'green' : 'gray'}>{opp.status === 'OPEN' ? 'Open' : 'Closed'}</Tag>
          {opp.visibility === 'CONNECTIONS' && <Tag color="gray"><Lock size={11} /> Connections only</Tag>}
        </div>

        <div className="od-grid">
          <Row icon={CalendarDays} label="Date">{fmtDay(m.date)}</Row>
          <Row icon={Clock} label="Time">{m.time ? `${fmtTime(m.time)}${m.endTime ? ` – ${fmtTime(m.endTime)}` : ''}` : ''}</Row>
          <Row icon={Building2} label="Venue">{m.venue}</Row>
          <Row icon={MapPin} label="City">{[m.address, opp.city].filter(Boolean).join(', ')}</Row>
          <Row icon={Music2} label="Genre">{opp.genre}</Row>
          <Row icon={Wallet} label="Budget">{budget}</Row>
          <Row icon={UsersIcon} label="Interest">{`${opp._count?.applications ?? 0} ${(opp._count?.applications ?? 0) === 1 ? 'person' : 'people'} applied or attending`}</Row>
        </div>

        {poster && (
          <button className="od-poster" onClick={() => onProfile(poster.id)}>
            <Avatar name={poster.name} src={poster.avatarUrl} size={36} />
            <span>Hosted by <b>{poster.name}</b>{poster.verificationStatus === 'VERIFIED' && <Verified size={12} />}<small>{[poster.stakeholderType, poster.city].filter(Boolean).join(' · ')}</small></span>
          </button>
        )}

        {opp.description && <><h5 className="od-h">About this event</h5><p className="od-p">{opp.description}</p></>}
        {extra && <><h5 className="od-h">Requirements</h5><p className="od-p">{extra}</p></>}

        <div className="od-actions">
          <button className="btn btn-sm btn-ghost" onClick={onSave} style={saved ? { color: 'var(--amber)', borderColor: 'var(--amber)' } : undefined}>
            <Bookmark size={13} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
          </button>
          {!isMine && poster && <button className="btn btn-sm btn-ghost" onClick={() => onMessage(poster.id)}><MessageCircle size={13} /> Message host</button>}
          <span style={{ flex: 1 }} />
          {isMine
            ? <button className="btn btn-sm btn-blue" onClick={onManage}>View applicants ({opp._count?.applications ?? 0})</button>
            : <OppActions app={app} onApply={onApply} onWithdraw={onWithdraw} busy={busy} closed={opp.status !== 'OPEN'} />}
        </div>
      </div>
    </Modal>
  );
}
