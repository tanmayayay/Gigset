// Web push (browser notifications). Optional: needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// Generate keys once with:  npx web-push generate-vapid-keys
import webpush from 'web-push';
import { prisma } from './prisma.js';

let ready = null;
function init() {
  if (ready !== null) return ready;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subj } = process.env;
  ready = !!(pub && priv);
  if (ready) webpush.setVapidDetails(subj || 'mailto:hello@thegigset.com', pub, priv);
  return ready;
}
export const pushEnabled = () => init();
export const vapidPublicKey = () => (init() ? process.env.VAPID_PUBLIC_KEY : null);

/** Send a notification to every browser the person enabled. Failures never throw. */
export async function pushTo(userId, { title, body, url, tag }) {
  if (!init()) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    const payload = JSON.stringify({ title, body: (body || '').slice(0, 140), url: url || '/', tag });
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
      } catch (e) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }));
  } catch { /* best effort */ }
}
