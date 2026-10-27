import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Admin } from '../../lib/api';
import { LineChart, Bars, Donut, Funnel, Heatmap, Retention, Spark, PALETTE, fmt } from './charts';
import { roleLabel } from '../../lib/profileSchema';

const RANGES = [7, 30, 90];
const SERIES = [
  ['active', 'Active people', PALETTE[0]], ['signups', 'New sign-ups', PALETTE[4]], ['posts', 'Posts', PALETTE[1]], ['comments', 'Comments', PALETTE[5]],
  ['messages', 'Messages', PALETTE[3]], ['bookings', 'Booking requests', PALETTE[2]], ['applications', 'Gig applications', PALETTE[6]], ['follows', 'Follows', PALETTE[7]],
];
const delta = (v) => { const h = Math.floor(v.length / 2); const a = v.slice(0, h).reduce((x, y) => x + y, 0), b = v.slice(h).reduce((x, y) => x + y, 0); return a === 0 ? (b > 0 ? 100 : 0) : Math.round(((b - a) / a) * 100); };

function Kpi({ label, value, hint, values, color, onClick, warn }) {
  const d = values ? delta(values) : null;
  return (
    <button className={`ad-kpi${warn ? ' warn' : ''}`} onClick={onClick} disabled={!onClick}>
      <span>{label}</span><b>{fmt(value)}</b>
      {values && <Spark values={values} color={color} />}
      <em className={d > 0 ? 'up' : d < 0 ? 'down' : ''}>{d != null ? `${d > 0 ? '▲' : d < 0 ? '▼' : '–'} ${Math.abs(d)}% vs earlier half` : hint}</em>
    </button>
  );
}

export default function Overview({ go }) {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    Admin.analytics(days).then((r) => { if (alive) { setD(r); setErr(''); } }).catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [days]);
  if (err) return <p className="ad-empty">{err}</p>;
  if (!d) return <div className="shimmer-strip" style={{ height: 320, borderRadius: 16 }} />;
  const k = d.kpis, s = d.series;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  return (
    <div className="ad-stack">
      <div className="ad-row-head">
        <div><h2>How Gigset is doing</h2><p>Live numbers from your database. Click anything with a hover effect to dig in.</p></div>
        <div className="ad-seg">{RANGES.map((r) => <button key={r} className={days === r ? 'on' : ''} onClick={() => setDays(r)}>{r} days</button>)}</div>
      </div>

      <div className="ad-kpis">
        <Kpi label="Total people" value={k.users} values={s.signups} color={PALETTE[4]} onClick={() => go('people')} />
        <Kpi label="Active today" value={k.activeToday} values={s.active} color={PALETTE[0]} />
        <Kpi label="Active this week" value={k.wau} hint={`${k.users ? Math.round((k.wau / k.users) * 100) : 0}% of everyone`} />
        <Kpi label="Active this month" value={k.mau} hint={`${k.mau ? Math.round((k.activeToday / k.mau) * 100) : 0}% come back daily`} />
        <Kpi label={`New in ${days} days`} value={k.newInRange} values={s.signups} color={PALETTE[4]} />
        <Kpi label="Posts" value={sum(s.posts)} values={s.posts} color={PALETTE[1]} hint={`${fmt(k.posts)} all time`} />
        <Kpi label="Booking requests" value={sum(s.bookings)} values={s.bookings} color={PALETTE[2]} />
        <Kpi label="Messages" value={sum(s.messages)} values={s.messages} color={PALETTE[3]} />
        <Kpi label="Open reports" value={k.openReports} hint="needs a look" warn={k.openReports > 0} onClick={() => go('reports')} />
        <Kpi label="Awaiting verification" value={k.pendingVerify} hint="people asked for the badge" warn={k.pendingVerify > 0} onClick={() => go('people', { filter: 'pending' })} />
      </div>

      <section className="ad-card">
        <h3>Trends</h3>
        <p className="ad-sub">Click a name below the title to hide or show that line. Move your mouse over the chart for exact numbers.</p>
        <LineChart labels={d.labels} series={SERIES.map(([key, name, color]) => ({ key, name, color, values: s[key] })).filter((x, i) => i < 5 || sum(x.values) > 0)} />
      </section>

      <div className="ad-grid2">
        <section className="ad-card"><h3>Who is on Gigset</h3><p className="ad-sub">Click a slice to see those people.</p>
          <Donut rows={d.breakdowns.role} format={(r) => roleLabel(r.key)} onPick={(r) => go('people', { type: r.key })} /></section>
        <section className="ad-card"><h3>Where they are</h3><p className="ad-sub">Top cities. Click a bar to list them.</p>
          <Bars rows={d.breakdowns.city} color={PALETTE[0]} onPick={(r) => r.key !== 'Not set' && go('people', { search: r.key })} /></section>
      </div>

      <section className="ad-card"><h3>From sign-up to first booking</h3><p className="ad-sub">Of the {d.funnel[0].n} people who joined in the last {days} days. The gaps show where people drift away.</p><Funnel steps={d.funnel} /></section>

      <div className="ad-grid2">
        <section className="ad-card"><h3>When people are active</h3><p className="ad-sub">Posts, comments and messages by day and hour. Good times to announce something.</p><Heatmap cells={d.heat} /></section>
        <section className="ad-card"><h3>Marketplace health</h3>
          <p className="ad-sub">Booking requests by outcome</p><Bars rows={d.breakdowns.bookings} color={PALETTE[2]} format={(r) => ({ PENDING: 'Waiting', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled' }[r.key] || r.key)} />
          <p className="ad-sub" style={{ marginTop: 16 }}>Gigs posted</p><Bars rows={d.breakdowns.opportunities} color={PALETTE[3]} />
          <p className="ad-sub" style={{ marginTop: 16 }}>Verification</p><Bars rows={d.breakdowns.verification} color={PALETTE[4]} onPick={(r) => go('people', { filter: r.key === 'VERIFIED' ? 'verified' : r.key === 'PENDING' ? 'pending' : '' })} />
        </section>
      </div>

      <section className="ad-card"><h3>Do people come back?</h3><p className="ad-sub">Each row is a group who joined in the same week. Darker means more of them returned that many weeks later.</p><Retention rows={d.retention} /></section>

      <div className="ad-grid2">
        <section className="ad-card"><h3>Top posts</h3>
          {d.topPosts.length === 0 ? <p className="ad-empty">No liked posts in this period.</p> : d.topPosts.map((p) => <button key={p.id} className="ad-link" onClick={() => navigate(`/profile/${p.author.id}`)}><b>{p.body || '(photo)'}</b><span>{p.author.name} · {p.likes} likes</span></button>)}</section>
        <section className="ad-card"><h3>Busiest communities</h3>
          {d.topGroups.map((g) => <button key={g.id} className="ad-link" onClick={() => navigate(`/community?c=${g.slug || g.id}`)}><b>{g.name}</b><span>{g._count.posts} posts · {g._count.members} members</span></button>)}</section>
      </div>

      <section className="ad-card"><h3>Everything at a glance</h3>
        <div className="ad-mini">{[['Venues', k.venues], ['Events', k.events], ['Communities', k.communities], ['Conversations', k.conversations], ['Messages sent', k.messages], ['Community posts', k.communityPosts], ['Suspended', k.suspended], ['Admins', k.admins]].map(([l, v]) => <div key={l}><b>{fmt(v)}</b><span>{l}</span></div>)}</div></section>
    </div>
  );
}
