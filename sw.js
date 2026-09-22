// Diego NYC Oct '26 — Service Worker
// Sube este número cada vez que modifiques la app (index.html, manifest, íconos, etc.)
// para que el navegador detecte la nueva versión y el banner de "Actualización disponible" aparezca.
const SW_VERSION = 'v1.0.0';
const CACHE_NAME = 'diego-nyc-' + SW_VERSION;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// --- INSTALACION: guarda los archivos base en caché ---
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    })
  );
  // No llama a skipWaiting() automáticamente: así el banner de "Actualización
  // disponible" puede mostrarse y el usuario decide cuándo actualizar.
});

// --- ACTIVACION: borra cachés de versiones anteriores ---
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key.startsWith('diego-nyc-') && key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// --- MENSAJE: permite que el botón "Actualizar ahora" active la nueva versión ---
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// --- FETCH: red primero para el HTML (detecta cambios rápido), caché primero para el resto ---
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (isNavigation) {
    event.respondWith(
      fetch(req).then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        return res;
      }).catch(function () { /* sin red y sin caché: deja que falle normalmente */ });
    })
  );
});
