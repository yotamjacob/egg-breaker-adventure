// ============================================================
//  Egg Smash Adventures — Service Worker
//  Update CACHE_VERSION whenever assets change (matches game version).
// ============================================================

const CACHE_VERSION = '3.0.1';
const CACHE_NAME    = 'esa-' + CACHE_VERSION;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/bundle.min.css',
  '/bundle.min.js',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/privacy',
];

// ── Install: pre-cache all static assets ──────────────────────
self.addEventListener('install', event => {
  // Do NOT skipWaiting automatically — wait for user confirmation via SKIP_WAITING message.
  // Cache each asset individually (allSettled) rather than cache.addAll: addAll is
  // atomic, so a single missing/404 asset would reject the whole install and the new
  // SW would never activate — trapping clients on a stale (possibly broken) worker.
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(asset => cache.add(asset)))
    )
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
    // Network-first for JS/CSS/HTML/JSON — always get fresh code, but never
    // let a stalled connection hang the page: race the fetch against a timeout
    // and always fall back to cache (and, for navigations, the cached shell).
    event.respondWith(networkFirst(event.request));
  }
});

const NETWORK_TIMEOUT_MS = 6000;

function networkFirst(request) {
  return new Promise(resolve => {
    let settled = false;
    const done = value => { if (!settled) { settled = true; resolve(value); } };

    // Serve cache (exact match, then the app shell for navigations, then a
    // real network error as a last resort — never respondWith(undefined),
    // which the browser treats as a hard failure / error page).
    const fallback = () => caches.match(request).then(cached => {
      if (cached) return done(cached);
      if (request.mode === 'navigate') {
        return caches.match('/').then(shell => done(shell || Response.error()));
      }
      done(Response.error());
    });

    const timer = setTimeout(fallback, NETWORK_TIMEOUT_MS);

    fetch(request).then(response => {
      clearTimeout(timer);
      if (settled) return; // timeout already served cache
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      done(response);
    }).catch(() => { clearTimeout(timer); fallback(); });
  });
}

// Push notifications
self.addEventListener('push', event => {
  let data = { title: 'Egg Smash Adventures', body: 'Tap to play.', url: '/' }
  try { if (event.data) data = { ...data, ...event.data.json() } } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'esa',
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
