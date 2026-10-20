import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Availability from '../profile/Availability';
import Requests from '../profile/Requests';
import ShareModal from '../ShareModal';
import { Bookings } from '../../lib/api';
import { metaFor } from '../../lib/profileSchema';
import { useStore } from '../../store/store';
import '../profile/profile.css';

/** Collab > Bookings: your calendar, requests you received, requests you sent. */
export default function BookingsPanel({ data }) {
  const { user, pushToast } = useStore();
  const [shareCard, setShareCard] = useState(null);
  const meta = metaFor(user?.stakeholderType);

  const onStatus = async (booking, status) => {
    try {
      await Bookings.setStatus(booking.id, status);
      pushToast(status === 'CONFIRMED' ? 'Booking confirmed. The day is now blocked on your calendar.' : 'Request updated.');
      data.reload();
    } catch (e) { pushToast(e.message, 'error'); }
  };

  const shareBooking = (b) => {
    const when = new Date(`${String(b.date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    setShareCard({ kind: 'booked', person: user, founding: !!user?.foundingMember, booked: { date: when, withName: b.requester?.name } });
  };

  return (
    <div className="collab-bookings" style={{ '--pf-tint': meta.tint, marginTop: 14 }}>
      {meta.bookable && <Availability person={user} isSelf tint={meta.tint} />}
      {data.error && <p style={{ color: 'var(--danger,#e5484d)', fontSize: 13 }}>{data.error}</p>}
      <Requests received={data.received} sent={data.sent} loading={data.loading} onStatus={onStatus} onShare={shareBooking} />
      <AnimatePresence>
        {shareCard && <ShareModal card={shareCard} title="Share your booking" onClose={() => setShareCard(null)} />}
      </AnimatePresence>
    </div>
  );
}
