// Admin console API. Everything here is behind adminOnly and every change is written to the audit log.
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, bad, notFound, pagination } from '../lib/http.js';
import { adminOnly, audit, isAdminUser } from '../middleware/admin.js';
import { forgetUser } from '../middleware/auth.js';
import { notify } from '../lib/notify.js';

const router = Router();
export const publicRouter = Router();

const dayKey = (d) => d.toISOString().slice(0, 10);
const startOfDayUtc = (daysAgo) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - daysAgo); return d; };
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ---------- Announcement banner (public read) ----------
publicRouter.get('/', asyncHandler(async (_req, res) => {
  const now = new Date();
  const items = await prisma.announcement.findMany({
    where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, title: true, body: true, tone: true },
  });
  res.json({ items });
}));

router.use(adminOnly);

router.get('/me', (req, res) => res.json({ admin: true, id: req.admin.id, name: req.admin.name }));

// ---------- Analytics ----------
async function daily(table, col, since) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_char("${col}" AT TIME ZONE 'UTC','YYYY-MM-DD') AS d, COUNT(*)::int AS n FROM "${table}" WHERE "${col}" >= $1 GROUP BY 1`, since);
  return new Map(rows.map((r) => [r.d, r.n]));
}

router.get('/analytics', asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days ?? '30', 10) || 30, 7), 180);
  const since = startOfDayUtc(days - 1);
  const labels = Array.from({ length: days }, (_, i) => dayKey(startOfDayUtc(days - 1 - i)));

  const sources = [['signups', 'User', 'createdAt'], ['posts', 'Post', 'createdAt'], ['comments', 'Comment', 'createdAt'], ['communityPosts', 'CommunityPost', 'createdAt'],
    ['messages', 'Message', 'createdAt'], ['bookings', 'Booking', 'createdAt'], ['applications', 'Application', 'createdAt'], ['opportunities', 'Opportunity', 'createdAt'],
    ['follows', 'Connection', 'createdAt'], ['reports', 'Report', 'createdAt']];
  const maps = await Promise.all(sources.map(([, t, c]) => daily(t, c, since)));
  const series = Object.fromEntries(sources.map(([k], i) => [k, labels.map((d) => maps[i].get(d) || 0)]));
  const activeRows = await prisma.activeDay.groupBy({ by: ['day'], where: { day: { gte: labels[0] } }, _count: { userId: true } });
  const am = new Map(activeRows.map((r) => [r.day, r._count.userId]));
  series.active = labels.map((d) => am.get(d) || 0);

  const today = dayKey(new Date());
  const [users, suspended, admins, openReports, activeToday, mau, wau, byRole, byCity, byVerif, bookingStatus, oppStatus, posts, cposts, convs, msgs, venues, events, groups, pendingVerify, funnelBase] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { suspendedAt: { not: null } } }), prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
    prisma.activeDay.count({ where: { day: today } }),
    prisma.activeDay.findMany({ where: { day: { gte: dayKey(startOfDayUtc(29)) } }, distinct: ['userId'], select: { userId: true } }).then((r) => r.length),
    prisma.activeDay.findMany({ where: { day: { gte: dayKey(startOfDayUtc(6)) } }, distinct: ['userId'], select: { userId: true } }).then((r) => r.length),
    prisma.user.groupBy({ by: ['stakeholderType'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['city'], _count: { _all: true }, orderBy: { _count: { city: 'desc' } }, take: 12 }),
    prisma.user.groupBy({ by: ['verificationStatus'], _count: { _all: true } }),
    prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.opportunity.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.post.count(), prisma.communityPost.count({ where: { removed: false } }), prisma.conversation.count(), prisma.message.count(),
    prisma.venue.count(), prisma.event.count(), prisma.communityGroup.count(),
    prisma.user.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { id: true, bio: true, city: true } }),
  ]);

  // Funnel for people who joined in this window: joined -> filled profile -> posted -> followed someone -> booked / applied
  const ids = funnelBase.map((u) => u.id);
  const filled = funnelBase.filter((u) => u.bio && u.city).length;
  const [posted, followed, transacted] = ids.length === 0 ? [0, 0, 0] : await Promise.all([
    prisma.post.findMany({ where: { authorId: { in: ids } }, distinct: ['authorId'], select: { authorId: true } }).then((r) => r.length),
    prisma.connection.findMany({ where: { followerId: { in: ids } }, distinct: ['followerId'], select: { followerId: true } }).then((r) => r.length),
    Promise.all([
      prisma.booking.findMany({ where: { requesterId: { in: ids } }, distinct: ['requesterId'], select: { requesterId: true } }),
      prisma.application.findMany({ where: { applicantId: { in: ids } }, distinct: ['applicantId'], select: { applicantId: true } }),
    ]).then(([a, b]) => new Set([...a.map((x) => x.requesterId), ...b.map((x) => x.applicantId)]).size),
  ]);

  // When people are busy: posts + comments + messages by weekday and hour (UTC; the client shifts to IST).
  const heat = await prisma.$queryRawUnsafe(
    `SELECT EXTRACT(DOW FROM t)::int AS dow, EXTRACT(HOUR FROM t)::int AS hr, COUNT(*)::int AS n FROM (
       SELECT "createdAt" AS t FROM "Post" WHERE "createdAt" >= $1 UNION ALL SELECT "createdAt" FROM "Comment" WHERE "createdAt" >= $1
       UNION ALL SELECT "createdAt" FROM "Message" WHERE "createdAt" >= $1) x GROUP BY 1,2`, since);

  // Weekly retention: of people who joined in a given week, how many came back in week 0,1,2...
  const rsince = startOfDayUtc(7 * 8);
  const cohortRows = await prisma.$queryRawUnsafe(
    `SELECT to_char(date_trunc('week', u."createdAt"),'YYYY-MM-DD') AS cohort, COUNT(*)::int AS size FROM "User" u WHERE u."createdAt" >= $1 GROUP BY 1 ORDER BY 1`, rsince);
  const backRows = await prisma.$queryRawUnsafe(
    `SELECT to_char(date_trunc('week', u."createdAt"),'YYYY-MM-DD') AS cohort,
            FLOOR(((a."day"::date) - date_trunc('week', u."createdAt")::date) / 7.0)::int AS wk, COUNT(DISTINCT u.id)::int AS n
     FROM "User" u JOIN "ActiveDay" a ON a."userId" = u.id WHERE u."createdAt" >= $1 GROUP BY 1,2`, rsince);
  const retention = cohortRows.map((c) => ({
    cohort: c.cohort, size: c.size,
    weeks: Array.from({ length: 8 }, (_, w) => backRows.find((b) => b.cohort === c.cohort && b.wk === w)?.n ?? null),
  }));

  // Top content
  const likeTop = await prisma.like.groupBy({ by: ['postId'], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { postId: 'desc' } }, take: 5 });
  const topPostsRaw = await prisma.post.findMany({ where: { id: { in: likeTop.map((l) => l.postId) } }, select: { id: true, body: true, author: { select: { id: true, name: true } } } });
  const topPosts = likeTop.map((l) => { const p = topPostsRaw.find((x) => x.id === l.postId); return p ? { id: p.id, body: p.body.slice(0, 120), author: p.author, likes: l._count._all } : null; }).filter(Boolean);
  const topGroups = await prisma.communityGroup.findMany({ take: 5, orderBy: { posts: { _count: 'desc' } }, select: { id: true, name: true, slug: true, _count: { select: { posts: true, members: true } } } });

  res.json({
    days, labels, series,
    kpis: { users, suspended, admins, openReports, activeToday, wau, mau, posts, communityPosts: cposts, conversations: convs, messages: msgs, venues, events, communities: groups, pendingVerify,
      newInRange: series.signups.reduce((a, b) => a + b, 0) },
    breakdowns: {
      role: byRole.map((r) => ({ key: r.stakeholderType, n: r._count._all })),
      city: byCity.map((r) => ({ key: r.city || 'Not set', n: r._count._all })),
      verification: byVerif.map((r) => ({ key: r.verificationStatus, n: r._count._all })),
      bookings: bookingStatus.map((r) => ({ key: r.status, n: r._count._all })),
      opportunities: oppStatus.map((r) => ({ key: r.status, n: r._count._all })),
    },
    funnel: [{ key: 'Joined', n: ids.length }, { key: 'Filled profile', n: filled }, { key: 'Posted', n: posted }, { key: 'Followed someone', n: followed }, { key: 'Booked or applied', n: transacted }],
    heat, retention, topPosts, topGroups,
  });
}));

// ---------- Users ----------
const userRow = {
  id: true, name: true, email: true, city: true, stakeholderType: true, role: true, verificationStatus: true, foundingMember: true,
  suspendedAt: true, suspendReason: true, createdAt: true, avatarUrl: true,
  _count: { select: { posts: true, followers: true, following: true, bookingsRequested: true, bookingsHosted: true, reportsMade: true } },
};

router.get('/users', asyncHandler(async (req, res) => {
  const { take, skip } = pagination(req);
  const where = {};
  const search = str(req.query.search, 80);
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { city: { contains: search, mode: 'insensitive' } }];
  const f = req.query.filter;
  if (f === 'suspended') where.suspendedAt = { not: null };
  else if (f === 'admins') where.role = 'ADMIN';
  else if (f === 'pending') where.verificationStatus = 'PENDING';
  else if (f === 'verified') where.verificationStatus = 'VERIFIED';
  else if (f === 'founding') where.foundingMember = true;
  else if (f === 'new') where.createdAt = { gte: startOfDayUtc(7) };
  if (req.query.type) where.stakeholderType = String(req.query.type);
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: userRow, orderBy: { createdAt: 'desc' }, take, skip }),
    prisma.user.count({ where }),
  ]);
  res.json({ items, total, take, skip });
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, select: { ...userRow, bio: true, detail: true, visibility: true } });
  if (!u) return notFound(res, 'User');
  const [reportsAgainst, recentPosts, lastActive] = await Promise.all([
    prisma.report.findMany({ where: { targetType: 'USER', targetId: u.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.post.findMany({ where: { authorId: u.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, body: true, createdAt: true } }),
    prisma.activeDay.findFirst({ where: { userId: u.id }, orderBy: { day: 'desc' }, select: { day: true } }),
  ]);
  res.json({ ...u, reportsAgainst, recentPosts, lastActive: lastActive?.day || null });
}));

async function target(req, res) {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, authId: true, role: true, email: true, suspendedAt: true } });
  if (!u) { notFound(res, 'User'); return null; }
  return u;
}

router.post('/users/:id/suspend', asyncHandler(async (req, res) => {
  const u = await target(req, res); if (!u) return;
  if (u.id === req.admin.id) return bad(res, 400, 'You cannot suspend your own account.');
  if (isAdminUser(u)) return bad(res, 400, 'Remove their admin access first.');
  const reason = str(req.body?.reason, 300) || 'Breach of community guidelines';
  await prisma.user.update({ where: { id: u.id }, data: { suspendedAt: new Date(), suspendReason: reason } });
  forgetUser(u.authId);
  await audit(req.admin, 'SUSPEND_USER', { targetType: 'USER', targetId: u.id, summary: `${u.name}: ${reason}` });
  res.json({ ok: true });
}));
router.post('/users/:id/unsuspend', asyncHandler(async (req, res) => {
  const u = await target(req, res); if (!u) return;
  await prisma.user.update({ where: { id: u.id }, data: { suspendedAt: null, suspendReason: null } });
  forgetUser(u.authId);
  await audit(req.admin, 'UNSUSPEND_USER', { targetType: 'USER', targetId: u.id, summary: u.name });
  res.json({ ok: true });
}));
router.post('/users/:id/verify', asyncHandler(async (req, res) => {
  const u = await target(req, res); if (!u) return;
  const status = ['VERIFIED', 'UNVERIFIED', 'PENDING'].includes(req.body?.status) ? req.body.status : 'VERIFIED';
  await prisma.user.update({ where: { id: u.id }, data: { verificationStatus: status } });
  if (status === 'VERIFIED') notify(u.id, { type: 'verified', title: 'You are verified', body: 'Your profile now shows the verified badge.', link: '/profile' });
  await audit(req.admin, 'SET_VERIFICATION', { targetType: 'USER', targetId: u.id, summary: `${u.name} → ${status}` });
  res.json({ ok: true });
}));
router.post('/users/:id/founding', asyncHandler(async (req, res) => {
  const u = await target(req, res); if (!u) return;
  const on = !!req.body?.on;
  await prisma.user.update({ where: { id: u.id }, data: { foundingMember: on } });
  await audit(req.admin, on ? 'SET_FOUNDING' : 'UNSET_FOUNDING', { targetType: 'USER', targetId: u.id, summary: u.name });
  res.json({ ok: true });
}));
router.post('/users/:id/role', asyncHandler(async (req, res) => {
  const u = await target(req, res); if (!u) return;
  const role = req.body?.role === 'ADMIN' ? 'ADMIN' : 'USER';
  if (u.id === req.admin.id && role !== 'ADMIN') return bad(res, 400, 'You cannot remove your own admin access.');
  await prisma.user.update({ where: { id: u.id }, data: { role } });
  forgetUser(u.authId);
  await audit(req.admin, role === 'ADMIN' ? 'MAKE_ADMIN' : 'REMOVE_ADMIN', { targetType: 'USER', targetId: u.id, summary: u.name });
  res.json({ ok: true });
}));
router.post('/users/:id/message', asyncHandler(async (req, res) => {
  const u = await target(req, res); if (!u) return;
  const title = str(req.body?.title, 100), body = str(req.body?.body, 400);
  if (!title) return bad(res, 400, 'Add a title.');
  await notify(u.id, { type: 'admin', title, body, link: '/notifications' });
  await audit(req.admin, 'MESSAGE_USER', { targetType: 'USER', targetId: u.id, summary: `${u.name}: ${title}` });
  res.json({ ok: true });
}));
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const u = await target(req, res); if (!u) return;
  if (u.id === req.admin.id) return bad(res, 400, 'You cannot delete your own account here.');
  if (isAdminUser(u)) return bad(res, 400, 'Remove their admin access first.');
  if (req.body?.confirm !== u.name) return bad(res, 400, 'Type the person\'s name exactly to confirm.');
  await prisma.user.delete({ where: { id: u.id } });
  forgetUser(u.authId);
  await audit(req.admin, 'DELETE_USER', { targetType: 'USER', targetId: u.id, summary: u.name });
  res.json({ ok: true });
}));

// ---------- Content ----------
router.get('/content', asyncHandler(async (req, res) => {
  const { take, skip } = pagination(req);
  const kind = req.query.kind || 'posts';
  const search = str(req.query.search, 80);
  const author = { select: { id: true, name: true } };
  if (kind === 'posts') {
    const where = search ? { body: { contains: search, mode: 'insensitive' } } : {};
    const [items, total] = await Promise.all([
      prisma.post.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip, select: { id: true, body: true, mediaUrl: true, createdAt: true, author, _count: { select: { likes: true, comments: true } } } }),
      prisma.post.count({ where })]);
    return res.json({ items, total });
  }
  if (kind === 'community') {
    const where = search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { body: { contains: search, mode: 'insensitive' } }] } : {};
    const [items, total] = await Promise.all([
      prisma.communityPost.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip, select: { id: true, title: true, body: true, mediaUrl: true, removed: true, pinned: true, score: true, createdAt: true, author, group: { select: { name: true, slug: true } } } }),
      prisma.communityPost.count({ where })]);
    return res.json({ items, total });
  }
  if (kind === 'opportunities') {
    const where = search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] } : {};
    const [items, total] = await Promise.all([
      prisma.opportunity.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip, select: { id: true, title: true, description: true, city: true, status: true, visibility: true, createdAt: true, poster: author, _count: { select: { applications: true } } } }),
      prisma.opportunity.count({ where })]);
    return res.json({ items, total });
  }
  return bad(res, 400, 'Unknown content type.');
}));

router.delete('/content/posts/:id', asyncHandler(async (req, res) => {
  const p = await prisma.post.findUnique({ where: { id: req.params.id }, select: { id: true, body: true, author: { select: { name: true } } } });
  if (!p) return notFound(res, 'Post');
  await prisma.post.delete({ where: { id: p.id } });
  await audit(req.admin, 'DELETE_POST', { targetType: 'POST', targetId: p.id, summary: `${p.author.name}: ${p.body.slice(0, 80)}` });
  res.json({ ok: true });
}));
router.post('/content/community/:id/remove', asyncHandler(async (req, res) => {
  const removed = req.body?.removed !== false;
  const p = await prisma.communityPost.update({ where: { id: req.params.id }, data: { removed }, select: { id: true, title: true } }).catch(() => null);
  if (!p) return notFound(res, 'Post');
  await audit(req.admin, removed ? 'REMOVE_COMMUNITY_POST' : 'RESTORE_COMMUNITY_POST', { targetType: 'COMMUNITY_POST', targetId: p.id, summary: p.title });
  res.json({ ok: true });
}));
router.post('/content/opportunities/:id/close', asyncHandler(async (req, res) => {
  const o = await prisma.opportunity.update({ where: { id: req.params.id }, data: { status: 'CLOSED' }, select: { id: true, title: true } }).catch(() => null);
  if (!o) return notFound(res, 'Opportunity');
  await audit(req.admin, 'CLOSE_OPPORTUNITY', { targetType: 'OPPORTUNITY', targetId: o.id, summary: o.title });
  res.json({ ok: true });
}));
router.delete('/content/opportunities/:id', asyncHandler(async (req, res) => {
  const o = await prisma.opportunity.findUnique({ where: { id: req.params.id }, select: { id: true, title: true } });
  if (!o) return notFound(res, 'Opportunity');
  await prisma.opportunity.delete({ where: { id: o.id } });
  await audit(req.admin, 'DELETE_OPPORTUNITY', { targetType: 'OPPORTUNITY', targetId: o.id, summary: o.title });
  res.json({ ok: true });
}));

// ---------- Reports ----------
router.get('/reports', asyncHandler(async (req, res) => {
  const { take, skip } = pagination(req);
  const status = ['OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED'].includes(req.query.status) ? req.query.status : 'OPEN';
  const [rows, total] = await Promise.all([
    prisma.report.findMany({ where: { status }, orderBy: { createdAt: 'desc' }, take, skip, include: { reporter: { select: { id: true, name: true } } } }),
    prisma.report.count({ where: { status } }),
  ]);
  // Show what was reported so nobody has to hunt for it.
  const items = await Promise.all(rows.map(async (r) => {
    let preview = null, authorId = null;
    try {
      if (r.targetType === 'USER') { const u = await prisma.user.findUnique({ where: { id: r.targetId }, select: { id: true, name: true, bio: true } }); preview = u && `${u.name}${u.bio ? ' · ' + u.bio.slice(0, 100) : ''}`; authorId = u?.id; }
      else if (r.targetType === 'POST') { const p = await prisma.post.findUnique({ where: { id: r.targetId }, select: { body: true, authorId: true } }); preview = p?.body.slice(0, 200); authorId = p?.authorId; }
      else if (r.targetType === 'COMMUNITY_POST') { const p = await prisma.communityPost.findUnique({ where: { id: r.targetId }, select: { title: true, body: true, authorId: true } }); preview = p && `${p.title}${p.body ? ' — ' + p.body.slice(0, 160) : ''}`; authorId = p?.authorId; }
      else if (r.targetType === 'COMMUNITY_COMMENT') { const c = await prisma.communityComment.findUnique({ where: { id: r.targetId }, select: { body: true, authorId: true } }); preview = c?.body.slice(0, 200); authorId = c?.authorId; }
      else if (r.targetType === 'OPPORTUNITY') { const o = await prisma.opportunity.findUnique({ where: { id: r.targetId }, select: { title: true, posterId: true } }); preview = o?.title; authorId = o?.posterId; }
      else if (r.targetType === 'MESSAGE') { const m = await prisma.message.findUnique({ where: { id: r.targetId }, select: { body: true, senderId: true } }); preview = m?.body.slice(0, 200); authorId = m?.senderId; }
    } catch { /* target may be gone */ }
    return { ...r, preview: preview || null, gone: !preview, authorId };
  }));
  res.json({ items, total });
}));

// action: DISMISS | HIDE (remove the content) | SUSPEND (suspend its author) | REVIEWED
router.post('/reports/:id', asyncHandler(async (req, res) => {
  const r = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!r) return notFound(res, 'Report');
  const action = req.body?.action;
  let status = 'REVIEWED', summary = `${r.targetType} ${r.reason}`;
  if (action === 'DISMISS') status = 'DISMISSED';
  if (action === 'HIDE') {
    status = 'ACTIONED';
    if (r.targetType === 'POST') await prisma.post.deleteMany({ where: { id: r.targetId } });
    else if (r.targetType === 'COMMUNITY_POST') await prisma.communityPost.updateMany({ where: { id: r.targetId }, data: { removed: true } });
    else if (r.targetType === 'COMMUNITY_COMMENT') await prisma.communityComment.updateMany({ where: { id: r.targetId }, data: { removed: true } });
    else if (r.targetType === 'OPPORTUNITY') await prisma.opportunity.updateMany({ where: { id: r.targetId }, data: { status: 'CLOSED' } });
    else return bad(res, 400, 'This kind of report has nothing to hide. Use Suspend instead.');
  }
  if (action === 'SUSPEND') {
    status = 'ACTIONED';
    const authorId = r.targetType === 'USER' ? r.targetId : req.body?.authorId;
    const u = authorId && await prisma.user.findUnique({ where: { id: String(authorId) }, select: { id: true, name: true, authId: true, role: true, email: true, suspendedAt: true } });
    if (!u) return bad(res, 400, 'Could not find the person to suspend.');
    if (isAdminUser(u)) return bad(res, 400, 'That person is an admin.');
    await prisma.user.update({ where: { id: u.id }, data: { suspendedAt: new Date(), suspendReason: `Report: ${r.reason}` } });
    forgetUser(u.authId);
    summary += ` · suspended ${u.name}`;
  }
  await prisma.report.update({ where: { id: r.id }, data: { status } });
  await audit(req.admin, `REPORT_${action || 'REVIEWED'}`, { targetType: r.targetType, targetId: r.targetId, summary });
  res.json({ ok: true });
}));

// ---------- Announcements and broadcast ----------
router.get('/announcements', asyncHandler(async (_req, res) => res.json({ items: await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }) })));
router.post('/announcements', asyncHandler(async (req, res) => {
  const title = str(req.body?.title, 100), body = str(req.body?.body, 300);
  if (!title) return bad(res, 400, 'Add a title.');
  const tone = ['info', 'success', 'warning'].includes(req.body?.tone) ? req.body.tone : 'info';
  const hours = Number(req.body?.hours);
  const a = await prisma.announcement.create({ data: { title, body: body || null, tone, createdBy: req.admin.name, expiresAt: hours > 0 ? new Date(Date.now() + Math.min(hours, 24 * 60) * 3600000) : null } });
  await audit(req.admin, 'ANNOUNCE', { targetType: 'ANNOUNCEMENT', targetId: a.id, summary: title });
  res.status(201).json(a);
}));
router.patch('/announcements/:id', asyncHandler(async (req, res) => {
  const a = await prisma.announcement.update({ where: { id: req.params.id }, data: { active: !!req.body?.active } }).catch(() => null);
  if (!a) return notFound(res, 'Announcement');
  await audit(req.admin, a.active ? 'ANNOUNCEMENT_ON' : 'ANNOUNCEMENT_OFF', { targetType: 'ANNOUNCEMENT', targetId: a.id, summary: a.title });
  res.json(a);
}));
router.delete('/announcements/:id', asyncHandler(async (req, res) => {
  await prisma.announcement.deleteMany({ where: { id: req.params.id } });
  await audit(req.admin, 'ANNOUNCEMENT_DELETE', { targetType: 'ANNOUNCEMENT', targetId: req.params.id });
  res.json({ ok: true });
}));
router.post('/broadcast', asyncHandler(async (req, res) => {
  const title = str(req.body?.title, 100), body = str(req.body?.body, 400);
  if (!title) return bad(res, 400, 'Add a title.');
  const where = ['PERFORMER', 'VENUE', 'BUYER', 'CREW', 'INSTITUTION'].includes(req.body?.type) ? { stakeholderType: req.body.type, suspendedAt: null } : { suspendedAt: null };
  const users = await prisma.user.findMany({ where, select: { id: true }, take: 20000 });
  await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, type: 'admin', title, body: body || null, link: '/notifications' })) });
  await audit(req.admin, 'BROADCAST', { summary: `${title} → ${users.length} people${req.body?.type ? ` (${req.body.type})` : ''}` });
  res.json({ ok: true, sent: users.length });
}));

// ---------- Audit log and export ----------
router.get('/audit', asyncHandler(async (req, res) => {
  const { take, skip } = pagination(req);
  const [items, total] = await Promise.all([prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take, skip }), prisma.auditLog.count()]);
  res.json({ items, total });
}));

router.get('/export/users.csv', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ select: { name: true, email: true, city: true, stakeholderType: true, verificationStatus: true, createdAt: true, suspendedAt: true }, orderBy: { createdAt: 'desc' }, take: 20000 });
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;
  const csv = ['Name,Email,City,Role,Verification,Joined,Suspended', ...users.map((u) => [u.name, u.email, u.city, u.stakeholderType, u.verificationStatus, u.createdAt.toISOString().slice(0, 10), u.suspendedAt ? 'yes' : ''].map(q).join(','))].join('\n');
  await audit(req.admin, 'EXPORT_USERS', { summary: `${users.length} rows` });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="gigset-users.csv"');
  res.send(csv);
}));

export default router;
