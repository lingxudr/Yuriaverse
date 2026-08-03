const VERSION = 'animesu-pwa-v9-no-ssr-splash-20260728';
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-images`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = '/offline.html';

// Do NOT precache HTML routes. HTML must always be network-fresh after deploy.
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-512x512.png',
  '/brand/animesu-mascot-nav.png',
  '/brand/animesu-logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('animesu-pwa') && !key.startsWith(VERSION)).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'ANIMESU_SW_ACTIVATED', version: VERSION }));
  })());
});

async function putSafe(cacheName, req, res, maxEntries = 80) {
  if (!res || !res.ok || res.type === 'opaque') return;
  const cache = await caches.open(cacheName);
  await cache.put(req, res.clone());
  const keys = await cache.keys();
  if (keys.length > maxEntries) await cache.delete(keys[0]);
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  await putSafe(cacheName, req, res, 120);
  return res;
}

async function staleWhileRevalidate(req, cacheName, maxEntries = 80) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req).then(async (res) => {
    await putSafe(cacheName, req, res, maxEntries);
    return res;
  }).catch(() => cached);
  return cached || network;
}

async function networkOnly(req) {
  return fetch(req, { cache: 'no-store' });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache external requests in this SW.
  if (url.origin !== self.location.origin) return;

  // HTML/navigation must be fresh to avoid old UI after deploy.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // API data changes frequently; do not serve stale API from SW.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/data/')) {
    event.respondWith(networkOnly(req).catch(() => new Response(JSON.stringify({ ok: false, offline: true }), { headers: { 'content-type': 'application/json' }, status: 503 })));
    return;
  }

  // Next static assets are content-hashed and safe to cache aggressively.
  if (url.pathname.startsWith('/_next/static/') || req.destination === 'script' || req.destination === 'style' || req.destination === 'font') {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Same-origin images: show cached instantly, refresh in background.
  if (req.destination === 'image' || /\.(png|jpg|jpeg|webp|gif|svg|ico|avif)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE, 160));
    return;
  }

  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE, 50));
});

self.addEventListener('push', (event) => {
  let data = { title: 'Animesu', body: 'Ada update baru di Animesu.', url: '/' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/maskable-192x192.png',
    image: data.image,
    tag: data.tag || 'animesu-update',
    data: { url: data.url || '/' },
    actions: [{ action: 'open', title: 'Buka Animesu' }]
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ('focus' in client) { client.navigate(url); return client.focus(); }
    }
    return clients.openWindow(url);
  }));
});

async function clearAnimesuCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith('animesu-pwa') || key.startsWith('animesu')).map((key) => caches.delete(key)));
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_ANIMESU_CACHES') event.waitUntil(clearAnimesuCaches());
  if (event.data?.type === 'ANIMESU_TEST_NOTIFICATION') {
    self.registration.showNotification('Animesu Reminder', {
      body: event.data.body || 'Notifikasi Animesu aktif.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/maskable-192x192.png',
      data: { url: event.data.url || '/' }
    });
  }
});
