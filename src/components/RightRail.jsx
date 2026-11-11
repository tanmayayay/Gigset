import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, MapPin, Newspaper } from 'lucide-react';
import { Avatar, Verified } from './ui';
import { Profiles, Opps, NewsLive } from '../lib/api';
import { useStore } from '../store/store';

const TAG_RE = /#[\p{L}\p{N}_]+/gu;

function typeLabel(t) {
  if (!t || typeof t !== 'string') return 'Member';
  return t.charAt(0) + t.slice(1).toLowerCase();
}

function Card({ title, icon, linkTo, linkLabel, children }) {
  return (
    <section className="rail-card">
      <h3 className="rail-title">
        {icon}
        {title}
        {linkTo && (
          <Link className="rail-head-link" to={linkTo}>
            {linkLabel}
          </Link>
        )}
      </h3>
      {children}
    </section>
  );
}

/* ---------------- Trending in music ---------------- */
/* Search.jsx has no ?q= support, so these render as plain (non-navigating) chips. */
function Trending({ posts }) {
  const tags = [];
  const seen = new Set();
  const counts = new Map();
  for (const p of posts || []) {
    const matches = (p.body || '').match(TAG_RE);
    if (matches) {
      for (const t of matches) {
        const key = t.toLowerCase();
        if (!seen.has(key)) { seen.add(key); tags.push({ tag: t, key }); }
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  const top = tags
    .map(({ tag, key }) => ({ tag, count: counts.get(key) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  if (top.length === 0) return null;
  return (
    <Card title="Trending in music" icon={<TrendingUp size={17} />}>
      <div className="trend-chips">
        {top.map(({ tag, count }) => (
          <span key={tag} className="trend-chip">
            {tag}
            <span className="count">{count}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Who to follow ---------------- */
function WhoToFollow({ followedIds }) {
  const { user, pushToast } = useStore();
  const [people, setPeople] = useState([]);
  const [hidden, setHidden] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await Profiles.list({ take: 8 });
        if (alive) setPeople(res.items || []);
      } catch (e) {
        /* stay silent — widget hides */
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!user) return null;

  const suggestions = people
    .filter((p) => p.id !== user.id && !hidden[p.id] && !(followedIds && followedIds.has(p.id)))
    .slice(0, 3);
  if (suggestions.length === 0) return null;

  const follow = async (p) => {
    setHidden((h) => ({ ...h, [p.id]: true }));
    try {
      await Profiles.follow(p.id);
      pushToast(`Following ${p.name?.split(' ')[0] || 'them'}.`);
    } catch (e) {
      setHidden((h) => {
        const next = { ...h };
        delete next[p.id];
        return next;
      });
      pushToast(e.message || 'Could not follow.', 'error');
    }
  };

  return (
    <Card title="Who to follow" icon={<Users size={17} />} linkTo="/search" linkLabel="Find more">
      {suggestions.map((p) => (
        <div className="wtf-row" key={p.id}>
          <Avatar name={p.name || 'Unknown'} size={34} />
          <div className="wtf-info">
            <div className="wtf-name">
              {p.name || 'Unknown'}
              {p.verificationStatus === 'VERIFIED' && <Verified size={13} />}
            </div>
            <div className="wtf-sub">
              {typeLabel(p.stakeholderType)}{p.city ? ` · ${p.city}` : ''}
            </div>
          </div>
          <button className="btn btn-blue btn-xs" onClick={() => follow(p)}>
            Follow
          </button>
        </div>
      ))}
    </Card>
  );
}

/* ---------------- Upcoming near you ---------------- */
function Upcoming() {
  const [opps, setOpps] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await Opps.list({ take: 3 });
        if (alive) setOpps(res.items || []);
      } catch (e) {
        /* stay silent — widget hides */
      }
    })();
    return () => { alive = false; };
  }, []);

  if (opps.length === 0) return null;
  return (
    <Card title="Upcoming near you" icon={<MapPin size={17} />} linkTo="/collab" linkLabel="Browse all">
      {opps.map((o) => (
        <Link className="opp-row" key={o.id} to="/collab">
          <div className="opp-title">{o.title}</div>
          {o.city && (
            <div className="opp-meta">
              <MapPin size={12} /> {o.city}
            </div>
          )}
        </Link>
      ))}
    </Card>
  );
}

/* ---------------- Industry pulse ---------------- */
function Pulse() {
  const [headlines, setHeadlines] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await NewsLive.get();
        if (alive) setHeadlines((res.items || []).slice(0, 3));
      } catch (e) {
        /* stay silent — widget hides */
      }
    })();
    return () => { alive = false; };
  }, []);

  if (headlines.length === 0) return null;
  return (
    <Card title="Industry pulse" icon={<Newspaper size={17} />} linkTo="/news" linkLabel="All news">
      {headlines.map((n) => (
        <Link className="pulse-row" key={n.id || n.url || n.title} to="/news">
          <div className="pulse-headline">{n.title}</div>
          {n.source && <div className="pulse-source">{n.source}</div>}
        </Link>
      ))}
    </Card>
  );
}

export default function RightRail({ posts = [], followedIds = null }) {
  return (
    <aside className="rail" aria-label="Discover">
      <Trending posts={posts} />
      <WhoToFollow followedIds={followedIds} />
      <Upcoming />
      <Pulse />
      <div className="rail-footer">
        <span>© 2026 TheGigSet</span>
        <Link to="/about">About</Link>
        <Link to="/support">Support</Link>
      </div>
    </aside>
  );
}
