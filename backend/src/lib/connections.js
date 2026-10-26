import { prisma } from './prisma.js';

// A "connection" is a mutual follow: you follow them and they follow you back.
// Collab requests and connections-only opportunities are limited to connections.

/** Ids of everyone the person is connected with. */
export async function connectionIds(userId) {
  if (!userId) return [];
  const [out, inc] = await Promise.all([
    prisma.connection.findMany({ where: { followerId: userId }, select: { followeeId: true } }),
    prisma.connection.findMany({ where: { followeeId: userId }, select: { followerId: true } }),
  ]);
  const followsMe = new Set(inc.map((r) => r.followerId));
  return out.map((r) => r.followeeId).filter((id) => followsMe.has(id));
}

/** True when both people follow each other. */
export async function areConnected(a, b) {
  if (!a || !b || a === b) return false;
  const n = await prisma.connection.count({
    where: { OR: [{ followerId: a, followeeId: b }, { followerId: b, followeeId: a }] },
  });
  return n >= 2;
}

/** { iFollow, followsMe, connected } between the viewer and another person. */
export async function relationBetween(viewerId, otherId) {
  if (!viewerId || !otherId || viewerId === otherId) return { iFollow: false, followsMe: false, connected: false };
  const rows = await prisma.connection.findMany({
    where: { OR: [{ followerId: viewerId, followeeId: otherId }, { followerId: otherId, followeeId: viewerId }] },
    select: { followerId: true },
  });
  const iFollow = rows.some((r) => r.followerId === viewerId);
  const followsMe = rows.some((r) => r.followerId === otherId);
  return { iFollow, followsMe, connected: iFollow && followsMe };
}
