// ============================================================
// GIGSET — live (real-world) data loader
// A sibling data pipeline writes JSON snapshots to ./live/:
//   venues.json, events.json, news.json, meta.json
// If those files are absent (glob matches nothing), every export
// falls back to an empty value and the app behaves exactly as
// before — the demo experience is untouched.
// ============================================================

const mods = import.meta.glob('./live/*.json', { eager: true });
const load = (n) => mods[`./live/${n}`]?.default ?? null;

const asArray = (v) => (Array.isArray(v) ? v : []);

export const liveVenues = asArray(load('venues.json'));
export const liveEvents = asArray(load('events.json'));
export const liveNews = asArray(load('news.json'));
export const liveMeta = load('meta.json');
export const hasLiveData = (liveVenues.length + liveEvents.length + liveNews.length) > 0;

// ---------- defensive helpers ----------
// Parse an ISO-ish string; returns a Date or null when invalid.
export function safeDate(s) {
  if (!s || typeof s !== 'string') return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "Mon, 2 Nov, 7:00 pm" — returns null when unparseable, so the
// caller can hide the date chip instead of showing garbage.
export function fmtLiveDateTime(iso) {
  const d = safeDate(iso);
  if (!d) return null;
  try {
    return d.toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return null;
  }
}

// "3h ago" / "2d ago" / "24 Sep 2026" — '' when unparseable.
export function fmtRelative(iso) {
  const d = safeDate(iso);
  if (!d) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  try {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

// Provenance pill text for a live item: "via Ticketmaster" etc.
// Demo honesty: every real item must carry this visibly.
export function viaLabel(item, fallback = 'live feed') {
  const src = item && typeof item.source === 'string' && item.source.trim()
    ? item.source.trim()
    : fallback;
  return `via ${src}`;
}
