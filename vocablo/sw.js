/* Vocablo · service worker: la app funciona sin conexión una vez abierta */
const CACHE = 'vocablo-v1';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './srs.js',
  './storage.js',
  './ai.js',
  './js/core.js',
  './js/study.js',
  './js/editor.js',
  './js/home.js',
  './js/browse.js',
  './js/stats.js',
  './js/settings.js',
  './js/sample.js',
  './js/main.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero para los archivos propios (así ves siempre la última versión);
// si no hay conexión, la copia guardada. Las fuentes se guardan al vuelo.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!own && !font) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
