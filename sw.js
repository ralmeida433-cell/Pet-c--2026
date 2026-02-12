const CACHE_NAME = 'hotel-pet-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/logo.png',
  '/js/app.js',
  '/js/database.js',
  '/js/dashboard.js',
  '/js/animals.js',
  '/js/reservations.js',
  '/js/reports.js',
  '/js/kennels.js',
  '/js/inventory.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('push', function(event) {
  const options = {
    body: event.data.text(),
    icon: 'css/logo.png',
    badge: 'css/logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Hotel Pet CÁ', options)
  );
});
