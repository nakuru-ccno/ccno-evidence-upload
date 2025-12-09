// Service Worker for CCNO Evidence Portal
const CACHE_NAME = 'ccno-evidence-v1.2';

// CRITICAL: All paths must include /ccno-evidence-upload/
const urlsToCache = [
  '/ccno-evidence-upload/',
  '/ccno-evidence-upload/index.html',
  '/ccno-evidence-upload/style.css',
  '/ccno-evidence-upload/script.js',
  '/ccno-evidence-upload/manifest.json',
  '/ccno-evidence-upload/icon-192.png',
  '/ccno-evidence-upload/icon-512.png',
  '/ccno-evidence-upload/images/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('[Service Worker] All resources cached');
            return self.skipWaiting();
          })
          .catch(err => {
            console.log('[Service Worker] Cache addAll error:', err);
          });
      })
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', event => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    // Network first for API calls
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({ 
            error: 'You are offline. Please check your connection.' 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // For HTML pages - network first, fallback to cache
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the new version
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback to index.html
              return caches.match('/ccno-evidence-upload/index.html');
            });
        })
    );
    return;
  }
  
  // For static assets - cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache the new response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed:', error);
            
            // For images, return a placeholder
            if (event.request.url.match(/\.(jpg|png|gif|svg)$/)) {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Image</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            
            // For CSS, return empty styles
            if (event.request.url.match(/\.css$/)) {
              return new Response('/* Offline - no styles */', {
                headers: { 'Content-Type': 'text/css' }
              });
            }
          });
      })
  );
});

// ===== SYNC EVENT (Background Sync) =====
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-evidence') {
    event.waitUntil(syncPendingEvidence());
  }
});

async function syncPendingEvidence() {
  console.log('[Service Worker] Syncing pending evidence...');
  // You can implement offline form submission sync here
  // Check IndexedDB for pending uploads and sync them
}

// ===== PUSH NOTIFICATION EVENT =====
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received.');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/ccno-evidence-upload/icon-192.png',
    badge: '/ccno-evidence-upload/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('CCNO Evidence Portal', options)
  );
});

// ===== NOTIFICATION CLICK EVENT =====
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received.');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Focus on existing window if available
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/ccno-evidence-upload/');
        }
      })
  );
});

// ===== MESSAGE EVENT =====
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});

// ===== PERIODIC SYNC (for future use) =====
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-content') {
    console.log('[Service Worker] Periodic sync triggered');
    event.waitUntil(updateCachedContent());
  }
});

async function updateCachedContent() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
    } catch (error) {
      console.log('[Service Worker] Failed to update:', request.url, error);
    }
  }
}
