// Service Worker — AD Export (baseado no Index.html original)
// Arquivos do site: REDE PRIMEIRO (sempre abre a versao nova).
// O cache so e usado quando estiver offline.
const SHELL_CACHE = 'adexport-shell-v20';
const IMG_CACHE = 'adexport-images-v3'; // NAO mudar: offline.js grava as fotos neste cache
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
      // cache:'reload' garante que pega a versao nova do servidor, nao a do navegador
      await Promise.all(SHELL_FILES.map((u) =>
        fetch(u, { cache: 'reload' }).then((r) => { if (r.ok) return c.put(u, r); }).catch(() => {})
      ));
      try { await Promise.all(EXTERNAL_FILES.map((u) => fetch(u, { mode: 'cors' }).then((r) => c.put(u, r)))); } catch (e) {}
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== SHELL_CACHE && n !== IMG_CACHE).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
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

  // jsPDF: nao muda nunca, pode vir do cache
  if (EXTERNAL_FILES.includes(url)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    return;
  }

  if (event.request.method !== 'GET') return;
  const reqUrl = new URL(url);
  if (reqUrl.origin !== self.location.origin) return; // API do Apps Script, fontes etc: direto na rede

  // Arquivos do site: rede primeiro, atualiza o cache, e so usa o cache se estiver offline
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((r) => {
        if (r && r.ok) {
          const copia = r.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(event.request, copia));
        }
        return r;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then((cached) =>
          cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
  );
});
