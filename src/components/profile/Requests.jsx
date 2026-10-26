import { CalendarCheck, Check, X, Share2, FileText } from 'lucide-react';
import { Tag } from '../ui';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const STATUS_TAG = { PENDING: 'amber', CONFIRMED: 'green', CANCELLED: 'gray' };

function parts(date) {
  const [, m, d] = String(date).slice(0, 10).split('-').map(Number);
  return { d: d || '–', m: MONTHS[(m || 1) - 1] };
}

function Row({ b, who, incoming, onStatus, hot, onShare }) {
  const { d, m } = parts(b.date);
  return (
    <div className={`pf-reqrow${hot ? ' hot' : ''}`}>
      <div className="pf-reqdate"><b>{d}</b><span>{m}</span></div>
      <div className="pf-reqmain">
        <b>{who}</b>
        <div>{[b.timeSlot, b.budget].filter(Boolean).join(' · ') || 'No details added'}</div>
        {b.message && <q>{b.message}</q>}
        {incoming && b.requester?.id && <a className="pf-epklink" href={`#/epk/${b.requester.id}?t=${b.epkTemplate || 'classic'}`} target="_blank" rel="noopener noreferrer"><FileText size={13} /> View their press kit</a>}
      </div>
      {b.status === 'PENDING' ? (
        <div className="pf-reqbtns">
          {incoming && <button className="btn btn-blue btn-sm" onClick={() => onStatus(b, 'CONFIRMED')}><Check size={14} /> Accept</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => onStatus(b, 'CANCELLED')}><X size={14} /> {incoming ? 'Decline' : 'Cancel'}</button>
        </div>
      ) : (
        <div className="pf-reqbtns">
          <Tag color={STATUS_TAG[b.status] || 'gray'}>{b.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}</Tag>
          {b.status === 'CONFIRMED' && incoming && onShare && <button className="btn btn-ghost btn-sm" onClick={() => onShare(b)}><Share2 size={14} /> Share</button>}
        </div>
      )}
    </div>
  );
}

/** Everything that needs the owner's reply, then confirmed gigs, then requests they sent. */
export default function Requests({ received, sent, onStatus, loading, onShare }) {
  const waiting = received.filter((b) => b.status === 'PENDING');
  const confirmed = received.filter((b) => b.status === 'CONFIRMED');
  const past = received.filter((b) => b.status === 'CANCELLED');

  if (loading) return <div className="pf-card"><div className="shimmer-strip" style={{ height: 110, borderRadius: 12 }} /></div>;

  return (
    <>
      <div className="pf-reqgroup">
        <h4>Needs your reply {waiting.length > 0 && <Tag color="amber">{waiting.length}</Tag>}</h4>
        {waiting.length === 0 ? (
          <div className="pf-card pf-empty" style={{ margin: 0 }}>
            <b>You&apos;re all caught up</b>
            Booking requests from artists, venues and organisers will land here.
          </div>
        ) : waiting.map((b) => <Row key={b.id} b={b} hot incoming who={b.requester?.name || 'Someone'} onStatus={onStatus} />)}
      </div>

      {confirmed.length > 0 && (
        <div className="pf-reqgroup">
          <h4><CalendarCheck size={13} /> Confirmed</h4>
          {confirmed.map((b) => <Row key={b.id} b={b} incoming who={b.requester?.name || 'Someone'} onStatus={onStatus} onShare={onShare} />)}
        </div>
      )}

      <div className="pf-reqgroup">
        <h4>Requests you sent</h4>
        {sent.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-faint)', margin: 0 }}>Open someone&apos;s profile and tap Collab / Book to pick a free day and send a request.</p>
        ) : sent.map((b) => <Row key={b.id} b={b} who={b.host?.name || 'Unknown'} onStatus={onStatus} />)}
      </div>

      {past.length > 0 && (
        <div className="pf-reqgroup">
          <h4>Declined or cancelled</h4>
          {past.map((b) => <Row key={b.id} b={b} incoming who={b.requester?.name || 'Someone'} onStatus={onStatus} />)}
        </div>
      )}
    </>
  );
}
