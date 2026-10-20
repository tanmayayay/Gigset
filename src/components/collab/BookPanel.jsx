import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ExternalLink } from 'lucide-react';
import { Avatar, Verified } from '../ui';
import Availability from '../profile/Availability';
import BookingModal from '../BookingModal';
import { Profiles, Convos } from '../../lib/api';
import { metaFor, roleLabel } from '../../lib/profileSchema';
import { useStore } from '../../store/store';
import '../profile/profile.css';

/** Shown at the top of Collab when you arrive from someone's profile: collaborate or book them. */
export default function BookPanel({ id, onClose }) {
  const { userId, pushToast } = useStore();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [missing, setMissing] = useState(false);
  const [day, setDay] = useState(null);

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
      {self ? (
        <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'var(--text-faint)' }}>This is you. Manage your calendar and requests in the Bookings tab.</p>
      ) : meta.bookable ? (
        <>
          <p style={{ margin: '12px 0 4px', fontSize: 13.5, color: 'var(--text-faint)' }}>Pick a free day to send a booking request, or message {person.name.split(' ')[0]} first to talk about collaborating.</p>
          <Availability person={person} isSelf={false} tint={meta.tint} onPick={userId ? (d) => setDay(d) : () => pushToast('Sign in to request a booking.', 'error')} />
        </>
      ) : (
        <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'var(--text-faint)' }}>{person.name.split(' ')[0]} takes collaboration requests by message. Say hello to start the conversation.</p>
      )}
      <AnimatePresence>{day && <BookingModal person={person} day={day} onClose={() => setDay(null)} />}</AnimatePresence>
    </div>
  );
}
