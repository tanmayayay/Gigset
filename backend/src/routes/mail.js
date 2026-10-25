import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, bad } from '../lib/http.js';
import { sendEmail, emailEnabled, layout, appUrl, unsubUrl, unsubToken, esc } from '../lib/email.js';

const router = Router();

const page = (msg) => `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;color:#0b1530"><h2>Gigset</h2><p>${esc(msg)}</p></body>`;

// GET /api/email/unsubscribe?u=&k=alerts|digest&t=  — one-click, signed link from every email.
router.get('/unsubscribe', asyncHandler(async (req, res) => {
  const { u, k, t } = req.query;
  if (!['alerts', 'digest'].includes(k) || typeof u !== 'string' || typeof t !== 'string') return res.status(400).send(page('This link is not valid.'));
  const want = unsubToken(u, k);
  const ok = t.length === want.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(want));
  if (!ok) return res.status(400).send(page('This link is not valid.'));
  await prisma.user.updateMany({ where: { id: u }, data: k === 'alerts' ? { emailAlerts: false } : { weeklyDigest: false } });
  res.send(page(k === 'alerts' ? 'You will no longer get alert emails from Gigset.' : 'You will no longer get the weekly Gigset digest.'));
}));

const IST_MS = 5.5 * 3600 * 1000;
const dayKey = (ms) => new Date(ms + IST_MS).toISOString().slice(0, 10);

// POST /api/email/digest — called weekly by a scheduler (GitHub Action) with header x-cron-secret.
// Sends each opted-in person a short summary; skips anyone with nothing to report.
router.post('/digest', asyncHandler(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const given = String(req.headers['x-cron-secret'] || '');
  if (!secret || given.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return bad(res, 403, 'Forbidden.');
  if (!emailEnabled()) return res.json({ sent: 0, skipped: 'email not configured' });

  const dry = req.query.dry === '1';
  const cutoff = new Date(Date.now() - 6 * 24 * 3600 * 1000);
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const fromDay = dayKey(Date.now() - 7 * 24 * 3600 * 1000);
  const users = await prisma.user.findMany({
    where: { weeklyDigest: true, email: { not: null }, OR: [{ lastDigestAt: null }, { lastDigestAt: { lt: cutoff } }] },
    select: { id: true, name: true, email: true, city: true },
    take: 300,
  });

  let sent = 0, skipped = 0;
  for (const u of users) {
    const [views, followers, pending, unreadMsgs, opps] = await Promise.all([
      prisma.profileViewDay.aggregate({ where: { profileId: u.id, day: { gte: fromDay } }, _sum: { views: true } }),
      prisma.connection.count({ where: { followeeId: u.id, createdAt: { gte: since } } }),
      prisma.booking.count({ where: { hostId: u.id, status: 'PENDING' } }),
      prisma.message.count({ where: { senderId: { not: u.id }, readAt: null, conversation: { members: { some: { userId: u.id } } } } }),
      u.city ? prisma.opportunity.findMany({ where: { status: 'OPEN', city: u.city, createdAt: { gte: since }, posterId: { not: u.id } }, orderBy: { createdAt: 'desc' }, take: 3, select: { title: true } }) : [],
    ]);
    const v = views._sum.views || 0;
    if (!v && !followers && !pending && !unreadMsgs && !opps.length) { skipped++; continue; }
    const rows = [];
    if (v) rows.push({ label: 'Profile views this week', value: String(v) });
    if (followers) rows.push({ label: 'New followers', value: `+${followers}` });
    if (pending) rows.push({ label: 'Booking requests waiting', value: String(pending) });
    if (unreadMsgs) rows.push({ label: 'Unread messages', value: String(unreadMsgs) });
    const gigs = opps.length ? `<br><br><b>New gigs in ${esc(u.city)}:</b><br>${opps.map((o) => `• ${esc(o.title)}`).join('<br>')}` : '';
    if (!dry) {
      const ok = await sendEmail({
        to: u.email,
        subject: pending ? `${pending} booking request${pending > 1 ? 's' : ''} waiting on Gigset` : 'Your week on Gigset',
        html: layout({
          title: `Your week, ${esc(u.name.split(' ')[0])}`,
          intro: `Here's what happened on your Gigset profile.${gigs}`,
          rows,
          cta: pending ? 'Review requests' : 'Open Gigset',
          ctaUrl: appUrl(pending ? '/collab?tab=bookings' : '/home'),
          unsubscribe: unsubUrl(u.id, 'digest'),
        }),
      });
      if (ok) { await prisma.user.update({ where: { id: u.id }, data: { lastDigestAt: new Date() } }); sent++; }
      await new Promise((r) => setTimeout(r, 120)); // stay well under the email provider's rate limit
    } else sent++;
  }
  res.json({ sent, skipped, considered: users.length, dry });
}));

export default router;
