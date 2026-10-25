import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, tooLong } from '../lib/http.js';

const router = Router();

const TARGETS = ['USER', 'POST', 'MESSAGE', 'OPPORTUNITY', 'COMMUNITY_POST', 'COMMUNITY_COMMENT'];
const REASONS = ['SPAM', 'HARASSMENT', 'FAKE', 'INAPPROPRIATE', 'SCAM', 'OTHER'];

// POST /api/reports  { targetType, targetId, reason, details? }
router.post('/reports', auth, asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details } = req.body ?? {};
  if (!TARGETS.includes(targetType)) return bad(res, 400, `Field "targetType" must be one of: ${TARGETS.join(', ')}`);
  if (typeof targetId !== 'string' || !targetId || targetId.length > 60) return bad(res, 400, 'Field "targetId" is required.');
  if (!REASONS.includes(reason)) return bad(res, 400, `Field "reason" must be one of: ${REASONS.join(', ')}`);
  const long = tooLong(details, 1000, 'details');
  if (long) return bad(res, 400, long);
  // Don't let one person flood the queue.
  const recent = await prisma.report.count({ where: { reporterId: req.user.id, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } });
  if (recent >= 20) return bad(res, 429, 'You have sent a lot of reports today. Our team will review them.');
  await prisma.report.create({
    data: { reporterId: req.user.id, targetType, targetId, reason, details: typeof details === 'string' && details.trim() ? details.trim() : null },
  });
  // Community content hides itself once three different people have reported it; the report stays open for review.
  if (targetType === 'COMMUNITY_POST' || targetType === 'COMMUNITY_COMMENT') {
    const who = await prisma.report.findMany({ where: { targetType, targetId, status: 'OPEN' }, select: { reporterId: true }, distinct: ['reporterId'] });
    if (who.length >= 3) {
      const model = targetType === 'COMMUNITY_POST' ? prisma.communityPost : prisma.communityComment;
      await model.updateMany({ where: { id: targetId }, data: { removed: true } });
    }
  }
  res.status(201).json({ ok: true });
}));

// GET /api/blocks — people I blocked.
router.get('/blocks', auth, asyncHandler(async (req, res) => {
  const rows = await prisma.block.findMany({
    where: { blockerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { blocked: { select: { id: true, name: true, avatarUrl: true, stakeholderType: true, city: true } } },
  });
  res.json({ items: rows.map((r) => r.blocked) });
}));

// POST /api/blocks  { userId } — block someone (also removes follows between us).
router.post('/blocks', auth, asyncHandler(async (req, res) => {
  const userId = req.body?.userId;
  if (typeof userId !== 'string' || !userId) return bad(res, 400, 'Field "userId" is required.');
  if (userId === req.user.id) return bad(res, 400, 'You cannot block yourself.');
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return bad(res, 404, 'Person not found.');
  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.user.id, blockedId: userId } },
      create: { blockerId: req.user.id, blockedId: userId },
      update: {},
    }),
    prisma.connection.deleteMany({ where: { OR: [{ followerId: req.user.id, followeeId: userId }, { followerId: userId, followeeId: req.user.id }] } }),
  ]);
  res.status(201).json({ blocked: true, userId });
}));

// DELETE /api/blocks/:userId
router.delete('/blocks/:userId', auth, asyncHandler(async (req, res) => {
  await prisma.block.deleteMany({ where: { blockerId: req.user.id, blockedId: req.params.userId } });
  res.json({ blocked: false, userId: req.params.userId });
}));

export default router;
