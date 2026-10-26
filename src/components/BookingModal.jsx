import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Clock, Wallet, MessageSquare, Send, X, FileText } from 'lucide-react';
import { Bookings } from '../lib/api';
import { useStore } from '../store/store';
import { TemplatePicker } from './epk/EpkModal';
import useKit from './epk/useKit';
import { savedTemplate, saveTemplate } from '../lib/epk';
import './booking.css';

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const SLOTS = ['10 AM–12 PM', '2–4 PM', '6–8 PM', '8–10 PM'];
const BUDGETS = ['Under ₹15k', '₹15k–30k', '₹30k–60k', '₹60k+'];

export default function BookingModal({ person, day, onClose }) {
  const { pushToast, userId } = useStore();
  const { kit } = useKit(userId);
  const [tpl, setTpl] = useState(savedTemplate);
  const [showTpl, setShowTpl] = useState(false);
  const [slot, setSlot] = useState(SLOTS[0]);
  const [budget, setBudget] = useState(BUDGETS[1]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const dateStr = day.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const confirm = async () => {
    if (sending) return;
    setSending(true);
    try {
      await Bookings.create({
        hostId: person.id,
        date: dayKey(day), // YYYY-MM-DD in the person's own calendar (not UTC)
        timeSlot: slot,
        budget,
        epkTemplate: tpl,
        message: message.trim() || undefined,
      });
      pushToast('Booking request sent.');
      onClose();
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="modal booking-modal"
        role="dialog"
        aria-modal="true"
        initial={{ scale: 0.9, opacity: 0, y: 28 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      >
        <div className="modal-head">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck size={17} style={{ color: 'var(--blue)' }} /> Request booking
          </h3>
          <button className="close-x" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p className="booking-who">
          <b>{person.name}</b> · {person.role || person.stakeholderType} · {person.city}
          <br />
          <span>{dateStr}</span>
        </p>

        <div className="field">
          <label><Clock size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Time slot</label>
          <div className="slot-chips">
            {SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`slot-chip${slot === s ? ' active' : ''}`}
                onClick={() => setSlot(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label><Wallet size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Budget</label>
          <div className="select-wrap">
            <select value={budget} onChange={(e) => setBudget(e.target.value)}>
              {BUDGETS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label><MessageSquare size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Message <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(optional)</span></label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Tell ${person.name.split(' ')[0]} about the gig — venue, set length, what you need…`}
          />
        </div>

        <div className="field">
          <label><FileText size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Your press kit <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(sent automatically)</span></label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowTpl((v) => !v)}>{showTpl ? 'Hide templates' : `Template: ${tpl[0].toUpperCase() + tpl.slice(1)} · change`}</button>
          {showTpl && kit && <div style={{ marginTop: 10 }}><TemplatePicker kit={kit} value={tpl} onChange={(t) => { setTpl(t); saveTemplate(t); }} /></div>}
        </div>

        <div className="booking-summary" aria-live="polite">
          <span className="booking-summary-label">Summary</span>
          <div>{slot} · {budget} · {dateStr}</div>
        </div>

        <div className="booking-foot">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-blue" style={{ flex: 2 }} onClick={confirm} disabled={sending}>
            <Send size={14} /> {sending ? 'Sending…' : 'Confirm request'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
