import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ExternalLink, Lock, UserPlus, UserCheck, FileText } from 'lucide-react';
import { Avatar, Verified } from '../ui';
import Availability from '../profile/Availability';
import BookingModal from '../BookingModal';
import { Profiles, Convos } from '../../lib/api';
import { metaFor, roleLabel } from '../../lib/profileSchema';
import { epkUrl, savedTemplate } from '../../lib/epk';
import EpkModal from '../epk/EpkModal';
import { useStore } from '../../store/store';
import '../profile/profile.css';

/** Shown at the top of Collab when you arrive from someone's profile: collaborate or book them. */
export default function BookPanel({ id, onClose }) {
  const { userId, pushToast } = useStore();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [missing, setMissing] = useState(false);
  const [day, setDay] = useState(null);
  const [epkOpen, setEpkOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setPerson(null); setMissing(false);
    Profiles.get(id).then((p) => { if (alive) setPerson(p); }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [id]);

  const message = async () => {
    try { const c = await Convos.open(id); navigate('/messages?c=' + c.id); }
    catch (e) { pushToast(e.message, 'error'); }
  };

  const follow = async () => {
    setBusy(true);
    try {
      const r = person.relation?.iFollow ? await Profiles.unfollow(id) : await Profiles.follow(id);
      void r;
      const p = await Profiles.get(id); setPerson(p);
    } catch (e) { pushToast(e.message, 'error'); } finally { setBusy(false); }
  };
  /** For people without a calendar: open a chat and drop our press kit in. */
  const sendRequest = async () => {
    setBusy(true);
    try {
      const c = await Convos.open(id);
      await Convos.send(c.id, `Hi ${person.name.split(' ')[0]}, I'd love to collaborate. Here is my press kit: ${epkUrl(userId, savedTemplate())}`);
      pushToast('Collab request sent with your press kit.');
      navigate('/messages?c=' + c.id);
    } catch (e) { pushToast(e.message, 'error'); } finally { setBusy(false); }
  };

  if (missing) return null;
  if (!person) return <div className="pf-card" style={{ marginBottom: 16 }}><div className="shimmer-strip" style={{ height: 90, borderRadius: 12 }} /></div>;

  const meta = metaFor(person.stakeholderType);
  const self = person.id === userId;
  return (
    <div className="pf-card collab-book" style={{ '--pf-tint': meta.tint, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Avatar name={person.name} src={person.avatarUrl} size={48} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <b style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Collab or book {person.name}{person.verificationStatus === 'VERIFIED' && <Verified size={14} />}</b>
          <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{roleLabel(person.stakeholderType)}{person.city ? ` · ${person.city}` : ''}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={message}><MessageCircle size={14} /> Message</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/profile/${person.id}`)}><ExternalLink size={14} /> Profile</button>
        <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
      </div>
      {!self && !person.relation?.connected ? (
        <div className="collab-lock">
          <Lock size={18} />
          <div>
            <b>Collabs are for connections</b>
            <p>{person.relation?.followsMe ? `${person.name.split(' ')[0]} follows you. Follow back to connect.` : person.relation?.iFollow ? `You follow ${person.name.split(' ')[0]}. Once they follow you back you can send a collab request with your press kit.` : `Follow ${person.name.split(' ')[0]} and ask them to follow you back. When you are connected, you can collab or book.`}</p>
          </div>
          <button className="btn btn-blue btn-sm" disabled={busy || !userId} onClick={follow}>
            {person.relation?.iFollow ? <><UserCheck size={14} /> Requested</> : <><UserPlus size={14} /> {person.relation?.followsMe ? 'Follow back' : 'Connect'}</>}
          </button>
        </div>
      ) : self ? (
        <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'var(--text-faint)' }}>This is you. Manage your calendar and requests in the Bookings tab.</p>
      ) : meta.bookable ? (
        <>
          <p style={{ margin: '12px 0 4px', fontSize: 13.5, color: 'var(--text-faint)' }}>Pick a free day to send a booking request, or message {person.name.split(' ')[0]} first to talk about collaborating.</p>
          <Availability person={person} isSelf={false} tint={meta.tint} onPick={userId ? (d) => setDay(d) : () => pushToast('Sign in to request a booking.', 'error')} />
        </>
      ) : (
        <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'var(--text-faint)' }}>{person.name.split(' ')[0]} takes collaboration requests by message. Send a request and your press kit goes with it.</p>
      )}
      {!self && person.relation?.connected && !meta.bookable && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-blue btn-sm" disabled={busy || !userId} onClick={sendRequest}><FileText size={14} /> Send collab request + my press kit</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setEpkOpen(true)}>Preview / change my press kit</button>
        </div>
      )}
      {!self && person.relation?.connected && meta.bookable && <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setEpkOpen(true)}><FileText size={14} /> Preview the press kit they will receive</button>}
      {epkOpen && <EpkModal personId={userId} onClose={() => setEpkOpen(false)} />}
      <AnimatePresence>{day && <BookingModal person={person} day={day} onClose={() => setDay(null)} />}</AnimatePresence>
    </div>
  );
}
