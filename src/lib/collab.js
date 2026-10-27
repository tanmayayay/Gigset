export const VIBES = [
  { id: 'JAM', label: 'Jam session', emoji: '🎸', line: 'a jam session' },
  { id: 'WRITE', label: 'Write together', emoji: '✍️', line: 'writing something together' },
  { id: 'RECORD', label: 'Record something', emoji: '🎙️', line: 'recording something' },
  { id: 'GIG', label: 'Play a show', emoji: '🎤', line: 'playing a show together' },
  { id: 'HANG', label: 'Just vibe', emoji: '☕', line: 'hanging and swapping ideas' },
];
export const vibeOf = (id) => VIBES.find((v) => v.id === id) || VIBES[0];
export const SLOTS = ['Morning', 'Afternoon', 'Evening', 'Late night'];
export const whenText = (o) => `${new Date(`${o.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${o.slot}`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** A few easy one-tap suggestions for the next days. */
export function quickTimes() {
  const out = [];
  const now = new Date();
  const next = (dow, slot, label) => { const d = new Date(now); d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7 || 7)); out.push({ date: iso(d), slot, label }); };
  next(6, 'Evening', 'This Saturday evening'); next(0, 'Afternoon', 'This Sunday afternoon'); next(5, 'Late night', 'Friday night');
  return out;
}
export const todayIso = () => iso(new Date());
