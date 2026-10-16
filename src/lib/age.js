// Single place for the minimum age and quick client-side checks (the server is the real gate).
export const MIN_AGE = 13;

export function ageOf(iso, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
  const [y, m, d] = iso.split('-').map(Number);
  let a = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a -= 1;
  return a;
}

/** Returns an error string, or '' when the date is fine. */
export function birthError(iso) {
  if (!iso) return '';
  const a = ageOf(iso);
  if (a == null || a < 0 || a > 110) return 'That birth date does not look right.';
  if (a < MIN_AGE) return `Strings is for people ${MIN_AGE} and over.`;
  return '';
}
