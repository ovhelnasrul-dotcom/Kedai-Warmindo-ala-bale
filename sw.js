const CACHE_NAME = 'kasir-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/driver-dashboard.html',
  '/style.css',
  '/app.js',
  '/admin.js',
  '/driver-dashboard.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});