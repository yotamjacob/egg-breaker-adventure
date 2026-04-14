// ============================================================
//  Egg Breaker Adventures — Service Worker
//  Update CACHE_VERSION whenever assets change (matches game version).
// ============================================================

const CACHE_VERSION = '1.1.7';
const CACHE_NAME    = 'eba-' + CACHE_VERSION;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/style.css',
  '/play.css',
  '/tabs.css',
  '/components.css',
  '/config.js',
  '/data.js',
  '/audio.js',
  '/particles.js',
  '/hammers.js',
  '/render.js',
  '/game.js',
  '/img/mrmonkey.png',
  '/img/steampunk.png',
  '/img/princess.png',
  '/img/space.png',
  '/img/mrmonkey_chef.png',
  '/img/steampunk_chef.png',
  '/img/princess_chef.png',
  '/img/space_chef.png',
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

// ── Fetch: cache-first, fall back to network ──────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests for same origin
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache immediately; revalidate in background
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {});
        return cached;
      }
      // Not in cache — fetch from network and cache it
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
