const CACHE_NAME = 'evidence-upload-v1';
const OFFLINE_URLS = [
  './', // root
  './index.html',
  './style.css', // if you have a CSS file
  './script.js', // if you have a separate JS file
  './favicon.ico'
];

// Install event: cache all static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Don't try to cache Google Apps Script uploads or Tawk.to
  if (event.request.url.includes('script.google.com') || event.request.url.includes('tawk.to')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // If offline and not found in cache, serve index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
