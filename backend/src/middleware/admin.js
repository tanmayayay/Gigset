import { prisma } from '../lib/prisma.js';
import { asyncHandler, bad } from '../lib/http.js';
import { auth } from './auth.js';

/** Emails listed in the ADMIN_EMAILS setting are always admins (comma separated). */
const envAdmins = () => (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
export const isEnvAdmin = (email) => !!email && envAdmins().includes(String(email).toLowerCase());
export const isAdminUser = (u) => !!u && !u.suspendedAt && (u.role === 'ADMIN' || isEnvAdmin(u.email));

/** Signed in AND an admin, otherwise 403. Puts the admin's own row on req.admin. */
export const adminOnly = [
  auth,
  asyncHandler(async (req, res, next) => {
    const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, email: true, role: true, suspendedAt: true } });
    if (!isAdminUser(u)) return bad(res, 403, 'Admins only.');
    req.admin = u;
    next();
  }),
];

export async function audit(admin, action, { targetType, targetId, summary } = {}) {
  try {
    await prisma.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action, targetType: targetType ?? null, targetId: targetId ?? null, summary: summary ? String(summary).slice(0, 300) : null } });
  } catch { /* never block an action because the log failed */ }
}
