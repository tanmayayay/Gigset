import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Bell, CalendarClock, Video } from 'lucide-react';
import { PageHead } from '../components/ui';
import { CountdownCard } from '../components/widgets';
import { Directory } from '../lib/api';
import { useStore } from '../store/store';

const GRADIENTS = [
  'linear-gradient(135deg,#3b82f6,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
];

export default function Live() {
  const { pushToast } = useStore();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Directory.events({ take: 3 })
      .then((d) => { if (!cancelled) setEvents(d.items || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <PageHead title="Live" sub="Streams, watch parties and saved broadcasts — arriving in Phase 2." />
      <div className="live-soon">
        <div style={{ position: 'relative' }}>
          <div style={{ width: 60, height: 60, borderRadius: 20, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Radio size={26} color="#fff" />
          </div>
          <h2>Live is coming soon</h2>
          <p>Go live from a soundcheck, stream a full set, or host a listening party — then save the broadcast to your profile. We&apos;re building it for Phase 2, right after the network and marketplace layers are proven.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}>
            <button className="btn btn-sky" onClick={() => pushToast("You're on the waitlist — we'll ping you at launch.")}>
              <Bell size={15} /> Notify me at launch
            </button>
            <button className="btn btn-ghost" style={{ background: 'rgba(255,255,255,.12)', borderColor: 'rgba(255,255,255,.3)', color: '#fff' }} onClick={() => navigate('/about')}>
              Read the roadmap
            </button>
          </div>
        </div>
      </div>

      {events.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '34px 0 16px' }}>
            <CalendarClock size={17} style={{ color: 'var(--blue)' }} />
            <h3 style={{ fontSize: 17 }}>Meanwhile — upcoming gigs</h3>
          </div>
          <div className="countdown-grid">
            {events.map((e, i) => (
              <CountdownCard
                key={e.id}
                gig={{
                  date: e.date,
                  title: e.title,
                  venue: e.venue || e.city || '',
                  note: [e.genre, e.city].filter(Boolean).join(' · '),
                  gradient: GRADIENTS[i % GRADIENTS.length],
                }}
              />
            ))}
          </div>
        </>
      )}

      <div className="side-card" style={{ marginTop: 24, display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Video size={20} style={{ color: 'var(--blue)' }} />
        </div>
        <div>
          <h4 style={{ marginBottom: 4 }}>What Live will include</h4>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>One-tap going live, ticketed streams, saved broadcasts on your profile, and live Q&A with the audience — all wired into your Gigset network.</p>
        </div>
      </div>
    </div>
  );
}
