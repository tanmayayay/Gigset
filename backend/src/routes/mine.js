import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/http.js';

const router = Router();
const LIMIT = 100;

// GET /api/mine/uploads — everything the signed-in member has made, in one call.
router.get('/uploads', auth, asyncHandler(async (req, res) => {
  const me = req.user.id;
  const [posts, comments, communityPosts, communityComments, gigs] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: me }, orderBy: { createdAt: 'desc' }, take: LIMIT,
      select: { id: true, body: true, mediaUrl: true, visibility: true, createdAt: true, _count: { select: { likes: true, comments: true } } },
    }),
    prisma.comment.findMany({
      where: { authorId: me }, orderBy: { createdAt: 'desc' }, take: LIMIT,
      select: { id: true, body: true, createdAt: true, post: { select: { id: true, body: true, mediaUrl: true, author: { select: { id: true, name: true } } } } },
    }),
    prisma.communityPost.findMany({
      where: { authorId: me, removed: false }, orderBy: { createdAt: 'desc' }, take: LIMIT,
      select: { id: true, title: true, body: true, mediaUrl: true, score: true, commentCount: true, createdAt: true, group: { select: { id: true, name: true } } },
    }),
    prisma.communityComment.findMany({
      where: { authorId: me, removed: false }, orderBy: { createdAt: 'desc' }, take: LIMIT,
      select: { id: true, body: true, createdAt: true, post: { select: { id: true, title: true, group: { select: { id: true, name: true } } } } },
    }),
    prisma.opportunity.findMany({
      where: { posterId: me }, orderBy: { createdAt: 'desc' }, take: LIMIT,
      select: { id: true, title: true, city: true, genre: true, status: true, createdAt: true, _count: { select: { applications: true } } },
    }),
  ]);

  const allComments = [
    ...comments.map((c) => ({ kind: 'post', id: c.id, body: c.body, createdAt: c.createdAt, on: { id: c.post.id, text: c.post.body, mediaUrl: c.post.mediaUrl, by: c.post.author?.name } })),
    ...communityComments.map((c) => ({ kind: 'community', id: c.id, body: c.body, createdAt: c.createdAt, on: { id: c.post.id, text: c.post.title, by: c.post.group?.name } })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ posts, comments: allComments, communityPosts, gigs });
}));

export default router;
