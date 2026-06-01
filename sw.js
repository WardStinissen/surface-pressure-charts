// sw.js
const SHELL_CACHE = 'sp-shell-v1';
const CHART_HOST = 'data.consumer-digital.api.metoffice.gov.uk';
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
  const url = new URL(event.request.url);

  // Chart GIFs: network-first (always prefer latest), fall back to cache.
  if (url.hostname === CHART_HOST) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // App shell: cache-first.
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
