// Service Worker for Workout Manager
const CACHE_NAME = 'workout-manager-v5';
const OFFLINE_URL = '/offline.html';
const START_URL = '/index.html';
const APP_DATA_KEY = 'workoutManagerAppData';

// Debug function with timestamp and persistent logging
function debugLog(...args) {
  const timestamp = new Date().toISOString();
  const logMessage = `[SW ${timestamp}] ${args.join(' ')}`;
  console.log(logMessage);
  
  // Store log in IndexedDB for persistence
  storeLog(logMessage);
  
  // Send log to all clients
  self.clients.matchAll({includeUncontrolled: true, type: 'window'})
    .then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_DEBUG',
          message: logMessage
        });
      });
    });
}

// Store logs in IndexedDB for persistence
function storeLog(message) {
  const now = new Date();
  const logEntry = {
    timestamp: now.getTime(),
    message: message
  };
  
  // Store in IndexedDB or fallback to localStorage
  if ('indexedDB' in self) {
    openIDB().then(db => {
      const tx = db.transaction(['logs'], 'readwrite');
      const store = tx.objectStore('logs');
      store.add(logEntry);
    }).catch(() => {
      // Fallback to localStorage if IndexedDB fails
      const logs = JSON.parse(localStorage.getItem('swLogs') || '[]');
      logs.push(logEntry);
      localStorage.setItem('swLogs', JSON.stringify(logs.slice(-100))); // Keep last 100 logs
    });
  } else {
    // Fallback to localStorage
    const logs = JSON.parse(localStorage.getItem('swLogs') || '[]');
    logs.push(logEntry);
    localStorage.setItem('swLogs', JSON.stringify(logs.slice(-100)));
  }
}

// Initialize IndexedDB
function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WorkoutManagerSW', 1);
    
    request.onerror = () => {
      debugLog('Failed to open IndexedDB');
      reject('IndexedDB error');
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'timestamp' });
      }
      if (!db.objectStoreNames.contains('appData')) {
        db.createObjectStore('appData', { keyPath: 'key' });
      }
    };
  });
}

// Install event - cache core assets
self.addEventListener('install', (event) => {
  debugLog('Installing service worker...');
  
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
  
  // Cache core assets
  event.waitUntil(
    Promise.all([
      // Initialize IndexedDB
      openIDB().catch(error => {
        debugLog('IndexedDB initialization failed, falling back to localStorage:', error);
        return null;
      }),
      
      // Cache core assets
      caches.open(CACHE_NAME)
        .then(cache => {
          debugLog('Caching core assets:', CORE_ASSETS.join(', '));
          return cache.addAll(CORE_ASSETS.map(url => new Request(url, { 
            cache: 'reload',
            credentials: 'same-origin' 
          }))).catch(error => {
            debugLog('Failed to cache some assets:', error);
            // Don't fail the installation if some assets fail to cache
            return true;
          });
        })
    ]).then(() => {
      debugLog('Installation complete');
      
      // Store app data in localStorage as a fallback
      const appData = {
        version: CACHE_NAME,
        installedAt: new Date().toISOString(),
        assets: CORE_ASSETS
      };
      
      // Store in IndexedDB or fallback to localStorage
      if ('indexedDB' in self) {
        return openIDB().then(db => {
          const tx = db.transaction(['appData'], 'readwrite');
          const store = tx.objectStore('appData');
          return store.put({ key: 'appInfo', data: appData });
        }).catch(() => {
          localStorage.setItem('workoutManagerAppInfo', JSON.stringify(appData));
        });
      } else {
        localStorage.setItem('workoutManagerAppInfo', JSON.stringify(appData));
      }
    })
  );
});

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



// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  debugLog('Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      debugLog('Found caches:', cacheNames.join(', '));
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            debugLog('Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      debugLog('Claiming clients');
      return self.clients.claim()
        .then(() => debugLog('Successfully claimed clients'))
        .catch(error => debugLog('Error claiming clients:', error));
    })
  );
});

// Special handling for home screen launch
function handleHomeScreenLaunch(request) {
  debugLog('Handling potential home screen launch');
  return caches.match(START_URL, { ignoreSearch: true })
    .then(response => {
      if (response) {
        debugLog('Serving start URL from cache');
        return response;
      }
      // If start URL not in cache, try to fetch it
      return fetch(START_URL)
        .then(networkResponse => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(START_URL, responseToCache));
          return networkResponse;
        })
        .catch(() => caches.match(OFFLINE_URL));
    });
}

// Fetch event handler with different strategies
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isRootPath = requestUrl.pathname === '/' || requestUrl.pathname === '';
  
  debugLog(`Fetching: ${requestUrl.href}`, `(Navigation: ${isNavigation}, Root: ${isRootPath})`);
  
  // Special handling for root path (common in home screen launches)
  if (isRootPath) {
    debugLog('Root path requested, handling as potential home screen launch');
    event.respondWith(handleHomeScreenLaunch(event.request));
    return;
  }
  
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || requestUrl.protocol === 'chrome-extension:') {
    debugLog('Skipping non-GET request or chrome-extension:', requestUrl.href);
    return;
  }
  
  // Handle navigation requests with offline fallback
  if (isNavigation) {
    debugLog('Handling navigation request');
    event.respondWith(
      fetch(event.request)
        .then(response => {
          debugLog('Navigation fetch successful, caching response');
          // If we got a valid response, cache it and return it
          const responseToCache = response.clone();
          return caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache))
            .then(() => {
              debugLog('Cached navigation response');
              return response;
            });
        })
        .catch(error => {
          debugLog('Navigation fetch failed, trying cache', error);
          // If fetch fails, try to serve from cache
          return caches.match('/index.html')
            .then(response => {
              if (response) {
                debugLog('Serving index.html from cache');
                return response;
              }
              debugLog('index.html not in cache, trying offline page');
              return caches.match(OFFLINE_URL);
            });
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
