import { useEffect, useState } from 'react';
import { Eye, Users, Heart, MessageCircle, TrendingUp } from 'lucide-react';
import { Profiles } from '../../lib/api';

const short = (day) => { const [, m, d] = day.split('-'); return `${Number(d)}/${Number(m)}`; };

function Delta({ now, prev, days }) {
  if (!prev && !now) return <em>No views yet</em>;
  if (!prev) return <em className="up">New this period</em>;
  const pct = Math.round(((now - prev) / prev) * 100);
  return <em className={pct >= 0 ? 'up' : 'down'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% vs previous {days} days</em>;
}

/** Real profile analytics for the owner. */
export default function Insights() {
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let off = false;
    setData(null);
    setError('');
    Profiles.analytics(days).then((d) => { if (!off) setData(d); }).catch((e) => { if (!off) setError(e.message || 'Could not load insights.'); });
    return () => { off = true; };
  }, [days]);

  if (error) return <div className="pf-card pf-empty"><b>Insights unavailable</b>{error}</div>;
  if (!data) return <div className="pf-card"><div className="shimmer-strip" style={{ height: 150, borderRadius: 12 }} /></div>;

  const max = Math.max(...data.series.map((s) => s.views), 1);
  const r = data.requests;

  return (
    <>
      <div className="pf-card" style={{ paddingBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}><TrendingUp size={16} /> Profile views</h3>
          <div className="pf-seg" role="tablist" aria-label="Period">
            {[14, 30].map((d) => (
              <button key={d} role="tab" aria-selected={days === d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d} days</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '14px 0 4px' }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 34 }}>{data.views.toLocaleString()}</b>
          <span className="pf-delta"><Delta now={data.views} prev={data.prevViews} days={days} /></span>
        </div>
        <div className="pf-bars" aria-label="Views per day">
          {data.series.map((s) => (
            <div key={s.day} className={s.views ? '' : 'zero'} style={{ height: `${Math.max(6, (s.views / max) * 100)}%` }} title={`${short(s.day)} — ${s.views} view${s.views === 1 ? '' : 's'}`} />
          ))}
        </div>
        <div className="pf-axis"><span>{short(data.series[0].day)}</span><span>Today</span></div>
        {data.views === 0 && <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 12 }}>Views are counted when other people open your profile. Share your profile link to get started.</p>}
      </div>

      <div className="pf-kpis">
        <div className="pf-kpi"><span><Users size={13} style={{ verticalAlign: -2 }} /> Followers</span><b>{data.followers.toLocaleString()}</b><em className={data.newFollowers ? 'up' : ''}>+{data.newFollowers} this week</em></div>
        <div className="pf-kpi"><span><Heart size={13} style={{ verticalAlign: -2 }} /> Likes received</span><b>{data.likesReceived.toLocaleString()}</b><em>{data.posts} post{data.posts === 1 ? '' : 's'}</em></div>
        <div className="pf-kpi"><span><MessageCircle size={13} style={{ verticalAlign: -2 }} /> Comments</span><b>{data.commentsReceived.toLocaleString()}</b><em>on your posts</em></div>
        <div className="pf-kpi"><span><Eye size={13} style={{ verticalAlign: -2 }} /> Requests</span><b>{(r.pending + r.confirmed + r.cancelled).toLocaleString()}</b><em>{r.pending} waiting · {r.confirmed} confirmed</em></div>
      </div>

      <div className="pf-card">
        <h3>Your top posts</h3>
        {data.topPosts.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-faint)', margin: 0 }}>Post something to see what resonates.</p>
        ) : data.topPosts.map((p) => (
          <div key={p.id} className="pf-toppost">
            <p>{p.body}</p>
            <span>♥ {p._count.likes} · 💬 {p._count.comments}</span>
          </div>
        ))}
      </div>
    </>
  );
}
