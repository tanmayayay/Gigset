import { prisma } from './prisma.js';

const seen = new Set(); // "userId:YYYY-MM-DD" already recorded by this server
const dayKey = () => new Date().toISOString().slice(0, 10);

/** Remember that someone used the app today (one tiny write per person per day). */
export function touchActive(userId) {
  if (!userId) return;
  const key = `${userId}:${dayKey()}`;
  if (seen.has(key)) return;
  if (seen.size > 50000) seen.clear();
  seen.add(key);
  prisma.activeDay.createMany({ data: [{ userId, day: dayKey() }], skipDuplicates: true }).catch(() => seen.delete(key));
}
