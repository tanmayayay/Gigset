import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination, isOwnMediaUrl, tooLong } from '../lib/http.js';

const router = Router();

const POST_VISIBILITIES = ['PUBLIC', 'CONNECTIONS'];

const authorSelect = {
  id: true,
  name: true,
  stakeholderType: true, avatarUrl: true,
  city: true,
  verificationStatus: true,
};

// GET /api/posts?authorId=&take=20&skip=0  — newest first
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = {};
    if (req.query.authorId) where.authorId = req.query.authorId;

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: authorSelect },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.post.count({ where }),
    ]);

    // Tell a signed-in caller which of these posts they already liked.
    let liked = new Set();
    if (req.user && items.length) {
      const mine = await prisma.like.findMany({
        where: { userId: req.user.id, postId: { in: items.map((p) => p.id) } },
        select: { postId: true },
      });
      liked = new Set(mine.map((l) => l.postId));
    }
    res.json({ items: items.map((p) => ({ ...p, likedByMe: liked.has(p.id) })), total, take, skip });
  })
);

// POST /api/posts  (auth)
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { body, mediaUrl, visibility } = req.body ?? {};

    if (!body || typeof body !== 'string' || !body.trim()) {
      return bad(res, 400, 'Field "body" is required.');
    }
    const longBody = tooLong(body, 3000, 'body');
    if (longBody) return bad(res, 400, longBody);
    if (mediaUrl != null && !isOwnMediaUrl(mediaUrl)) {
      return bad(res, 400, 'Field "mediaUrl" must be a photo uploaded to Gigset.');
    }
    if (visibility !== undefined && !POST_VISIBILITIES.includes(visibility)) {
      return bad(res, 400, `Field "visibility" must be one of: ${POST_VISIBILITIES.join(', ')}`);
    }

    const post = await prisma.post.create({
      data: {
        authorId: req.user.id,
        body: body.trim(),
        mediaUrl: mediaUrl ?? null,
        visibility: visibility ?? 'PUBLIC',
      },
      include: { author: { select: authorSelect } },
    });

    res.status(201).json(post);
  })
);

// GET /api/posts/:id
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!post) return notFound(res, 'Post');
    let likedByMe = false;
    if (req.user) {
      likedByMe = !!(await prisma.like.findFirst({ where: { postId: post.id, userId: req.user.id }, select: { postId: true } }));
    }
    res.json({ ...post, likedByMe });
  })
);

// POST /api/posts/:id/like  (auth) — idempotent: liking twice is not an error
router.post(
  '/:id/like',
  auth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return notFound(res, 'Post');

    try {
      await prisma.like.create({
        data: { postId: post.id, userId: req.user.id },
      });
      res.status(201).json({ liked: true, postId: post.id });
    } catch (e) {
      if (e?.code === 'P2002') return res.json({ liked: true, postId: post.id }); // already liked
      throw e;
    }
  })
);

// DELETE /api/posts/:id/like  (auth) — unlike
router.delete(
  '/:id/like',
  auth,
  asyncHandler(async (req, res) => {
    const result = await prisma.like.deleteMany({
      where: { postId: req.params.id, userId: req.user.id },
    });
    res.json({ liked: false, postId: req.params.id });
  })
);

// GET /api/posts/:id/comments
router.get(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return notFound(res, 'Post');

    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId: post.id },
        include: { author: { select: authorSelect } },
        orderBy: { createdAt: 'asc' },
        take,
        skip,
      }),
      prisma.comment.count({ where: { postId: post.id } }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// POST /api/posts/:id/comments  (auth)
router.post(
  '/:id/comments',
  auth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return notFound(res, 'Post');

    const { body } = req.body ?? {};
    if (!body || typeof body !== 'string' || !body.trim()) {
      return bad(res, 400, 'Field "body" is required.');
    }
    if (body.length > 1000) return bad(res, 400, 'Comments can be at most 1000 characters.');

    const comment = await prisma.comment.create({
      data: { postId: post.id, authorId: req.user.id, body: body.trim() },
      include: { author: { select: authorSelect } },
    });

    res.status(201).json(comment);
  })
);

export default router;
