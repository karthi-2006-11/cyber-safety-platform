/**
 * Cyber Safety Platform — Minimal Safe Application Shell Service Worker
 * Focus: PWA Installability and Safe Application Shell Performance
 * STRICT SAFETY RULE: Never cache API endpoints, JWTs, reports, or threat decisions.
 */

const CACHE_NAME = 'cybersafety-app-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event — Cache static app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — Clean up legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Safe network-first / cache-bypass strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. STRICT SAFETY BYPASS: Never intercept or cache API requests or non-GET requests
  if (request.method !== 'GET' || url.pathname.includes('/api/')) {
    return; // Default browser fetch handling
  }

  // 2. App Shell & Static Asset Strategy (Stale-While-Revalidate for static UI assets)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Return cached response if offline
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
