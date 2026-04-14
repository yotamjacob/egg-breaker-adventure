// ============================================================
//  Egg Breaker Adventures — Service Worker
//  Update CACHE_VERSION whenever assets change (matches game version).
// ============================================================

const CACHE_VERSION = '1.3.7';
const CACHE_NAME    = 'eba-' + CACHE_VERSION;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/bundle.min.css',
  '/bundle.min.js',
  '/img/mrmonkey.webp',
  '/img/steampunk.webp',
  '/img/princess.webp',
  '/img/space.webp',
  '/img/mrmonkey_chef.webp',
  '/img/steampunk_chef.webp',
  '/img/princess_chef.webp',
  '/img/space_chef.webp',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/privacy.html',
  '/screenshots/screen-mobile.png',
  '/screenshots/screen-album.png',
  '/screenshots/screen-shop.png',
];

// ── Install: pre-cache all static assets ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
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
