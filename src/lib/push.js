// Browser notifications (Web Push). Needs the API to have VAPID keys; otherwise isSupported() still
// reflects the browser but Push.key() returns null and we say it is not available yet.
import { Push } from './api';

const b64ToBytes = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function registration() {
  const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  await navigator.serviceWorker.ready;
  return reg;
}

export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    const reg = await navigator.serviceWorker.getRegistration(`${import.meta.env.BASE_URL}`);
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch { return 'off'; }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support notifications.');
  const { key } = await Push.key();
  if (!key) throw new Error('Browser notifications are not switched on for Gigset yet.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings for this site.');
  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
  const j = sub.toJSON();
  await Push.subscribe({ endpoint: j.endpoint, keys: j.keys });
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration(`${import.meta.env.BASE_URL}`);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await Push.unsubscribe(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  }
}
