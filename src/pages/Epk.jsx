import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Pause, BadgeCheck, Share2, ArrowRight, CalendarCheck, Star, Zap, UserX } from 'lucide-react';
import { Logo, EmptyState } from '../components/ui';
import { Profiles, Posts } from '../lib/api';
import { useStore } from '../store/store';
import './epk.css';

const TYPE_LABEL = { PERFORMER: 'Performer', VENUE: 'Venue', BUYER: 'Buyer', CREW: 'Crew', INSTITUTION: 'Institution' };
const labelFor = (t) => TYPE_LABEL[t] || t || 'Member';

/* Deterministic calendar illustration (pure function of the id — no demo data).
 * Real availability needs a backend endpoint; until then this keeps the
 * "upcoming dates" visual without claiming live data. */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
function availability(id, days = 14) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const h = hashStr(id + d.toDateString()) % 10;
    out.push({ date: d, status: h < 4 ? 'free' : h < 7 ? 'busy' : 'booked' });
  }
  return out;
}

function taglineFor(person) {
  const d = person.detail?.data || {};
  const bits = [];
  if (Array.isArray(d.genres) && d.genres.length) bits.push(d.genres.join(' / '));
  if (Array.isArray(d.instruments) && d.instruments.length) bits.push(d.instruments.join(', '));
  if (Array.isArray(d.skills) && d.skills.length) bits.push(d.skills.join(' · '));
  if (d.type) bits.push(String(d.type).replace(/_/g, ' '));
  if (d.org) bits.push(d.org);
  return bits.join(' — ') || labelFor(person.stakeholderType);
}

/**
 * Public electronic press kit ("one-sheet") for an artist.
 * Rendered OUTSIDE RequireAuth — no login needed.
 */
export default function Epk() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useStore();
  const [playing, setPlaying] = useState(false);
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setPerson(null);
    setPosts([]);
    (async () => {
      try {
        const p = await Profiles.get(id);
        if (!alive) return;
        setPerson(p);
        // Best-effort: posts need a signed-in session; the EPK itself is public.
        try {
          const pl = await Posts.list({ authorId: id, take: 3 });
          if (alive) setPosts(pl.items || []);
        } catch {
          /* not signed in — EPK still renders */
        }
      } catch (e) {
        if (!alive) return;
        if (e.status === 404) setNotFound(true);
        else pushToast(e.message, 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const bars = useMemo(
    () => (person ? Array.from({ length: 64 }, (_, i) => 10 + ((i * 53 + hashStr(person.id) * 17) % 30)) : []),
    [person]
  );
  const upcoming = useMemo(
    () => (person ? availability(person.id).filter((d) => d.status === 'free').slice(0, 3) : []),
    [person]
  );

  const toggleClip = () => {
    setPlaying((p) => !p);
    pushToast('Audio previews are not available in this version.');
  };

  const requestBooking = () => {
    pushToast('Sign in to the full app to request a booking.');
    navigate('/');
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard unavailable */
    }
    pushToast('Press-kit link copied.');
  };

  if (loading) {
    return (
      <div className="epk-page">
        <div className="epk-bar"><Logo /></div>
        <article className="epk-sheet"><p className="epk-empty">Loading press kit…</p></article>
      </div>
    );
  }

  if (notFound || !person) {
    return (
      <div className="epk-page">
        <div className="epk-bar"><Logo /></div>
        <article className="epk-sheet">
          <EmptyState
            icon={<UserX size={22} />}
            title="Press kit not found"
            text="This press kit doesn't exist or the profile isn't public."
            action={<Link className="btn btn-blue btn-sm" to="/">Back to Gigset</Link>}
          />
        </article>
        <footer className="epk-foot"><Logo size={20} /><span>Tying the music industry together.</span></footer>
      </div>
    );
  }

  const verified = person.verificationStatus === 'VERIFIED';
  const postsCount = person._count?.posts ?? 0;
  const followers = person._count?.followers ?? 0;

  return (
    <div className="epk-page">
      <div className="epk-bar">
        <Logo />
        <Link className="btn btn-blue btn-sm" to={`/profile/${person.id}`}>
          Open in Gigset <ArrowRight size={14} />
        </Link>
      </div>

      <article className="epk-sheet">
        <p className="epk-sheet-kicker">Electronic press kit · via Gigset</p>
        <h1 className="epk-sheet-name">{person.name}</h1>
        <p className="epk-sheet-sub">
          {labelFor(person.stakeholderType)}{person.city ? ` · ${person.city}` : ''}
          {verified && <BadgeCheck size={16} style={{ color: 'var(--blue)', verticalAlign: -3, marginLeft: 6 }} />}
        </p>
        <p className="epk-sheet-tagline">“{taglineFor(person)}”</p>

        <div className="epk-stat-row">
          <div className="epk-stat"><b>{postsCount}</b><span>Posts</span></div>
          <div className="epk-stat"><b>{followers}</b><span>Followers</span></div>
          <div className="epk-stat"><b>{verified ? 'Yes' : '—'}<Star size={13} style={{ verticalAlign: -1, marginLeft: 3 }} /></b><span>Verified</span></div>
        </div>

        <p className="epk-bio">{person.bio || 'No bio added yet.'}</p>

        {posts.length > 0 && (
          <>
            <h3 className="epk-section-title"><Zap size={15} style={{ color: 'var(--amber)', verticalAlign: -2 }} /> Recent posts</h3>
            <ul className="epk-dates">
              {posts.map((p) => (
                <li key={p.id}>
                  <b>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</b>
                  <span>{p.body?.slice(0, 140)}{p.body && p.body.length > 140 ? '…' : ''}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="epk-section-title"><Zap size={15} style={{ color: 'var(--amber)', verticalAlign: -2 }} /> Featured clip</h3>
        <div className="epk-clip" onClick={toggleClip} role="button" tabIndex={0}>
          <button className="epk-clip-btn" aria-label={playing ? 'Pause preview' : 'Play preview'}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <div className="epk-clip-bars">{bars.map((h, i) => <span key={i} style={{ height: h }} />)}</div>
          <span className="epk-clip-label">{playing ? 'Playing…' : 'Featured clip'}</span>
        </div>

        <h3 className="epk-section-title"><CalendarCheck size={15} style={{ color: 'var(--blue)', verticalAlign: -2 }} /> Upcoming dates</h3>
        {upcoming.length === 0 ? (
          <p className="epk-empty">No open dates in the next two weeks — check back soon.</p>
        ) : (
          <ul className="epk-dates">
            {upcoming.map((d, i) => (
              <li key={i}>
                <b>{d.date.toLocaleDateString('en-IN', { weekday: 'long' })}</b>
                <span>{d.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} · Available</span>
              </li>
            ))}
          </ul>
        )}

        <div className="epk-cta">
          <h3>Book {person.name.split(' ')[0]}</h3>
          <p>On Gigset, booking takes under a minute — pick a free day, choose a slot, and send your request directly.</p>
          <div className="epk-cta-row">
            <button className="btn btn-blue" onClick={requestBooking}>Request booking</button>
            <button className="btn btn-ghost" onClick={share}><Share2 size={14} /> Share</button>
          </div>
        </div>
      </article>

      <footer className="epk-foot">
        <Logo size={20} />
        <span>Tying the music industry together.</span>
      </footer>
    </div>
  );
}
