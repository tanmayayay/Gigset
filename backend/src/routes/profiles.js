import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination, tooLong, jsonTooBig, isOwnMediaUrl } from '../lib/http.js';
import { cleanDetail } from '../lib/profileDetail.js';
import { notify } from '../lib/notify.js';
import { isBlockedBetween } from '../lib/blocks.js';
import { connectionIds, relationBetween } from '../lib/connections.js';
import { contentInfo, parseBirthDate } from '../lib/contentRating.js';

// The caller's own content settings (computed; the birth date itself is never sent back).
async function withContent(user) {
  const c = await prisma.user.findUnique({ where: { id: user.id }, select: { birthDate: true, contentOpen: true } });
  return { ...user, content: contentInfo(c || {}) };
}

// Shared field limits for create + edit.
function checkProfileFields({ name, bio, city, detail }) {
  return (
    tooLong(name, 80, 'name') || tooLong(bio, 1000, 'bio') || tooLong(city, 80, 'city') ||
    (typeof bio !== 'string' && bio != null ? 'Field "bio" must be text.' : null) ||
    (typeof city !== 'string' && city != null ? 'Field "city" must be text.' : null) ||
    (detail !== undefined && jsonTooBig(detail) ? 'Field "detail" is too large.' : null)
  );
}

const router = Router();

// ---------------------------------------------------------------- helpers
// "Today" in India (IST, UTC+5:30) as YYYY-MM-DD — the app launches in India, so
// availability days and view counts roll over at Indian midnight.
const IST_MS = 5.5 * 3600 * 1000;
const dayKey = (ms) => new Date(ms + IST_MS).toISOString().slice(0, 10);
const todayIST = () => dayKey(Date.now());
const addDays = (key, n) => new Date(Date.parse(`${key}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (v) => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const MAX_AHEAD_DAYS = 120;

// Count a profile view at most once per viewer per 30 minutes (viewer id, else IP).
// Only a per-day total is stored — no one's identity is kept.
const recentViews = new Map();
function recordView(profileId, viewerKey) {
  const k = `${profileId}:${viewerKey}`;
  const now = Date.now();
  const last = recentViews.get(k);
  if (last && now - last < 30 * 60 * 1000) return;
  recentViews.set(k, now);
  if (recentViews.size > 5000) {
    for (const [key, t] of recentViews) if (now - t > 30 * 60 * 1000) recentViews.delete(key);
  }
  prisma.profileViewDay
    .upsert({
      where: { profileId_day: { profileId, day: todayIST() } },
      create: { profileId, day: todayIST(), views: 1 },
      update: { views: { increment: 1 } },
    })
    .catch(() => {});
}

// The calendar for one profile: free unless the owner marked the day busy or a
// confirmed booking sits on it. `pending` (owner-only) counts open requests per day.
async function buildCalendar(userId, fromKey, days, { withPending = false } = {}) {
  const toKey = addDays(fromKey, days - 1);
  const [busy, booked, pending] = await Promise.all([
    prisma.availability.findMany({ where: { userId, date: { gte: fromKey, lte: toKey } }, select: { date: true } }),
    prisma.booking.findMany({
      where: { hostId: userId, status: 'CONFIRMED', date: { gte: fromKey, lte: `${toKey}~` } },
      select: { date: true, timeSlot: true },
    }),
    withPending
      ? prisma.booking.findMany({
          where: { hostId: userId, status: 'PENDING', date: { gte: fromKey, lte: `${toKey}~` } },
          select: { date: true },
        })
      : Promise.resolve([]),
  ]);
  const busySet = new Set(busy.map((b) => b.date));
  const bookedMap = new Map(booked.map((b) => [b.date.slice(0, 10), b.timeSlot || true]));
  const pendingCount = {};
  pending.forEach((b) => { const k = b.date.slice(0, 10); pendingCount[k] = (pendingCount[k] || 0) + 1; });
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(fromKey, i);
    const status = bookedMap.has(date) ? 'booked' : busySet.has(date) ? 'busy' : 'free';
    const out = { date, status };
    if (status === 'booked' && typeof bookedMap.get(date) === 'string') out.slot = bookedMap.get(date);
    if (withPending && pendingCount[date]) out.pending = pendingCount[date];
    return out;
  });
}

const STAKEHOLDER_TYPES = ['PERFORMER', 'VENUE', 'BUYER', 'CREW', 'INSTITUTION'];
const VISIBILITIES = ['PUBLIC', 'CONNECTIONS', 'PRIVATE'];
const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED'];

const publicUser = {
  id: true,
  stakeholderType: true, avatarUrl: true,
  name: true,
  bio: true,
  city: true,
  visibility: true,
  verificationStatus: true,
  foundingMember: true,
  createdAt: true,
  detail: true,
};

// GET /api/profiles?type=PERFORMER&city=Mumbai&search=ananya&take=20&skip=0
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    // Private and connections-only profiles never appear in lists or search.
    const where = { visibility: 'PUBLIC' };
    if (req.query.type) {
      if (!STAKEHOLDER_TYPES.includes(req.query.type)) {
        return bad(res, 400, `Invalid type. One of: ${STAKEHOLDER_TYPES.join(', ')}`);
      }
      where.stakeholderType = req.query.type;
    }
    if (req.query.city) where.city = req.query.city;
    if (req.query.search) where.name = { contains: String(req.query.search).slice(0, 80), mode: 'insensitive' };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...publicUser,
          _count: { select: { posts: true, followers: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// POST /api/profiles  (auth) — create a profile.
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { name, stakeholderType, bio, city, visibility, detail } = req.body ?? {};
    const fieldError = checkProfileFields({ name, bio, city, detail });
    if (fieldError) return bad(res, 400, fieldError);

    if (!name || typeof name !== 'string' || !name.trim()) {
      return bad(res, 400, 'Field "name" is required.');
    }
    if (!STAKEHOLDER_TYPES.includes(stakeholderType)) {
      return bad(res, 400, `Field "stakeholderType" must be one of: ${STAKEHOLDER_TYPES.join(', ')}`);
    }
    if (visibility !== undefined && !VISIBILITIES.includes(visibility)) {
      return bad(res, 400, `Field "visibility" must be one of: ${VISIBILITIES.join(', ')}`);
    }

    let cleanedDetail;
    if (detail) {
      const d = cleanDetail(detail);
      if (d.error) return bad(res, 400, d.error);
      cleanedDetail = d.value;
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        stakeholderType,
        bio: bio ?? null,
        city: city ?? null,
        visibility: visibility ?? 'PUBLIC',
        verificationStatus: 'UNVERIFIED',
        ...(cleanedDetail
          ? { detail: { create: { type: stakeholderType, data: cleanedDetail } } }
          : {}),
      },
      select: publicUser,
    });

    res.status(201).json(user);
  })
);

// GET /api/profiles/me  (auth) — the caller's own profile.
// The auth middleware auto-provisions the Prisma user on first sight, so this
// always returns a row for a valid token.
router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: publicUser,
    });
    if (!user) return notFound(res, 'Profile');
    res.json(await withContent(user));
  })
);

// GET /api/profiles/me/connections  (auth) — mutual follows: the people you can collab with.
router.get(
  '/me/connections',
  auth,
  asyncHandler(async (req, res) => {
    const ids = await connectionIds(req.user.id);
    const items = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, stakeholderType: true, avatarUrl: true, city: true, verificationStatus: true, bio: true },
          orderBy: { name: 'asc' },
        })
      : [];
    res.json({ items });
  })
);

// GET /api/profiles/me/following  (auth) — people the caller follows.
// Registered BEFORE /:id so Express doesn't capture "me" as an id.
router.get(
  '/me/following',
  auth,
  asyncHandler(async (req, res) => {
    const rows = await prisma.connection.findMany({
      where: { followerId: req.user.id, kind: 'FOLLOW' },
      include: {
        followee: {
          select: { id: true, name: true, stakeholderType: true, avatarUrl: true, city: true, verificationStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: rows.map((r) => r.followee) });
  })
);


// GET /api/profiles/me/analytics?days=14  (auth) — real numbers for the owner's Insights tab.
router.get(
  '/me/analytics',
  auth,
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 7), 90);
    const me = req.user.id;
    const today = todayIST();
    const from = addDays(today, -(days - 1));
    const prevFrom = addDays(today, -(days * 2 - 1));
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const [viewRows, followers, newFollowers, postsCount, likesReceived, commentsReceived, hostGroups, sentCount, topPosts] =
      await Promise.all([
        prisma.profileViewDay.findMany({ where: { profileId: me, day: { gte: prevFrom, lte: today } }, select: { day: true, views: true } }),
        prisma.connection.count({ where: { followeeId: me } }),
        prisma.connection.count({ where: { followeeId: me, createdAt: { gte: weekAgo } } }),
        prisma.post.count({ where: { authorId: me } }),
        prisma.like.count({ where: { post: { authorId: me } } }),
        prisma.comment.count({ where: { post: { authorId: me } } }),
        prisma.booking.groupBy({ by: ['status'], where: { hostId: me }, _count: { _all: true } }),
        prisma.booking.count({ where: { requesterId: me } }),
        prisma.post.findMany({
          where: { authorId: me },
          orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
          take: 3,
          select: { id: true, body: true, mediaUrl: true, createdAt: true, _count: { select: { likes: true, comments: true } } },
        }),
      ]);

    const byDay = new Map(viewRows.map((r) => [r.day, r.views]));
    const series = Array.from({ length: days }, (_, i) => {
      const day = addDays(from, i);
      return { day, views: byDay.get(day) || 0 };
    });
    const views = series.reduce((a, r) => a + r.views, 0);
    let prevViews = 0;
    for (const r of viewRows) if (r.day < from) prevViews += r.views;
    const hosted = Object.fromEntries(hostGroups.map((g) => [g.status, g._count._all]));

    res.json({
      days,
      views,
      prevViews,
      series,
      followers,
      newFollowers,
      posts: postsCount,
      likesReceived,
      commentsReceived,
      requests: {
        pending: hosted.PENDING || 0,
        confirmed: hosted.CONFIRMED || 0,
        cancelled: hosted.CANCELLED || 0,
        sent: sentCount,
      },
      topPosts,
    });
  })
);

// PUT /api/profiles/me/availability  (auth) { dates: ["2026-10-20", …], status: "busy" | "free" }
// The owner marks days busy (or frees them again). Confirmed bookings always win.
router.put(
  '/me/availability',
  auth,
  asyncHandler(async (req, res) => {
    const { dates, status } = req.body ?? {};
    if (!Array.isArray(dates) || dates.length === 0 || dates.length > 62) {
      return bad(res, 400, 'Field "dates" must be a list of 1–62 days (YYYY-MM-DD).');
    }
    if (status !== 'busy' && status !== 'free') return bad(res, 400, 'Field "status" must be "busy" or "free".');
    const today = todayIST();
    const last = addDays(today, MAX_AHEAD_DAYS);
    const clean = [...new Set(dates)];
    if (!clean.every((d) => validDay(d) && d >= today && d <= last)) {
      return bad(res, 400, `Dates must be valid days from today up to ${MAX_AHEAD_DAYS} days ahead.`);
    }
    if (status === 'busy') {
      await prisma.availability.createMany({
        data: clean.map((date) => ({ userId: req.user.id, date, status: 'BUSY' })),
        skipDuplicates: true,
      });
    } else {
      await prisma.availability.deleteMany({ where: { userId: req.user.id, date: { in: clean } } });
    }
    res.json({ ok: true, calendar: await buildCalendar(req.user.id, today, 30, { withPending: true }) });
  })
);

// GET /api/profiles/:id/availability?days=30  (public) — free / busy / booked per day.
// With the owner's token it also carries `pending` request counts.
router.get(
  '/:id/availability',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 60);
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, visibility: true } });
    if (!user || (user.visibility === 'PRIVATE' && req.user?.id !== user.id)) return notFound(res, 'Profile');
    const owner = req.user?.id === user.id;
    res.json({ today: todayIST(), days: await buildCalendar(user.id, todayIST(), days, { withPending: owner }) });
  })
);

// GET /api/profiles/:id
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...publicUser,
        posts: {
          select: { id: true, body: true, mediaUrl: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: { select: { posts: true, followers: true, following: true } },
      },
    });
    if (!user) return notFound(res, 'Profile');
    // Private profiles are visible only to their owner.
    if (user.visibility === 'PRIVATE' && req.user?.id !== user.id) return notFound(res, 'Profile');
    if (req.user?.id !== user.id) recordView(user.id, req.user?.id || req.ip || 'anon');
    res.json({ ...user, relation: await relationBetween(req.user?.id, user.id) });
  })
);

// DELETE /api/profiles/me  (auth) — delete the caller's account and all their content.
// Required by the App Store / Play Store and India's DPDP Act. Posts, comments,
// likes, stories, messages, memberships etc. cascade via the schema.
router.delete(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ ok: true });
  })
);

// PATCH /api/profiles/:id  (auth, owner only)
router.patch(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    if (req.user.id !== req.params.id) {
      return bad(res, 403, 'You can only edit your own profile.');
    }

    const { name, stakeholderType, bio, city, visibility, detail, avatarUrl, birthDate, contentOpen } = req.body ?? {};
    const fieldError = checkProfileFields({ name, bio, city, detail });
    if (fieldError) return bad(res, 400, fieldError);
    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return bad(res, 400, 'Field "name" must be a non-empty string.');
      data.name = name.trim();
    }
    if (stakeholderType !== undefined) {
      if (!STAKEHOLDER_TYPES.includes(stakeholderType)) return bad(res, 400, `Invalid stakeholderType.`);
      data.stakeholderType = stakeholderType;
    }
    if (bio !== undefined) data.bio = bio;
    if (city !== undefined) data.city = city;
    if (visibility !== undefined) {
      if (!VISIBILITIES.includes(visibility)) return bad(res, 400, `Invalid visibility.`);
      data.visibility = visibility;
    }
    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && !isOwnMediaUrl(avatarUrl)) return bad(res, 400, 'Field "avatarUrl" must be a photo uploaded to Gigset.');
      data.avatarUrl = avatarUrl;
    }
    if (birthDate !== undefined || contentOpen !== undefined) {
      const cur = await prisma.user.findUnique({ where: { id: req.user.id }, select: { birthDate: true } });
      let born = cur?.birthDate || null;
      if (birthDate !== undefined) {
        // Set once: changing it later would let a young person simply re-enter an older date.
        if (born) return bad(res, 409, 'Your birth date is already saved. Contact support if it needs correcting.');
        const b = parseBirthDate(birthDate);
        if (b.error) return bad(res, 400, b.error);
        data.birthDate = born = b.value;
      }
      if (contentOpen !== undefined) {
        if (typeof contentOpen !== 'boolean') return bad(res, 400, 'Invalid setting.');
        const info = contentInfo({ birthDate: born });
        data.contentOpen = contentOpen && info.adult; // only ever on for verified-by-date adults
      }
    }
    if (detail !== undefined) {
      const d = cleanDetail(detail);
      if (d.error) return bad(res, 400, d.error);
      const type = data.stakeholderType || stakeholderType || 'custom';
      data.detail = {
        upsert: {
          create: { type, data: d.value },
          update: { type, data: d.value },
        },
      };
    }

    try {
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data,
        select: publicUser,
      });
      res.json(await withContent(user));
    } catch {
      return notFound(res, 'Profile');
    }
  })
);

// POST /api/profiles/:id/follow  (auth) — follow a profile.
// Idempotent: following twice stays followed.
router.post(
  '/:id/follow',
  auth,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) {
      return bad(res, 400, 'You cannot follow yourself.');
    }
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!target) return notFound(res, 'Profile');
    if (await isBlockedBetween(req.user.id, req.params.id)) return bad(res, 403, 'You cannot follow this person.');
    await prisma.connection.upsert({
      where: {
        followerId_followeeId: { followerId: req.user.id, followeeId: req.params.id },
      },
      create: { followerId: req.user.id, followeeId: req.params.id, status: 'ACCEPTED', kind: 'FOLLOW' },
      update: { status: 'ACCEPTED' },
    });
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    notify(req.params.id, {
      type: 'follow',
      title: 'New follower',
      body: `${me?.name ?? 'Someone'} started following you.`,
      link: `/profile/${req.user.id}`,
      from: req.user.id,
    });
    res.status(201).json({ ok: true });
  })
);

// DELETE /api/profiles/:id/follow  (auth) — unfollow a profile.
router.delete(
  '/:id/follow',
  auth,
  asyncHandler(async (req, res) => {
    await prisma.connection.deleteMany({
      where: { followerId: req.user.id, followeeId: req.params.id },
    });
    res.json({ ok: true });
  })
);

export default router;
