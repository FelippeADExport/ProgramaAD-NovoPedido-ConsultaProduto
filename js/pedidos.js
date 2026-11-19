// ============================================================
// ABA TODOS OS PEDIDOS: lista, seleção em lote, gerar PDF e exclusão
// ============================================================
function loadPedidos(){
  document.getElementById('pedidosLoading').style.display='block';document.getElementById('pedidosTableWrap').classList.add('hidden');document.getElementById('pedidosEmpty').classList.add('hidden');
  return new Promise((res,rej)=>{google.script.run.withSuccessHandler(r=>{const d=JSON.parse(r);if(d.success){PEDIDOS=d.data;filtrarPedidos();document.getElementById('tabTodosCount').textContent=PEDIDOS.length;res();}else{showToast('Erro: '+d.error,'error');rej(d.error);}}).withFailureHandler(e=>{showToast('Erro: '+e.message,'error');rej(e.message);}).getPedidos();});
}

// BUSCA: filtra a lista pelo texto digitado (número, cliente, ID, país, cidade, data, tabela, portos)
function filtrarPedidos(){
  const q=(document.getElementById('pedidosSearch').value||'').toLowerCase().trim();
  if(!q){renderPedidos(PEDIDOS);onRowCheck();return;}
  const campos=['numero','cliente_nome','cliente_id','pais','cidade','data_pedido','tabela_preco','porto_destino','porto_destino_chegada'];
  const lista=PEDIDOS.filter(p=>campos.some(k=>String(p[k]||'').toLowerCase().includes(q)));
  renderPedidos(lista);onRowCheck();
  if(!lista.length)document.getElementById('pedidosSubtitle').textContent='Nenhum pedido encontrado para "'+q+'"';
}

// Partes comuns da linha da tabela e do card (celular)
function _pedidoPartes(p){
  const isRev=/\-R\d+$/.test(p.numero),pu=(p.link_pdf||'').trim();
  const pdfBtn=pu&&pu.startsWith('http')
    ?`<a href="${esc(pu)}" target="_blank" class="btn btn-sm btn-secondary btn-icon" title="Abrir PDF salvo no Drive" aria-label="Abrir PDF">📄</a>`
    :`<button class="btn btn-sm btn-secondary btn-icon" data-num="${esc(p.numero)}" onclick="gerarPdfParaPedido(this.dataset.num)" title="Gerar PDF" aria-label="Gerar PDF">📄</button>`;
  const editBtn=`<button class="btn btn-sm btn-secondary btn-icon" data-num="${esc(p.numero)}" onclick="iniciarEdicao(this.dataset.num)" title="Editar" aria-label="Editar">✏️</button>`;
  const delBtn=`<button class="btn btn-sm btn-danger btn-icon del-btn" data-num="${esc(p.numero)}" data-nome="${esc(p.cliente_nome)}" data-pdf="${esc(pu)}" title="Excluir" aria-label="Excluir">🗑️</button>`;
  const tabela=`<span class="chip ${p.tabela_preco==='FOB'?'chip-accent':''}">${esc(p.tabela_preco)}</span>`;
  const valor=(p.desconto_valor>0?`<span class="valor-antigo">US$ ${fmtN(Number(p.valor_total)+Number(p.desconto_valor))}</span>`:'')
    +`<span class="valor">US$ ${fmtN(p.valor_total)}</span>`
    +(p.desconto_valor>0?`<span class="valor-desconto">−US$ ${fmtN(p.desconto_valor)}</span>`:'');
  return{isRev,pdfBtn,editBtn,delBtn,tabela,valor};
}

function renderPedidos(lista){
  document.getElementById('pedidosLoading').style.display='none';document.getElementById('pedidosTableWrap').classList.add('hidden');document.getElementById('pedidosCardsList').classList.add('hidden');document.getElementById('pedidosEmpty').classList.add('hidden');
  if(!lista.length){document.getElementById('pedidosEmpty').classList.remove('hidden');document.getElementById('pedidosSubtitle').textContent='Nenhum pedido registrado';return;}
  const tot=lista.reduce((a,b)=>a+(b.valor_total||0),0);document.getElementById('pedidosSubtitle').textContent=lista.length+' pedido'+(lista.length>1?'s':'')+', total US$ '+fmtN(tot);
  document.getElementById('pedidosTableWrap').classList.remove('hidden');
  document.getElementById('pedidosTbody').innerHTML=lista.map(p=>{
    const{isRev,pdfBtn,editBtn,delBtn,tabela,valor}=_pedidoPartes(p);
    const embarque=p.porto_destino?`<span class="sub">Embarque: ${esc(p.porto_destino)}</span>`:'';
    const destino=p.porto_destino_chegada?`<span class="sub">Destino: ${esc(p.porto_destino_chegada)}</span>`:'';
    return`<tr>
      <td class="cb-wrap"><input type="checkbox" class="cb-row ped-cb" data-num="${esc(p.numero)}" data-link="${esc(p.link_pdf||'')}" onchange="onRowCheck()"></td>
      <td class="ped-num-cell${isRev?' rev':''}">${esc(p.numero)}${isRev?' <span class="chip chip-warn">REV</span>':''}</td>
      <td class="ped-date-cell">${esc(p.data_pedido)}</td>
      <td class="ped-client-cell">${esc(p.cliente_nome)}<span class="sub">${esc(p.cliente_id)}</span></td>
      <td class="txt-left">${esc(p.pais||'—')}${p.cidade?`<span class="sub">${esc(p.cidade)}</span>`:''}</td>
      <td class="txt-left">${tabela}${embarque}${destino}</td>
      <td class="num">${p.qtd_itens||'—'}</td>
      <td class="ped-value-cell">${valor}</td>
      <td><div class="actions">${pdfBtn}${editBtn}${delBtn}</div></td>
    </tr>`;
  }).join('');
  document.getElementById('pedidosCardsList').classList.remove('hidden');
  document.getElementById('pedidosCardsList').innerHTML=lista.map(p=>{
    const{isRev,pdfBtn,editBtn,delBtn,tabela,valor}=_pedidoPartes(p);
    return`<div class="pedido-card">
      <div class="pedido-card-header">
        <div><div class="pedido-card-num${isRev?' rev':''}">${esc(p.numero)}${isRev?' <span class="chip chip-warn">REV</span>':''}</div><div class="pedido-card-date">${esc(p.data_pedido)}</div></div>
        <div class="pedido-card-actions">${pdfBtn}${editBtn}${delBtn}</div>
      </div>
      <div class="pedido-card-body">
        <div class="pedido-card-field full"><label>Cliente</label><span>${esc(p.cliente_nome)}</span></div>
        <div class="pedido-card-field"><label>País / cidade</label><span>${esc(p.pais||'—')}${p.cidade?', '+esc(p.cidade):''}</span></div>
        <div class="pedido-card-field"><label>Tabela</label><div class="pedido-card-tags">${tabela}</div></div>
        ${p.porto_destino?`<div class="pedido-card-field"><label>Embarque</label><span>${esc(p.porto_destino)}</span></div>`:''}
        ${p.porto_destino_chegada?`<div class="pedido-card-field"><label>Destino</label><span>${esc(p.porto_destino_chegada)}</span></div>`:''}
        <div class="pedido-card-field full"><label>Valor total</label><div class="ped-value-cell">${valor}</div></div>
      </div>
    </div>`;
  }).join('');
}

// SELEÇÃO EM LOTE
function onRowCheck(){const cbs=[...document.querySelectorAll('.ped-cb')];const sel=cbs.filter(c=>c.checked);const bar=document.getElementById('bulkBar');const all=document.getElementById('cbSelectAll');bar.classList.toggle('active',sel.length>0);document.getElementById('bulkCount').textContent=sel.length+' selecionado'+(sel.length!==1?'s':'');all.indeterminate=sel.length>0&&sel.length<cbs.length;all.checked=sel.length===cbs.length&&cbs.length>0;}
function toggleSelectAll(cb){document.querySelectorAll('.ped-cb').forEach(c=>c.checked=cb.checked);onRowCheck();}
function deselectAll(){document.querySelectorAll('.ped-cb').forEach(c=>c.checked=false);document.getElementById('cbSelectAll').checked=false;document.getElementById('cbSelectAll').indeterminate=false;document.getElementById('bulkBar').classList.remove('active');}

// GERAR PDF de um pedido já salvo (botão da lista)
function gerarPdfParaPedido(numero){
  showToast('Buscando dados do pedido...','');
  google.script.run.withSuccessHandler(r=>{
    const d=JSON.parse(r);
    if(!d.success){showToast('Erro: '+d.error,'error');return;}
    const{itens,cliente,extra}=d;
    // getItensPedido não traz o campo "imagem" (só fica salvo no cadastro do
    // produto) — completa aqui antes de gerar o PDF, senão sai sem fotos.
    itens.forEach(it=>{
      const p=PRODUCTS.find(x=>String(x.codigo)===String(it.codigo));
      if(p)it.imagem=p.imagem||'';
    });
    const valorTotal=itens.reduce((a,b)=>a+(b.valor_total||0),0);
    const pedido={
      numero,cliente,
      tabela_preco:extra.tabela_preco||'FOB',
      porto_destino:extra.porto_destino||'',
      porto_destino_chegada:extra.porto_destino_chegada||'',
      desconto_perc:extra.desconto_perc||0,
      desconto_valor:extra.desconto_valor||0,
      valor_total:valorTotal-(extra.desconto_valor||0),
      observacoes:extra.observacoes||'',
      itens,
      opcoes:{exibir_preco:true,exibir_qtd:true,exibir_euro:itens.some(i=>i.europallet),idioma:'pt'}
    };
    showToast('Gerando PDF...','');
    google.script.run.withSuccessHandler(r2=>{
      const d2=JSON.parse(r2);
      if(d2.success){showToast('PDF gerado','success');if(d2.url)window.open(d2.url,'_blank');loadPedidos();}
      else showToast('Erro ao gerar PDF: '+d2.error,'error');
    }).withFailureHandler(e=>showToast('Erro: '+e.message,'error')).gerarPdfESalvar(JSON.stringify(pedido));
  }).withFailureHandler(e=>showToast('Erro: '+e.message,'error')).getItensPedido(numero);
}

// EXCLUSÃO DE PEDIDO (individual ou em lote)
var _exNum='', _exPdf='', _exModo='individual';
var _exLoteNums=[], _exLoteLinks=[];

function abrirModalExcluir(numero, nome, linkPdf) {
  var modal = document.getElementById('modalExcluir');
  if (!modal) return;
  _exModo = 'individual';
  _exNum  = numero;
  _exPdf  = linkPdf;
  document.getElementById('modalExcluirTitulo').textContent   = 'Excluir pedido';
  document.getElementById('modalExcluirNum').textContent      = numero;
  document.getElementById('modalExcluirDescricao').innerHTML  = 'Excluir o pedido de <strong>' + esc(nome) + '</strong>?';
  _resetBtnExcluir();
  modal.style.display = 'flex';
}

function abrirModalExcluirLote() {
  var sel = [].slice.call(document.querySelectorAll('.ped-cb:checked'));
  if (!sel.length) return;
  _exModo       = 'lote';
  _exLoteNums   = sel.map(function(c){ return c.dataset.num; });
  _exLoteLinks  = sel.map(function(c){ return c.dataset.link || ''; });
  var qtd = _exLoteNums.length;
  document.getElementById('modalExcluirTitulo').textContent  = 'Excluir ' + qtd + ' pedido' + (qtd > 1 ? 's' : '');
  document.getElementById('modalExcluirNum').textContent     = qtd + ' pedido' + (qtd > 1 ? 's' : '') + ' selecionado' + (qtd > 1 ? 's' : '');
  document.getElementById('modalExcluirDescricao').innerHTML = 'Excluir os pedidos abaixo?<br><strong class="lista-numeros">' + esc(_exLoteNums.join(', ')) + '</strong>';
  _resetBtnExcluir();
  document.getElementById('modalExcluir').style.display = 'flex';
}

function fecharModalExcluir() {
  document.getElementById('modalExcluir').style.display = 'none';
  _resetBtnExcluir();
  _exNum = ''; _exPdf = '';
}

function _resetBtnExcluir() {
  var btn = document.getElementById('btnConfirmarExcluir');
  btn.disabled    = false;
  btn.textContent = 'Excluir';
}

function _onConfirmarExcluir() {
  if (_exModo === 'lote') {
    var btn = document.getElementById('btnConfirmarExcluir');
    btn.disabled    = true;
    btn.textContent = 'Excluindo...';
    document.getElementById('modalExcluir').style.display = 'none';
    excluirLoteSequencial(_exLoteNums.slice(), _exLoteLinks.slice(), 0);
    return;
  }
  var num = _exNum, pdf = _exPdf;
  if (!num) return;
  var btn = document.getElementById('btnConfirmarExcluir');
  btn.disabled    = true;
  btn.textContent = 'Excluindo...';
  google.script.run
    .withSuccessHandler(function(r) {
      var d = JSON.parse(r);
      if (d.success) {
        fecharModalExcluir();
        showToast('Pedido excluído', 'success');
        loadPedidos();
      } else {
        _resetBtnExcluir();
        showToast('Erro: ' + d.error, 'error');
      }
    })
    .withFailureHandler(function(e) {
      _resetBtnExcluir();
      showToast('Erro: ' + e.message, 'error');
    })
    .excluirPedido(num, pdf);
}

// Registrar listeners UMA única vez — chamado no window.onload
function initExcluirListeners() {
  document.getElementById('modalExcluir').addEventListener('click', function(e) {
    if (e.target === this) fecharModalExcluir();
  });
  document.getElementById('btnConfirmarExcluir').addEventListener('click', _onConfirmarExcluir);
  // Delegação de eventos para botões de excluir na tabela e nos cards
  document.getElementById('app').addEventListener('click', function(e) {
    var btn = e.target.closest('.del-btn');
    if (btn) {
      abrirModalExcluir(btn.dataset.num, btn.dataset.nome, btn.dataset.pdf);
    }
  });
}

function excluirLoteSequencial(nums, links, idx) {
  if (idx >= nums.length) {
    showToast(nums.length + ' pedido' + (nums.length !== 1 ? 's' : '') + ' excluído' + (nums.length !== 1 ? 's' : ''), 'success');
    deselectAll();
    loadPedidos();
    return;
  }
  google.script.run
    .withSuccessHandler(function() { excluirLoteSequencial(nums, links, idx + 1); })
    .withFailureHandler(function(e) {
      showToast('Erro ao excluir ' + nums[idx] + ': ' + e.message, 'error');
      excluirLoteSequencial(nums, links, idx + 1);
    })
    .excluirPedido(nums[idx], links[idx] || '');
}
