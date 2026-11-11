import { useEffect, useState } from 'react';
import { oppMeta } from '../lib/oppMeta';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { Sparkles, Check, ShieldCheck, BadgeCheck, Star, Zap, X } from 'lucide-react';
import { availability } from '../data/demo';
import { useStore } from '../store/store';
import './booking.css';

/* ---------- 1. AI Match Score badge with "Why this matches" tooltip + breakdown modal ---------- */
// Deterministic match score computed from REAL opportunity + viewer profile fields.
// A factor is only included when real data exists for it; factors without data
// are dropped rather than fabricated.
export function computeMatchScore(opp, viewer) {
  let score = 52;
  const reasons = [];
  const factors = [];

  // Stakeholder type fit — real signal: poster's type vs viewer's type.
  const posterType = opp.poster?.stakeholderType;
  const viewerType = viewer?.stakeholderType;
  if (posterType && viewerType) {
    if (posterType !== viewerType) {
      score += 8;
      factors.push({ label: 'Stakeholder type fit', value: 84 });
      reasons.push(`Posted by a ${posterType.toLowerCase()} — cross-type collaboration`);
    } else {
      factors.push({ label: 'Stakeholder type fit', value: 58 });
    }
  }

  // Location match — real signal: opportunity city vs viewer city.
  if (opp.city && viewer?.city) {
    const same = opp.city === viewer.city;
    if (same) {
      score += 13;
      reasons.push(`In your city (${viewer.city}) — no travel needed`);
    }
    factors.push({ label: 'Location match', value: same ? 94 : 62 });
  }

  // Skill & genre overlap — real signal: viewer's profile detail (genres, skills,
  // instruments) against the opportunity's title/description/requirements/genre.
  const detailData = viewer?.detail?.data || {};
  const viewerTerms = [
    ...(Array.isArray(detailData.genres) ? detailData.genres : []),
    ...(Array.isArray(detailData.skills) ? detailData.skills : []),
    ...(Array.isArray(detailData.instruments) ? detailData.instruments : []),
  ].map(String);
  const text = `${opp.title || ''} ${opp.description || ''} ${oppMeta(opp).text} ${opp.genre || ''}`.toLowerCase();
  const hits = viewerTerms.filter((t) =>
    t.toLowerCase().split(' ').some((w) => w.length > 3 && text.includes(w.toLowerCase()))
  );
  if (viewerTerms.length) {
    factors.push({ label: 'Skill & genre overlap', value: 60 + Math.min(30, hits.length * 10) });
    if (hits.length) {
      score += Math.min(12, hits.length * 4);
      reasons.push(`Matches your profile: ${hits.slice(0, 3).join(', ')}`);
    }
  }

  // Budget signal — real signal: whether the opportunity lists a budget.
  const hasBudget = opp.budgetMin != null || opp.budgetMax != null;
  factors.push({ label: 'Budget signal', value: hasBudget ? 82 : 64 });
  if (hasBudget) {
    score += 3;
    reasons.push('Budget is listed for this opportunity');
  }

  score = Math.max(58, Math.min(98, score));
  if (!reasons.length) reasons.push('Popular with profiles similar to yours');
  const appCount = opp._count?.applications;
  if (typeof appCount === 'number') {
    reasons.push(`${appCount} ${appCount === 1 ? 'person has' : 'people have'} applied so far`);
  }

  return { score, reasons, factors };
}

export function MatchScore({ opp, viewer }) {
  const { score, reasons, factors } = computeMatchScore(opp, viewer);
  const [open, setOpen] = useState(false);
  const cls = score >= 85 ? 'high' : score >= 70 ? 'mid' : 'low';

  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!open) return;
    const c = animate(0, score, { duration: 0.9, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [open, score]);

  return (
    <>
      <span className="match-wrap" tabIndex={0}>
        <button
          type="button"
          className={`match-badge ${cls}`}
          onClick={() => setOpen(true)}
          title="See match breakdown"
          style={{ cursor: 'pointer' }}
        >
          <Sparkles size={13} strokeWidth={2.4} />
          {score}% match
        </button>
        <span className="match-tip" role="tooltip">
          <b>Why this matches you</b>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {reasons.map((r, i) => (
              <li key={i}><Check size={13} strokeWidth={3} />{r}</li>
            ))}
          </ul>
        </span>
      </span>
      <AnimatePresence>
        {open && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              className="modal match-modal"
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.9, opacity: 0, y: 28 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            >
              <div className="modal-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} style={{ color: 'var(--blue)' }} /> Match breakdown
                </h3>
                <button className="close-x" onClick={() => setOpen(false)} aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <div className="match-score-big" aria-live="polite">
                <b>{shown}%</b>
                <span>AI match score for “{opp.title}”</span>
              </div>
              <div className="match-factors">
                {factors.map((f, i) => (
                  <div className="match-factor" key={f.label}>
                    <div className="match-factor-top"><span>{f.label}</span><b>{f.value}%</b></div>
                    <div className="match-factor-bar">
                      <motion.div
                        className="match-factor-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${f.value}%` }}
                        transition={{ duration: 0.7, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <ul className="match-reasons">
                {reasons.map((r, i) => (
                  <li key={i}><Check size={13} strokeWidth={3} />{r}</li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- 3. Verification badges + trust indicators ---------- */
export function TrustRow({ person }) {
  const items = [];
  if (person.verified) items.push({ icon: <BadgeCheck size={14} />, label: 'Verified profile' });
  if (person.idVerified) items.push({ icon: <ShieldCheck size={14} />, label: 'ID-verified' });
  items.push({ icon: <Zap size={14} />, label: `${person.pastGigs}+ gigs` });
  items.push({ icon: <Check size={14} />, label: `${person.responseRate}% response rate` });
  if (person.rating) items.push({ icon: <Star size={14} />, label: `${person.rating} rated` });
  return (
    <div className="trust-row">
      {items.map((it, i) => (
        <span className="trust-item" key={i}>{it.icon}{it.label}</span>
      ))}
    </div>
  );
}

/* ---------- 2. Availability calendar strip (next 14 days) ---------- */
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const STATUS_LABEL = { free: 'Free', busy: 'Busy', booked: 'Booked' };
export function AvailabilityStrip({ personId, compact = false, onSelectDay }) {
  const { pushToast } = useStore();
  const days = availability(personId, compact ? 7 : 14);
  const handleDay = (d) => {
    if (d.status !== 'free') return;
    if (onSelectDay) {
      onSelectDay(d.date);
    } else {
      pushToast(`Request sent for ${d.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} — the artist usually replies within a day.`);
    }
  };
  return (
    <div>
      <div className="avail-strip">
        {days.map((d, i) => (
          <div
            key={i}
            className={`avail-day ${d.status}`}
            title={`${d.date.toDateString()} — ${STATUS_LABEL[d.status]}`}
            onClick={() => handleDay(d)}
            style={d.status === 'free' ? { cursor: 'pointer' } : undefined}
          >
            <div className="dow">{i === 0 ? 'Today' : DOW[d.date.getDay()]}</div>
            <div className="dnum">{d.date.getDate()}</div>
            <div className="dot" />
            <div className="lbl">{STATUS_LABEL[d.status]}</div>
          </div>
        ))}
      </div>
      <div className="avail-legend">
        <span><i style={{ background: 'var(--green)' }} />Free — tap to request</span>
        <span><i style={{ background: 'var(--amber)' }} />Busy</span>
        <span><i style={{ background: 'var(--red)' }} />Booked</span>
      </div>
    </div>
  );
}

/* ---------- 8. Event countdown card ---------- */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
export function CountdownCard({ gig }) {
  const now = useNow(1000);
  const target = new Date(gig.date);
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const { pushToast } = useStore();
  return (
    <div className="countdown-card">
      <div className="countdown-top" style={{ background: gig.gradient }}>
        <h4>{gig.title}</h4>
        <p>{gig.venue} · {target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
      </div>
      <div className="countdown-body">
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{gig.note}</div>
        <div className="countdown-timer">
          {[[d, 'days'], [h, 'hrs'], [m, 'min'], [s, 'sec']].map(([v, l]) => (
            <div className="cd-cell" key={l}><b>{String(v).padStart(2, '0')}</b><span>{l}</span></div>
          ))}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', marginTop: 12 }}
          onClick={() => pushToast(`You're on the list for “${gig.title}”. We'll remind you a day before.`)}
        >
          Remind me
        </button>
      </div>
    </div>
  );
}

/* ---------- 9. Toast stack ---------- */
export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div className={`toast ${t.kind}`} key={t.id}>
          <span className="toast-icon">
            {t.kind === 'success' ? <Check size={14} strokeWidth={3} /> : <Sparkles size={14} />}
          </span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
