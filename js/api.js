// ============================================================
// api.js — Comunicação com o Google Apps Script (Web App)
// Só é chamado quando há internet. Toda falha de rede deve ser
// tratada por quem chama (ex: cair para fila offline).
// ============================================================

// TODO: cole aqui a URL do seu Web App (Implantar > Nova implantação > Execute como Web App)
const API_URL = 'https://script.google.com/macros/s/AKfycbx-MNx7NTPepZvV0WA9KFK1gNOIkDMQjoGcHM9Poh9J9P4Zgbz7IEhSp2iCENmEAqysCA/exec';

async function _apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.keys(params).forEach((k) => url.searchParams.set(k, params[k]));
  const resp = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  if (!resp.ok) throw new Error('Falha na requisição (' + resp.status + ')');
  const json = await resp.json();
  if (!json.success) throw new Error(json.error || 'Erro desconhecido na API');
  return json.data;
}

// POST com Content-Type text/plain evita o preflight CORS (Apps Script não
// responde OPTIONS). O servidor faz JSON.parse(e.postData.contents).
async function _apiPost(action, payload) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });
  if (!resp.ok) throw new Error('Falha na requisição (' + resp.status + ')');
  const json = await resp.json();
  if (!json.success) throw new Error(json.error || 'Erro desconhecido na API');
  return json.data;
}

const API = {
  buscarProdutos: () => _apiGet('produtos'),
  buscarClientes: () => _apiGet('clientes'),
  buscarConfig: () => _apiGet('config'),
  buscarPortos: () => _apiGet('portos'),
  buscarPedidos: () => _apiGet('pedidos'),
  buscarItensPedido: (numero) => _apiGet('itens_pedido', { numero }),

  // ids: array de fileId do Drive. Retorna { fileId: base64DataUrl }
  buscarImagensLote: (ids) => _apiPost('imagens', { ids }),

  salvarPedido: (pedido) => _apiPost('pedido', pedido),
  atualizarPedido: (pedido, numeroOriginal, linkPdfAntigo) => _apiPost('atualizar_pedido', { pedido, numeroOriginal, linkPdfAntigo }),
  excluirPedido: (numero, linkPdf) => _apiPost('excluir_pedido', { numero, linkPdf }),
  gerarPdf: (pedido) => _apiPost('gerar_pdf', pedido),
  salvarCliente: (cliente) => _apiPost('cliente_novo', cliente),
  atualizarCliente: (cliente) => _apiPost('cliente_editar', cliente),
  salvarConfig: (config) => _apiPost('salvar_config', config)
};
