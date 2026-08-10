// Service Worker — AD Export PWA
// Cacheia o "app shell" (HTML/CSS/JS/ícones). Os DADOS (produtos, clientes,
// imagens, pedidos) NÃO passam por aqui — ficam no IndexedDB (veja db.js).

const CACHE_NAME = 'adexport-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/db.js',
  './js/api.js',
  './js/produtos.js',
  './js/pedido.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Estratégia: cache-first para o app shell (arquivos locais), network para o resto.
// Nunca intercepta chamadas para o Google Apps Script (sempre precisa ir na rede
// quando disponível; se falhar, o app trata isso via api.js).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // deixa passar (Apps Script etc.)

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
