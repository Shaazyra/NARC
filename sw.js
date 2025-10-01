const CACHE_NAME = 'nur-al-hikmah-cache-v1';
const URLS_TO_CACHE = [
  '/',
  'index.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Let the browser handle non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Do not cache API requests to external services
  const nonCacheableDomains = ['generativelanguage', 'leonardo.ai', 'huggingface.co', 'freepik.com'];
  if (nonCacheableDomains.some(domain => event.request.url.includes(domain))) {
    // Pass request to the network, do not attempt to cache or serve from cache
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the resource is in the cache, return it
        if (cachedResponse) {
          return cachedResponse;
        }

        // If the resource is not in the cache, fetch it from the network
        return fetch(event.request).then(
          networkResponse => {
            // Check for a valid response
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clone the response and cache it
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          }
        );
      })
  );
});