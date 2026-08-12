// ============================================================
// offline.js — Faz o Index.html original funcionar fora do
// Apps Script: substitui `google.script.run` por chamadas fetch
// para o Web App, com cache automático (IndexedDB + Cache Storage)
// para uso offline. NENHUMA outra parte do app original precisa
// mudar — todas as funções continuam com os mesmos nomes.
// ============================================================

// >>> Cole aqui a URL do seu Web App (Implantar > Gerenciar implantações) <<<
// Aponta pro Cloudflare Worker (evita a instabilidade de CORS do Apps Script
// quando chamado direto do navegador). O Worker repassa pro Apps Script
// de servidor pra servidor por baixo dos panos.
const API_URL = 'https://ad-export-proxy.felippe-6c1.workers.dev';

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
const DB_VERSION = 2;
function _openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('respostas')) db.createObjectStore('respostas');
      if (!db.objectStoreNames.contains('fila_pedidos')) db.createObjectStore('fila_pedidos', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('fila_clientes')) db.createObjectStore('fila_clientes', { keyPath: 'tempId' });
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

// ---- Fila de clientes criados offline ----
async function _filaClienteAdicionar(cliente, tempId) {
  const db = await getDB();
  return new Promise((res) => {
    const tx = db.transaction('fila_clientes', 'readwrite');
    tx.objectStore('fila_clientes').put({ tempId, cliente, criadoEm: new Date().toISOString() });
    tx.oncomplete = () => res();
  });
}
async function _filaClientesListar() {
  const db = await getDB();
  return new Promise((res) => {
    const tx = db.transaction('fila_clientes', 'readonly');
    const r = tx.objectStore('fila_clientes').getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => res([]);
  });
}
async function _filaClienteRemover(tempId) {
  const db = await getDB();
  return new Promise((res) => {
    const tx = db.transaction('fila_clientes', 'readwrite');
    tx.objectStore('fila_clientes').delete(tempId);
    tx.oncomplete = () => res();
  });
}

// ============================================================
// RPC — chama a mesma função do Codigo.gs via fetch (POST)
// ============================================================
// Ações que ESCREVEM dados (salvar/editar/excluir) NUNCA devem ser repetidas
// automaticamente: se a resposta demorar a voltar mas o Google já tiver
// processado a primeira tentativa, tentar de novo duplicaria o pedido/cliente.
// Só é seguro repetir automaticamente ações de LEITURA.
const _FUNCOES_ESCRITA = ['salvarPedido', 'atualizarPedido', 'excluirPedido', 'gerarPdfESalvar', 'salvarCliente', 'atualizarCliente', 'excluirCliente', 'salvarConfig', 'salvarCatalogoConfig'];

async function _rpcCallOnce(fn, args, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 15000);
  try {
    const resp = await fetch(API_URL + '?action=rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn, args }),
      signal: controller.signal
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const env = await resp.json();
    if (!env.ok) throw new Error(env.error || 'Erro no servidor');
    return env.result; // string bruta, igual ao que a função do Apps Script retorna
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Tempo esgotado (sem internet ou servidor lento)');
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

// O Apps Script Web App às vezes falha de forma intermitente quando chamado
// de fora do Google (CORS no redirecionamento interno do Google) — isso não
// é um erro real, insistir de novo quase sempre resolve. Por isso toda
// chamada tenta algumas vezes antes de desistir.
async function _rpcCall(fn, args, timeoutMs, tentativas) {
  const ehEscrita = _FUNCOES_ESCRITA.includes(fn);
  const maxTentativas = ehEscrita ? 1 : (tentativas || 3);
  let ultimoErro;
  for (let i = 0; i < maxTentativas; i++) {
    try {
      return await _rpcCallOnce(fn, args, timeoutMs);
    } catch (e) {
      ultimoErro = e;
      if (i < maxTentativas - 1) await _esperar(600 * (i + 1));
    }
  }
  throw ultimoErro;
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

  // Cliente novo criado offline: enfileira localmente com ID temporário,
  // finge sucesso pra poder ser usado no pedido imediatamente.
  if (fn === 'salvarCliente' && !navigator.onLine) {
    try {
      const cliente = JSON.parse(args[0]);
      const tempId = 'TEMP' + Date.now();
      await _filaClienteAdicionar(cliente, tempId);
      atualizarBadgeOffline();
      successCb && successCb(JSON.stringify({ success: true, id: tempId, offline: true }));
      showToastSafe('Sem internet — cliente salvo no dispositivo. Será enviado quando a conexão voltar.', 'success');
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
      // Busca no cache local em paralelo (bem mais rápido que um por um)
      const resultados = await Promise.all(urls.map((u) => _imagemCacheParaBase64(u).then((b64) => ({ u, b64 }))));
      resultados.forEach(({ u, b64 }) => { if (b64) data[u] = b64; else faltando.push(u); });
      console.log('[catálogo] imagens no cache local:', urls.length - faltando.length, '/ faltando buscar:', faltando.length);
      if (faltando.length && navigator.onLine) {
        const raw = await _rpcCall(fn, [JSON.stringify(faltando)], 60000, 4);
        const env = JSON.parse(raw);
        if (env.success) {
          Object.assign(data, env.data);
          const vazias = faltando.filter((u) => !env.data[u]);
          if (vazias.length) console.warn('[catálogo] o servidor não conseguiu buscar estas imagens:', vazias);
        } else {
          console.warn('[catálogo] buscarImagensBase64 retornou erro:', env.error);
        }
      }
      const semImagem = urls.filter((u) => !data[u]);
      if (semImagem.length) console.warn('[catálogo] URLs sem imagem no resultado final:', semImagem);
      successCb && successCb(JSON.stringify({ success: true, data }));
    } catch (e) {
      console.error('[catálogo] erro ao buscar imagens:', e);
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
    const cache = await caches.open('adexport-images-v3');
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

function _extrairIdDrive(url) {
  if (!url) return '';
  let m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return '';
}

// Réplica exata de cnsBuildUrl do index.html — o app monta a URL da foto
// de formas diferentes dependendo do navegador (Safari/iPad usa lh3.googleusercontent.com
// primeiro). Por isso cacheamos a MESMA imagem sob TODAS as variações possíveis.
function _variantesUrlImagem(id) {
  if (!id) return [];
  return [
    'https://lh3.googleusercontent.com/d/' + id + '=s2000',
    'https://drive.google.com/uc?export=view&id=' + id,
    'https://drive.google.com/thumbnail?id=' + id + '&sz=w2000'
  ];
}

async function _cachearImagensLote(urls) {
  if (!urls.length || !('caches' in window)) return;
  const cache = await caches.open('adexport-images-v3');

  // Para cada foto: id do Drive, todas as URLs que precisam do mesmo conteúdo,
  // e a URL de ALTA resolução que vamos efetivamente buscar no servidor
  // (em vez da versão pequena que fica salva na planilha).
  const infoPorOriginal = {};
  const faltando = [];
  for (const u of urls) {
    const id = _extrairIdDrive(u);
    const variantes = [u, ..._variantesUrlImagem(id)];
    const urlAltaRes = id ? ('https://drive.google.com/thumbnail?id=' + id + '&sz=w2000') : u;
    infoPorOriginal[u] = { variantes, urlAltaRes };
    let completo = true;
    for (const v of variantes) { if (!(await cache.match(v))) { completo = false; break; } }
    if (!completo) faltando.push(u);
  }
  if (!faltando.length) return;

  const urlsParaBuscar = faltando.map((u) => infoPorOriginal[u].urlAltaRes);
  try {
    const raw = await _rpcCall('buscarImagensBase64', [JSON.stringify(urlsParaBuscar)], 60000, 4);
    const env = JSON.parse(raw);
    if (!env.success) return;
    for (const u of faltando) {
      const info = infoPorOriginal[u];
      const dataUrl = env.data[info.urlAltaRes];
      if (!dataUrl) continue;
      try {
        const blob = _dataUrlParaBlob(dataUrl);
        const respHeaders = { 'Content-Type': blob.type || 'image/jpeg' };
        for (const v of info.variantes) {
          await cache.put(v, new Response(blob, { headers: respHeaders }));
        }
      } catch (e) { /* imagem com problema, pula */ }
    }
  } catch (e) { /* mesmo com as tentativas, não conseguiu — segue pro próximo lote */ }
}

function _esperar(ms) { return new Promise((res) => setTimeout(res, ms)); }

function _dataUrlParaBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Baixa (em lotes, via Apps Script) até 3 fotos de cada produto
async function sincronizarTodasImagens(produtos, onProgress) {
  const urls = [];
  produtos.forEach((p) => { [p.imagem, p.imagem2, p.imagem3].forEach((u) => { if (u) urls.push(u); }); });
  const LOTE = 6;
  let feito = 0;
  for (let i = 0; i < urls.length; i += LOTE) {
    const lote = urls.slice(i, i + LOTE);
    await _cachearImagensLote(lote);
    feito += lote.length;
    onProgress && onProgress(feito, urls.length);
    await _esperar(350); // pequena pausa entre lotes pra não sobrecarregar chamadas externas
  }
}

// ============================================================
// Sincronização completa ("Atualizar dados") + fila de pedidos pendentes
// ============================================================
async function atualizarBadgeOffline() {
  const badge = document.getElementById('offlinePendingBadge');
  const texto = document.getElementById('offlinePendingBadgeTexto');
  const filaPedidos = await _filaListar();
  const filaClientes = await _filaClientesListar();
  const total = filaPedidos.length + filaClientes.length;
  if (total > 0) {
    badge.style.display = 'flex';
    const partes = [];
    if (filaPedidos.length) partes.push(filaPedidos.length + ' pedido(s)');
    if (filaClientes.length) partes.push(filaClientes.length + ' cliente(s)');
    texto.textContent = partes.join(' e ') + ' aguardando envio';
  } else {
    badge.style.display = 'none';
  }
}

async function forcarSincronizacao() {
  if (!navigator.onLine) {
    showToastSafe('Sem internet no momento — conecte-se e tente de novo', 'error');
    return;
  }
  const texto = document.getElementById('offlinePendingBadgeTexto');
  const original = texto.textContent;
  texto.textContent = 'Enviando...';
  await sincronizarFilaPedidos();
  const filaPedidos = await _filaListar();
  const filaClientes = await _filaClientesListar();
  if (filaPedidos.length === 0 && filaClientes.length === 0) {
    showToastSafe('Tudo enviado com sucesso!', 'success');
  } else {
    showToastSafe('Ainda restou algo pendente — tente de novo em instantes', 'error');
    texto.textContent = original;
  }
}

// Sincroniza clientes pendentes primeiro (para trocar o ID temporário pelo
// definitivo), depois os pedidos — trocando também o ID do cliente dentro
// de qualquer pedido pendente que tenha usado aquele cliente temporário.
let _sincronizando = false;

async function sincronizarFilaPedidos() {
  if (!navigator.onLine) { console.log('[sync] offline, abortando'); return; }
  if (_sincronizando) { console.log('[sync] já em andamento, ignorando chamada duplicada'); return; }
  _sincronizando = true;
  try {

  const filaClientes = await _filaClientesListar();
  console.log('[sync] clientes pendentes:', filaClientes.length);
  const mapaIds = {}; // tempId -> id real
  for (const item of filaClientes) {
    try {
      const raw = await _rpcCall('salvarCliente', [JSON.stringify(item.cliente)], 20000);
      const env = JSON.parse(raw);
      console.log('[sync] cliente', item.tempId, '->', env);
      if (env.success) {
        mapaIds[item.tempId] = env.id;
        await _filaClienteRemover(item.tempId);
      }
    } catch (e) { console.error('[sync] falha ao enviar cliente', item.tempId, e); }
  }

  const filaPedidos = await _filaListar();
  console.log('[sync] pedidos pendentes:', filaPedidos.length);
  for (const item of filaPedidos) {
    try {
      if (item.pedido && item.pedido.cliente && mapaIds[item.pedido.cliente.id]) {
        item.pedido.cliente.id = mapaIds[item.pedido.cliente.id];
      }
      // Se o pedido ainda depende de um cliente temporário não sincronizado, espera a próxima rodada
      if (item.pedido && item.pedido.cliente && String(item.pedido.cliente.id || '').startsWith('TEMP')) {
        console.log('[sync] pedido', item.id, 'ainda depende de cliente temporário, aguardando');
        continue;
      }
      const raw = await _rpcCall('salvarPedido', [JSON.stringify(item.pedido)], 20000);
      console.log('[sync] pedido', item.id, '->', raw);
      await _filaRemover(item.id);
    } catch (e) { console.error('[sync] falha ao enviar pedido', item.id, e); }
  }
  atualizarBadgeOffline();
  } finally {
    _sincronizando = false;
  }
}

async function sincronizacaoCompleta() {
  const bar = document.getElementById('offlineSyncBar');
  if (!bar) return;
  bar.style.display = 'block';
  bar.textContent = 'Baixando fotos dos produtos...';
  try {
    const produtos = (typeof PRODUCTS !== 'undefined' && PRODUCTS.length) ? PRODUCTS : JSON.parse((await _cachePegar('getProdutos')) || '{"data":[]}').data;
    if (!produtos || !produtos.length) { bar.textContent = 'Nenhum produto carregado ainda'; setTimeout(() => { bar.style.display = 'none'; }, 2500); return; }
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

// O evento 'online' do iOS/Safari é conhecido por não disparar de forma
// confiável. Por isso, verificamos periodicamente — mas SÓ tentamos
// sincronizar de fato se houver algo pendente, pra não sobrecarregar o
// app com chamadas de rede desnecessárias o tempo todo.
setInterval(async () => {
  const el = document.getElementById('offlineStatus');
  if (el) {
    const online = navigator.onLine;
    el.textContent = online ? '● Online' : '● Offline';
    el.style.color = online ? 'var(--success)' : 'var(--danger)';
  }
  if (!navigator.onLine) return;
  const filaPedidos = await _filaListar();
  const filaClientes = await _filaClientesListar();
  if (filaPedidos.length === 0 && filaClientes.length === 0) return;
  sincronizarFilaPedidos();
}, 60000);

window.addEventListener('DOMContentLoaded', () => {
  _atualizarIndicadorConexao();
  atualizarBadgeOffline();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

  // Segurança: se o carregamento travar (ex: timeout inesperado), libera o app
  // mesmo assim depois de alguns segundos, em vez de ficar preso na tela de loading.
  setTimeout(() => {
    const loader = document.getElementById('loader');
    const app = document.getElementById('app');
    if (loader && loader.style.display !== 'none') {
      loader.style.display = 'none';
      if (app) app.style.display = 'block';
      showToastSafe('Alguns dados podem estar desatualizados (sem internet)', 'error');
    }
  }, 18000);
});

// Depois que o app original terminar de carregar (window.onload), baixa as
// fotos automaticamente se houver internet (mantém o cache sempre fresco).
window.addEventListener('load', () => {
  setTimeout(() => { if (navigator.onLine) sincronizacaoCompleta(); }, 1500);
});
