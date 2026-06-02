// sw.js
const SHELL_CACHE = 'sp-shell-v8';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icon.svg',
  './vendor/panzoom.min.js',
  './src/main.js',
  './src/runResolver.js',
  './src/chartModel.js',
  './src/format.js',
  './src/availability.js',
  './src/viewer.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-first for everything (app code and chart GIFs alike): when online,
  // the latest version is always used, so updated code is never stuck behind a
  // stale cache. The cache is only a fallback for offline use.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Cache successful or opaque (cross-origin no-cors) responses. Charts
        // are opaque (status 0), so their 404-ness can't be read; detectable
        // error statuses are not cached.
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request)),
  );
});
