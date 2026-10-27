import { useEffect, useMemo, useState } from 'react';
import { Link, Music, Search, UserPlus, Handshake } from 'lucide-react';
import { Avatar, Verified, EmptyState } from '../ui';
import { Profiles } from '../../lib/api';
import { INSTRUMENTS, GENRES, roleLabel } from '../../lib/profileSchema';
import { CITIES } from '../../data/demo';
import { cityDistanceKm } from '../../data/cityCoords';
import { useStore } from '../../store/store';

const RADII = [['any', 'Any distance'], ['25', 'Within 25 km'], ['100', 'Within 100 km'], ['300', 'Within 300 km'], ['1000', 'Within 1000 km']];

/** Find a collaborator by what they play, their genre, their city and how far away they are. */
export default function FindPanel({ onOpen }) {
  const { user, userId, pushToast } = useStore();
  const mine = user?.detail?.data?.instruments || [];
  const [instrument, setInstrument] = useState('');
  const [genre, setGenre] = useState('');
  const [city, setCity] = useState('');
  const [radius, setRadius] = useState('any');
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [rel, setRel] = useState({ follow: new Set(), conn: new Set() });

  useEffect(() => {
    if (!userId) return;
    Promise.all([Profiles.following().catch(() => ({ items: [] })), Profiles.connections().catch(() => ({ items: [] }))])
      .then(([f, c]) => setRel({ follow: new Set((f.items || []).map((x) => x.id)), conn: new Set((c.items || []).map((x) => x.id)) }));
  }, [userId]);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      const params = { type: 'PERFORMER', take: 60 };
      if (instrument) params.instrument = instrument;
      if (genre) params.genre = genre;
      if (city) params.city = city;
      if (q.trim()) params.search = q.trim();
      Profiles.list(params).then((r) => { if (alive) setItems(r.items || []); }).catch((e) => { pushToast(e.message, 'error'); if (alive) setItems([]); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [instrument, genre, city, q, pushToast]);

  const rows = useMemo(() => {
    const maxKm = radius === 'any' ? null : Number(radius);
    return (items || []).filter((p) => p.id !== userId).map((p) => ({ p, km: user?.city ? cityDistanceKm(user.city, p.city) : null }))
      .filter((r) => maxKm == null || (r.km != null && r.km <= maxKm))
      .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
  }, [items, radius, user?.city, userId]);

  const follow = async (id) => {
    try { await Profiles.follow(id); setRel((r) => ({ ...r, follow: new Set(r.follow).add(id) })); pushToast('Following. You connect once they follow you back.'); }
    catch (e) { pushToast(e.message, 'error'); }
  };

  return (
    <div className="find">
      <p className="find-lead">Looking for a bassist to jam with? A drummer for your band? Filter by what they play, their style and how far they are.</p>
      <div className="find-filters">
        <select className="filter-select" value={instrument} onChange={(e) => setInstrument(e.target.value)}>
          <option value="">Any instrument</option>{INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select className="filter-select" value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">Any genre</option>{GENRES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select className="filter-select" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Any city</option>{CITIES.slice(0, 8).map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={radius} onChange={(e) => setRadius(e.target.value)} disabled={!user?.city} title={user?.city ? `Distance from ${user.city}` : 'Set your city in your profile to filter by distance'}>
          {RADII.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="find-search"><Search size={14} /><input className="filter-select" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} /></span>
      </div>
      {mine.length > 0 && (
        <div className="find-quick">Quick: {mine.slice(0, 3).map((i) => <button key={i} className="filter-chip" onClick={() => setInstrument(i)}>Other {i.toLowerCase()} players</button>)}</div>
      )}
      {items == null ? <div className="shimmer-strip" style={{ height: 140, borderRadius: 14, marginTop: 14 }} /> : rows.length === 0 ? (
        <EmptyState icon={<Music size={22} />} title="Nobody matches yet" text="Try a wider distance, another genre or any instrument." />
      ) : (
        <div className="conn-grid" style={{ marginTop: 14 }}>
          {rows.map(({ p, km }) => {
            const d = p.detail?.data || {};
            const connected = rel.conn.has(p.id), following = rel.follow.has(p.id);
            return (
              <div className="conn-card" key={p.id}>
                <div className="conn-top">
                  <Avatar name={p.name} src={p.avatarUrl} size={44} />
                  <div style={{ minWidth: 0 }}><b>{p.name}{p.verificationStatus === 'VERIFIED' && <Verified size={13} />}</b><span>{roleLabel(p.stakeholderType)}{p.city ? ` · ${p.city}` : ''}{km != null ? ` · ${Math.round(km)} km` : ''}</span></div>
                </div>
                <div className="find-tags">{[...(d.instruments || []).slice(0, 3), ...(d.genres || []).slice(0, 2)].map((t) => <span key={t}>{t}</span>)}</div>
                {connected ? (
                  <button className="btn btn-blue btn-sm" onClick={() => onOpen(p.id)}><Handshake size={14} /> Collab + EPK</button>
                ) : (
                  <button className="btn btn-ghost btn-sm" disabled={following} onClick={() => follow(p.id)}>{following ? <><Link size={14} /> Requested</> : <><UserPlus size={14} /> Connect to collab</>}</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
