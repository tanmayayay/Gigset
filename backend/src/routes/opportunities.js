import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { connectionIds } from '../lib/connections.js';
import { checkAll, CLEAN_MESSAGE } from '../lib/moderation.js';
import { asyncHandler, bad, notFound, pagination } from '../lib/http.js';

const router = Router();

const OPP_STATUSES = ['OPEN', 'CLOSED'];
const VISIBILITIES = ['PUBLIC', 'CONNECTIONS'];

// Connections-only opportunities are visible to their poster and the poster's connections.
async function canSee(opp, userId) {
  if (!opp.visibility || opp.visibility === 'PUBLIC' || opp.posterId === userId) return true;
  if (!userId) return false;
  return (await connectionIds(userId)).includes(opp.posterId);
}

const posterSelect = {
  id: true,
  name: true,
  stakeholderType: true, avatarUrl: true,
  city: true,
  verificationStatus: true,
};

// GET /api/opportunities?status=OPEN&city=Mumbai&genre=&take=20&skip=0
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = {};
    const me = req.user?.id;
    where.OR = me
      ? [{ visibility: 'PUBLIC' }, { posterId: me }, { posterId: { in: await connectionIds(me) } }]
      : [{ visibility: 'PUBLIC' }];
    if (req.query.status) {
      if (!OPP_STATUSES.includes(req.query.status)) {
        return bad(res, 400, `Invalid status. One of: ${OPP_STATUSES.join(', ')}`);
      }
      where.status = req.query.status;
    }
    if (req.query.city) where.city = req.query.city;
    if (req.query.genre) where.genre = req.query.genre;

    const [items, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: {
          poster: { select: posterSelect },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.opportunity.count({ where }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// POST /api/opportunities  (auth)
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { title, description, requirements, city, genre, budgetMin, budgetMax, visibility } = req.body ?? {};
    if (visibility !== undefined && !VISIBILITIES.includes(visibility)) {
      return bad(res, 400, `Field "visibility" must be one of: ${VISIBILITIES.join(', ')}`);
    }
    if (!checkAll(title, description, typeof requirements === 'string' ? requirements : '').ok) return bad(res, 422, CLEAN_MESSAGE);

    if (!title || typeof title !== 'string' || !title.trim()) {
      return bad(res, 400, 'Field "title" is required.');
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return bad(res, 400, 'Field "description" is required.');
    }
    if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax) {
      return bad(res, 400, 'budgetMin cannot be greater than budgetMax.');
    }

    const opp = await prisma.opportunity.create({
      data: {
        posterId: req.user.id,
        visibility: visibility ?? 'PUBLIC',
        title: title.trim(),
        description: description.trim(),
        requirements: requirements ?? null,
        city: city ?? null,
        genre: genre ?? null,
        budgetMin: budgetMin ?? null,
        budgetMax: budgetMax ?? null,
      },
      include: { poster: { select: posterSelect } },
    });

    res.status(201).json(opp);
  })
);

// GET /api/opportunities/:id
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const opp = await prisma.opportunity.findUnique({
      where: { id: req.params.id },
      include: {
        poster: { select: posterSelect },
        _count: { select: { applications: true } },
      },
    });
    if (!opp || !(await canSee(opp, req.user?.id))) return notFound(res, 'Opportunity');
    res.json(opp);
  })
);

// POST /api/opportunities/:id/apply  (auth)  { message?, intent? }
// intent: 'PERFORM' (default) or 'ATTEND' — apply to perform, or just go and enjoy.
router.post(
  '/:id/apply',
  auth,
  asyncHandler(async (req, res) => {
    const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id } });
    if (!opp || !(await canSee(opp, req.user.id))) return notFound(res, 'Opportunity');
    if (opp.status !== 'OPEN') return bad(res, 400, 'This opportunity is closed.');
    if (opp.posterId === req.user.id) return bad(res, 400, 'You cannot apply to your own opportunity.');

    const INTENTS = ['PERFORM', 'ATTEND'];
    const intent = req.body?.intent ?? 'PERFORM';
    if (!INTENTS.includes(intent)) {
      return bad(res, 400, `Field "intent" must be one of: ${INTENTS.join(', ')}.`);
    }

    try {
      const application = await prisma.application.create({
        data: {
          opportunityId: opp.id,
          applicantId: req.user.id,
          message: req.body?.message ?? null,
          intent,
        },
        include: { applicant: { select: posterSelect } },
      });
      // Alert the poster.
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
      await prisma.notification
        .create({
          data: {
            userId: opp.posterId,
            type: 'application',
            title: 'New application',
            body: `${me?.name ?? 'Someone'} applied to "${opp.title}".`,
            link: '/gighub',
          },
        })
        .catch(() => {});
      res.status(201).json(application);
    } catch {
      return bad(res, 409, 'You have already applied to this opportunity.');
    }
  })
);

// GET /api/opportunities/:id/applications  (auth, poster only)
router.get(
  '/:id/applications',
  auth,
  asyncHandler(async (req, res) => {
    const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id } });
    if (!opp) return notFound(res, 'Opportunity');
    if (opp.posterId !== req.user.id) {
      return bad(res, 403, 'Only the poster can view applications.');
    }

    const { take, skip } = pagination(req);
    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where: { opportunityId: opp.id },
        include: { applicant: { select: posterSelect } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.application.count({ where: { opportunityId: opp.id } }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// PATCH /api/opportunities/applications/:appId  (auth, poster only)
// { status: 'SHORTLISTED' | 'REJECTED' | 'WITHDRAWN' }
router.patch(
  '/applications/:appId',
  auth,
  asyncHandler(async (req, res) => {
    const STATUSES = ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'];
    const { status } = req.body ?? {};
    if (!STATUSES.includes(status)) {
      return bad(res, 400, `Field "status" must be one of: ${STATUSES.join(', ')}`);
    }
    const app = await prisma.application.findUnique({
      where: { id: req.params.appId },
      include: { opportunity: { select: { posterId: true, title: true } } },
    });
    if (!app) return notFound(res, 'Application');
    if (app.opportunity.posterId !== req.user.id) {
      return bad(res, 403, 'Only the opportunity poster can update applications.');
    }
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: { status },
    });
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    await prisma.notification
      .create({
        data: {
          userId: app.applicantId,
          type: 'application',
          title: status === 'SHORTLISTED' ? 'You were shortlisted' : 'Application update',
          body: `${me?.name ?? 'The poster'} ${status === 'SHORTLISTED' ? 'shortlisted you' : 'updated your application'} for "${app.opportunity.title}".`,
          link: '/gighub',
        },
      })
      .catch(() => {});
    res.json(updated);
  })
);

export default router;
