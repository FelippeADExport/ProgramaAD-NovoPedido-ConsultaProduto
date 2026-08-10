// Service Worker — AD Export PWA
// Cacheia o "app shell" (HTML/CSS/JS/ícones). Os DADOS (produtos, clientes,
// imagens, pedidos) NÃO passam por aqui — ficam no IndexedDB (veja db.js).

const CACHE_NAME = 'adexport-shell-v3';
const SHELL_FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/db.js',
  './js/api.js',
  './js/produtos.js',
  './js/pedido.js',
  './js/pedidos-lista.js',
  './js/clientes.js',
  './js/catalogo.js',
  './js/config.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const EXTERNAL_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(SHELL_FILES);
      // Biblioteca externa (jsPDF) — cacheada à parte pra não travar o install se a rede falhar
      try {
        await Promise.all(EXTERNAL_FILES.map((url) => fetch(url, { mode: 'cors' }).then((r) => cache.put(url, r))));
      } catch (e) { /* sem internet na primeira instalação, tenta de novo depois */ }
    })
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
  if (url.origin !== self.location.origin) {
    // Biblioteca externa (jsPDF): cache-first pra funcionar offline também
    if (EXTERNAL_FILES.includes(event.request.url)) {
      event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
      );
    }
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
