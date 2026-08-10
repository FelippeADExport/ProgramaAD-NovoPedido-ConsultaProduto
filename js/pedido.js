// ============================================================
// pedido.js — Tela Novo Pedido
// Replica a lógica de cálculo do programa original (Index.html):
// unidade (m²/caixa/pallet/container), europallet, acréscimo Itapoá,
// tabela FOB/EXW, frete Marítimo x Rodoviário (Criciúma fixo).
// ============================================================

let CLIENTES = [];
let PORTOS = [];
let CFG = { acrescimo_itapoa: 0.10, acrescimo_europallet: 0.15 };

let clienteSelecionado = null;
let itensPedido = []; // { uid, produto, unidade, quantidade, europallet, sqmt, peso, caixas, pallets, containers, precoUnit, valorTotal }
let currentPrice = 'FOB';
let currentFrete = 'maritimo';
let currentPorto = '';

function _uid() { return 'it' + Math.random().toString(36).slice(2, 9); }

function iniciarNovoPedido() {
  clienteSelecionado = null;
  itensPedido = [];
  currentPrice = 'FOB';
  currentFrete = 'maritimo';
  currentPorto = '';
  document.getElementById('np-cliente-busca').value = '';
  document.getElementById('np-cliente-selecionado').classList.add('hidden');
  document.getElementById('np-cliente-form-novo').classList.add('hidden');
  document.getElementById('np-observacoes').value = '';
  document.getElementById('np-desconto').value = '';
  document.getElementById('np-itens-lista').innerHTML = '';
  document.getElementById('numeroPedidoNovo').textContent = 'PED-' + Date.now();
  setFrete('maritimo');
  adicionarItem();
  atualizarResumoPedido();
}

// ---------------- Cliente ----------------

function buscarClientesUI() {
  const termo = document.getElementById('np-cliente-busca').value.trim().toLowerCase();
  const lista = document.getElementById('np-cliente-lista');
  if (!termo) { lista.classList.add('hidden'); lista.innerHTML = ''; return; }
  const match = CLIENTES.filter((c) =>
    (c.nome || '').toLowerCase().includes(termo) || String(c.id).toLowerCase().includes(termo)
  ).slice(0, 8);
  if (!match.length) {
    lista.innerHTML = `<div class="autocomplete-item" onclick="abrirCadastroClienteNovo()"><strong>Cliente não encontrado</strong><small>Clique para cadastrar novo</small></div>`;
  } else {
    lista.innerHTML = match
      .map((c) => `<div class="autocomplete-item" onclick="selecionarCliente('${c.id}')"><strong>${c.nome}</strong><small>${c.cidade || ''} · ${c.pais || ''}</small></div>`)
      .join('') + `<div class="autocomplete-item autocomplete-item-add" onclick="abrirCadastroClienteNovo()">+ Cadastrar novo cliente</div>`;
  }
  lista.classList.remove('hidden');
}

function selecionarCliente(id) {
  const c = CLIENTES.find((x) => String(x.id) === String(id));
  if (!c) return;
  clienteSelecionado = c;
  document.getElementById('np-cliente-lista').classList.add('hidden');
  document.getElementById('np-cliente-form-novo').classList.add('hidden');
  document.getElementById('np-cliente-busca').value = '';
  const box = document.getElementById('np-cliente-selecionado');
  box.classList.remove('hidden');
  box.innerHTML = `<strong>${c.nome}</strong><span>${c.cidade || ''} · ${c.pais || ''}</span>
    <button type="button" onclick="trocarCliente()">Trocar</button>`;
}

function trocarCliente() {
  clienteSelecionado = null;
  document.getElementById('np-cliente-selecionado').classList.add('hidden');
  document.getElementById('np-cliente-busca').value = '';
}

function abrirCadastroClienteNovo() {
  document.getElementById('np-cliente-lista').classList.add('hidden');
  document.getElementById('np-cliente-form-novo').classList.remove('hidden');
  ['ncNome','ncEndereco','ncComplemento','ncProvincia','ncCidade','ncPais','ncCep','ncContato','ncTelefone','ncEmail'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
}

async function salvarClienteNovoESelecionar() {
  const cliente = {
    nome: document.getElementById('ncNome').value.trim(),
    endereco: document.getElementById('ncEndereco').value.trim(),
    complemento: document.getElementById('ncComplemento').value.trim(),
    provincia: document.getElementById('ncProvincia').value.trim(),
    cidade: document.getElementById('ncCidade').value.trim(),
    pais: document.getElementById('ncPais').value.trim(),
    cep: document.getElementById('ncCep').value.trim(),
    contato: document.getElementById('ncContato').value.trim(),
    telefone: document.getElementById('ncTelefone').value.trim(),
    email: document.getElementById('ncEmail').value.trim()
  };
  if (!cliente.nome) { mostrarToast('Informe o nome do cliente', 'error'); return; }

  if (navigator.onLine) {
    try {
      const r = await API.salvarCliente(cliente);
      cliente.id = r.id;
      await DB.salvarCliente(cliente);
      CLIENTES.push(cliente);
      selecionarCliente(cliente.id);
      mostrarToast('Cliente cadastrado', 'success');
      return;
    } catch (e) {
      mostrarToast('Erro ao salvar cliente online, salvando localmente', 'error');
    }
  }
  // offline: gera id temporário local; sincroniza quando o pedido for enviado
  cliente.id = 'TEMP' + Date.now();
  cliente._pendenteSync = true;
  await DB.salvarCliente(cliente);
  CLIENTES.push(cliente);
  selecionarCliente(cliente.id);
  mostrarToast('Cliente salvo localmente (será sincronizado quando houver internet)', 'success');
}

// ---------------- Frete / Tabela de Preço ----------------

function setPrice(p) {
  currentPrice = p;
  document.getElementById('np-btn-fob').classList.toggle('active', p === 'FOB');
  document.getElementById('np-btn-exw').classList.toggle('active', p === 'EXW');
  itensPedido.forEach((it) => recalcItem(it.uid));
  atualizarResumoPedido();
}

function setFrete(f) {
  currentFrete = f;
  document.getElementById('np-btn-maritimo').classList.toggle('active', f === 'maritimo');
  document.getElementById('np-btn-rodoviario').classList.toggle('active', f === 'rodoviario');
  document.getElementById('np-porto-maritimo').classList.toggle('hidden', f !== 'maritimo');
  document.getElementById('np-porto-rodoviario').classList.toggle('hidden', f === 'maritimo');
  itensPedido.forEach((it) => recalcItem(it.uid));
  atualizarResumoPedido();
}

function montarSelectPortos() {
  const sel = document.getElementById('np-porto-select');
  sel.innerHTML = '<option value="">Selecione o porto...</option>' +
    PORTOS.map((p) => `<option value="${p.porto}">${p.porto} — ${p.pais}</option>`).join('');
  sel.onchange = () => { currentPorto = sel.value; atualizarResumoPedido(); };
}

// ---------------- Itens ----------------

function getItem(uid) { return itensPedido.find((i) => i.uid === uid); }
function setItem(uid, patch) {
  const i = itensPedido.findIndex((x) => x.uid === uid);
  if (i >= 0) itensPedido[i] = { ...itensPedido[i], ...patch };
}

function getProdData(prod, isEuro) {
  if (!isEuro) {
    return {
      preco_fob: prod.preco_fob, preco_exw: prod.preco_exw,
      cx_sqmt: prod.cx_sqmt, cx_peso: prod.cx_peso,
      pallet_caixas: prod.pallet_caixas, pallet_sqmt: prod.pallet_sqmt, pallet_peso: prod.pallet_peso,
      container_sqmt: prod.container_sqmt, container_peso: prod.container_peso,
      container_caixas: prod.container_caixas, container_pallets: prod.container_pallets
    };
  }
  return {
    preco_fob: prod.preco_fob, preco_exw: prod.preco_exw,
    cx_sqmt: prod.euro_cx_sqmt, cx_peso: prod.euro_cx_peso,
    pallet_caixas: prod.euro_pallet_caixas, pallet_sqmt: prod.euro_pallet_sqmt, pallet_peso: prod.euro_pallet_peso,
    container_sqmt: prod.euro_container_sqmt, container_peso: prod.euro_container_peso,
    container_caixas: prod.euro_container_caixas, container_pallets: prod.euro_container_pallets
  };
}

function adicionarItem() {
  const uid = _uid();
  itensPedido.push({ uid, produto: null, unidade: 'M2', quantidade: 1, europallet: false });
  renderizarItem(uid);
}

function removerItem(uid) {
  if (itensPedido.length <= 1) { mostrarToast('Mantenha pelo menos 1 item', 'error'); return; }
  itensPedido = itensPedido.filter((i) => i.uid !== uid);
  document.getElementById('item-' + uid)?.remove();
  document.querySelectorAll('#np-itens-lista .item-card').forEach((card, i) => {
    const numEl = card.querySelector('.item-num');
    if (numEl) numEl.textContent = i + 1;
  });
  atualizarResumoPedido();
}

function renderizarItem(uid) {
  const formatos = valoresUnicos(PRODUTOS, 'formato');
  const div = document.createElement('div');
  div.className = 'item-card';
  div.id = 'item-' + uid;
  const numAtual = itensPedido.findIndex((it) => it.uid === uid) + 1;
  div.innerHTML = `
    <div class="item-header">
      <div class="item-num">${numAtual}</div>
      <div class="item-name" id="iname-${uid}">Novo item</div>
      <button type="button" class="item-remove" onclick="removerItem('${uid}')">×</button>
    </div>
    <div class="grid grid-3">
      <div><label>Formato</label>
        <select id="formato-${uid}" onchange="onFormatoChange('${uid}')">
          <option value="">Selecione...</option>
          ${formatos.map((f) => `<option value="${f}">${f}</option>`).join('')}
        </select>
      </div>
      <div><label>Produto</label>
        <select id="nome-${uid}" onchange="onNomeChange('${uid}')" disabled>
          <option value="">Selecione o formato primeiro</option>
        </select>
      </div>
      <div><label>Código</label>
        <div class="autocomplete-wrap">
          <input type="text" id="codigo-${uid}" placeholder="Buscar código..." oninput="onCodigoInput('${uid}')" onblur="setTimeout(()=>document.getElementById('codigo-dd-${uid}').classList.add('hidden'),250)">
          <div class="autocomplete-list hidden" id="codigo-dd-${uid}"></div>
        </div>
      </div>
    </div>
    <div class="grid grid-2 mt-8">
      <div><label>Unidade</label>
        <select id="unidade-${uid}" onchange="recalcItem('${uid}')">
          <option value="M2">m²</option>
          <option value="CAIXA">Caixa</option>
          <option value="PALLET">Pallet</option>
          <option value="CONTAINER">Container</option>
        </select>
      </div>
      <div><label>Quantidade</label>
        <input type="number" id="qtd-${uid}" min="1" value="1" oninput="recalcItem('${uid}')">
      </div>
    </div>
    <div class="europallet-row" id="euro-row-${uid}" onclick="document.getElementById('euro-${uid}').click()">
      <input type="checkbox" id="euro-${uid}" onchange="recalcItem('${uid}');document.getElementById('euro-row-${uid}').classList.toggle('checked',this.checked)" onclick="event.stopPropagation()">
      <div class="euro-box">✓</div>
      <span class="europallet-label">Europallet</span>
    </div>
    <div class="item-results" id="results-${uid}">
      <div><label>m²</label><span id="r-sqmt-${uid}">—</span></div>
      <div><label>Preço unit.</label><span id="r-preco-${uid}">—</span></div>
      <div><label>Total</label><span id="r-total-${uid}">—</span></div>
      <div><label>Peso</label><span id="r-peso-${uid}">—</span></div>
      <div><label>Caixas</label><span id="r-caixas-${uid}">—</span></div>
      <div><label>Pallets</label><span id="r-pallets-${uid}">—</span></div>
    </div>`;
  document.getElementById('np-itens-lista').appendChild(div);
}

function onFormatoChange(uid) {
  const f = document.getElementById('formato-' + uid).value;
  const sel = document.getElementById('nome-' + uid);
  sel.disabled = !f;
  sel.innerHTML = '<option value="">Selecione...</option>';
  if (!f) return;
  PRODUTOS.filter((p) => p.formato === f).forEach((p) => {
    const o = document.createElement('option');
    o.value = p.codigo; o.textContent = p.nome;
    sel.appendChild(o);
  });
  setItem(uid, { produto: null });
}

function onNomeChange(uid) {
  const codigo = document.getElementById('nome-' + uid).value;
  const p = PRODUTOS.find((x) => String(x.codigo) === String(codigo));
  if (!p) return;
  setItem(uid, { produto: p });
  document.getElementById('codigo-' + uid).value = p.codigo;
  document.getElementById('iname-' + uid).textContent = p.nome + ' · ' + p.formato;
  recalcItem(uid);
}

function onCodigoInput(uid) {
  const v = document.getElementById('codigo-' + uid).value.trim();
  const dd = document.getElementById('codigo-dd-' + uid);
  if (!v) { dd.classList.add('hidden'); return; }
  const m = PRODUTOS.filter((p) => String(p.codigo).includes(v) || p.nome.toLowerCase().includes(v.toLowerCase())).slice(0, 8);
  if (!m.length) { dd.classList.add('hidden'); return; }
  dd.innerHTML = m.map((p) => `<div class="autocomplete-item" onmousedown="selecionarProdutoPorCodigo('${uid}','${p.codigo}')"><strong>${p.codigo} — ${p.nome}</strong><small>${p.formato}</small></div>`).join('');
  dd.classList.remove('hidden');
}

function selecionarProdutoPorCodigo(uid, codigo) {
  const p = PRODUTOS.find((x) => String(x.codigo) === String(codigo));
  if (!p) return;
  setItem(uid, { produto: p });
  document.getElementById('formato-' + uid).value = p.formato;
  onFormatoChange(uid);
  document.getElementById('nome-' + uid).value = p.codigo;
  document.getElementById('codigo-' + uid).value = p.codigo;
  document.getElementById('codigo-dd-' + uid).classList.add('hidden');
  document.getElementById('iname-' + uid).textContent = p.nome + ' · ' + p.formato;
  recalcItem(uid);
}

function recalcItem(uid) {
  const item = getItem(uid);
  if (!item || !item.produto) return;
  const prod = item.produto;
  const und = document.getElementById('unidade-' + uid).value;
  const qtd = parseFloat(document.getElementById('qtd-' + uid).value) || 0;
  const isEuro = document.getElementById('euro-' + uid).checked;
  const itapoaAtivo = currentFrete === 'maritimo' && currentPorto === 'Itapoá';
  const iB = itapoaAtivo ? (CFG.acrescimo_itapoa || 0) : 0;
  const euroB = isEuro ? (CFG.acrescimo_europallet || 0) : 0;
  const d = getProdData(prod, isEuro);
  const precoBase = (currentPrice === 'FOB' ? d.preco_fob : d.preco_exw) + euroB;
  const pu = precoBase + iB;

  let sqmt = 0, peso = 0, caixas = 0, pallets = 0, containers = 0;
  if (und === 'M2') {
    sqmt = qtd;
    const cxM2 = d.cx_sqmt || 1;
    caixas = cxM2 > 0 ? qtd / cxM2 : 0;
    peso = caixas * (d.cx_peso || 0);
    pallets = d.pallet_caixas > 0 ? caixas / d.pallet_caixas : 0;
    containers = d.container_pallets > 0 ? pallets / d.container_pallets : 0;
  } else if (und === 'CAIXA') {
    caixas = qtd;
    sqmt = qtd * (d.cx_sqmt || 0);
    peso = qtd * (d.cx_peso || 0);
    pallets = d.pallet_caixas > 0 ? qtd / d.pallet_caixas : 0;
    containers = d.container_pallets > 0 ? pallets / d.container_pallets : 0;
  } else if (und === 'PALLET') {
    sqmt = qtd * (d.pallet_sqmt || 0);
    peso = qtd * (d.pallet_peso || 0);
    caixas = qtd * (d.pallet_caixas || 0);
    pallets = qtd;
    containers = d.container_pallets > 0 ? qtd / d.container_pallets : 0;
  } else if (und === 'CONTAINER') {
    sqmt = qtd * (d.container_sqmt || 0);
    peso = qtd * (d.container_peso || 0);
    caixas = qtd * (d.container_caixas || 0);
    pallets = qtd * (d.container_pallets || 0);
    containers = qtd;
  }
  const valorTotal = sqmt * pu;
  setItem(uid, { unidade: und, quantidade: qtd, europallet: isEuro, sqmt, peso, caixas, pallets, containers, precoUnit: pu, valorTotal });

  document.getElementById('r-sqmt-' + uid).textContent = fmtN(sqmt) + ' m²';
  document.getElementById('r-preco-' + uid).textContent = 'US$ ' + fmtN(pu);
  document.getElementById('r-total-' + uid).textContent = 'US$ ' + fmtN(valorTotal);
  document.getElementById('r-peso-' + uid).textContent = fmtN(peso) + ' kg';
  document.getElementById('r-caixas-' + uid).textContent = fmtN(caixas);
  document.getElementById('r-pallets-' + uid).textContent = fmtN(pallets);
  atualizarResumoPedido();
}

function fmtN(n) { return isNaN(n) ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getDesconto(subtotal) {
  const perc = parseFloat(document.getElementById('np-desconto').value) || 0;
  const valor = subtotal * (perc / 100);
  return { perc, valor };
}

function atualizarResumoPedido() {
  const validos = itensPedido.filter((i) => i.produto);
  const tbody = document.getElementById('np-resumo-tabela');
  if (!validos.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum item adicionado</td></tr>';
  } else {
    tbody.innerHTML = validos.map((it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.produto.nome}</td>
        <td>${it.unidade}</td>
        <td>${fmtN(it.quantidade)}</td>
        <td>US$ ${fmtN(it.valorTotal)}</td>
        <td>${fmtN(it.peso)} kg</td>
      </tr>`).join('');
  }
  const subtotal = validos.reduce((a, b) => a + (b.valorTotal || 0), 0);
  const { perc, valor: desconto } = getDesconto(subtotal);
  const total = subtotal - desconto;
  document.getElementById('np-subtotal').textContent = 'US$ ' + fmtN(subtotal);
  document.getElementById('np-desconto-valor').textContent = '− US$ ' + fmtN(desconto) + (perc ? ' (' + perc + '%)' : '');
  document.getElementById('np-total').textContent = 'US$ ' + fmtN(total);
}

// ---------------- Salvar Pedido ----------------

function montarObjetoPedido() {
  const validos = itensPedido.filter((i) => i.produto);
  const subtotal = validos.reduce((a, b) => a + (b.valorTotal || 0), 0);
  const { perc, valor: desconto } = getDesconto(subtotal);
  const n = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return {
    numero: document.getElementById('numeroPedidoNovo').textContent,
    cliente: clienteSelecionado,
    tabela_preco: currentPrice,
    porto_destino: currentFrete === 'maritimo' ? currentPorto : 'Criciúma',
    porto_destino_chegada: document.getElementById('np-porto-chegada')?.value || '',
    desconto_perc: perc,
    desconto_valor: desconto,
    valor_total: subtotal - desconto,
    observacoes: document.getElementById('np-observacoes').value,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
    data_hora_local: pad(n.getDate()) + '/' + pad(n.getMonth() + 1) + '/' + n.getFullYear() + ' ' + pad(n.getHours()) + ':' + pad(n.getMinutes()),
    itens: validos.map((it, i) => ({
      item: i + 1, linha: it.produto.linha || '', formato: it.produto.formato,
      nome: it.produto.nome, codigo: it.produto.codigo, unidade: it.unidade,
      quantidade: it.quantidade, qtd_total: it.sqmt, total_caixas: it.caixas || 0,
      total_pallets: it.pallets || 0, preco_unitario: it.precoUnit,
      europallet: it.europallet, valor_total: it.valorTotal, peso_total: it.peso
    }))
  };
}

async function salvarPedidoAtual() {
  if (!clienteSelecionado) { mostrarToast('Selecione ou cadastre um cliente', 'error'); return; }
  const validos = itensPedido.filter((i) => i.produto);
  if (!validos.length) { mostrarToast('Adicione ao menos um item', 'error'); return; }

  const pedido = montarObjetoPedido();

  if (navigator.onLine) {
    try {
      await API.salvarPedido(pedido);
      mostrarToast('Pedido enviado com sucesso!', 'success');
      iniciarNovoPedido();
      return;
    } catch (e) {
      mostrarToast('Falha ao enviar — pedido salvo offline e será sincronizado', 'error');
    }
  }
  await DB.adicionarPedidoPendente(pedido);
  mostrarToast('Sem internet — pedido salvo no dispositivo. Será enviado automaticamente quando houver conexão.', 'success');
  iniciarNovoPedido();
  atualizarBadgePendentes();
}
