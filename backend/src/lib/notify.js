// One place to tell a person something: bell notification + browser push + (optional) email.
import { prisma } from './prisma.js';
import { pushTo } from './push.js';
import { sendEmail, emailEnabled, layout, appUrl, unsubUrl, esc } from './email.js';
import { isBlockedBetween } from './blocks.js';

/**
 * notify(userId, { type, title, body, link, from, email: { subject, intro, cta } })
 * `link` is an in-app route like "/collab?tab=bookings".
 * `from` (user id) lets us skip people who blocked each other.
 */
export async function notify(userId, { type, title, body, link, from, email }) {
  try {
    if (from && (await isBlockedBetween(userId, from))) return;
    await prisma.notification.create({ data: { userId, type, title, body: body ?? null, link: link ?? null } });
    pushTo(userId, { title, body, url: link ? `#${link}` : '#/notifications', tag: type });
    if (email && emailEnabled()) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailAlerts: true } });
      if (u?.email && u.emailAlerts) {
        sendEmail({
          to: u.email,
          subject: email.subject || title,
          html: layout({
            title,
            intro: esc(email.intro || body || ''),
            cta: email.cta || 'Open Gigset',
            ctaUrl: appUrl(link || '/notifications'),
            unsubscribe: unsubUrl(userId, 'alerts'),
          }),
        });
      }
    }
  } catch (e) {
    console.warn('[notify] failed', e?.message);
  }
}
