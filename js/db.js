// ============================================================
// db.js — Camada de acesso ao IndexedDB
// Stores:
//   produtos          (key: codigo)
//   clientes          (key: id)
//   imagens           (key: fileId do Drive)  -> Blob WebP já otimizado
//   pedidos_pendentes (key: auto)             -> pedidos criados offline aguardando sync
//   meta              (key: nome)             -> última sincronização, config, etc.
// ============================================================

const DB_NAME = 'adexport_db';
const DB_VERSION = 1;

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('produtos')) {
        db.createObjectStore('produtos', { keyPath: 'codigo' });
      }
      if (!db.objectStoreNames.contains('clientes')) {
        db.createObjectStore('clientes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('imagens')) {
        db.createObjectStore('imagens'); // key = fileId (string), value = Blob
      }
      if (!db.objectStoreNames.contains('pedidos_pendentes')) {
        db.createObjectStore('pedidos_pendentes', { keyPath: 'localId', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'nome' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let _dbPromise = null;
function getDB() {
  if (!_dbPromise) _dbPromise = abrirDB();
  return _dbPromise;
}

function _tx(storeName, mode) {
  return getDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

const DB = {
  // ---------- genérico ----------
  async limparStore(storeName) {
    const store = await _tx(storeName, 'readwrite');
    return new Promise((res, rej) => {
      const r = store.clear();
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  async putMuitos(storeName, itens) {
    const store = await _tx(storeName, 'readwrite');
    return new Promise((res, rej) => {
      itens.forEach((it) => store.put(it));
      store.transaction.oncomplete = () => res();
      store.transaction.onerror = () => rej(store.transaction.error);
    });
  },
  async pegarTodos(storeName) {
    const store = await _tx(storeName, 'readonly');
    return new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  },
  async pegar(storeName, key) {
    const store = await _tx(storeName, 'readonly');
    return new Promise((res, rej) => {
      const r = store.get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },

  // ---------- produtos ----------
  salvarProdutos(produtos) {
    return this.limparStore('produtos').then(() => this.putMuitos('produtos', produtos));
  },
  listarProdutos() {
    return this.pegarTodos('produtos');
  },

  // ---------- clientes ----------
  salvarClientes(clientes) {
    return this.limparStore('clientes').then(() => this.putMuitos('clientes', clientes));
  },
  async salvarCliente(cliente) {
    const store = await _tx('clientes', 'readwrite');
    return new Promise((res, rej) => {
      const r = store.put(cliente);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  listarClientes() {
    return this.pegarTodos('clientes');
  },

  // ---------- imagens ----------
  async salvarImagem(fileId, blob) {
    const store = await _tx('imagens', 'readwrite');
    return new Promise((res, rej) => {
      const r = store.put(blob, fileId);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  async pegarImagem(fileId) {
    return this.pegar('imagens', fileId);
  },
  async temImagem(fileId) {
    const store = await _tx('imagens', 'readonly');
    return new Promise((res) => {
      const r = store.count(fileId);
      r.onsuccess = () => res(r.result > 0);
      r.onerror = () => res(false);
    });
  },

  // ---------- pedidos pendentes (fila offline) ----------
  async adicionarPedidoPendente(pedido) {
    const store = await _tx('pedidos_pendentes', 'readwrite');
    return new Promise((res, rej) => {
      const r = store.add({ pedido, criadoEm: new Date().toISOString(), tentativas: 0 });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  listarPedidosPendentes() {
    return this.pegarTodos('pedidos_pendentes');
  },
  async removerPedidoPendente(localId) {
    const store = await _tx('pedidos_pendentes', 'readwrite');
    return new Promise((res, rej) => {
      const r = store.delete(localId);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  async incrementarTentativa(localId) {
    const store = await _tx('pedidos_pendentes', 'readwrite');
    return new Promise((res, rej) => {
      const g = store.get(localId);
      g.onsuccess = () => {
        const item = g.result;
        if (!item) return res();
        item.tentativas = (item.tentativas || 0) + 1;
        const p = store.put(item);
        p.onsuccess = () => res();
        p.onerror = () => rej(p.error);
      };
      g.onerror = () => rej(g.error);
    });
  },

  // ---------- meta ----------
  async setMeta(nome, valor) {
    const store = await _tx('meta', 'readwrite');
    return new Promise((res, rej) => {
      const r = store.put({ nome, valor });
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  async getMeta(nome) {
    const item = await this.pegar('meta', nome);
    return item ? item.valor : null;
  }
};
