import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { avatarColor, initials } from '../data/demo';

/* Brand logo: a "G" cut from a sound-wave ring, on a gradient tile. */
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="gsg" x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" /><stop offset=".55" stopColor="#2A63EE" /><stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#gsg)" />
      <path d="M22.4 11.6A8 8 0 1 0 24 16h-7" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="9" r="1.7" fill="#fff" opacity=".9" />
    </svg>
  );
}

export function Logo({ size = 26, light = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-0.02em', color: light ? '#fff' : undefined }}>
      <LogoMark size={size + 4} />
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
