// ============================================================
// pedidos-lista.js — Aba "Todos os Pedidos" (precisa de internet)
// ============================================================

let TODOS_PEDIDOS = [];
let todosPedidosCarregado = false;

async function carregarTodosPedidos() {
  if (!navigator.onLine) {
    document.getElementById('todos-lista').innerHTML = '<div class="empty-state"><div class="icon">📡</div><div class="title">Sem internet</div><div class="sub">Conecte-se para ver os pedidos salvos</div></div>';
    return;
  }
  document.getElementById('todos-lista').innerHTML = '<div class="empty-state"><div class="sub">Carregando pedidos...</div></div>';
  try {
    TODOS_PEDIDOS = await API.buscarPedidos();
    todosPedidosCarregado = true;
    renderizarTodosPedidos();
  } catch (e) {
    document.getElementById('todos-lista').innerHTML = `<div class="empty-state"><div class="title">Erro ao carregar</div><div class="sub">${e.message}</div></div>`;
  }
}

function renderizarTodosPedidos() {
  const termo = (document.getElementById('todos-busca').value || '').toLowerCase();
  const lista = TODOS_PEDIDOS.filter((p) =>
    !termo || p.numero.toLowerCase().includes(termo) || (p.cliente_nome || '').toLowerCase().includes(termo)
  );
  document.getElementById('todos-contagem').textContent = lista.length + ' pedido(s)';

  if (!lista.length) {
    document.getElementById('todos-lista').innerHTML = '<div class="empty-state"><div class="sub">Nenhum pedido encontrado</div></div>';
    return;
  }

  document.getElementById('todos-lista').innerHTML = lista.map((p) => `
    <div class="section">
      <div class="section-body" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-weight:800">${p.numero}</div>
          <div style="font-size:12px;color:var(--text3)">${p.cliente_nome} · ${p.cidade || ''} ${p.pais ? '/ ' + p.pais : ''}</div>
          <div style="font-size:12px;color:var(--text3)">${p.data_pedido} · ${p.qtd_itens} item(ns) · US$ ${fmtN(p.valor_total)}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="verDetalhePedido('${p.numero}')">Ver</button>
          ${p.link_pdf ? `<button class="btn btn-secondary" onclick="window.open('${p.link_pdf}','_blank')">📄 PDF</button>` : ''}
          <button class="btn" style="border-color:var(--danger);color:var(--danger)" onclick="confirmarExcluirPedido('${p.numero}','${p.link_pdf || ''}')">Excluir</button>
        </div>
      </div>
    </div>`).join('');
}

async function verDetalhePedido(numero) {
  document.getElementById('modal-produto-corpo').innerHTML = '<div class="empty-state"><div class="sub">Carregando...</div></div>';
  document.getElementById('modal-produto').classList.add('aberto');
  try {
    const r = await API.buscarItensPedido(numero);
    const itensHtml = r.itens.map((it) => `
      <tr><td>${it.item}</td><td>${it.nome}</td><td>${it.codigo}</td><td>${it.unidade}</td><td>${fmtN(it.quantidade)}</td><td>US$ ${fmtN(it.valor_total)}</td></tr>
    `).join('');
    document.getElementById('modal-produto-corpo').innerHTML = `
      <h3 style="font-family:'Syne',sans-serif;margin-bottom:4px">${numero}</h3>
      <div style="font-size:13px;color:var(--text3);margin-bottom:16px">${r.cliente ? r.cliente.nome : ''} · ${r.extra ? r.extra.tabela_preco : ''} · ${r.extra ? r.extra.porto_destino : ''}</div>
      <table class="tabela-resumo">
        <thead><tr><th>#</th><th>Produto</th><th>Código</th><th>Unid.</th><th>Qtd</th><th>Total</th></tr></thead>
        <tbody>${itensHtml}</tbody>
      </table>
      ${r.extra && r.extra.observacoes ? `<div class="mt-12" style="font-size:13px"><label>Observações</label>${r.extra.observacoes}</div>` : ''}
    `;
  } catch (e) {
    document.getElementById('modal-produto-corpo').innerHTML = `<div class="empty-state"><div class="sub">Erro: ${e.message}</div></div>`;
  }
}

function confirmarExcluirPedido(numero, linkPdf) {
  if (!confirm('Excluir o pedido ' + numero + '? Essa ação não pode ser desfeita.')) return;
  excluirPedidoConfirmado(numero, linkPdf);
}

async function excluirPedidoConfirmado(numero, linkPdf) {
  try {
    await API.excluirPedido(numero, linkPdf);
    mostrarToast('Pedido excluído', 'success');
    TODOS_PEDIDOS = TODOS_PEDIDOS.filter((p) => p.numero !== numero);
    renderizarTodosPedidos();
  } catch (e) {
    mostrarToast('Erro ao excluir: ' + e.message, 'error');
  }
}
