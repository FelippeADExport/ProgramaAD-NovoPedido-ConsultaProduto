// ============================================================
// offline.js — Faz o Index.html original funcionar fora do
// Apps Script: substitui `google.script.run` por chamadas fetch
// para o Web App, com cache automático (IndexedDB + Cache Storage)
// para uso offline. NENHUMA outra parte do app original precisa
// mudar — todas as funções continuam com os mesmos nomes.
// ============================================================

// >>> Cole aqui a URL do seu Web App (Implantar > Gerenciar implantações) <<<
const API_URL = 'https://script.google.com/macros/s/AKfycby4W8UGzFEDHr8iDtqd-jmbC7WxgjVfD5yLqLDTNDFdYwrIDtYU1eMvk44arY4hu5rUBA/exec';

// Funções cujo resultado fica salvo localmente para reuso offline
const CACHEABLE_READS = {
  getProdutos: '{"success":true,"data":[]}',
  getClientes: '{"success":true,"data":[]}',
  getPortosDestino: '{"success":true,"data":[]}',
  getConfig: '{"success":true,"data":{"acrescimo_itapoa":0.10,"acrescimo_europallet":0.15}}'
};

// ============================================================
// IndexedDB — cache de respostas (produtos/clientes/portos/config)
// e fila de pedidos criados offline
// ============================================================
const DB_NAME = 'adexport_offline';
const DB_VERSION = 1;
function _openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('respostas')) db.createObjectStore('respostas');
      if (!db.objectStoreNames.contains('fila_pedidos')) db.createObjectStore('fila_pedidos', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
let _dbPromise = null;
function getDB() { if (!_dbPromise) _dbPromise = _openDB(); return _dbPromise; }

async function _cacheSalvar(fn, raw) {
  const db = await getDB();
  return new Promise((res) => {
    const tx = db.transaction('respostas', 'readwrite');
    tx.objectStore('respostas').put(raw, fn);
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}
async function _cachePegar(fn) {
  const db = await getDB();
  return new Promise((res) => {
    const tx = db.transaction('respostas', 'readonly');
    const r = tx.objectStore('respostas').get(fn);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => res(null);
  });
}
async function _filaAdicionar(pedido) {
  const db = await getDB();
  return new Promise((res) => {
    const tx = db.transaction('fila_pedidos', 'readwrite');
    const r = tx.objectStore('fila_pedidos').add({ pedido, criadoEm: new Date().toISOString() });
    r.onsuccess = () => res(r.result);
  });
}
async function _filaListar() {
  const db = await getDB();
  return new Promise((res) => {
    const tx = db.transaction('fila_pedidos', 'readonly');
    const r = tx.objectStore('fila_pedidos').getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => res([]);
  });
}
async function _filaRemover(id) {
  const db = await getDB();
  return new Promise((res) => {
    const tx = db.transaction('fila_pedidos', 'readwrite');
    tx.objectStore('fila_pedidos').delete(id);
    tx.oncomplete = () => res();
  });
}

// ============================================================
// RPC — chama a mesma função do Codigo.gs via fetch (POST)
// ============================================================
async function _rpcCall(fn, args) {
  const resp = await fetch(API_URL + '?action=rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ fn, args })
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const env = await resp.json();
  if (!env.ok) throw new Error(env.error || 'Erro no servidor');
  return env.result; // string bruta, igual ao que a função do Apps Script retorna
}

// ============================================================
// Shim de google.script.run — mantém 100% a mesma API usada
// no restante do arquivo original (.withSuccessHandler().withFailureHandler().fn(args))
// ============================================================
function _makeRunner(successCb, failureCb) {
  return new Proxy({}, {
    get(_target, prop) {
      if (prop === 'withSuccessHandler') return (cb) => _makeRunner(cb, failureCb);
      if (prop === 'withFailureHandler') return (cb) => _makeRunner(successCb, cb);
      // prop é o nome da função do servidor
      return (...args) => _dispatch(prop, args, successCb, failureCb);
    }
  });
}

async function _dispatch(fn, args, successCb, failureCb) {
  // Pedido criado offline: enfileira localmente e finge sucesso
  if (fn === 'salvarPedido' && !navigator.onLine) {
    try {
      const pedido = JSON.parse(args[0]);
      await _filaAdicionar(pedido);
      atualizarBadgeOffline();
      const numero = pedido.numero || ('PED-OFFLINE-' + Date.now());
      successCb && successCb(JSON.stringify({ success: true, numero, offline: true }));
      showToastSafe('Sem internet — pedido salvo no dispositivo. Será enviado quando a conexão voltar.', 'success');
    } catch (e) {
      failureCb && failureCb({ message: e.message });
    }
    return;
  }

  // Catálogo PDF: busca imagens — tenta cache local antes de ir na rede
  if (fn === 'buscarImagensBase64') {
    try {
      const urls = JSON.parse(args[0]);
      const data = {};
      const faltando = [];
      for (const u of urls) {
        const b64 = await _imagemCacheParaBase64(u);
        if (b64) data[u] = b64; else faltando.push(u);
      }
      if (faltando.length && navigator.onLine) {
        const raw = await _rpcCall(fn, [JSON.stringify(faltando)]);
        const env = JSON.parse(raw);
        if (env.success) Object.assign(data, env.data);
      }
      successCb && successCb(JSON.stringify({ success: true, data }));
    } catch (e) {
      failureCb && failureCb({ message: e.message });
    }
    return;
  }

  try {
    const raw = await _rpcCall(fn, args);
    if (CACHEABLE_READS.hasOwnProperty(fn)) await _cacheSalvar(fn, raw);
    successCb && successCb(raw);
  } catch (e) {
    if (CACHEABLE_READS.hasOwnProperty(fn)) {
      const cached = await _cachePegar(fn);
      if (cached) { successCb && successCb(cached); return; }
      successCb && successCb(CACHEABLE_READS[fn]); // primeira vez offline, sem cache ainda
      return;
    }
    failureCb && failureCb({ message: navigator.onLine ? e.message : 'Sem internet' });
  }
}

window.google = { script: { run: _makeRunner(null, null) } };

function showToastSafe(msg, type) {
  if (typeof showToast === 'function') showToast(msg, type);
}

// ============================================================
// Imagens offline — Cache Storage (mesma URL usada nos <img src>)
// ============================================================
async function _imagemCacheParaBase64(url) {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open('adexport-images');
    const resp = await cache.match(url);
    if (!resp) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch (e) { return null; }
}

async function _cachearImagem(url) {
  if (!url || !('caches' in window)) return;
  try {
    const cache = await caches.open('adexport-images');
    const ja = await cache.match(url);
    if (ja) return;
    const resp = await fetch(url, { mode: 'no-cors' });
    await cache.put(url, resp);
  } catch (e) { /* imagem indisponível, ignora */ }
}

// Baixa (em paralelo controlado) até 3 fotos de cada produto
async function sincronizarTodasImagens(produtos, onProgress) {
  const urls = [];
  produtos.forEach((p) => { [p.imagem, p.imagem2, p.imagem3].forEach((u) => { if (u) urls.push(u); }); });
  const LOTE = 6;
  let feito = 0;
  for (let i = 0; i < urls.length; i += LOTE) {
    const lote = urls.slice(i, i + LOTE);
    await Promise.all(lote.map((u) => _cachearImagem(u)));
    feito += lote.length;
    onProgress && onProgress(feito, urls.length);
  }
}

// ============================================================
// Sincronização completa ("Atualizar dados") + fila de pedidos pendentes
// ============================================================
async function atualizarBadgeOffline() {
  const badge = document.getElementById('offlinePendingBadge');
  const fila = await _filaListar();
  if (fila.length > 0) {
    badge.style.display = 'block';
    badge.textContent = fila.length + ' pedido(s) aguardando envio';
  } else {
    badge.style.display = 'none';
  }
}

async function sincronizarFilaPedidos() {
  if (!navigator.onLine) return;
  const fila = await _filaListar();
  for (const item of fila) {
    try {
      await _rpcCall('salvarPedido', [JSON.stringify(item.pedido)]);
      await _filaRemover(item.id);
    } catch (e) { /* tenta de novo na próxima vez */ }
  }
  atualizarBadgeOffline();
}

async function sincronizacaoCompleta() {
  const bar = document.getElementById('offlineSyncBar');
  bar.style.display = 'block';
  bar.textContent = 'Baixando fotos dos produtos...';
  try {
    const produtos = (typeof PRODUCTS !== 'undefined' && PRODUCTS.length) ? PRODUCTS : JSON.parse((await _cachePegar('getProdutos')) || '{"data":[]}').data;
    await sincronizarTodasImagens(produtos, (feito, total) => {
      bar.textContent = `Baixando fotos... ${feito}/${total}`;
    });
    bar.textContent = 'Fotos atualizadas!';
    setTimeout(() => { bar.style.display = 'none'; }, 2500);
  } catch (e) {
    bar.textContent = 'Erro ao baixar fotos: ' + e.message;
    setTimeout(() => { bar.style.display = 'none'; }, 4000);
  }
}

function _atualizarIndicadorConexao() {
  const el = document.getElementById('offlineStatus');
  if (!el) return;
  const online = navigator.onLine;
  el.textContent = online ? '● Online' : '● Offline';
  el.style.color = online ? 'var(--success)' : 'var(--danger)';
  if (online) sincronizarFilaPedidos();
}

window.addEventListener('online', _atualizarIndicadorConexao);
window.addEventListener('offline', _atualizarIndicadorConexao);
window.addEventListener('DOMContentLoaded', () => {
  _atualizarIndicadorConexao();
  atualizarBadgeOffline();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
});

// Depois que o app original terminar de carregar (window.onload), baixa as
// fotos automaticamente se houver internet (mantém o cache sempre fresco).
window.addEventListener('load', () => {
  setTimeout(() => { if (navigator.onLine) sincronizacaoCompleta(); }, 1500);
});
