/* Gigset service worker: browser notifications only (no offline caching). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* ignore */ }
  event.waitUntil((async () => {
    // If Gigset is open and in front, the in-app pop-up already told them.
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === 'visible' && w.focused)) return;
    await self.registration.showNotification(data.title || 'Gigset', {
      body: data.body || '',
      tag: data.tag || 'gigset',
      icon: './brand/icon-192.png',
      badge: './brand/favicon-32.png',
      data: { url: data.url || '/notifications' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // New notifications carry a path (/messages?c=…); older ones a hash (#/messages?c=…).
  const link = ((event.notification.data && event.notification.data.url) || '/notifications').replace(/^#/, '');
  const target = new URL(link, self.registration.scope);
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        w.navigate(target.href).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
