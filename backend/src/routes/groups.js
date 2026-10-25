import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { checkAll, CLEAN_MESSAGE } from '../lib/moderation.js';
import { asyncHandler, bad, notFound, pagination } from '../lib/http.js';

const router = Router();

// All group routes require auth. Reads/writes on a specific group are
// scoped to its members; role changes are admin-gated. Groups have one
// ADMIN and up to 3 COADMINs, changeable at any time.

const memberUserSelect = {
  id: true,
  name: true,
  stakeholderType: true, avatarUrl: true,
  city: true,
  verificationStatus: true,
};

async function requireMember(groupId, userId) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

function groupSummary(g, myRole) {
  return {
    id: g.id,
    name: g.name,
    desc: g.desc,
    createdAt: g.createdAt,
    _count: g._count,
    myRole,
  };
}

// GET /api/groups — all groups, newest first, with the caller's role.
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const [groups, total, mine] = await Promise.all([
      prisma.communityGroup.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { _count: { select: { members: true, messages: true } } },
      }),
      prisma.communityGroup.count(),
      prisma.groupMember.findMany({
        where: { userId: req.user.id },
        select: { groupId: true, role: true },
      }),
    ]);
    const roleByGroup = new Map(mine.map((m) => [m.groupId, m.role]));
    res.json({
      items: groups.map((g) => groupSummary(g, roleByGroup.get(g.id) ?? null)),
      total,
      take,
      skip,
    });
  })
);

// POST /api/groups  (auth)  { name, desc? } — create a group; caller becomes ADMIN.
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { name, desc } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return bad(res, 400, 'Field "name" is required.');
    }
    if (name.trim().length > 80) {
      return bad(res, 400, 'Group name is too long (max 80 characters).');
    }
    if (!checkAll(name, desc).ok) return bad(res, 422, CLEAN_MESSAGE);
    const group = await prisma.communityGroup.create({
      data: {
        name: name.trim(),
        desc: typeof desc === 'string' && desc.trim() ? desc.trim() : null,
        creatorId: req.user.id,
        members: { create: { userId: req.user.id, role: 'ADMIN' } },
      },
      include: { _count: { select: { members: true, messages: true } } },
    });
    res.status(201).json(groupSummary(group, 'ADMIN'));
  })
);

// GET /api/groups/:id  (auth, member only) — group + members, admins first.
router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const group = await prisma.communityGroup.findUnique({ where: { id: req.params.id } });
    if (!group) return notFound(res, 'Group');
    const me = await requireMember(group.id, req.user.id);
    if (!me) return bad(res, 403, 'You are not a member of this group.');
    const members = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: { user: { select: memberUserSelect } },
      // Role sorts alphabetically ADMIN < COADMIN < MEMBER — admins first.
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
    res.json({
      group: { id: group.id, name: group.name, desc: group.desc, createdAt: group.createdAt },
      members: members.map((m) => ({ user: m.user, role: m.role, joinedAt: m.joinedAt })),
      myRole: me.role,
    });
  })
);

// POST /api/groups/:id/join  (auth) — join as MEMBER (idempotent).
router.post(
  '/:id/join',
  auth,
  asyncHandler(async (req, res) => {
    const group = await prisma.communityGroup.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!group) return notFound(res, 'Group');
    const existing = await requireMember(group.id, req.user.id);
    if (existing) return res.json({ ok: true, role: existing.role });
    const member = await prisma.groupMember.create({
      data: { groupId: group.id, userId: req.user.id, role: 'MEMBER' },
    });
    res.status(201).json({ ok: true, role: member.role });
  })
);

// POST /api/groups/:id/leave  (auth) — leave; admin transfers to the oldest
// co-admin (else oldest member); the group is deleted when empty.
router.post(
  '/:id/leave',
  auth,
  asyncHandler(async (req, res) => {
    const me = await requireMember(req.params.id, req.user.id);
    if (!me) return bad(res, 400, 'You are not a member of this group.');
    await prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({
        where: { groupId_userId: { groupId: req.params.id, userId: req.user.id } },
      });
      if (me.role === 'ADMIN') {
        const next = await tx.groupMember.findFirst({
          where: { groupId: req.params.id },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        });
        if (!next) {
          // Cascade deletes remaining members/messages.
          await tx.communityGroup.delete({ where: { id: req.params.id } });
        } else {
          await tx.groupMember.update({
            where: { groupId_userId: { groupId: req.params.id, userId: next.userId } },
            data: { role: 'ADMIN' },
          });
        }
      }
    });
    res.json({ ok: true });
  })
);

// GET /api/groups/:id/messages?take=60&before=<msgId>  (auth, member only)
// Returns the last N messages (or the N before the cursor), oldest first.
router.get(
  '/:id/messages',
  auth,
  asyncHandler(async (req, res) => {
    if (!(await requireMember(req.params.id, req.user.id))) {
      return notFound(res, 'Group');
    }
    const { take } = pagination(req);
    const beforeId = typeof req.query.before === 'string' && req.query.before ? req.query.before : null;
    let cursor = null;
    if (beforeId) {
      cursor = await prisma.groupMessage.findFirst({
        where: { id: beforeId, groupId: req.params.id },
        select: { createdAt: true },
      });
      if (!cursor) return bad(res, 400, 'Invalid "before" cursor.');
    }
    const desc = await prisma.groupMessage.findMany({
      where: {
        groupId: req.params.id,
        ...(cursor ? { createdAt: { lt: cursor.createdAt } } : {}),
      },
      include: { sender: { select: memberUserSelect } },
      orderBy: { createdAt: 'desc' },
      take,
    });
    res.json({ items: desc.reverse() });
  })
);

// POST /api/groups/:id/messages  (auth, member only)  { body }
router.post(
  '/:id/messages',
  auth,
  asyncHandler(async (req, res) => {
    if (!(await requireMember(req.params.id, req.user.id))) {
      return notFound(res, 'Group');
    }
    const { body } = req.body ?? {};
    if (!body || typeof body !== 'string' || !body.trim()) {
      return bad(res, 400, 'Field "body" is required.');
    }
    if (body.length > 2000) {
      return bad(res, 400, 'Message is too long (max 2000 characters).');
    }
    const msg = await prisma.groupMessage.create({
      data: { groupId: req.params.id, senderId: req.user.id, body: body.trim() },
      include: { sender: { select: memberUserSelect } },
    });
    res.status(201).json(msg);
  })
);

// PATCH /api/groups/:id/members/:userId  (auth, ADMIN only)  { role }
// COADMIN/MEMBER: direct set (max 3 co-admins). ADMIN: transfers admin — the
// target becomes ADMIN and the caller steps down to COADMIN.
const SETTABLE_ROLES = ['ADMIN', 'COADMIN', 'MEMBER'];
router.patch(
  '/:id/members/:userId',
  auth,
  asyncHandler(async (req, res) => {
    const { id: groupId, userId: targetId } = req.params;
    const { role } = req.body ?? {};
    if (!SETTABLE_ROLES.includes(role)) {
      return bad(res, 400, 'Field "role" must be one of ADMIN, COADMIN, MEMBER.');
    }
    if (targetId === req.user.id) {
      return bad(res, 400, 'You cannot change your own role — leave the group to step down.');
    }
    const caller = await requireMember(groupId, req.user.id);
    if (!caller || caller.role !== 'ADMIN') {
      return bad(res, 403, 'Only the group admin can change roles.');
    }
    const target = await requireMember(groupId, targetId);
    if (!target) return notFound(res, 'Member');
    if (role === 'COADMIN') {
      const coadmins = await prisma.groupMember.count({
        where: { groupId, role: 'COADMIN', NOT: { userId: targetId } },
      });
      if (coadmins >= 3) return bad(res, 400, 'Only 3 co-admins allowed.');
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (role === 'ADMIN') {
        await tx.groupMember.update({
          where: { groupId_userId: { groupId, userId: req.user.id } },
          data: { role: 'COADMIN' },
        });
      }
      return tx.groupMember.update({
        where: { groupId_userId: { groupId, userId: targetId } },
        data: { role },
        include: { user: { select: memberUserSelect } },
      });
    });
    res.json({
      groupId: updated.groupId,
      userId: updated.userId,
      role: updated.role,
      joinedAt: updated.joinedAt,
      user: updated.user,
    });
  })
);

// DELETE /api/groups/:id/members/:userId  (auth)
// ADMIN can remove anyone except self; COADMIN can remove MEMBERs only.
router.delete(
  '/:id/members/:userId',
  auth,
  asyncHandler(async (req, res) => {
    const { id: groupId, userId: targetId } = req.params;
    if (targetId === req.user.id) {
      return bad(res, 400, 'You cannot remove yourself — leave the group instead.');
    }
    const [caller, target] = await Promise.all([
      requireMember(groupId, req.user.id),
      requireMember(groupId, targetId),
    ]);
    if (!target) return notFound(res, 'Member');
    const allowed =
      caller?.role === 'ADMIN' || (caller?.role === 'COADMIN' && target.role === 'MEMBER');
    if (!allowed) {
      return bad(res, 403, 'You do not have permission to remove this member.');
    }
    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetId } },
    });
    res.json({ ok: true });
  })
);

export default router;
