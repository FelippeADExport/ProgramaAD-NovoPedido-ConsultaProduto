// ============================================================
// app.js — Inicialização geral do PWA
// ============================================================

function mostrarToast(msg, tipo) {
  const el = document.createElement('div');
  el.className = 'toast toast-' + (tipo || 'info');
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 4000);
}

// ---------------- Tema claro/escuro (igual ao programa original) ----------------

function aplicarTema(t) {
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '');
  document.getElementById('themeIcon').textContent = t === 'light' ? '🌙' : '☀️';
  document.getElementById('themeLabel').textContent = t === 'light' ? 'Escuro' : 'Claro';
  localStorage.setItem('adexport_theme', t);
}
function toggleTheme() {
  aplicarTema((localStorage.getItem('adexport_theme') || 'dark') === 'light' ? 'dark' : 'light');
}
function initTheme() {
  aplicarTema(localStorage.getItem('adexport_theme') || 'dark');
}

// ---------------- Abas ----------------

function trocarAba(nome) {
  document.querySelectorAll('.tab-btn[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === nome));
  document.querySelectorAll('.tab-content').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + nome));
  if (nome === 'todos') carregarTodosPedidos();
  if (nome === 'clientes') { montarFiltrosClientes(); renderizarClientes(); }
  if (nome === 'catalogo') catInit();
  if (nome === 'config') carregarConfiguracoesUI();
}

// ---------------- Status de conexão / fila offline ----------------

function atualizarStatusConexao() {
  const online = navigator.onLine;
  const el = document.getElementById('status-conexao');
  el.textContent = online ? '● Online' : '● Offline';
  el.className = 'status-dot ' + (online ? 'status-online' : 'status-offline');
  if (online) sincronizarPedidosPendentes();
}

async function atualizarBadgePendentes() {
  const pendentes = await DB.listarPedidosPendentes();
  const badge = document.getElementById('badge-pendentes');
  if (pendentes.length > 0) {
    badge.textContent = pendentes.length + ' pedido(s) aguardando envio';
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function sincronizarPedidosPendentes() {
  const pendentes = await DB.listarPedidosPendentes();
  for (const p of pendentes) {
    try {
      await API.salvarPedido(p.pedido);
      await DB.removerPedidoPendente(p.localId);
    } catch (e) {
      await DB.incrementarTentativa(p.localId);
    }
  }
  atualizarBadgePendentes();
}

// ---------------- Atualizar Dados (sync completo) ----------------

async function atualizarDados() {
  if (!navigator.onLine) {
    mostrarToast('Sem internet no momento — conecte-se ao wifi para atualizar', 'error');
    return;
  }
  const btn = document.getElementById('btn-atualizar-dados');
  const barra = document.getElementById('sync-progresso');
  const texto = document.getElementById('sync-texto');
  btn.disabled = true;
  barra.classList.remove('hidden');

  try {
    texto.textContent = 'Baixando produtos...';
    const produtos = await API.buscarProdutos();
    await DB.salvarProdutos(produtos);
    PRODUTOS = produtos;

    texto.textContent = 'Baixando clientes...';
    const clientes = await API.buscarClientes();
    await DB.salvarClientes(clientes);
    CLIENTES = clientes;

    try {
      texto.textContent = 'Baixando portos e configurações...';
      PORTOS = await API.buscarPortos();
      CFG = await API.buscarConfig();
      await DB.setMeta('config', CFG);
      await DB.setMeta('portos', PORTOS);
    } catch (e) { /* opcional */ }

    texto.textContent = 'Baixando fotos (isso pode levar alguns minutos)...';
    const resultadoImgs = await sincronizarImagens(produtos, (feitos, total) => {
      texto.textContent = total > 0 ? `Baixando fotos... ${feitos}/${total}` : 'Fotos já atualizadas';
      document.getElementById('sync-barra-interna').style.width = total > 0 ? (feitos / total * 100) + '%' : '100%';
    });

    await DB.setMeta('ultima_sync', new Date().toISOString());
    atualizarTextoUltimaSync();
    montarFiltrosConsulta();
    montarSelectPortos();
    if (resultadoImgs && resultadoImgs.falhas > 0) {
      mostrarToast(`Dados atualizados, mas ${resultadoImgs.falhas} foto(s) não puderam ser baixadas (provável falta de permissão no Drive para esses arquivos)`, 'error');
    } else {
      mostrarToast('Dados atualizados com sucesso!', 'success');
    }
  } catch (e) {
    mostrarToast('Erro ao atualizar: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    barra.classList.add('hidden');
  }
}

async function atualizarTextoUltimaSync() {
  const ultima = await DB.getMeta('ultima_sync');
  const el = document.getElementById('ultima-sync-texto');
  if (!ultima) { el.textContent = 'Nunca atualizado — toque em "Atualizar dados"'; return; }
  const d = new Date(ultima);
  el.textContent = 'Última atualização: ' + d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ---------------- Inicialização ----------------

async function init() {
  initTheme();

  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch (e) {}
  }

  PRODUTOS = await DB.listarProdutos();
  CLIENTES = await DB.listarClientes();
  try { CFG = (await DB.getMeta('config')) || CFG; } catch (e) {}
  try { PORTOS = (await DB.getMeta('portos')) || []; } catch (e) {}

  montarFiltrosConsulta();
  montarSelectPortos();
  montarFiltrosClientes();
  montarFiltrosCatalogo();
  atualizarTextoUltimaSync();
  atualizarBadgePendentes();
  atualizarStatusConexao();
  iniciarNovoPedido();

  window.addEventListener('online', atualizarStatusConexao);
  window.addEventListener('offline', atualizarStatusConexao);

  document.getElementById('btn-atualizar-dados').addEventListener('click', atualizarDados);
  document.querySelectorAll('.tab-btn[data-tab]').forEach((b) => b.addEventListener('click', () => trocarAba(b.dataset.tab)));

  if (PRODUTOS.length === 0) {
    mostrarToast('Nenhum dado local ainda — conecte-se à internet e toque em "Atualizar dados"', 'info');
  }

  setInterval(() => { if (navigator.onLine) sincronizarPedidosPendentes(); }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
