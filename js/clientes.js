// ============================================================
// clientes.js — Aba "Consulta Cliente" (precisa de internet p/ salvar)
// ============================================================

function montarFiltrosClientes() {
  const paises = Array.from(new Set(CLIENTES.map((c) => c.pais).filter(Boolean))).sort();
  const cidades = Array.from(new Set(CLIENTES.map((c) => c.cidade).filter(Boolean))).sort();
  document.getElementById('cli-filtro-pais').innerHTML = '<option value="">Todos</option>' + paises.map((p) => `<option value="${p}">${p}</option>`).join('');
  document.getElementById('cli-filtro-cidade').innerHTML = '<option value="">Todas</option>' + cidades.map((c) => `<option value="${c}">${c}</option>`).join('');
}

function renderizarClientes() {
  const termo = (document.getElementById('cli-busca').value || '').toLowerCase();
  const pais = document.getElementById('cli-filtro-pais').value;
  const cidade = document.getElementById('cli-filtro-cidade').value;
  const lista = CLIENTES.filter((c) => {
    if (pais && c.pais !== pais) return false;
    if (cidade && c.cidade !== cidade) return false;
    if (termo && !((c.nome || '').toLowerCase().includes(termo) || String(c.id).toLowerCase().includes(termo))) return false;
    return true;
  });

  if (!lista.length) {
    document.getElementById('clientes-lista').innerHTML = '<div class="empty-state"><div class="sub">Nenhum cliente encontrado</div></div>';
    return;
  }

  document.getElementById('clientes-lista').innerHTML = lista.map((c) => `
    <div class="section">
      <div class="section-body" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-weight:700">${c.nome}</div>
          <div style="font-size:12px;color:var(--text3)">${c.id} · ${c.cidade || ''} ${c.pais ? '/ ' + c.pais : ''}</div>
          <div style="font-size:12px;color:var(--text3)">${c.contato || ''} ${c.telefone ? '· ' + c.telefone : ''} ${c.email ? '· ' + c.email : ''}</div>
        </div>
        <button class="btn btn-secondary" onclick="abrirEdicaoCliente('${c.id}')">Editar</button>
      </div>
    </div>`).join('');
}

function _clienteFormHtml(c) {
  const v = (x) => x || '';
  return `
    <h3 style="font-family:'Syne',sans-serif;margin-bottom:14px">${c && c.id ? 'Editar cliente' : 'Novo cliente'}</h3>
    <div class="grid grid-2">
      <div><label>Nome *</label><input type="text" id="mcNome" value="${v(c && c.nome)}"></div>
      <div><label>RUT / Documento</label><input type="text" id="mcRut" value="${v(c && c.rut)}"></div>
      <div><label>Contato</label><input type="text" id="mcContato" value="${v(c && c.contato)}"></div>
      <div><label>Endereço</label><input type="text" id="mcEndereco" value="${v(c && c.endereco)}"></div>
      <div><label>Complemento</label><input type="text" id="mcComplemento" value="${v(c && c.complemento)}"></div>
      <div><label>Cidade</label><input type="text" id="mcCidade" value="${v(c && c.cidade)}"></div>
      <div><label>Província/Estado</label><input type="text" id="mcProvincia" value="${v(c && c.provincia)}"></div>
      <div><label>País</label><input type="text" id="mcPais" value="${v(c && c.pais)}"></div>
      <div><label>CEP</label><input type="text" id="mcCep" value="${v(c && c.cep)}"></div>
      <div><label>Telefone</label><input type="text" id="mcTelefone" value="${v(c && c.telefone)}"></div>
      <div><label>Email</label><input type="text" id="mcEmail" value="${v(c && c.email)}"></div>
    </div>
    <button type="button" class="btn btn-primary btn-full mt-12" onclick="salvarClienteModal(${c && c.id ? `'${c.id}'` : 'null'})">Salvar</button>
  `;
}

function abrirEdicaoCliente(id) {
  const c = CLIENTES.find((x) => String(x.id) === String(id));
  document.getElementById('modal-produto-corpo').innerHTML = _clienteFormHtml(c);
  document.getElementById('modal-produto').classList.add('aberto');
}

function abrirNovoClienteStandalone() {
  document.getElementById('modal-produto-corpo').innerHTML = _clienteFormHtml(null);
  document.getElementById('modal-produto').classList.add('aberto');
}

async function salvarClienteModal(id) {
  if (!navigator.onLine) { mostrarToast('Precisa de internet para salvar cliente', 'error'); return; }
  const cliente = {
    nome: document.getElementById('mcNome').value.trim(),
    rut: document.getElementById('mcRut').value.trim(),
    endereco: document.getElementById('mcEndereco').value.trim(),
    complemento: document.getElementById('mcComplemento').value.trim(),
    provincia: document.getElementById('mcProvincia').value.trim(),
    cidade: document.getElementById('mcCidade').value.trim(),
    pais: document.getElementById('mcPais').value.trim(),
    cep: document.getElementById('mcCep').value.trim(),
    contato: document.getElementById('mcContato').value.trim(),
    telefone: document.getElementById('mcTelefone').value.trim(),
    email: document.getElementById('mcEmail').value.trim()
  };
  if (!cliente.nome) { mostrarToast('Informe o nome do cliente', 'error'); return; }
  try {
    if (id) {
      cliente.id = id;
      await API.atualizarCliente(cliente);
      const idx = CLIENTES.findIndex((c) => String(c.id) === String(id));
      if (idx >= 0) CLIENTES[idx] = cliente;
      mostrarToast('Cliente atualizado', 'success');
    } else {
      const r = await API.salvarCliente(cliente);
      cliente.id = r.id;
      CLIENTES.push(cliente);
      mostrarToast('Cliente cadastrado', 'success');
    }
    await DB.salvarClientes(CLIENTES);
    fecharModalProduto();
    montarFiltrosClientes();
    renderizarClientes();
  } catch (e) {
    mostrarToast('Erro ao salvar: ' + e.message, 'error');
  }
}
