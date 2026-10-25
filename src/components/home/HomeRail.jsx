import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Newspaper, ArrowRight, Briefcase, MapPin, CalendarDays, UserPlus, Check,
  Hash, Flame, ChevronRight, Layers, IndianRupee,
} from 'lucide-react';
import { Avatar, Verified } from '../ui';
import { computeMatchScore } from '../widgets';
import { timeAgo } from '../../lib/format';

const typeLabel = (t) => (t ? t.charAt(0) + t.slice(1).toLowerCase() : 'Member');

export function profileCompleteness(user) {
  const d = user?.detail?.data || {};
  const tags = [...(d.genres || []), ...(d.skills || []), ...(d.instruments || [])];
  const steps = [
    { done: Boolean(user?.name), label: 'Add your name', to: `/profile/${user?.id}` },
    { done: Boolean(user?.city), label: 'Add your city', to: `/profile/${user?.id}` },
    { done: Boolean(user?.bio && user.bio.length > 20), label: 'Write a short bio', to: `/profile/${user?.id}` },
    { done: tags.length > 0, label: 'Add genres or skills', to: `/profile/${user?.id}` },
    { done: user?.verificationStatus === 'VERIFIED', label: 'Get verified', to: '/support' },
  ];
  const pct = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  return { pct, next: steps.find((s) => !s.done) };
}

function fmtBudget(o) {
  const f = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  if (o.budgetMin != null && o.budgetMax != null) return `₹${f(o.budgetMin)}–${f(o.budgetMax)}`;
  if (o.budgetMax != null) return `up to ₹${f(o.budgetMax)}`;
  if (o.budgetMin != null) return `from ₹${f(o.budgetMin)}`;
  return null;
}

/* ---------- 1. You: identity card with a progress ring ---------- */
export function MeCard({ user, followingCount, postCount }) {
  const navigate = useNavigate();
  const { pct, next } = profileCompleteness(user);
  return (
    <div className="rail-card me-card">
      <button className="me-row" onClick={() => navigate(`/profile/${user?.id}`)} aria-label="Open your profile">
        <Avatar name={user?.name || 'You'} src={user?.avatarUrl} size={44} />
        <span className="me-id">
          <b className="me-name">{user?.name}{user?.verificationStatus === 'VERIFIED' && <Verified size={13} />}</b>
          <span className="me-sub">{typeLabel(user?.stakeholderType)}{user?.city ? ` · ${user.city}` : ''}</span>
        </span>
        <ChevronRight size={16} className="me-go" />
      </button>
      <div className="me-meta">
        <span><b>{postCount ?? '—'}</b> posts</span>
        <i aria-hidden="true" />
        <span><b>{followingCount ?? '—'}</b> following</span>
      </div>
      <div className="me-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="me-hint">
        {next ? <Link to={next.to}>{pct}% · Next: {next.label} <ChevronRight size={11} /></Link> : <span>{pct === 100 ? 'Gig-ready profile' : `${pct}% complete`}</span>}
      </div>
    </div>
  );
}

export function NewsCard({ items }) {
  const navigate = useNavigate();
  if (!items?.length) return null;
  return (
    <div className="rail-card">
      <h4><Newspaper size={15} /> Gigset Daily <span className="rail-live">LIVE</span></h4>
      <ul className="rail-news">
        {items.slice(0, 4).map((n, i) => (
          <li key={n.id || n.url || i}>
            <a href={n.url} target="_blank" rel="noopener noreferrer">
              <b>{n.title}</b>
              <span>{n.source}{n.publishedAt ? ` · ${timeAgo(n.publishedAt)}` : ''}</span>
            </a>
          </li>
        ))}
      </ul>
      <button className="rail-cta" onClick={() => navigate('/news')}>
        <Layers size={15} /> Swipe today’s stories <ArrowRight size={14} />
      </button>
    </div>
  );
}

/* ---------- 3. Opportunities matched to you ---------- */
export function OppsCard({ opps, user }) {
  const navigate = useNavigate();
  if (!opps?.length) return null;
  const ranked = opps
    .map((o) => ({ o, s: computeMatchScore(o, user).score }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
  return (
    <div className="rail-card">
      <h4><Sparkles size={15} /> Matched for you</h4>
      {ranked.map(({ o, s }) => (
        <button key={o.id} className="rail-opp" onClick={() => navigate('/collab')}>
          <span className={`rail-score ${s >= 85 ? 'hi' : s >= 70 ? 'mid' : ''}`}>{s}%</span>
          <span className="rail-opp-text">
            <b>{o.title}</b>
            <span>
              {o.city && <><MapPin size={11} /> {o.city}</>}
              {fmtBudget(o) && <> · <IndianRupee size={11} />{fmtBudget(o).replace('₹', '')}</>}
            </span>
          </span>
        </button>
      ))}
      <button className="rail-cta subtle" onClick={() => navigate('/collab')}>
        <Briefcase size={14} /> All opportunities <ArrowRight size={14} />
      </button>
    </div>
  );
}

/* ---------- 4. People to follow ---------- */
export function PeopleCard({ people, following, onFollow }) {
  const navigate = useNavigate();
  const list = people.filter((p) => !following.has(p.id)).slice(0, 4);
  if (!list.length) return null;
  return (
    <div className="rail-card">
      <h4><UserPlus size={15} /> People to know</h4>
      {list.map((p) => (
        <div key={p.id} className="rail-person">
          <button onClick={() => navigate(`/profile/${p.id}`)} className="rail-person-main">
            <Avatar name={p.name} src={p.avatarUrl} size={38} />
            <span>
              <b>{p.name}{p.verificationStatus === 'VERIFIED' && <Verified size={12} />}</b>
              <span>{typeLabel(p.stakeholderType)}{p.city ? ` · ${p.city}` : ''}</span>
            </span>
          </button>
          <button className="rail-follow" onClick={() => onFollow(p)} aria-label={`Follow ${p.name}`}>
            <UserPlus size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------- 5. Gigs & venues near you ---------- */
export function NearbyCard({ events, venues, city }) {
  if (!events?.length && !venues?.length) return null;
  const fmt = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return { day: d.toLocaleDateString('en-IN', { day: 'numeric' }), mon: d.toLocaleDateString('en-IN', { month: 'short' }) };
  };
  return (
    <div className="rail-card">
      <h4><CalendarDays size={15} /> {events?.length ? 'Upcoming gigs' : `Venues${city ? ` in ${city}` : ''}`}</h4>
      {events?.length
        ? events.slice(0, 3).map((e) => {
          const d = e.date && fmt(e.date);
          return (
            <a key={e.id} className="rail-event" href={e.url || undefined} target="_blank" rel="noopener noreferrer">
              <span className="rail-date">{d ? <><b>{d.day}</b>{d.mon}</> : <b>TBA</b>}</span>
              <span><b>{e.title}</b><span>{[e.venue, e.city].filter(Boolean).join(' · ')}</span></span>
            </a>
          );
        })
        : venues.slice(0, 4).map((v) => (
          <div key={v.id} className="rail-event">
            <span className="rail-date venue"><MapPin size={15} /></span>
            <span><b>{v.name}</b><span>{[v.type?.replace(/_/g, ' '), v.city].filter(Boolean).join(' · ')}</span></span>
          </div>
        ))}
    </div>
  );
}

/* ---------- 6. Trending tags (computed from real posts) ---------- */
export function TrendingCard({ posts, onPick }) {
  const counts = {};
  for (const p of posts) {
    for (const m of (p.body || '').matchAll(/#([\p{L}\p{N}_]{2,30})/gu)) {
      const k = m[1].toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!top.length) return null;
  return (
    <div className="rail-card">
      <h4><Flame size={15} /> Trending on Gigset</h4>
      <div className="rail-tags">
        {top.map(([t, n]) => (
          <button key={t} onClick={() => onPick(t)}><Hash size={12} />{t}<span>{n}</span></button>
        ))}
      </div>
    </div>
  );
}

export function RailFooter() {
  return (
    <footer className="rail-foot">
      <Link to="/about">About</Link><Link to="/support">Help</Link><Link to="/support">Privacy</Link>
      <Link to="/support">Terms</Link><Link to="/settings">Settings</Link>
      <span>© 2026 Gigset · Made in India</span>
    </footer>
  );
}

/* ---------- In-feed carousels ---------- */
export function OppsStrip({ opps, user }) {
  const navigate = useNavigate();
  if (!opps?.length) return null;
  return (
    <section className="feed-strip">
      <div className="feed-strip-head">
        <h3><Sparkles size={16} /> Opportunities picked for you</h3>
        <Link to="/collab">See all <ArrowRight size={13} /></Link>
      </div>
      <div className="feed-strip-row">
        {opps.slice(0, 8).map((o) => {
          const s = computeMatchScore(o, user).score;
          return (
            <button key={o.id} className="opp-tile" onClick={() => navigate('/collab')}>
              <span className={`rail-score ${s >= 85 ? 'hi' : s >= 70 ? 'mid' : ''}`}>{s}% match</span>
              <b>{o.title}</b>
              <span className="opp-tile-meta">
                {o.city && <><MapPin size={12} /> {o.city}</>}
              </span>
              {fmtBudget(o) && <span className="opp-tile-budget">{fmtBudget(o)}</span>}
              <span className="opp-tile-by">
                <Avatar name={o.poster?.name || 'Gigset'} size={20} /> {o.poster?.name || 'Gigset member'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PeopleStrip({ people, following, onFollow }) {
  const navigate = useNavigate();
  const list = people.filter((p) => !following.has(p.id)).slice(0, 10);
  if (list.length < 2) return null;
  return (
    <section className="feed-strip">
      <div className="feed-strip-head">
        <h3><UserPlus size={16} /> Grow your circle</h3>
        <Link to="/search">Browse <ArrowRight size={13} /></Link>
      </div>
      <div className="feed-strip-row">
        {list.map((p) => (
          <div key={p.id} className="person-tile">
            <button className="person-tile-top" onClick={() => navigate(`/profile/${p.id}`)}>
              <Avatar name={p.name} src={p.avatarUrl} size={64} />
              <b>{p.name}{p.verificationStatus === 'VERIFIED' && <Verified size={12} />}</b>
              <span>{typeLabel(p.stakeholderType)}{p.city ? ` · ${p.city}` : ''}</span>
            </button>
            <button className={`person-tile-btn${following.has(p.id) ? ' on' : ''}`} onClick={() => onFollow(p)}>
              {following.has(p.id) ? <><Check size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
