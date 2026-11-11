import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import BookingsPanel from '../components/collab/BookingsPanel';
import BookPanel from '../components/collab/BookPanel';
import ConnectionsPanel from '../components/collab/ConnectionsPanel';
import FindPanel from '../components/collab/FindPanel';
import CollabRequests from '../components/collab/CollabRequests';
import { Collabs } from '../lib/api';
import '../components/collab/collab.css';
import { useBookings } from '../lib/useBookings';
import { Plus, MapPin, Wallet, Users as UsersIcon, Bookmark, Briefcase, Search as SearchIcon, Lock, CalendarDays } from 'lucide-react';
import OppDetail, { OppActions } from '../components/collab/OppDetail';
import { oppMeta, oppText, fmtWhen } from '../lib/oppMeta';
import { PageHead, Avatar, Tag, EmptyState, Verified } from '../components/ui';
import { MatchScore, computeMatchScore } from '../components/widgets';
import { CITIES } from '../data/demo';
import { cityDistanceKm } from '../data/cityCoords';
import { Opps, Profiles, Convos } from '../lib/api';
import { useStore } from '../store/store';

function OppSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div className="skel-card" key={i}>
          <div className="skel-line shimmer-strip" style={{ width: '55%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '32%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '88%' }} />
        </div>
      ))}
    </>
  );
}

function fmtBudget(o) {
  const f = (n) => `\u20B9${Number(n).toLocaleString('en-IN')}`;
  if (o.budgetMin != null && o.budgetMax != null) return `${f(o.budgetMin)} \u2013 ${f(o.budgetMax)}`;
  if (o.budgetMin != null) return `${f(o.budgetMin)}+`;
  if (o.budgetMax != null) return `Up to ${f(o.budgetMax)}`;
  return null;
}

const STATUS_TAG = { PENDING: 'sky', SHORTLISTED: 'green', REJECTED: 'gray', WITHDRAWN: 'gray' };

export default function Collab() {
  const { isBookmarked, toggleBookmark, pushToast, user, userId } = useStore();
  const { openOpp } = useOutletContext();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const withId = params.get('with');
  const TABS = ['discover', 'find', 'connections', 'requests', 'mine', 'bookings'];
  const [tab, setTab] = useState(TABS.includes(params.get('tab')) ? params.get('tab') : 'discover');
  const tabParam = params.get('tab');
  useEffect(() => { if (TABS.includes(tabParam)) setTab(tabParam); }, [tabParam]);
  const [todo, setTodo] = useState(0);
  useEffect(() => { if (userId) Collabs.list().then((r) => setTodo(r.todo)).catch(() => {}); }, [userId]);
  const bookings = useBookings(!!userId);
  const reloadBookings = bookings.reload;
  // Fresh bookings and collabs every time the tab is opened.
  useEffect(() => { if (tab === 'bookings' && userId) reloadBookings(); }, [tab, userId, reloadBookings]);
  const closeWith = () => setParams((p) => { const n = new URLSearchParams(p); n.delete('with'); return n; }, { replace: true });
  const [cityF, setCityF] = useState('all');
  const [genreF, setGenreF] = useState('all');
  const [radiusF, setRadiusF] = useState('any'); // 'any' | '25' | '50' | '100' | '250'
  const [q, setQ] = useState('');
  const [opps, setOpps] = useState([]);
  const [genreOptions, setGenreOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  // The server tells us each gig's status for you (o.myApplication). `override` holds changes made just now.
  const [override, setOverride] = useState({}); // oppId -> application | null
  const [busyId, setBusyId] = useState(null);
  const myApp = useCallback((o) => (o.id in override ? override[o.id] : (o.myApplication || null)), [override]);
  const [detailId, setDetailId] = useState(params.get('opp'));
  const [extraOpp, setExtraOpp] = useState(null); // a gig opened from a notification that isn't in the list
  const oppParam = params.get('opp');
  useEffect(() => { if (oppParam) setDetailId(oppParam); }, [oppParam]);
  const closeDetail = () => { setDetailId(null); setParams((p) => { const n = new URLSearchParams(p); n.delete('opp'); return n; }, { replace: true }); };
  const [expandedOppId, setExpandedOppId] = useState(null);
  const [appsByOpp, setAppsByOpp] = useState({});
  const [appsLoadingId, setAppsLoadingId] = useState(null);
  const [recs, setRecs] = useState([]);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [connIds, setConnIds] = useState(new Set());
  useEffect(() => {
    if (!userId) return;
    Profiles.following().then((r) => setFollowedIds(new Set((r.items || []).map((x) => x.id)))).catch(() => {});
    Profiles.connections().then((r) => setConnIds(new Set((r.items || []).map((x) => x.id)))).catch(() => {});
  }, [userId]);

  const fetchOpps = useCallback(async () => {
    setLoading(true);
    try {
      const params = { take: 50 };
      if (tab === 'discover') {
        params.status = 'OPEN';
        if (cityF !== 'all') params.city = cityF;
        if (genreF !== 'all') params.genre = genreF;
      }
      const data = await Opps.list(params);
      let items = data.items || [];
      if (tab === 'mine') items = items.filter((o) => o.poster?.id === userId);
      setOpps(items);
    } catch (e) {
      pushToast(e.message, 'error');
      setOpps([]);
    } finally {
      setLoading(false);
    }
  }, [tab, cityF, genreF, userId, pushToast]);

  useEffect(() => {
    fetchOpps();
  }, [fetchOpps]);

  // Refresh when a new opportunity is posted via the gig composer.
  useEffect(() => {
    const onCreated = () => fetchOpps();
    window.addEventListener('gigset:opp-created', onCreated);
    return () => window.removeEventListener('gigset:opp-created', onCreated);
  }, [fetchOpps]);

  // Accumulate genre options from real data for the filter dropdown.
  useEffect(() => {
    setGenreOptions((prev) => {
      const next = new Set(prev);
      opps.forEach((o) => { if (o.genre) next.add(o.genre); });
      return [...next].sort();
    });
  }, [opps]);

  // Recommended connections — real profiles.
  useEffect(() => {
    let cancelled = false;
    Profiles.list({ take: 6 })
      .then((d) => { if (!cancelled) setRecs((d.items || []).filter((p) => p.id !== userId).slice(0, 4)); })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [userId]);

  const ql = q.trim().toLowerCase();
  const userCity = user?.city || null;
  // Text search + optional radius filter (client-side). When a radius is set,
  // gigs in cities missing from the map are hidden and counted so the user
  // knows why they disappeared.
  const { list: filtered, hiddenUnmapped } = useMemo(() => {
    const radiusKm = radiusF === 'any' ? null : Number(radiusF);
    const radiusActive = radiusKm != null && !!userCity;
    const list = opps.filter((o) => {
      if (ql && !oppText(o).toLowerCase().includes(ql)) return false;
      if (!radiusActive) return true;
      const d = cityDistanceKm(userCity, o.city);
      return d != null && d <= radiusKm;
    });
    const hiddenUnmapped = radiusActive
      ? opps.filter((o) => cityDistanceKm(userCity, o.city) == null).length
      : 0;
    return { list, hiddenUnmapped };
  }, [opps, ql, radiusF, userCity]);

  // sort by AI match score for the viewer
  const yours = useMemo(() => opps.map((o) => ({ o, a: myApp(o) })).filter((x) => x.a), [opps, myApp]);

  // The gig being viewed: from the list, or fetched (e.g. opened from a notification).
  const detailOpp = opps.find((o) => o.id === detailId) || (extraOpp?.id === detailId ? extraOpp : null);
  useEffect(() => {
    if (!detailId || opps.some((o) => o.id === detailId) || extraOpp?.id === detailId) return;
    Opps.get(detailId).then(setExtraOpp).catch(() => { pushToast('That event is no longer available.', 'error'); closeDetail(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId, opps]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => computeMatchScore(b, user).score - computeMatchScore(a, user).score),
  [filtered, user]);

  const apply = async (opp, intent = 'PERFORM') => {
    if (myApp(opp)) return;
    setBusyId(opp.id);
    try {
      const a = await Opps.apply(opp.id, '', intent);
      setOverride((m) => ({ ...m, [opp.id]: { id: a?.id, status: 'PENDING', intent } }));
      pushToast(intent === 'ATTEND'
        ? `You're on the list for \u201C${opp.title}\u201D. You can undo this any time.`
        : `Applied to \u201C${opp.title}\u201D. You can withdraw any time.`);
    } catch (e) {
      if (e.status === 409) {
        setOverride((m) => ({ ...m, [opp.id]: { status: 'PENDING', intent } }));
        pushToast("You've already applied", 'error');
        fetchOpps();
      } else {
        pushToast(e.message, 'error');
      }
    } finally { setBusyId(null); }
  };

  const withdraw = async (opp) => {
    const cur = myApp(opp);
    setBusyId(opp.id);
    try {
      await Opps.withdraw(opp.id);
      setOverride((m) => ({ ...m, [opp.id]: null }));
      pushToast(cur?.status === 'SHORTLISTED' ? "Okay, the host knows you can't make it."
        : cur?.intent === 'ATTEND' ? "You're no longer attending." : 'Application withdrawn.');
    } catch (e) {
      pushToast(e.message, 'error');
    } finally { setBusyId(null); }
  };

  const messageHost = async (id) => {
    try { const c = await Convos.open(id); closeDetail(); navigate(`/messages?c=${c.id}`); } catch (e) { pushToast(e.message, 'error'); }
  };

  const loadApplications = async (oppId) => {
    if (expandedOppId === oppId) { setExpandedOppId(null); return; }
    if (appsByOpp[oppId]) { setExpandedOppId(oppId); return; }
    setAppsLoadingId(oppId);
    try {
      const data = await Opps.applications(oppId);
      setAppsByOpp((prev) => ({ ...prev, [oppId]: data.items || [] }));
      setExpandedOppId(oppId);
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setAppsLoadingId(null);
    }
  };

  const setAppStatus = async (oppId, appId, status) => {
    try {
      await Opps.setApplicationStatus(appId, status);
      setAppsByOpp((prev) => ({
        ...prev,
        [oppId]: (prev[oppId] || []).map((a) => (a.id === appId ? { ...a, status } : a)),
      }));
      pushToast(status === 'SHORTLISTED' ? 'Applicant shortlisted.' : 'Application rejected.');
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  const toggleFollow = async (p) => {
    const isF = followedIds.has(p.id);
    try {
      if (isF) {
        await Profiles.unfollow(p.id);
        setFollowedIds((prev) => { const n = new Set(prev); n.delete(p.id); return n; });
      } else {
        await Profiles.follow(p.id);
        setFollowedIds((prev) => new Set(prev).add(p.id));
        pushToast(`Following ${p.name}. You connect once they follow you back.`);
      }
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  return (
    <div>
      <PageHead
        title="Collab"
        sub="Make music with people you vibe with. Find artists, send a collab request, or browse gigs and crew calls."
        action={<button className="btn btn-blue btn-sm" onClick={openOpp}><Plus size={14} /> Post an opportunity</button>}
      />
      <div className="two-col">
        <div>
          <div className="filter-row">
            {[['discover', 'Gigs'], ['find', 'Find artists'], ['connections', 'Connections'], ['requests', 'Requests'], ['mine', 'My gigs'], ['bookings', 'Bookings']].map(([v, l]) => (
              <button key={v} className={`filter-chip${tab === v ? ' active' : ''}`} onClick={() => { setTab(v); setExpandedOppId(null); }}>
                {l}{v === 'requests' && todo > 0 && <span className="dot" style={{ marginLeft: 6 }}>{todo}</span>}{v === 'bookings' && bookings.pending > 0 && <span className="dot" style={{ marginLeft: 6 }}>{bookings.pending}</span>}
              </button>
            ))}
          </div>
          {withId && <BookPanel id={withId} onClose={closeWith} onSent={() => Collabs.list().then((r) => setTodo(r.todo)).catch(() => {})} />}
          {tab === 'bookings' ? <BookingsPanel data={bookings} /> : tab === 'requests' ? <CollabRequests onChange={setTodo} /> : tab === 'find' ? <FindPanel onOpen={(id) => setParams((p) => { const n = new URLSearchParams(p); n.set('with', id); return n; })} /> : tab === 'connections' ? <ConnectionsPanel onCollab={(id) => setParams((p) => { const n = new URLSearchParams(p); n.set('with', id); return n; })} /> : (<>
          <div className="filter-row">
            <select className="filter-select" value={genreF} onChange={(e) => setGenreF(e.target.value)}>
              <option value="all">All genres</option>{genreOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select className="filter-select" value={cityF} onChange={(e) => setCityF(e.target.value)}>
              <option value="all">All cities</option>{CITIES.slice(0, 5).map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              className="filter-select"
              value={radiusF}
              onChange={(e) => setRadiusF(e.target.value)}
              disabled={!userCity}
              title={!userCity ? 'Set your city in your profile to use radius search' : `Gigs within this distance of ${userCity}`}
            >
              <option value="any">Any distance</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="100">Within 100 km</option>
              <option value="250">Within 250 km</option>
            </select>
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <SearchIcon size={14} style={{ position: 'absolute', left: 10, opacity: 0.5, pointerEvents: 'none' }} />
              <input
                className="filter-select"
                placeholder="Search gigs…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ paddingLeft: 30, minWidth: 150 }}
              />
            </span>
          </div>
          {hiddenUnmapped > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '8px 0 0' }}>
              {hiddenUnmapped} {hiddenUnmapped === 1 ? 'gig' : 'gigs'} hidden — city not on the map yet.
            </p>
          )}
          {loading ? (
            <OppSkeleton />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={22} />}
              title={tab === 'mine' ? 'No gigs posted yet' : 'No opportunities match'}
              text={tab === 'mine' ? 'Post your first opportunity to see applications here.' : 'Try widening your filters \u2014 new call-outs land here daily.'}
            />
          ) : sorted.map((o) => {
            const mine = myApp(o);
            const when = fmtWhen(oppMeta(o));
            const venue = oppMeta(o).venue;
            const saved = isBookmarked('opp', o.id);
            const poster = o.poster || null;
            const isMine = poster?.id === userId;
            const budget = fmtBudget(o);
            const apps = appsByOpp[o.id] || [];
            const performerCount = apps.filter((a) => (a.intent || 'PERFORM') === 'PERFORM').length;
            const attendingCount = apps.filter((a) => a.intent === 'ATTEND').length;
            return (
              <div className="opp-card" key={o.id} onClick={() => setDetailId(o.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setDetailId(o.id); } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 15.5 }}>{o.title}</b>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {o.genre && <Tag color="blue">{o.genre}</Tag>}
                      {o.city && <Tag color="sky"><MapPin size={11} /> {o.city}</Tag>}
                      {budget && <Tag color="gray"><Wallet size={11} /> {budget}</Tag>}
                      {when && <Tag color="gray"><CalendarDays size={11} /> {when}</Tag>}
                      {venue && <Tag color="gray"><Briefcase size={11} /> {venue}</Tag>}
                      {tab === 'mine' && <Tag color={o.status === 'OPEN' ? 'green' : 'gray'}>{o.status}</Tag>}
                      {o.visibility === 'CONNECTIONS' && <Tag color="gray"><Lock size={11} /> Connections only</Tag>}
                    </div>
                  </div>
                  <MatchScore opp={o} viewer={user} />
                </div>
                {o.description && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 12 }}>{o.description}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  {poster ? (
                    <button onClick={() => navigate(`/profile/${poster.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0 }}>
                      <Avatar name={poster.name} size={26} />
                      <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Posted by <b style={{ color: 'var(--text)' }}>{poster.name}</b>{poster.verificationStatus === 'VERIFIED' && <Verified size={12} />}</span>
                    </button>
                  ) : null}
                  <span style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 4 }}><UsersIcon size={12} /> {o._count?.applications ?? 0} applied</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`btn btn-xs ${saved ? 'btn-ghost' : 'btn-ghost'}`}
                      onClick={() => { const s = toggleBookmark('opp', o.id); pushToast(s ? 'Saved to your bookmarks.' : 'Removed from bookmarks.'); }}
                      style={saved ? { color: 'var(--amber)', borderColor: 'var(--amber)' } : undefined}
                    >
                      <Bookmark size={13} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
                    </button>
                    {tab === 'mine' ? (
                      <button className="btn btn-sm btn-ghost" onClick={() => loadApplications(o.id)}>
                        {expandedOppId === o.id ? 'Hide applications' : `Applications (${o._count?.applications ?? 0})`}
                      </button>
                    ) : !isMine ? (
                      <OppActions app={mine} busy={busyId === o.id} closed={o.status !== 'OPEN'} onApply={(intent) => apply(o, intent)} onWithdraw={() => withdraw(o)} />
                    ) : null}
                  </div>
                </div>
                {tab === 'mine' && expandedOppId === o.id && (
                  <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    {appsLoadingId === o.id ? (
                      <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Loading applications…</p>
                    ) : apps.length === 0 ? (
                      <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>No applications yet.</p>
                    ) : (
                      <>
                        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 10px' }}>
                          {performerCount} {performerCount === 1 ? 'performer' : 'performers'} · {attendingCount} attending
                        </p>
                        {apps.map((a) => (
                      <div className="mini-list-item" key={a.id}>
                        <span onClick={() => a.applicant && navigate(`/profile/${a.applicant.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: a.applicant ? 'pointer' : 'default' }}>
                          <Avatar name={a.applicant?.name || '?'} size={30} />
                          <div style={{ minWidth: 0 }}>
                            <b>{a.applicant?.name || 'Unknown'}</b>
                            <span>{[a.applicant?.stakeholderType, a.applicant?.city].filter(Boolean).join(' \u00B7 ')}</span>
                            {a.message && <span style={{ fontStyle: 'italic' }}>\u201C{a.message}\u201D</span>}
                          </div>
                        </span>
                        <Tag color={a.intent === 'ATTEND' ? 'green' : 'blue'}>{a.intent === 'ATTEND' ? 'Attending' : 'Performer'}</Tag>
                        <Tag color={STATUS_TAG[a.status] || 'sky'}>{a.status}</Tag>
                        {a.status === 'PENDING' && (
                          <>
                            <button className="btn btn-xs btn-blue" onClick={() => setAppStatus(o.id, a.id, 'SHORTLISTED')}>Shortlist</button>
                            <button className="btn btn-xs btn-ghost" onClick={() => setAppStatus(o.id, a.id, 'REJECTED')}>Reject</button>
                          </>
                        )}
                      </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </>)}
        </div>

        <div>
          <div className="side-card">
            <h4>Recommended connections</h4>
            {recs.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>No suggestions right now.</p>
            ) : recs.map((p) => {
              const isC = followedIds.has(p.id);
              return (
                <div className="mini-list-item" key={p.id}>
                  <span onClick={() => navigate(`/profile/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <Avatar name={p.name} size={30} />
                    <div style={{ minWidth: 0 }}><b>{p.name}{p.verificationStatus === 'VERIFIED' && <Verified size={12} />}</b><span>{[p.stakeholderType, p.city].filter(Boolean).join(' \u00B7 ')}</span></div>
                  </span>
                  <button
                    className={`btn btn-xs ${isC ? 'btn-ghost' : 'btn-blue'}`}
                    onClick={() => toggleFollow(p)}
                  >
                    {connIds.has(p.id) ? 'Connected' : isC ? 'Requested' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="side-card">
            <h4>Your applications</h4>
            {yours.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Apply to an opportunity to track it here.</p>
            ) : yours.map(({ o, a }) => (
              <div className="mini-list-item" key={o.id} onClick={() => setDetailId(o.id)} style={{ cursor: 'pointer' }}>
                <Tag color={a.status === 'SHORTLISTED' ? 'green' : a.status === 'REJECTED' ? 'gray' : a.intent === 'ATTEND' ? 'green' : 'sky'}>
                  {a.status === 'SHORTLISTED' ? "You're invited" : a.status === 'REJECTED' ? 'Not selected' : a.intent === 'ATTEND' ? 'Attending' : 'Applied'}
                </Tag>
                <div><b style={{ fontWeight: 500 }}>{o.title}</b><span>{o.city}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {detailId && detailOpp && (
        <OppDetail
          opp={detailOpp} app={myApp(detailOpp)} userId={userId} busy={busyId === detailOpp.id}
          saved={isBookmarked('opp', detailOpp.id)}
          onSave={() => { const sv = toggleBookmark('opp', detailOpp.id); pushToast(sv ? 'Saved to your bookmarks.' : 'Removed from bookmarks.'); }}
          onClose={closeDetail}
          onApply={(intent) => apply(detailOpp, intent)} onWithdraw={() => withdraw(detailOpp)}
          onProfile={(id) => { closeDetail(); navigate(`/profile/${id}`); }}
          onMessage={messageHost}
          onManage={() => { closeDetail(); setTab('mine'); loadApplications(detailOpp.id); }}
        />
      )}
    </div>
  );
}
