import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, isOwnMediaUrl } from '../lib/http.js';

const router = Router();

// The Vault: image stories that disappear after 12 hours.
const TTL_MS = 12 * 3600 * 1000;
const MAX_ACTIVE_PER_USER = 10;

const authorSelect = { id: true, name: true, stakeholderType: true, avatarUrl: true, city: true, verificationStatus: true };

// Expired rows are hidden by every query; this also deletes them now and then.
let lastSweep = 0;
async function sweep() {
  if (Date.now() - lastSweep < 10 * 60 * 1000) return;
  lastSweep = Date.now();
  try { await prisma.story.deleteMany({ where: { expiresAt: { lte: new Date() } } }); } catch { /* best effort */ }
}

// GET /api/stories — active stories grouped by author, newest author first. Public.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    sweep();
    const rows = await prisma.story.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { author: { select: authorSelect } },
      orderBy: { createdAt: 'asc' },
      take: 300,
    });
    const byAuthor = new Map();
    for (const s of rows) {
      const { author, ...story } = s;
      if (!byAuthor.has(author.id)) byAuthor.set(author.id, { author, stories: [] });
      byAuthor.get(author.id).stories.push(story);
    }
    const groups = [...byAuthor.values()].sort(
      (a, b) => Date.parse(b.stories.at(-1).createdAt) - Date.parse(a.stories.at(-1).createdAt),
    );
    res.json({ items: groups });
  })
);

// POST /api/stories (auth) { mediaUrl, caption? }
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { mediaUrl, caption } = req.body ?? {};
    if (!isOwnMediaUrl(mediaUrl)) {
      return bad(res, 400, 'Field "mediaUrl" must be a photo uploaded to Gigset.');
    }
    if (caption != null && (typeof caption !== 'string' || caption.length > 140)) {
      return bad(res, 400, 'Field "caption" must be at most 140 characters.');
    }
    const active = await prisma.story.count({ where: { authorId: req.user.id, expiresAt: { gt: new Date() } } });
    if (active >= MAX_ACTIVE_PER_USER) {
      return bad(res, 429, `You can have ${MAX_ACTIVE_PER_USER} stories in the vault at a time.`);
    }
    const story = await prisma.story.create({
      data: {
        authorId: req.user.id,
        mediaUrl,
        caption: caption?.trim() || null,
        expiresAt: new Date(Date.now() + TTL_MS),
      },
      include: { author: { select: authorSelect } },
    });
    res.status(201).json(story);
  })
);

// DELETE /api/stories/:id (auth) — owner only
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const story = await prisma.story.findUnique({ where: { id: req.params.id } });
    if (!story) return notFound(res, 'Story');
    if (story.authorId !== req.user.id) return bad(res, 403, 'Not your story.');
    await prisma.story.delete({ where: { id: story.id } });
    res.json({ ok: true });
  })
);

export default router;
