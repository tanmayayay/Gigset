import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Availability from '../profile/Availability';
import Requests from '../profile/Requests';
import ShareModal from '../ShareModal';
import { CalendarHeart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui';
import { Bookings, Collabs } from '../../lib/api';
import { vibeOf, whenText } from '../../lib/collab';
import { metaFor } from '../../lib/profileSchema';
import { useStore } from '../../store/store';
import '../profile/profile.css';

/** Collab > Bookings: your calendar, requests you received, requests you sent. */
export default function BookingsPanel({ data }) {
  const { user, userId, pushToast } = useStore();
  const navigate = useNavigate();
  const [shareCard, setShareCard] = useState(null);
  const meta = metaFor(user?.stakeholderType);

  const onStatus = async (booking, status) => {
    try {
      await Bookings.setStatus(booking.id, status);
      pushToast(status === 'CONFIRMED' ? 'Booking confirmed. The day is now blocked on your calendar.' : 'Request updated.');
      data.reload();
    } catch (e) { pushToast(e.message, 'error'); }
  };

  const cancelCollab = async (c) => {
    try { await Collabs.cancel(c.id); pushToast('Collab cancelled.'); data.reload(); } catch (e) { pushToast(e.message, 'error'); }
  };

  const shareBooking = (b) => {
    const when = new Date(`${String(b.date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    setShareCard({ kind: 'booked', person: user, founding: !!user?.foundingMember, booked: { date: when, withName: b.requester?.name } });
  };

  return (
    <div className="collab-bookings" style={{ '--pf-tint': meta.tint, marginTop: 14 }}>
      {meta.bookable && <Availability key={(data.collabs || []).map((c) => c.id).join(',')} person={user} isSelf tint={meta.tint} />}
      {data.error && <p style={{ color: 'var(--danger,#e5484d)', fontSize: 13 }}>{data.error}</p>}
      {(data.collabs || []).length > 0 && (
        <section className="cb-collabs">
          <h4><CalendarHeart size={15} /> Confirmed collabs</h4>
          {data.collabs.map((c) => {
            const other = c.requesterId === userId ? c.host : c.requester;
            const v = vibeOf(c.vibe);
            return (
              <div key={c.id} className="cr-card">
                <div className="cr-top">
                  <Avatar name={other?.name || '?'} src={other?.avatarUrl} size={44} />
                  <div className="cr-who"><b>{other?.name}</b><span>{v.emoji} {v.label}</span></div>
                  <span className="cr-vibe" style={{ color: '#10b981' }}>Confirmed</span>
                </div>
                {c.chosen && <p className="cr-when"><CalendarHeart size={15} /> {whenText(c.chosen)}</p>}
                <div className="cr-act">
                  {c.conversationId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/messages?c=${c.conversationId}`)}><MessageCircle size={14} /> Open chat</button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => cancelCollab(c)}>Cancel</button>
                </div>
              </div>
            );
          })}
        </section>
      )}
      <Requests received={data.received} sent={data.sent} loading={data.loading} onStatus={onStatus} onShare={shareBooking} />
      <AnimatePresence>
        {shareCard && <ShareModal card={shareCard} title="Share your booking" onClose={() => setShareCard(null)} />}
      </AnimatePresence>
    </div>
  );
}
