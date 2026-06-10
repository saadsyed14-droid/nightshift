// Nightshift service worker.
// Strategy: network-first for the page so a freshly uploaded version shows up on
// next open; falls back to cache when offline. Your data lives in localStorage.
const CACHE = 'nightshift-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isDoc = e.request.mode === 'navigate' || e.request.destination === 'document' || e.request.url.endsWith('index.html');
  if (isDoc) {
    // network-first: always try the live page, fall back to cache offline
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(()=>{});
        return resp;
      }).catch(() => caches.match('./index.html').then(h => h || caches.match('./')))
    );
  } else {
    // cache-first for static assets (icons, manifest)
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  }
});
