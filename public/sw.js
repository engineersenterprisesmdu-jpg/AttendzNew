const CACHE_NAME = 'attendx-pwa-cache-v6';

// Dynamically compute the application's base directory pathway from the service worker's registration scope
const SCOPE_PATH = (function() {
  try {
    const scopeUrl = new URL(self.registration.scope);
    const pathname = scopeUrl.pathname;
    return pathname.endsWith('/') ? pathname : pathname + '/';
  } catch (e) {
    return '/';
  }
})();

const ASSETS_TO_CACHE = [
  SCOPE_PATH,
  SCOPE_PATH + 'index.html',
  SCOPE_PATH + 'manifest.json',
  SCOPE_PATH + 'app-icon.svg'
];

// Install Event - Pre-cache shell assets dynamically
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching based on dynamic scope base:', SCOPE_PATH);
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
            console.log('[PWA SW] Removing old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-First Strategy with Clean Cache Fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Only cache same-origin assets
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful network responses of same-origin
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            const pathname = url.pathname;
            if (
              event.request.mode === 'navigate' ||
              pathname.includes('/assets/') ||
              ASSETS_TO_CACHE.includes(pathname)
            ) {
              cache.put(event.request, responseToCache);
            }
          });
        }
        return networkResponse;
      })
      .catch((err) => {
        console.log('[PWA SW] Network failed, looking up cache for:', url.pathname, err);
        // Offline / network failure: fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If it's a page navigation request, return cached root/index dynamically
          if (event.request.mode === 'navigate') {
            return caches.match(SCOPE_PATH) || caches.match(SCOPE_PATH + 'index.html');
          }
          // Propagate error to browser if asset is missing and uncached, preventing SW crash state
          throw err;
        });
      })
  );
});
