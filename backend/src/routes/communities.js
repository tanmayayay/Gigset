import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination, tooLong, isOwnMediaUrl } from '../lib/http.js';
import { checkAll, CLEAN_MESSAGE } from '../lib/moderation.js';
import { notify } from '../lib/notify.js';

// Subreddit-style communities: public to read for any signed-in person, members post,
// comment and vote. Admin / co-admins are the moderators.
const router = Router();

const CATEGORIES = ['GENERAL', 'ARTISTS', 'VENUES', 'CREW', 'CITY', 'GENRE', 'GIGS'];
const COLORS = ['indigo', 'sunset', 'ocean', 'forest', 'rose', 'amber', 'violet', 'slate'];
const userSel = { id: true, name: true, stakeholderType: true, avatarUrl: true, city: true, verificationStatus: true };
const isMod = (role) => role === 'ADMIN' || role === 'COADMIN';

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'community';

async function findCommunity(idOrSlug) {
  return prisma.communityGroup.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
}
const roleIn = (groupId, userId) =>
  prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { role: true } }).then((m) => m?.role ?? null);

function parseRules(raw) {
  if (!raw) return [];
  try { const r = JSON.parse(raw); return Array.isArray(r) ? r : []; } catch { return []; }
}

function summary(g, myRole) {
  return {
    id: g.id, name: g.name, slug: g.slug, desc: g.desc, color: g.color || 'indigo', category: g.category || 'GENERAL',
    createdAt: g.createdAt, members: g._count?.members ?? 0, posts: g._count?.posts ?? 0, myRole,
  };
}

// Reddit-style "hot": votes decay with age.
const hotScore = (p) => (Math.sign(p.score) * Math.log10(Math.max(Math.abs(p.score), 1)) + 1) - (Date.now() - new Date(p.createdAt).getTime()) / 3600000 / 12;

async function shapePosts(posts, userId) {
  if (!posts.length) return [];
  const votes = await prisma.communityVote.findMany({
    where: { userId, targetType: 'POST', targetId: { in: posts.map((p) => p.id) } }, select: { targetId: true, value: true },
  });
  const mine = new Map(votes.map((v) => [v.targetId, v.value]));
  return posts.map((p) => ({
    id: p.id, groupId: p.groupId,
    group: p.group ? { id: p.group.id, name: p.group.name, slug: p.group.slug, color: p.group.color || 'indigo' } : undefined,
    author: p.author, title: p.title, body: p.body, mediaUrl: p.mediaUrl, flair: p.flair, pinned: p.pinned,
    score: p.score, commentCount: p.commentCount, createdAt: p.createdAt, myVote: mine.get(p.id) ?? 0,
  }));
}

async function listPosts(where, req) {
  const sort = ['hot', 'new', 'top'].includes(req.query.sort) ? req.query.sort : 'hot';
  const { take, skip } = pagination(req);
  const include = { author: { select: userSel }, group: { select: { id: true, name: true, slug: true, color: true } } };
  const base = { ...where, removed: false };
  if (sort === 'new') {
    const rows = await prisma.communityPost.findMany({ where: base, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], take, skip, include });
    return shapePosts(rows, req.user.id);
  }
  if (sort === 'top') {
    const since = { day: 1, week: 7, month: 30 }[req.query.range];
    const rows = await prisma.communityPost.findMany({
      where: since ? { ...base, createdAt: { gte: new Date(Date.now() - since * 86400000) } } : base,
      orderBy: [{ pinned: 'desc' }, { score: 'desc' }, { createdAt: 'desc' }], take, skip, include,
    });
    return shapePosts(rows, req.user.id);
  }
  // hot: rank the most recent window in memory (communities here are small).
  const rows = await prisma.communityPost.findMany({
    where: { ...base, createdAt: { gte: new Date(Date.now() - 45 * 86400000) } }, orderBy: { createdAt: 'desc' }, take: 300, include,
  });
  rows.sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || hotScore(b) - hotScore(a));
  return shapePosts(rows.slice(skip, skip + take), req.user.id);
}

// GET /api/communities?q=&category=&sort=popular|new
router.get('/', auth, asyncHandler(async (req, res) => {
  const { take, skip } = pagination(req);
  const where = {};
  if (typeof req.query.q === 'string' && req.query.q.trim()) where.name = { contains: req.query.q.trim(), mode: 'insensitive' };
  if (CATEGORIES.includes(req.query.category)) where.category = req.query.category;
  const orderBy = req.query.sort === 'new' ? { createdAt: 'desc' } : { members: { _count: 'desc' } };
  const [rows, mine] = await Promise.all([
    prisma.communityGroup.findMany({ where, orderBy, take, skip, include: { _count: { select: { members: true, posts: true } } } }),
    prisma.groupMember.findMany({ where: { userId: req.user.id }, select: { groupId: true, role: true } }),
  ]);
  const roles = new Map(mine.map((m) => [m.groupId, m.role]));
  res.json({ items: rows.map((g) => summary(g, roles.get(g.id) ?? null)), take, skip });
}));

// GET /api/communities/feed?scope=home|popular&sort=hot|new|top
router.get('/feed', auth, asyncHandler(async (req, res) => {
  let where = {};
  if (req.query.scope === 'home') {
    const mine = await prisma.groupMember.findMany({ where: { userId: req.user.id }, select: { groupId: true } });
    where = { groupId: { in: mine.map((m) => m.groupId) } };
  }
  res.json({ items: await listPosts(where, req) });
}));

// POST /api/communities  { name, desc?, category?, color?, rules?: [{title, body}] }
router.post('/', auth, asyncHandler(async (req, res) => {
  const { name, desc, category, color, rules } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length < 3) return bad(res, 400, 'Give your community a name (at least 3 characters).');
  if (name.trim().length > 40) return bad(res, 400, 'Community name is too long (max 40 characters).');
  const long = tooLong(desc, 500, 'description');
  if (long) return bad(res, 400, long);
  const cleanRules = (Array.isArray(rules) ? rules : []).slice(0, 8)
    .map((r) => ({ title: String(r?.title ?? '').trim().slice(0, 80), body: String(r?.body ?? '').trim().slice(0, 300) })).filter((r) => r.title);
  const mod = checkAll(name, desc, ...cleanRules.flatMap((r) => [r.title, r.body]));
  if (!mod.ok) return bad(res, 422, CLEAN_MESSAGE);
  const recent = await prisma.communityGroup.count({ where: { creatorId: req.user.id, createdAt: { gte: new Date(Date.now() - 24 * 3600000) } } });
  if (recent >= 3) return bad(res, 429, 'You can start up to 3 communities a day.');
  let slug = slugify(name);
  if (await prisma.communityGroup.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const g = await prisma.communityGroup.create({
    data: {
      name: name.trim(), slug, desc: typeof desc === 'string' && desc.trim() ? desc.trim() : null,
      category: CATEGORIES.includes(category) ? category : 'GENERAL', color: COLORS.includes(color) ? color : 'indigo',
      rules: cleanRules.length ? JSON.stringify(cleanRules) : null, creatorId: req.user.id,
      members: { create: { userId: req.user.id, role: 'ADMIN' } },
    },
    include: { _count: { select: { members: true, posts: true } } },
  });
  res.status(201).json(summary(g, 'ADMIN'));
}));

// GET /api/communities/posts/:postId — one post with every comment (flat, oldest first).
router.get('/posts/:postId', auth, asyncHandler(async (req, res) => {
  const post = await prisma.communityPost.findUnique({
    where: { id: req.params.postId },
    include: { author: { select: userSel }, group: { select: { id: true, name: true, slug: true, color: true } } },
  });
  if (!post || post.removed) return notFound(res, 'Post');
  const [shaped] = await shapePosts([post], req.user.id);
  const comments = await prisma.communityComment.findMany({
    where: { postId: post.id }, orderBy: { createdAt: 'asc' }, take: 500, include: { author: { select: userSel } },
  });
  const votes = await prisma.communityVote.findMany({
    where: { userId: req.user.id, targetType: 'COMMENT', targetId: { in: comments.map((c) => c.id) } }, select: { targetId: true, value: true },
  });
  const mine = new Map(votes.map((v) => [v.targetId, v.value]));
  res.json({
    post: shaped, myRole: await roleIn(post.groupId, req.user.id),
    comments: comments.map((c) => ({
      id: c.id, parentId: c.parentId, author: c.removed ? null : c.author, body: c.removed ? '[removed]' : c.body,
      removed: c.removed, score: c.score, createdAt: c.createdAt, myVote: mine.get(c.id) ?? 0,
    })),
  });
}));

async function vote(req, res, targetType) {
  const value = Number(req.body?.value);
  if (![1, -1, 0].includes(value)) return bad(res, 400, 'Field "value" must be 1, -1 or 0.');
  const id = targetType === 'POST' ? req.params.postId : req.params.commentId;
  const model = targetType === 'POST' ? prisma.communityPost : prisma.communityComment;
  const target = await model.findUnique({ where: { id }, select: { id: true, removed: true, authorId: true } });
  if (!target || target.removed) return notFound(res, targetType === 'POST' ? 'Post' : 'Comment');
  const key = { userId_targetType_targetId: { userId: req.user.id, targetType, targetId: id } };
  const score = await prisma.$transaction(async (tx) => {
    const prev = (await tx.communityVote.findUnique({ where: key }))?.value ?? 0;
    if (prev === value) return (await (targetType === 'POST' ? tx.communityPost : tx.communityComment).findUnique({ where: { id }, select: { score: true } })).score;
    if (value === 0) await tx.communityVote.delete({ where: key });
    else await tx.communityVote.upsert({ where: key, create: { userId: req.user.id, targetType, targetId: id, value }, update: { value } });
    const row = await (targetType === 'POST' ? tx.communityPost : tx.communityComment).update({ where: { id }, data: { score: { increment: value - prev } }, select: { score: true } });
    return row.score;
  });
  res.json({ score, myVote: value });
}
router.post('/posts/:postId/vote', auth, asyncHandler((req, res) => vote(req, res, 'POST')));
router.post('/comments/:commentId/vote', auth, asyncHandler((req, res) => vote(req, res, 'COMMENT')));

// POST /api/communities/posts/:postId/comments  { body, parentId? }
router.post('/posts/:postId/comments', auth, asyncHandler(async (req, res) => {
  const post = await prisma.communityPost.findUnique({ where: { id: req.params.postId } });
  if (!post || post.removed) return notFound(res, 'Post');
  if (!(await roleIn(post.groupId, req.user.id))) return bad(res, 403, 'Join this community to comment.');
  const { body, parentId } = req.body ?? {};
  if (typeof body !== 'string' || !body.trim()) return bad(res, 400, 'Write something first.');
  const long = tooLong(body, 4000, 'comment');
  if (long) return bad(res, 400, long);
  if (!checkAll(body).ok) return bad(res, 422, CLEAN_MESSAGE);
  const recent = await prisma.communityComment.count({ where: { authorId: req.user.id, createdAt: { gte: new Date(Date.now() - 3600000) } } });
  if (recent >= 40) return bad(res, 429, 'Slow down a little — too many comments this hour.');
  let parent = null;
  if (parentId) {
    parent = await prisma.communityComment.findUnique({ where: { id: String(parentId) } });
    if (!parent || parent.postId !== post.id || parent.removed) return bad(res, 400, 'That comment is gone.');
  }
  const [c] = await prisma.$transaction([
    prisma.communityComment.create({
      data: { postId: post.id, authorId: req.user.id, parentId: parent?.id ?? null, body: body.trim(), score: 1 },
      include: { author: { select: userSel } },
    }),
    prisma.communityPost.update({ where: { id: post.id }, data: { commentCount: { increment: 1 } } }),
  ]);
  await prisma.communityVote.create({ data: { userId: req.user.id, targetType: 'COMMENT', targetId: c.id, value: 1 } }).catch(() => {});
  const to = parent?.authorId ?? post.authorId;
  if (to !== req.user.id) {
    notify(to, {
      type: 'community', title: `${c.author.name} replied ${parent ? 'to your comment' : 'to your post'}`,
      body: c.body.slice(0, 120), link: `/community?p=${post.id}`, from: req.user.id,
    });
  }
  res.status(201).json({ id: c.id, parentId: c.parentId, author: c.author, body: c.body, removed: false, score: 1, createdAt: c.createdAt, myVote: 1 });
}));

// DELETE comment / post — the author or a moderator.
router.delete('/comments/:commentId', auth, asyncHandler(async (req, res) => {
  const c = await prisma.communityComment.findUnique({ where: { id: req.params.commentId }, include: { post: { select: { groupId: true } } } });
  if (!c) return notFound(res, 'Comment');
  if (c.authorId !== req.user.id && !isMod(await roleIn(c.post.groupId, req.user.id))) return bad(res, 403, 'Only the author or a moderator can remove this.');
  await prisma.communityComment.update({ where: { id: c.id }, data: { removed: true } });
  res.json({ ok: true });
}));
router.delete('/posts/:postId', auth, asyncHandler(async (req, res) => {
  const p = await prisma.communityPost.findUnique({ where: { id: req.params.postId } });
  if (!p) return notFound(res, 'Post');
  if (p.authorId !== req.user.id && !isMod(await roleIn(p.groupId, req.user.id))) return bad(res, 403, 'Only the author or a moderator can remove this.');
  await prisma.communityPost.update({ where: { id: p.id }, data: { removed: true, pinned: false } });
  res.json({ ok: true });
}));

// POST /api/communities/posts/:postId/pin  { pinned }
router.post('/posts/:postId/pin', auth, asyncHandler(async (req, res) => {
  const p = await prisma.communityPost.findUnique({ where: { id: req.params.postId } });
  if (!p) return notFound(res, 'Post');
  if (!isMod(await roleIn(p.groupId, req.user.id))) return bad(res, 403, 'Only moderators can pin posts.');
  const pinned = !!req.body?.pinned;
  await prisma.communityPost.update({ where: { id: p.id }, data: { pinned } });
  res.json({ pinned });
}));

// GET /api/communities/:id
router.get('/:id', auth, asyncHandler(async (req, res) => {
  const g0 = await findCommunity(req.params.id);
  if (!g0) return notFound(res, 'Community');
  const g = await prisma.communityGroup.findUnique({ where: { id: g0.id }, include: { _count: { select: { members: true, posts: true } } } });
  const [role, mods] = await Promise.all([
    roleIn(g.id, req.user.id),
    prisma.groupMember.findMany({ where: { groupId: g.id, role: { in: ['ADMIN', 'COADMIN'] } }, include: { user: { select: userSel } }, orderBy: { role: 'asc' }, take: 8 }),
  ]);
  res.json({ ...summary(g, role), rules: parseRules(g.rules), mods: mods.map((m) => ({ ...m.user, role: m.role })) });
}));

// PATCH /api/communities/:id  { desc?, color?, rules? }  (moderators)
router.patch('/:id', auth, asyncHandler(async (req, res) => {
  const g = await findCommunity(req.params.id);
  if (!g) return notFound(res, 'Community');
  if (!isMod(await roleIn(g.id, req.user.id))) return bad(res, 403, 'Only moderators can edit this community.');
  const { desc, color, rules } = req.body ?? {};
  const data = {};
  if (typeof desc === 'string') { const l = tooLong(desc, 500, 'description'); if (l) return bad(res, 400, l); data.desc = desc.trim() || null; }
  if (COLORS.includes(color)) data.color = color;
  if (Array.isArray(rules)) {
    const r = rules.slice(0, 8).map((x) => ({ title: String(x?.title ?? '').trim().slice(0, 80), body: String(x?.body ?? '').trim().slice(0, 300) })).filter((x) => x.title);
    data.rules = r.length ? JSON.stringify(r) : null;
  }
  if (!checkAll(data.desc, data.rules).ok) return bad(res, 422, CLEAN_MESSAGE);
  await prisma.communityGroup.update({ where: { id: g.id }, data });
  res.json({ ok: true });
}));

router.post('/:id/join', auth, asyncHandler(async (req, res) => {
  const g = await findCommunity(req.params.id);
  if (!g) return notFound(res, 'Community');
  await prisma.groupMember.upsert({ where: { groupId_userId: { groupId: g.id, userId: req.user.id } }, create: { groupId: g.id, userId: req.user.id }, update: {} });
  res.json({ joined: true });
}));
router.post('/:id/leave', auth, asyncHandler(async (req, res) => {
  const g = await findCommunity(req.params.id);
  if (!g) return notFound(res, 'Community');
  const role = await roleIn(g.id, req.user.id);
  if (role === 'ADMIN') {
    const others = await prisma.groupMember.count({ where: { groupId: g.id, userId: { not: req.user.id } } });
    if (others > 0) return bad(res, 400, 'Hand over admin to someone else before you leave.');
  }
  await prisma.groupMember.deleteMany({ where: { groupId: g.id, userId: req.user.id } });
  res.json({ joined: false });
}));

// GET /api/communities/:id/posts?sort=
router.get('/:id/posts', auth, asyncHandler(async (req, res) => {
  const g = await findCommunity(req.params.id);
  if (!g) return notFound(res, 'Community');
  res.json({ items: await listPosts({ groupId: g.id }, req) });
}));

// POST /api/communities/:id/posts  { title, body?, mediaUrl?, flair? }
router.post('/:id/posts', auth, asyncHandler(async (req, res) => {
  const g = await findCommunity(req.params.id);
  if (!g) return notFound(res, 'Community');
  if (!(await roleIn(g.id, req.user.id))) return bad(res, 403, 'Join this community to post.');
  const { title, body, mediaUrl, flair } = req.body ?? {};
  if (typeof title !== 'string' || title.trim().length < 3) return bad(res, 400, 'Add a title (at least 3 characters).');
  const l1 = tooLong(title, 200, 'title') || tooLong(body, 10000, 'body') || tooLong(flair, 24, 'flair');
  if (l1) return bad(res, 400, l1);
  if (mediaUrl != null && !isOwnMediaUrl(mediaUrl)) return bad(res, 400, 'Photos must be uploaded to Gigset.');
  if (!checkAll(title, body, flair).ok) return bad(res, 422, CLEAN_MESSAGE);
  const recent = await prisma.communityPost.count({ where: { authorId: req.user.id, createdAt: { gte: new Date(Date.now() - 3600000) } } });
  if (recent >= 10) return bad(res, 429, 'You’ve posted a lot this hour. Try again a bit later.');
  const p = await prisma.communityPost.create({
    data: {
      groupId: g.id, authorId: req.user.id, title: title.trim(), body: typeof body === 'string' && body.trim() ? body.trim() : null,
      mediaUrl: mediaUrl ?? null, flair: typeof flair === 'string' && flair.trim() ? flair.trim() : null, score: 1,
    },
    include: { author: { select: userSel }, group: { select: { id: true, name: true, slug: true, color: true } } },
  });
  await prisma.communityVote.create({ data: { userId: req.user.id, targetType: 'POST', targetId: p.id, value: 1 } }).catch(() => {});
  const [shaped] = await shapePosts([p], req.user.id);
  res.status(201).json(shaped);
}));

export default router;
