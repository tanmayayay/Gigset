import { useMemo, useState } from 'react';

export const PALETTE = ['#5B86F5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#64748b'];
export const fmt = (n) => (n == null ? '–' : n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : n.toLocaleString('en-IN'));
const niceMax = (m) => { if (m <= 4) return 4; const p = 10 ** Math.floor(Math.log10(m)); const f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
const shortDay = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Tiny trend line for KPI tiles. */
export function Spark({ values, color = PALETTE[0], w = 96, h = 30 }) {
  if (!values?.length) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${h - 2 - (v / max) * (h - 5)}`).join(' ');
  return <svg className="ad-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

/** Multi-series line/area chart. Hover for a crosshair and every value for that day; click the legend to hide a line. */
export function LineChart({ labels, series, height = 260 }) {
  const [off, setOff] = useState(() => new Set());
  const [hover, setHover] = useState(null);
  const W = 800, H = height, L = 40, R = 14, T = 14, B = 28;
  const shown = series.filter((s) => !off.has(s.key));
  const max = niceMax(Math.max(1, ...shown.flatMap((s) => s.values)));
  const x = (i) => L + (i / Math.max(labels.length - 1, 1)) * (W - L - R);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const step = Math.ceil(labels.length / 7);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(labels.length - 1, Math.round(((px - L) / (W - L - R)) * (labels.length - 1)))));
  };
  return (
    <div className="ad-chart">
      <div className="ad-legend">
        {series.map((s) => (
          <button key={s.key} className={off.has(s.key) ? 'off' : ''} onClick={() => setOff((o) => { const n = new Set(o); n.has(s.key) ? n.delete(s.key) : n.add(s.key); return n; })}>
            <i style={{ background: s.color }} />{s.name}
          </button>
        ))}
      </div>
      <div className="ad-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend chart" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="ad-grid" /><text x={L - 6} y={y(t) + 4} textAnchor="end" className="ad-axis">{fmt(t)}</text></g>)}
          {labels.map((d, i) => (i % step === 0 ? <text key={d} x={x(i)} y={H - 8} textAnchor="middle" className="ad-axis">{shortDay(d)}</text> : null))}
          {shown.map((s, k) => {
            const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
            return (
              <g key={s.key}>
                {k === 0 && <polygon points={`${x(0)},${y(0)} ${pts.join(' ')} ${x(labels.length - 1)},${y(0)}`} fill={s.color} opacity="0.1" />}
                <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
          {hover != null && <>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="ad-cross" />
            {shown.map((s) => <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill={s.color} stroke="var(--panel,#fff)" strokeWidth="2" />)}
          </>}
        </svg>
        {hover != null && (
          <div className="ad-tip" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > labels.length * 0.6 ? '-105%' : '12px'})` }}>
            <b>{shortDay(labels[hover])}</b>
            {shown.map((s) => <div key={s.key}><i style={{ background: s.color }} />{s.name}<span>{fmt(s.values[hover])}</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Horizontal bars. Pass onPick to make bars clickable. */
export function Bars({ rows, onPick, color = PALETTE[0], format = (r) => r.key }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((a, r) => a + r.n, 0) || 1;
  if (!rows.length) return <p className="ad-empty">No data yet.</p>;
  return (
    <div className="ad-bars">
      {rows.map((r) => (
        <button key={r.key} className="ad-bar" disabled={!onPick} onClick={() => onPick?.(r)} title={`${r.n} (${Math.round((r.n / total) * 100)}%)`}>
          <span className="ad-bar-k">{format(r)}</span>
          <span className="ad-bar-t"><i style={{ width: `${(r.n / max) * 100}%`, background: color }} /></span>
          <span className="ad-bar-n">{fmt(r.n)}</span>
        </button>
      ))}
    </div>
  );
}

/** Donut with hover highlight and a centre read-out. */
export function Donut({ rows, format = (r) => r.key, onPick }) {
  const [hi, setHi] = useState(null);
  const total = rows.reduce((a, r) => a + r.n, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="ad-donut">
      <svg viewBox="0 0 140 140" width="150" height="150">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--border)" strokeWidth="18" opacity=".35" />
        {rows.map((r, i) => {
          const len = total ? (r.n / total) * C : 0;
          const el = <circle key={r.key} cx="70" cy="70" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={hi === i ? 22 : 18} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" style={{ cursor: onPick ? 'pointer' : 'default', transition: 'stroke-width .15s' }} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} onClick={() => onPick?.(r)} />;
          acc += len;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="ad-donut-n">{fmt(hi != null ? rows[hi].n : total)}</text>
        <text x="70" y="84" textAnchor="middle" className="ad-axis">{hi != null ? format(rows[hi]) : 'total'}</text>
      </svg>
      <ul>{rows.map((r, i) => <li key={r.key} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} className={hi === i ? 'on' : ''}><i style={{ background: PALETTE[i % PALETTE.length] }} />{format(r)}<span>{total ? Math.round((r.n / total) * 100) : 0}%</span></li>)}</ul>
    </div>
  );
}

/** Funnel: each step with how many carried on from the step before. */
export function Funnel({ steps }) {
  const top = Math.max(1, steps[0]?.n || 1);
  return (
    <div className="ad-funnel">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1].n : null;
        return (
          <div key={s.key} className="ad-fstep">
            <div className="ad-fbar" style={{ width: `${Math.max(6, (s.n / top) * 100)}%`, background: PALETTE[i % PALETTE.length] }}><b>{fmt(s.n)}</b></div>
            <span>{s.key}{prev != null && prev > 0 && <em>{Math.round((s.n / prev) * 100)}% of previous</em>}</span>
          </div>
        );
      })}
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Weekday x hour heat map (shifted from UTC to India time, rounded to the hour). */
export function Heatmap({ cells }) {
  const [tip, setTip] = useState(null);
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const c of cells) {
      let h = c.hr + 5, d = c.dow;
      if (h >= 24) { h -= 24; d = (d + 1) % 7; }
      g[d][h] += c.n;
    }
    return g;
  }, [cells]);
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="ad-heat">
      <div className="ad-heat-grid">
        {grid.map((row, d) => (
          <div key={d} className="ad-heat-row">
            <span>{DAYS[d]}</span>
            {row.map((n, h) => <i key={h} style={{ background: n ? `color-mix(in srgb, var(--blue) ${Math.round(12 + (n / max) * 88)}%, transparent)` : 'var(--border)', opacity: n ? 1 : 0.35 }} onMouseEnter={() => setTip({ d, h, n })} onMouseLeave={() => setTip(null)} />)}
          </div>
        ))}
        <div className="ad-heat-row ad-heat-x"><span />{Array.from({ length: 24 }, (_, h) => <em key={h}>{h % 6 === 0 ? `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` : ''}</em>)}</div>
      </div>
      <p className="ad-heat-tip">{tip ? <><b>{DAYS[tip.d]} {tip.h % 12 || 12}{tip.h < 12 ? ' AM' : ' PM'}</b> · {tip.n} actions</> : 'Hover a square to see activity. Times in IST.'}</p>
    </div>
  );
}

/** Weekly signup cohorts and how many came back in each following week. */
export function Retention({ rows }) {
  if (!rows.length) return <p className="ad-empty">Not enough sign-ups yet.</p>;
  return (
    <div className="ad-ret">
      <table>
        <thead><tr><th>Joined week</th><th>People</th>{Array.from({ length: 8 }, (_, i) => <th key={i}>{i === 0 ? 'Wk 0' : `+${i}`}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.cohort}>
              <td>{shortDay(r.cohort)}</td><td>{r.size}</td>
              {r.weeks.map((n, i) => {
                const pct = n == null || !r.size ? null : Math.round((n / r.size) * 100);
                return <td key={i} title={n == null ? '' : `${n} of ${r.size} came back`} style={pct == null ? undefined : { background: `color-mix(in srgb, var(--blue) ${Math.max(8, pct)}%, transparent)`, color: pct > 55 ? '#fff' : undefined }}>{pct == null ? '' : `${pct}%`}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
