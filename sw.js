// Bump this when you deploy changes to force-update caches
const CACHE_NAME = 'evidence-upload-v4';

// Add any other site assets you want guaranteed offline here
const OFFLINE_URLS = [
  './',
  './index.html',
  './favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never cache Tawk.to or Google Apps Script requests
  if (url.includes('tawk.to') || url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Navigation requests: network first, fallback to cached index
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For other requests: cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ||
      fetch(event.request).then((resp) => {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        return resp;
      }).catch(() => caches.match('./index.html'))
    )
  );
});

