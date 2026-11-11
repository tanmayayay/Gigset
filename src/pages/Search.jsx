import { useEffect, useState } from 'react';
import { oppText } from '../lib/oppMeta';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, MapPin, ExternalLink } from 'lucide-react';
import { PageHead, Avatar, Tag, Verified, EmptyState } from '../components/ui';
import { MatchScore } from '../components/widgets';
import { CITIES } from '../data/demo';
import { liveVenues, viaLabel } from '../data/liveData';
import { Profiles, Opps } from '../lib/api';
import { useStore } from '../store/store';

const TYPE_OPTIONS = [
  ['all', 'Any type'],
  ['PERFORMER', 'Performer'],
  ['CREW', 'Crew'],
  ['VENUE', 'Venue'],
  ['INSTITUTION', 'Institution'],
  ['BUYER', 'Buyer'],
];

export default function Search() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('people');
  const [city, setCity] = useState('all');
  const [type, setType] = useState('all');
  const { user, pushToast } = useStore();
  const navigate = useNavigate();

  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [opps, setOpps] = useState([]);
  const [oppsLoading, setOppsLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'people') return;
    let cancelled = false;
    setPeopleLoading(true);
    Profiles.list({
      search: debouncedQ || undefined,
      type: type !== 'all' ? type : undefined,
      city: city !== 'all' ? city : undefined,
      take: 20,
    })
      .then((d) => { if (!cancelled) setPeople(d.items || []); })
      .catch((e) => { if (!cancelled) pushToast(e.message, 'error'); })
      .finally(() => { if (!cancelled) setPeopleLoading(false); });
    return () => { cancelled = true; };
  }, [tab, debouncedQ, type, city, pushToast]);

  useEffect(() => {
    if (tab !== 'gigs') return;
    let cancelled = false;
    setOppsLoading(true);
    Opps.list({ status: 'OPEN', city: city !== 'all' ? city : undefined, take: 30 })
      .then((d) => { if (!cancelled) setOpps(d.items || []); })
      .catch((e) => { if (!cancelled) pushToast(e.message, 'error'); })
      .finally(() => { if (!cancelled) setOppsLoading(false); });
    return () => { cancelled = true; };
  }, [tab, city, pushToast]);

  const ql = q.trim().toLowerCase();
  const gigResults = opps.filter((o) =>
    !ql || oppText(o).toLowerCase().includes(ql)
  );
  const venues = liveVenues.filter((v) =>
    (city === 'all' || (v.city || '') === city) &&
    (!ql || ((v.name || '') + ' ' + (v.city || '') + ' ' + (v.type || '')).toLowerCase().includes(ql))
  );

  return (
    <div>
      <PageHead title="Search" sub="Search across people and opportunities." />
      <div className="composer">
        <SearchIcon size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
        <input type="text" placeholder="Search by name, skill, or opportunity\u2026" value={q} onChange={(e) => setQ(e.target.value)} style={{ background: 'none', border: 'none' }} autoFocus />
      </div>
      <div className="filter-row">
        {[['people', 'People'], ['gigs', 'Gigs']].map(([v, l]) => (
          <button key={v} className={`filter-chip${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>
      <div className="filter-row">
        <select className="filter-select" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="all">All cities</option>{CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {tab === 'people' && (
          <select className="filter-select" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
      </div>

      {tab === 'people' && (
        <>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '22px 0 12px' }}>People ({people.length})</h4>
          {peopleLoading ? (
            <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Searching\u2026</p>
          ) : people.length === 0 ? (
            <EmptyState icon={<SearchIcon size={22} />} title="No people found" text="Try a different name, skill or city." />
          ) : people.map((p) => (
            <div className="mini-list-item card" key={p.id} style={{ padding: '12px 14px', marginBottom: 10 }} onClick={() => navigate(`/profile/${p.id}`)}>
              <Avatar name={p.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'flex', alignItems: 'center' }}>{p.name}{p.verificationStatus === 'VERIFIED' && <Verified size={13} />}</b>
                <span>{p.stakeholderType} \u00B7 <MapPin size={10} style={{ verticalAlign: -1 }} /> {p.city || 'India'}</span>
              </div>
              <Tag color="sky">{p.stakeholderType}</Tag>
            </div>
          ))}
        </>
      )}

      {tab === 'people' && liveVenues.length > 0 && (
        <>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '22px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Real venues <Tag color="indigo">Live data</Tag>
            <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({venues.length})</span>
          </h4>
          {venues.map((v, i) => (
            <div className="mini-list-item card" key={v.id || `${v.name || 'venue'}-${i}`} style={{ padding: '12px 14px', marginBottom: 10, cursor: 'default' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{v.name || 'Unnamed venue'}</b>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={10} style={{ verticalAlign: -1 }} /> {v.city || 'India'}
                </span>
              </div>
              {v.type && <Tag color="sky">{v.type}</Tag>}
              <Tag color="indigo">{viaLabel(v, 'OpenStreetMap')}</Tag>
              {v.source_url && (
                <a href={v.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs" style={{ flexShrink: 0 }}>
                  Source <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'gigs' && (
        <>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', margin: '22px 0 12px' }}>Open opportunities ({gigResults.length})</h4>
          {oppsLoading ? (
            <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Searching\u2026</p>
          ) : gigResults.length === 0 ? (
            <EmptyState icon={<SearchIcon size={22} />} title="No opportunities found" text="Try widening your filters." />
          ) : gigResults.map((o) => (
            <div className="opp-card" key={o.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <b style={{ fontSize: 14.5 }}>{o.title}</b>
                  <div style={{ margin: '6px 0' }}>
                    {o.genre && <Tag color="blue">{o.genre}</Tag>} {o.city && <Tag color="sky">{o.city}</Tag>}
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{o.description}</p>
                </div>
                <MatchScore opp={o} viewer={user} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
