// ============================================================
//  Egg Breaker Adventures — Service Worker
//  Update CACHE_VERSION whenever assets change (matches game version).
// ============================================================

const CACHE_VERSION = '1.4.9';
const CACHE_NAME    = 'eba-' + CACHE_VERSION;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/bundle.min.css',
  '/bundle.min.js',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/privacy.html',
];

// ── Install: pre-cache all static assets ──────────────────────
self.addEventListener('install', event => {
  // Do NOT skipWaiting automatically — wait for user confirmation via SKIP_WAITING message
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// ── Message: allow page to trigger activation after user confirms update ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for scripts/html, cache-first for images ────
self.addEventListener('fetch', event => {
  // Only handle GET requests for same origin
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isImage = /\.(png|jpg|jpeg|gif|svg|ico|webp)$/.test(url.pathname);

  if (isImage) {
    // Cache-first for images — they rarely change
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
  } else {
    // Network-first for JS/CSS/HTML/JSON — always get fresh code,
    // fall back to cache only when offline
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
  }
});

// Push notifications
self.addEventListener('push', event => {
  let data = { title: 'Egg Breaker Adventure Revival', body: 'Tap to play.', url: '/' }
  try { if (event.data) data = { ...data, ...event.data.json() } } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'eba',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus()
      }
      return clients.openWindow(url)
    })
  )
})
