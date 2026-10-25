import crypto from 'node:crypto';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad } from '../lib/http.js';
import { notify } from '../lib/notify.js';
import { emailEnabled } from '../lib/email.js';
import { pushEnabled } from '../lib/push.js';

const router = Router();

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alike characters
function makeCode() {
  const bytes = crypto.randomBytes(7);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

// GET /api/account/prefs — notification settings + what the server can actually send.
router.get('/prefs', auth, asyncHandler(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { emailAlerts: true, weeklyDigest: true, email: true } });
  res.json({
    emailAlerts: u?.emailAlerts ?? true,
    weeklyDigest: u?.weeklyDigest ?? true,
    hasEmail: !!u?.email,
    emailAvailable: emailEnabled(),
    pushAvailable: pushEnabled(),
  });
}));

// PATCH /api/account/prefs  { emailAlerts?, weeklyDigest? }
router.patch('/prefs', auth, asyncHandler(async (req, res) => {
  const data = {};
  for (const k of ['emailAlerts', 'weeklyDigest']) {
    if (req.body?.[k] !== undefined) {
      if (typeof req.body[k] !== 'boolean') return bad(res, 400, `Field "${k}" must be true or false.`);
      data[k] = req.body[k];
    }
  }
  const u = await prisma.user.update({ where: { id: req.user.id }, data, select: { emailAlerts: true, weeklyDigest: true } });
  res.json(u);
}));

// GET /api/account/referral — my invite code (made on first use) and who joined with it.
router.get('/referral', auth, asyncHandler(async (req, res) => {
  let me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { referralCode: true, foundingMember: true } });
  for (let i = 0; i < 5 && !me.referralCode; i++) {
    try {
      me = await prisma.user.update({ where: { id: req.user.id }, data: { referralCode: makeCode() }, select: { referralCode: true, foundingMember: true } });
    } catch (e) {
      if (e?.code !== 'P2002') throw e; // code clash: try another
    }
  }
  const [count, recent] = await Promise.all([
    prisma.user.count({ where: { referredById: req.user.id } }),
    prisma.user.findMany({ where: { referredById: req.user.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, avatarUrl: true } }),
  ]);
  res.json({ code: me.referralCode, foundingMember: me.foundingMember, invited: count, recent });
}));

// POST /api/account/referral/claim  { code } — credit the person who invited me (once).
router.post('/referral/claim', auth, asyncHandler(async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return bad(res, 400, 'That invite code does not look right.');
  const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, referredById: true, createdAt: true } });
  if (me.referredById) return res.json({ ok: true, already: true });
  // Invite credit is for people who just joined, not long-time members clicking a link.
  if (Date.now() - new Date(me.createdAt).getTime() > 7 * 24 * 3600 * 1000) return res.json({ ok: true, expired: true });
  const inviter = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true, name: true } });
  if (!inviter || inviter.id === me.id) return bad(res, 404, 'That invite code was not found.');
  await prisma.user.update({ where: { id: me.id }, data: { referredById: inviter.id } });
  notify(inviter.id, {
    type: 'referral',
    title: `${me.name} joined with your invite`,
    body: 'Thanks for bringing your network to Gigset.',
    link: `/profile/${me.id}`,
    email: { subject: `${me.name} joined Gigset with your invite`, cta: 'See their profile' },
  });
  res.json({ ok: true, invitedBy: inviter.name });
}));

export default router;
