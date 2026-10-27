import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination } from '../lib/http.js';
import { isBlockedBetween } from '../lib/blocks.js';
import { pushTo } from '../lib/push.js';
import { areConnected, connectionIds } from '../lib/connections.js';
import { notify } from '../lib/notify.js';

const router = Router();

// All message routes require auth, and every read/write is scoped to
// conversations the caller is a member of. There is no public access.

const memberSelect = {
  id: true,
  name: true,
  stakeholderType: true, avatarUrl: true,
  city: true,
};

async function requireMember(conversationId, userId) {
  return prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}

// GET /api/conversations — my conversations, newest activity first.
// Returns the other members + the latest message for list rendering.
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: req.user.id },
      include: {
        conversation: {
          include: {
            members: { include: { user: { select: memberSelect } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });
    const unread = await prisma.message.groupBy({
      by: ['conversationId'],
      where: { senderId: { not: req.user.id }, readAt: null, conversation: { members: { some: { userId: req.user.id } } } },
      _count: { _all: true },
    });
    const unreadBy = Object.fromEntries(unread.map((u) => [u.conversationId, u._count._all]));
    const items = memberships.map((m) => {
      const c = m.conversation;
      return {
        id: c.id,
        title: c.title,
        kind: c.kind,
        status: c.status,
        createdById: c.createdById,
        memberCount: c.members.length,
        members: c.members.filter((x) => x.userId !== req.user.id).map((x) => x.user),
        lastMessage: c.messages[0] ?? null,
        unread: unreadBy[c.id] || 0,
        updatedAt: c.updatedAt,
      };
    });
    res.json({ items, total: items.length });
  })
);

// POST /api/conversations  (auth)  { userId }
// Find-or-create a 1:1 conversation with another user.
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { userId } = req.body ?? {};
    if (!userId || typeof userId !== 'string') {
      return bad(res, 400, 'Field "userId" is required.');
    }
    if (userId === req.user.id) {
      return bad(res, 400, 'You cannot start a conversation with yourself.');
    }
    const other = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!other) return notFound(res, 'User');
    if (await isBlockedBetween(req.user.id, userId)) return bad(res, 403, 'You cannot message this person.');

    const candidates = await prisma.conversation.findMany({
      where: { kind: 'DIRECT', members: { every: { userId: { in: [req.user.id, userId] } } } },
      include: { members: { select: { userId: true } } },
    });
    const direct = candidates.find((c) => c.members.length === 2);
    if (direct) {
      if (direct.status === 'DECLINED' && direct.createdById === req.user.id) return bad(res, 403, 'This person is not taking messages from you right now.');
      return res.json({ id: direct.id, created: false, status: direct.status });
    }

    // People you are not connected with land in the other person's Requests tab until they accept.
    const connected = await areConnected(req.user.id, userId);
    const convo = await prisma.conversation.create({
      data: { kind: 'DIRECT', status: connected ? 'ACTIVE' : 'REQUEST', createdById: req.user.id, members: { create: [{ userId: req.user.id }, { userId }] } },
    });
    res.status(201).json({ id: convo.id, created: true, status: convo.status });
  })
);

// POST /api/conversations/group  (auth)  { title, memberIds[] }  — only people you are connected with can be added.
router.post(
  '/group',
  auth,
  asyncHandler(async (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 60) : '';
    const ids = [...new Set(Array.isArray(req.body?.memberIds) ? req.body.memberIds.filter((x) => typeof x === 'string') : [])].filter((x) => x !== req.user.id);
    if (!title) return bad(res, 400, 'Give the group a name.');
    if (ids.length < 1) return bad(res, 400, 'Pick at least one person.');
    if (ids.length > 29) return bad(res, 400, 'Groups can have up to 30 people.');
    const allowed = new Set(await connectionIds(req.user.id));
    if (ids.some((id) => !allowed.has(id))) return bad(res, 403, 'You can only add people you are connected with.');
    const convo = await prisma.conversation.create({
      data: { title, kind: 'GROUP', status: 'ACTIVE', createdById: req.user.id, members: { create: [req.user.id, ...ids].map((userId) => ({ userId })) } },
    });
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    await prisma.message.create({ data: { conversationId: convo.id, senderId: req.user.id, body: `Hey everyone, I started "${title}". Say hi! 👋` } });
    for (const id of ids) notify(id, { type: 'group', title: `${me?.name || 'Someone'} added you to ${title}`, link: `/messages?c=${convo.id}`, from: req.user.id });
    res.status(201).json({ id: convo.id });
  })
);

// POST /api/conversations/:id/members  { userIds[] }  — anyone in the group can add their connections.
router.post(
  '/:id/members',
  auth,
  asyncHandler(async (req, res) => {
    const c = await prisma.conversation.findFirst({ where: { id: req.params.id, kind: 'GROUP', members: { some: { userId: req.user.id } } }, include: { members: { select: { userId: true } } } });
    if (!c) return notFound(res, 'Group');
    const ids = [...new Set(Array.isArray(req.body?.userIds) ? req.body.userIds.filter((x) => typeof x === 'string') : [])].filter((x) => !c.members.some((m) => m.userId === x));
    if (c.members.length + ids.length > 30) return bad(res, 400, 'Groups can have up to 30 people.');
    const allowed = new Set(await connectionIds(req.user.id));
    if (ids.some((id) => !allowed.has(id))) return bad(res, 403, 'You can only add people you are connected with.');
    if (ids.length) await prisma.conversationMember.createMany({ data: ids.map((userId) => ({ conversationId: c.id, userId })), skipDuplicates: true });
    for (const id of ids) notify(id, { type: 'group', title: `You were added to ${c.title}`, link: `/messages?c=${c.id}`, from: req.user.id });
    res.json({ ok: true, added: ids.length });
  })
);

// POST /api/conversations/:id/leave  — leave a group (the chat stays for everyone else).
router.post(
  '/:id/leave',
  auth,
  asyncHandler(async (req, res) => {
    const c = await prisma.conversation.findFirst({ where: { id: req.params.id, kind: 'GROUP', members: { some: { userId: req.user.id } } } });
    if (!c) return notFound(res, 'Group');
    await prisma.conversationMember.deleteMany({ where: { conversationId: c.id, userId: req.user.id } });
    const left = await prisma.conversationMember.count({ where: { conversationId: c.id } });
    if (left === 0) await prisma.conversation.delete({ where: { id: c.id } });
    res.json({ ok: true });
  })
);

// POST /api/conversations/:id/accept | /decline  — the person who received a message request.
router.post(
  '/:id/accept',
  auth,
  asyncHandler(async (req, res) => {
    const c = await prisma.conversation.findFirst({ where: { id: req.params.id, kind: 'DIRECT', status: 'REQUEST', createdById: { not: req.user.id }, members: { some: { userId: req.user.id } } } });
    if (!c) return notFound(res, 'Request');
    await prisma.conversation.update({ where: { id: c.id }, data: { status: 'ACTIVE' } });
    res.json({ ok: true });
  })
);
router.post(
  '/:id/decline',
  auth,
  asyncHandler(async (req, res) => {
    const c = await prisma.conversation.findFirst({ where: { id: req.params.id, kind: 'DIRECT', status: 'REQUEST', createdById: { not: req.user.id }, members: { some: { userId: req.user.id } } } });
    if (!c) return notFound(res, 'Request');
    await prisma.conversation.update({ where: { id: c.id }, data: { status: 'DECLINED' } });
    res.json({ ok: true });
  })
);

// GET /api/conversations/live?since=<ISO time from the previous response>  (auth)
// The lightweight "inbox pulse" the app polls every few seconds:
//   - marks everything waiting for me as DELIVERED (my app has now received it)
//   - returns unread message + notification counts for the badges
//   - returns messages that arrived since `since`, for the pop-up
// With no `since` (first call) it returns counts only, so opening the app never fires a burst of pop-ups.
router.get(
  '/live',
  auth,
  asyncHandler(async (req, res) => {
    const me = req.user.id;
    const now = new Date();
    const since = req.query.since ? new Date(String(req.query.since)) : null;
    const mine = { senderId: { not: me }, conversation: { members: { some: { userId: me } } } };

    await prisma.message.updateMany({ where: { ...mine, deliveredAt: null }, data: { deliveredAt: now } });

    const [unreadMessages, unreadNotifications, incoming] = await Promise.all([
      prisma.message.count({ where: { ...mine, readAt: null } }),
      prisma.notification.count({ where: { userId: me, read: false } }),
      since && !Number.isNaN(since.getTime())
        ? prisma.message.findMany({
            where: { ...mine, createdAt: { gt: since } },
            orderBy: { createdAt: 'asc' },
            take: 20,
            select: {
              id: true, conversationId: true, body: true, createdAt: true,
              sender: { select: { id: true, name: true, avatarUrl: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    res.json({ now: now.toISOString(), unreadMessages, unreadNotifications, incoming });
  })
);

// POST /api/conversations/:id/read  (auth, member only) — I opened the chat: mark their messages read.
router.post(
  '/:id/read',
  auth,
  asyncHandler(async (req, res) => {
    if (!(await requireMember(req.params.id, req.user.id))) return notFound(res, 'Conversation');
    const now = new Date();
    const r = await prisma.message.updateMany({
      where: { conversationId: req.params.id, senderId: { not: req.user.id }, readAt: null },
      data: { readAt: now },
    });
    // Anything opened is also delivered.
    await prisma.message.updateMany({
      where: { conversationId: req.params.id, senderId: { not: req.user.id }, deliveredAt: null },
      data: { deliveredAt: now },
    });
    res.json({ ok: true, marked: r.count });
  })
);

// GET /api/conversations/:id/messages?take=50&skip=0  (auth, member only)
router.get(
  '/:id/messages',
  auth,
  asyncHandler(async (req, res) => {
    if (!(await requireMember(req.params.id, req.user.id))) {
      return notFound(res, 'Conversation');
    }
    const { take, skip } = pagination(req);
    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: req.params.id },
        include: { sender: { select: memberSelect } },
        orderBy: { createdAt: 'asc' },
        take,
        skip,
      }),
      prisma.message.count({ where: { conversationId: req.params.id } }),
    ]);
    res.json({ items, total, take, skip });
  })
);

// POST /api/conversations/:id/messages  (auth, member only)  { body }
router.post(
  '/:id/messages',
  auth,
  asyncHandler(async (req, res) => {
    if (!(await requireMember(req.params.id, req.user.id))) {
      return notFound(res, 'Conversation');
    }
    const { body } = req.body ?? {};
    if (!body || typeof body !== 'string' || !body.trim()) {
      return bad(res, 400, 'Field "body" is required.');
    }
    if (body.length > 2000) {
      return bad(res, 400, 'Message is too long (max 2000 characters).');
    }
    const convoRow = await prisma.conversation.findUnique({ where: { id: req.params.id }, select: { kind: true, status: true, createdById: true } });
    const others = await prisma.conversationMember.findMany({
      where: { conversationId: req.params.id, userId: { not: req.user.id } },
      select: { userId: true },
    });
    if (convoRow.kind === 'DIRECT') {
      for (const o of others) {
        if (await isBlockedBetween(req.user.id, o.userId)) return bad(res, 403, 'You cannot message this person.');
      }
      if (convoRow.status === 'DECLINED') return bad(res, 403, 'This person is not taking messages from you right now.');
      if (convoRow.status === 'REQUEST') {
        if (convoRow.createdById === req.user.id) {
          // Until they accept you can send a few lines, not a flood.
          const sent = await prisma.message.count({ where: { conversationId: req.params.id, senderId: req.user.id } });
          if (sent >= 3) return bad(res, 403, 'Wait for them to accept your request before sending more.');
        } else {
          // Replying to a request is the same as accepting it.
          await prisma.conversation.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } });
        }
      }
    }
    const msg = await prisma.message.create({
      data: { conversationId: req.params.id, senderId: req.user.id, body: body.trim() },
      include: { sender: { select: memberSelect } },
    });
    // Bump the conversation so lists sort by recent activity.
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });
    // Chat messages are announced by the live inbox (pop-up + unread badges), not as bell notifications.
    // Browsers that enabled push also get a system notification (the service worker skips it if Gigset is open and focused).
    const groupTitle = convoRow.kind === 'GROUP' ? (await prisma.conversation.findUnique({ where: { id: req.params.id }, select: { title: true } }))?.title : null;
    for (const o of others) {
      pushTo(o.userId, { title: groupTitle ? `${groupTitle} · ${msg.sender.name}` : msg.sender.name, body: msg.body, url: `#/messages?c=${req.params.id}`, tag: `msg-${req.params.id}` });
    }
    res.status(201).json(msg);
  })
);

export default router;
