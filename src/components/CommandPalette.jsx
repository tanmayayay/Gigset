import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Handshake, Compass } from 'lucide-react';
import { Avatar } from './ui';
import { Profiles, Opps } from '../lib/api';

const TYPE_LABEL = { PERFORMER: 'Performer', VENUE: 'Venue', BUYER: 'Buyer', CREW: 'Crew', INSTITUTION: 'Institution' };

const PAGES = [
  { label: 'Home', sub: 'Your feed', to: '/home' },
  { label: 'Gighub', sub: 'Discovery feed', to: '/gighub' },
  { label: 'Collab', sub: 'Opportunities marketplace', to: '/collab' },
  { label: 'Community', sub: 'Circles & walls', to: '/community' },
  { label: 'News', sub: 'Daily industry headlines', to: '/news' },
  { label: 'Messages', sub: 'Conversations', to: '/messages' },
  { label: 'Saved', sub: 'Your bookmarks', to: '/saved' },
  { label: 'Settings', sub: 'Privacy & preferences', to: '/settings' },
  { label: 'About Gigset', sub: 'Mission & story', to: '/about' },
  { label: 'Help & Legal', sub: 'Support centre', to: '/support' },
];

const personItem = (p) => ({
  label: p.name,
  sub: `${TYPE_LABEL[p.stakeholderType] || 'Member'}${p.city ? ` · ${p.city}` : ''}`,
  to: `/profile/${p.id}`,
  kind: 'person',
});

/* ⌘K command-palette global search — real data only:
 * people via Profiles.list({search}), opportunities via Opps.list({status:'OPEN'})
 * filtered client-side. */
export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [people, setPeople] = useState([]);
  const [opps, setOpps] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) { setQ(''); setSel(0); setPeople([]); setOpps([]); setTimeout(() => inputRef.current?.focus(), 40); }
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const [pr, or] = await Promise.all([
          Profiles.list({ search: q.trim() || undefined, take: 8 }),
          Opps.list({ status: 'OPEN', take: 12 }),
        ]);
        if (!alive) return;
        setPeople(pr.items || []);
        setOpps(or.items || []);
      } catch {
        if (alive) { setPeople([]); setOpps([]); }
      }
    }, q.trim() ? 250 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [open, q]);

  const query = q.trim().toLowerCase();
  const filteredOpps = useMemo(() => (
    query
      ? opps.filter((o) => `${o.title || ''} ${o.description || ''} ${o.city || ''}`.toLowerCase().includes(query))
      : opps
  ), [opps, query]);

  const results = useMemo(() => {
    const groups = [];
    const push = (label, icon, items) => { if (items.length) groups.push({ label, icon, items: items.slice(0, 5) }); };
    if (!query) {
      push('Pages', Compass, PAGES.slice(0, 6).map((p) => ({ ...p, kind: 'page' })));
      push('People', User, people.slice(0, 4).map(personItem));
      return groups;
    }
    push('People', User, people.map(personItem));
    push('Opportunities', Handshake, filteredOpps.map((o) => ({
      label: o.title,
      sub: `${o.city || 'Anywhere'}`,
      to: '/collab',
      kind: 'opp',
    })));
    push('Pages', Compass, PAGES.filter((p) => p.label.toLowerCase().includes(query)).map((p) => ({ ...p, kind: 'page' })));
    return groups;
  }, [query, people, filteredOpps]);

  const flat = useMemo(() => results.flatMap((g) => g.items), [results]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && flat[sel]) { navigate(flat[sel].to); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flat, sel, navigate, onClose]);

  if (!open) return null;
  return (
    <div className="cmdk-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmdk" role="dialog" aria-label="Search Gigset">
        <div className="cmdk-input-row">
          <Search size={17} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            placeholder="Search people, venues, opportunities…"
          />
          <kbd style={{ fontSize: 11, color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px' }}>esc</kbd>
        </div>
        <div className="cmdk-results">
          {flat.length === 0 && <div className="cmdk-empty">No matches — try a name, a city or “wedding”.</div>}
          {results.map((g) => (
            <div key={g.label}>
              <div className="cmdk-group-label">{g.label}</div>
              {g.items.map((it) => {
                const idx = flat.indexOf(it);
                return (
                  <button
                    key={it.to + it.label}
                    className={`cmdk-item${idx === sel ? ' selected' : ''}`}
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => { navigate(it.to); onClose(); }}
                  >
                    {it.kind === 'person' ? <Avatar name={it.label} size={32} /> : <g.icon size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</b>
                      <span>{it.sub}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
