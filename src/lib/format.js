/** Relative time like "3m ago", "2h ago", "4d ago". */
export function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(s)) return '';
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Backend notification links sometimes point at API-style paths that have no
 * frontend route (e.g. /opportunities/:id from the seed data). Map those to
 * the closest real page so taps never land on a dead route.
 */
export function resolveNotifLink(link, n) {
  if (!link) return '/';
  // Older application notifications pointed at Gighub; they belong on the Collab page.
  if (link === '/gighub' && n?.type === 'application') return '/collab';
  if (link.startsWith('/opportunities')) return '/collab';
  return link;
}
