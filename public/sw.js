const CACHE_NAME = 'attendx-pwa-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './app-icon.svg'
];

// Install Event - Pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[PWA SW] Pre-caching asset failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-First Strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If response is valid, clone and cache it for offline fallback if it is in our assets or a navigation request
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            const urlObj = new URL(event.request.url);
            if (
              event.request.mode === 'navigate' ||
              ASSETS_TO_CACHE.some(asset => urlObj.pathname.endsWith(asset.replace('./', '')))
            ) {
              cache.put(event.request, responseToCache);
            }
          });
        }
        return networkResponse;
      })
      .catch((err) => {
        console.log('[PWA SW] Network request failed. Falling back to cache...', err);
        // Offline / network failure: fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If it's a page navigation, return the cached index.html template
          if (event.request.mode === 'navigate') {
            return caches.match('./') || caches.match('./index.html') || caches.match('index.html');
          }
        });
      })
  );
});
