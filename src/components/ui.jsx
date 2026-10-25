import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { avatarColor, initials } from '../data/demo';

/* Brand logo */
export function Logo({ size = 26, light = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, color: light ? '#fff' : undefined }}>
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <path d="M4 21C4 21 6 5 13 5C20 5 22 21 22 21" stroke="#2A63EE" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 21C8 21 9 11 13 11C17 11 18 21 18 21" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className={light ? '' : 'brand-gradient-text'}>Gigset</span>
    </span>
  );
}

/* Initials avatar */
export function Avatar({ name, size = 36, style, gradient, src }) {
  const fs = Math.round(size * 0.38);
  const [broken, setBroken] = useState(false);
  const showImg = !!src && !broken;
  return (
    <div
      className="avatar"
      style={{
        width: size, height: size, fontSize: fs,
        background: gradient || avatarColor(name || '?'),
        overflow: 'hidden',
        ...style,
      }}
    >
      {showImg
        ? <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : initials(name || '?')}
    </div>
  );
}

/* Verified badge (blue tick) */
export function Verified({ size = 15 }) {
  return (
    <span className="verified-badge" title="Verified profile" style={{ width: size, height: size }}>
      <BadgeCheck size={size} strokeWidth={2.6} />
    </span>
  );
}

/* Small colored tag */
export function Tag({ color = 'blue', children }) {
  return <span className={`tag tag-${color}`}>{children}</span>;
}

/* Section heading used on pages */
export function PageHead({ title, sub, action }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* Polished empty state */
export function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{text}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/* Generic modal */
export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={wide ? { width: 640 } : undefined} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="close-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Pure-SVG sparkline (no chart lib) */
export function Sparkline({ data, width = 260, height = 56, stroke = 'var(--blue)' }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 6 - ((v - min) / (max - min || 1)) * (height - 14);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${pts.join(' L')}`;
  const area = `${line} L${width},${height} L0,${height} Z`;
  const gid = `sg-${Math.round(width)}-${data.length}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={parseFloat(pts[pts.length - 1].split(',')[1])} r="3.5" fill={stroke} />
    </svg>
  );
}
