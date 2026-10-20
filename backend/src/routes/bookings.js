import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, pagination, tooLong } from '../lib/http.js';
import { notify } from '../lib/notify.js';
import { isBlockedBetween } from '../lib/blocks.js';

const router = Router();

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'];

const partySelect = {
  id: true,
  name: true,
  stakeholderType: true, avatarUrl: true,
  city: true,
};

// All booking routes require auth — bookings always belong to the caller.

// GET /api/bookings?role=requester|host&status=PENDING&take=20&skip=0
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { take, skip } = pagination(req);
    const where = { OR: [{ requesterId: req.user.id }, { hostId: req.user.id }] };

    if (req.query.role === 'requester') where.OR = [{ requesterId: req.user.id }];
    else if (req.query.role === 'host') where.OR = [{ hostId: req.user.id }];
    else if (req.query.role) return bad(res, 400, 'Invalid role. Use "requester" or "host".');

    if (req.query.status) {
      if (!BOOKING_STATUSES.includes(req.query.status)) {
        return bad(res, 400, `Invalid status. One of: ${BOOKING_STATUSES.join(', ')}`);
      }
      where.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          requester: { select: partySelect },
          host: { select: partySelect },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ items, total, take, skip });
  })
);

// POST /api/bookings  (auth)  { hostId, date, timeSlot?, budget?, message? }
// Mirrors the frontend BookingModal: requester picks a host, dateISO, slot,
// budget bucket and an optional message. Stored status starts as PENDING.
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { hostId, date, timeSlot, budget, message } = req.body ?? {};

    if (!hostId || typeof hostId !== 'string') {
      return bad(res, 400, 'Field "hostId" is required (the profile being booked).');
    }
    if (hostId === req.user.id) {
      return bad(res, 400, 'You cannot book yourself.');
    }
    if (!date || typeof date !== 'string' || Number.isNaN(Date.parse(date))) {
      return bad(res, 400, 'Field "date" is required as an ISO date string (e.g. "2026-10-10").');
    }

    const day = date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return bad(res, 400, 'Field "date" must start with YYYY-MM-DD.');
    if (tooLong(message, 500, 'message') || tooLong(timeSlot, 40, 'timeSlot') || tooLong(budget, 40, 'budget')) {
      return bad(res, 400, 'Message, time slot or budget is too long.');
    }

    const host = await prisma.user.findUnique({ where: { id: hostId } });
    if (!host) return notFound(res, 'Host profile');
    if (await isBlockedBetween(req.user.id, hostId)) return bad(res, 403, 'You cannot send a request to this person.');

    // Respect the host's live calendar: busy days and confirmed bookings can't be requested.
    const [busy, taken] = await Promise.all([
      prisma.availability.findUnique({ where: { userId_date: { userId: hostId, date: day } } }),
      prisma.booking.findFirst({ where: { hostId, status: 'CONFIRMED', date: { startsWith: day } } }),
    ]);
    if (busy || taken) return bad(res, 409, `${host.name.split(' ')[0]} isn't available on that day. Pick another date.`);

    const booking = await prisma.booking.create({
      data: {
        requesterId: req.user.id,
        hostId,
        date,
        timeSlot: timeSlot ?? null,
        budget: budget ?? null,
        message: message ?? null,
      },
      include: { requester: { select: partySelect }, host: { select: partySelect } },
    });

    // Tell the host there's a new request waiting (bell + push + email, best effort).
    notify(hostId, {
      type: 'booking',
      title: 'New booking request',
      body: `${booking.requester.name} asked to book you for ${day}.`,
      link: '/collab?tab=bookings',
      from: req.user.id,
      email: { subject: `${booking.requester.name} wants to book you on ${day}`, cta: 'Review the request' },
    });

    res.status(201).json(booking);
  })
);

// PATCH /api/bookings/:id  (auth)  { status }
// Rules: only the host can CONFIRM; either party can CANCEL.
router.patch(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const { status } = req.body ?? {};
    if (!BOOKING_STATUSES.includes(status)) {
      return bad(res, 400, `Field "status" must be one of: ${BOOKING_STATUSES.join(', ')}`);
    }

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return notFound(res, 'Booking');

    const isHost = booking.hostId === req.user.id;
    const isRequester = booking.requesterId === req.user.id;
    if (!isHost && !isRequester) return bad(res, 403, 'This booking is not yours.');
    if (status === 'CONFIRMED' && !isHost) {
      return bad(res, 403, 'Only the host can confirm a booking.');
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status },
      include: { requester: { select: partySelect }, host: { select: partySelect } },
    });

    // Let the other side know (best effort).
    if (status !== booking.status) {
      const toId = isHost ? updated.requesterId : updated.hostId;
      const who = isHost ? updated.host.name : updated.requester.name;
      notify(toId, {
        type: 'booking',
        title: status === 'CONFIRMED' ? 'Booking confirmed' : 'Booking cancelled',
        body: `${who} ${status === 'CONFIRMED' ? 'confirmed' : 'cancelled'} the booking for ${updated.date.slice(0, 10)}.`,
        link: '/collab?tab=bookings',
        from: req.user.id,
        email: { subject: status === 'CONFIRMED' ? `${who} confirmed your booking` : `${who} cancelled the booking`, cta: 'Open booking' },
      });
    }

    res.json(updated);
  })
);

export default router;
