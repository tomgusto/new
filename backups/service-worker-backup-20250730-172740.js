// Service Worker for Workout Manager
const CACHE_NAME = 'workout-manager-v2';
const OFFLINE_URL = '/offline.html';

// Core assets to cache
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/localStorage.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-144x144.png',
  '/icons/icon-48x48.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js'
];

// Network-first, then cache fallback strategy
const NETWORK_FIRST_URLS = [
  // Add any API endpoints that should try network first
];

// Cache-first strategy
const CACHE_FIRST_URLS = [
  // Static assets
  /\/icons\//,
  /\/css\//,
  /\/js\//,
  /\/img\//
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching core assets');
        return cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' })))
          .catch(error => {
            console.error('Failed to cache some assets:', error);
            throw error;
          });
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
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

// Fetch event handler with different strategies
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || requestUrl.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle navigation requests with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If we got a valid response, cache it and return it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => {
          // If fetch fails, try to serve from cache
          return caches.match('/index.html')
            .then(response => response || caches.match(OFFLINE_URL));
        })
    );
    return;
  }
  
  // Check if this is a network-first URL
  const isNetworkFirst = NETWORK_FIRST_URLS.some(url => 
    typeof url === 'string' ? 
      event.request.url.includes(url) : 
      url.test(event.request.url)
  );
  
  // Check if this is a cache-first URL
  const isCacheFirst = CACHE_FIRST_URLS.some(regex => 
    regex.test(event.request.url)
  );
  
  // Network first strategy for API calls
  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If we got a valid response, cache it and return it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => {
          // If fetch fails, try to serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache first strategy for static assets
  if (isCacheFirst) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Return cached response if found
          if (cachedResponse) {
            return cachedResponse;
          }
          // Otherwise fetch from network and cache it
          return fetch(event.request)
            .then(response => {
              // Only cache valid responses
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
              return response;
            });
        })
    );
    return;
  }
  
  // Default: try cache, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Only cache valid responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Don't cache data: URLs
            if (response.url.startsWith('data:')) {
              return response;
            }
            
            // Cache the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));
              
            return response;
          })
          .catch(error => {
            console.error('Fetch failed; returning offline page', error);
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('You are offline', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});
