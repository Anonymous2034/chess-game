// Service Worker — Offline support for Grandmasters Chess
const CACHE_NAME = 'grandmasters-v175';

// Install — precache core assets only (lazy-cache the rest on fetch)
const CORE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './lib/chess.min.js',
  './js/main.js',
  './js/board.js',
  './js/game.js',
  './js/engine.js',
  './js/notation.js',
  './js/utils.js',
  './js/themes.js',
  './js/api-client.js',
  './js/sync-queue.js',
  './js/auth.js',
  './js/sound.js',
  './js/bots.js',
  './icons/icon-192.png',
  './assets/favicon.svg',
  './lib/stockfish/stockfish.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        Promise.all(
          CORE_URLS.map(url =>
            cache.add(url).catch(err =>
              console.warn('SW: failed to cache', url, err)
            )
          )
        )
      )
    // Don't call skipWaiting — let the new SW wait until all tabs are closed.
    // This prevents mid-session cache wipes that cause reload loops.
  );
});

// Activate — clean old caches (runs only after all old tabs are closed)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
    // Don't call clients.claim — let pages continue using the SW they started with.
  );
});

// Fetch — network-first for code, cache-first for assets, skip APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Network-only for API calls and WebSocket
  if (url.pathname.startsWith('/api/') || url.pathname === '/ws') return;

  // Network-only for external services
  if (url.hostname !== self.location.hostname) return;

  const path = url.pathname;

  // Network-first for HTML, JS, CSS, JSON (ensures updates reach users)
  if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.json') ||
      path.endsWith('.css') || path === '/' || path.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (SVG, PNG, WASM, PGN, audio)
  // Also lazy-cache on first fetch so they're available offline
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
