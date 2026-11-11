// A gig's extra details (venue, date, time) live inside `requirements`. Older gigs just have plain text there.
export function oppMeta(o) {
  const r = o?.requirements;
  if (r && typeof r === 'object') {
    return { text: r.text || '', venue: r.venue || '', date: r.date || '', time: r.time || '', endTime: r.endTime || '', address: r.address || '' };
  }
  return { text: typeof r === 'string' ? r : '', venue: '', date: '', time: '', endTime: '', address: '' };
}

/** Everything searchable about a gig as one string. */
export function oppText(o) {
  const m = oppMeta(o);
  return [o?.title, o?.description, m.text, m.venue, o?.city, o?.genre, o?.poster?.name].filter(Boolean).join(' ');
}

export function fmtTime(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function fmtDay(d) {
  if (!d) return '';
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtWhen(m) {
  const day = fmtDay(m.date);
  const t = fmtTime(m.time);
  const e = fmtTime(m.endTime);
  return [day, t && (e ? `${t} – ${e}` : t)].filter(Boolean).join(' · ');
}
