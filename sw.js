// Service Worker — AD Export (baseado no Index.html original)
const SHELL_CACHE = 'adexport-shell-v4';
const IMG_CACHE = 'adexport-images-v3';
const SHELL_FILES = [
  './',
  './index.html',
  './offline.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const EXTERNAL_FILES = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (c) => {
      await c.addAll(SHELL_FILES);
      try { await Promise.all(EXTERNAL_FILES.map((u) => fetch(u, { mode: 'cors' }).then((r) => c.put(u, r)))); } catch (e) {}
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== SHELL_CACHE && n !== IMG_CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Fotos dos produtos (Google Drive / Google Photos) — cache-first, já
  // preenchido por offline.js. O app pode pedir a mesma imagem em domínios
  // diferentes (drive.google.com/thumbnail, drive.google.com/uc, lh3.googleusercontent.com),
  // por isso reconhecemos todos.
  if (url.includes('drive.google.com/thumbnail') || url.includes('drive.google.com/uc') || url.includes('lh3.googleusercontent.com')) {
    event.respondWith(
      caches.open(IMG_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached))
      )
    );
    return;
  }

  if (EXTERNAL_FILES.includes(url)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    return;
  }

  const reqUrl = new URL(url);
  if (reqUrl.origin !== self.location.origin) return; // API do Apps Script, fontes etc: direto na rede

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('./index.html')))
  );
});
