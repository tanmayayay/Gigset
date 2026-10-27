// Relaxed collab requests between connections.
//   PENDING   – sent, waiting for the other person
//   OFFERED   – they said yes and shared a few times that work for them
//   SCHEDULED – the requester picked one
//   DECLINED / CANCELLED
// Saying yes opens a chat for both people with a friendly starter message from each.
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler, bad, notFound, tooLong } from '../lib/http.js';
import { areConnected } from '../lib/connections.js';
import { isBlockedBetween } from '../lib/blocks.js';
import { checkAll, CLEAN_MESSAGE } from '../lib/moderation.js';
import { notify } from '../lib/notify.js';
import { EPK_TEMPLATES } from './bookings.js';

const router = Router();
export const VIBES = { JAM: 'a jam session', WRITE: 'writing something together', RECORD: 'recording something', GIG: 'playing a show together', HANG: 'just hanging and swapping ideas' };
export const SLOTS = ['Morning', 'Afternoon', 'Evening', 'Late night'];
const person = { id: true, name: true, stakeholderType: true, avatarUrl: true, city: true, verificationStatus: true };
const dateOk = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
const prettyWhen = (o) => `${new Date(`${o.date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}, ${o.slot.toLowerCase()}`;

async function shape(rows) {
  const ids = [...new Set(rows.flatMap((r) => [r.requesterId, r.hostId]))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: person });
  const by = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({ ...r, requester: by.get(r.requesterId) || null, host: by.get(r.hostId) || null }));
}

// GET /api/collabs  → { items, todo }  (everything involving me, newest first)
router.get('/', auth, asyncHandler(async (req, res) => {
  const me = req.user.id;
  const rows = await prisma.collabRequest.findMany({ where: { OR: [{ requesterId: me }, { hostId: me }] }, orderBy: { updatedAt: 'desc' }, take: 100 });
  const items = await shape(rows);
  const todo = rows.filter((r) => (r.hostId === me && r.status === 'PENDING') || (r.requesterId === me && r.status === 'OFFERED')).length;
  res.json({ items, todo });
}));

// POST /api/collabs  { hostId, vibe, note, epkTemplate }
router.post('/', auth, asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { hostId, vibe = 'JAM', note, epkTemplate = 'classic' } = req.body ?? {};
  if (typeof hostId !== 'string' || !hostId) return bad(res, 400, 'Field "hostId" is required.');
  if (hostId === me) return bad(res, 400, 'You cannot collab with yourself.');
  if (!VIBES[vibe]) return bad(res, 400, `Field "vibe" must be one of: ${Object.keys(VIBES).join(', ')}`);
  if (!EPK_TEMPLATES.includes(epkTemplate)) return bad(res, 400, 'Unknown press kit template.');
  const long = tooLong(note, 500, 'note');
  if (long) return bad(res, 400, long);
  if (note && !checkAll(note).ok) return bad(res, 400, CLEAN_MESSAGE);
  const host = await prisma.user.findUnique({ where: { id: hostId }, select: { id: true, name: true } });
  if (!host) return notFound(res, 'User');
  if (await isBlockedBetween(me, hostId)) return bad(res, 403, 'You cannot send a request to this person.');
  if (!(await areConnected(me, hostId))) return bad(res, 403, `You can only collab with your connections. Follow ${host.name} and ask them to follow you back first.`);
  const open = await prisma.collabRequest.findFirst({ where: { status: { in: ['PENDING', 'OFFERED'] }, OR: [{ requesterId: me, hostId }, { requesterId: hostId, hostId: me }] } });
  if (open) return bad(res, 409, 'You already have a collab going with this person. Check your Requests tab.');
  const meRow = await prisma.user.findUnique({ where: { id: me }, select: { name: true } });
  const text = (typeof note === 'string' && note.trim()) || `Hey ${host.name.split(' ')[0]}! I'd love to make something together. Are you up for it?`;
  const created = await prisma.collabRequest.create({ data: { requesterId: me, hostId, vibe, note: text, epkTemplate } });
  notify(hostId, { type: 'collab', title: `${meRow?.name || 'Someone'} wants to collab`, body: `They are up for ${VIBES[vibe]}. Their press kit is attached.`, link: '/collab?tab=requests', from: me, email: { subject: `${meRow?.name || 'Someone'} wants to collab on Gigset`, intro: `They are up for ${VIBES[vibe]}.`, cta: 'See the request' } });
  res.status(201).json(created);
}));

async function mine(req, res, { as, status }) {
  const r = await prisma.collabRequest.findUnique({ where: { id: req.params.id } });
  if (!r || (r.requesterId !== req.user.id && r.hostId !== req.user.id)) { notFound(res, 'Request'); return null; }
  if (as === 'host' && r.hostId !== req.user.id) { bad(res, 403, 'Only the person who got the request can do this.'); return null; }
  if (as === 'requester' && r.requesterId !== req.user.id) { bad(res, 403, 'Only the person who sent the request can do this.'); return null; }
  if (status && !status.includes(r.status)) { bad(res, 409, 'This request has already moved on.'); return null; }
  return r;
}

// POST /api/collabs/:id/accept  { options: [{date, slot}] }  — host says yes and shares times.
router.post('/:id/accept', auth, asyncHandler(async (req, res) => {
  const r = await mine(req, res, { as: 'host', status: ['PENDING'] }); if (!r) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  const raw = Array.isArray(req.body?.options) ? req.body.options : [];
  const options = [];
  for (const o of raw.slice(0, 6)) {
    if (!o || !dateOk(o.date) || !SLOTS.includes(o.slot)) return bad(res, 400, 'Each time needs a date and a part of the day.');
    if (o.date < todayKey) return bad(res, 400, 'Pick days from today onwards.');
    if (!options.some((x) => x.date === o.date && x.slot === o.slot)) options.push({ date: o.date, slot: o.slot });
  }
  if (options.length === 0) return bad(res, 400, 'Share at least one time that works for you.');
  const [host, requester] = await Promise.all([
    prisma.user.findUnique({ where: { id: r.hostId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: r.requesterId }, select: { name: true } }),
  ]);
  // Open (or reuse) their chat, then drop the starter messages in.
  let convo = (await prisma.conversation.findMany({ where: { kind: 'DIRECT', members: { every: { userId: { in: [r.requesterId, r.hostId] } } } }, include: { members: { select: { userId: true } } } })).find((c) => c.members.length === 2);
  if (!convo) convo = await prisma.conversation.create({ data: { kind: 'DIRECT', status: 'ACTIVE', createdById: r.requesterId, members: { create: [{ userId: r.requesterId }, { userId: r.hostId }] } } });
  else if (convo.status !== 'ACTIVE') await prisma.conversation.update({ where: { id: convo.id }, data: { status: 'ACTIVE' } });
  const now = Date.now();
  await prisma.message.createMany({ data: [
    { conversationId: convo.id, senderId: r.requesterId, body: r.note || `Hey ${host?.name?.split(' ')[0] || ''}! I'd love to make something together.`, createdAt: new Date(now - 2000) },
    { conversationId: convo.id, senderId: r.hostId, body: `Hey ${requester?.name?.split(' ')[0] || 'there'}! Yes, let's do it 🎶 I shared a few times that work for me. Pick whichever suits you and we'll lock it in.`, createdAt: new Date(now - 1000) },
  ] });
  await prisma.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });
  const updated = await prisma.collabRequest.update({ where: { id: r.id }, data: { status: 'OFFERED', options, conversationId: convo.id } });
  notify(r.requesterId, { type: 'collab', title: `${host?.name || 'They'} said yes!`, body: 'Pick a time that works for you.', link: '/collab?tab=requests', from: r.hostId, email: { subject: `${host?.name || 'Someone'} said yes to your collab`, intro: 'They shared a few times. Pick one that suits you.', cta: 'Pick a time' } });
  res.json(updated);
}));

// POST /api/collabs/:id/decline  — host, no pressure.
router.post('/:id/decline', auth, asyncHandler(async (req, res) => {
  const r = await mine(req, res, { as: 'host', status: ['PENDING'] }); if (!r) return;
  await prisma.collabRequest.update({ where: { id: r.id }, data: { status: 'DECLINED' } });
  const host = await prisma.user.findUnique({ where: { id: r.hostId }, select: { name: true } });
  notify(r.requesterId, { type: 'collab', title: `${host?.name || 'They'} can't make this one`, body: 'No stress. There are plenty of other people to make music with.', link: '/collab?tab=find', from: r.hostId });
  res.json({ ok: true });
}));

// POST /api/collabs/:id/choose  { index }  — requester picks one of the offered times.
router.post('/:id/choose', auth, asyncHandler(async (req, res) => {
  const r = await mine(req, res, { as: 'requester', status: ['OFFERED'] }); if (!r) return;
  const opts = Array.isArray(r.options) ? r.options : [];
  const pick = opts[Number(req.body?.index)];
  if (!pick) return bad(res, 400, 'Pick one of the times.');
  const updated = await prisma.collabRequest.update({ where: { id: r.id }, data: { status: 'SCHEDULED', chosen: pick } });
  if (r.conversationId) {
    await prisma.message.create({ data: { conversationId: r.conversationId, senderId: r.requesterId, body: `Locked in for ${prettyWhen(pick)} ✨ Looking forward to it!` } });
    await prisma.conversation.update({ where: { id: r.conversationId }, data: { updatedAt: new Date() } });
  }
  const me = await prisma.user.findUnique({ where: { id: r.requesterId }, select: { name: true } });
  notify(r.hostId, { type: 'collab', title: `${me?.name || 'They'} picked ${prettyWhen(pick)}`, body: "It's in your calendar of good ideas. Say hi in the chat.", link: r.conversationId ? `/messages?c=${r.conversationId}` : '/collab?tab=requests', from: r.requesterId });
  res.json(updated);
}));

// POST /api/collabs/:id/cancel  — either person, until it is done.
router.post('/:id/cancel', auth, asyncHandler(async (req, res) => {
  const r = await mine(req, res, { status: ['PENDING', 'OFFERED', 'SCHEDULED'] }); if (!r) return;
  await prisma.collabRequest.update({ where: { id: r.id }, data: { status: 'CANCELLED' } });
  const otherId = r.requesterId === req.user.id ? r.hostId : r.requesterId;
  const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
  notify(otherId, { type: 'collab', title: `${me?.name || 'They'} cancelled the collab`, link: '/collab?tab=requests', from: req.user.id });
  res.json({ ok: true });
}));

export default router;
