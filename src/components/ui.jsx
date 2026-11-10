import { createPortal } from 'react-dom';
import logoDarkText from '../assets/brand/logo-dark-text.png';
import logoLightText from '../assets/brand/logo-light-text.png';
import markForLight from '../assets/brand/mark-for-light.png';
import markForDark from '../assets/brand/mark-for-dark.png';
import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { avatarColor, initials } from '../data/demo';

/* Brand logo: a "G" cut from a sound-wave ring, on a gradient tile. */
export function LogoMark({ size = 28, dark = false }) {
  return <img src={dark ? markForDark : markForLight} alt="" width={size} height={size} style={{ flexShrink: 0, display: 'block' }} />;
}

/* TheGigSet logo. `light` forces the white-text version (for dark panels). Otherwise it follows the theme. */
export function Logo({ size = 26, light = false }) {
  return (
    <span className={`tgs-logo${light ? ' force-light' : ''}`} style={{ '--tgs-h': `${Math.round(size * 1.25)}px` }} role="img" aria-label="TheGigSet">
      <img className="on-light" src={logoDarkText} alt="" />
      <img className="on-dark" src={logoLightText} alt="" />
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
  // Rendered on <body> so no parent (blurred cards, sticky rails) can clip or re-position it.
  return createPortal((
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={wide ? { width: 640 } : undefined} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="close-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  ), document.body);
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
