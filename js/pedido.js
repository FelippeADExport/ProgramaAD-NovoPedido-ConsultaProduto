// ============================================================
// ABA NOVO PEDIDO: cliente, frete, itens, desconto, resumo,
// salvar, PDF e edição de pedido existente
// ============================================================

// Começa um pedido novo, vazio (usado ao abrir a aba, limpar e cancelar edição)
function novoPedidoEmBranco(){resetFormNovoPedido();addItem();updateSummary();updateItemsBadge();updateOrderNum();}
function confirmarLimparPedido(){fecharModal('modalLimpar');novoPedidoEmBranco();showToast('Pedido limpo','');}
function confirmarCancelarEdicao(){fecharModal('modalCancelarEdicao');novoPedidoEmBranco();showToast('Edição cancelada','');}
function updateOrderNum(){const n=new Date();const p=x=>String(x).padStart(2,'0');document.getElementById('orderNumDisplay').textContent='PED-'+String(n.getFullYear()).slice(2)+p(n.getMonth()+1)+p(n.getDate())+'-'+p(n.getHours())+p(n.getMinutes());}

function atualizarTextoItapoa(){const el=document.getElementById('itapoaValorTxt');if(el)el.textContent=CFG_ITAPOA.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}

// PORTO DE DESTINO (frete marítimo)
function populatePortoPaisSelect(){const s=document.getElementById('portoPaisSelect');s.innerHTML='<option value="">Selecione o país...</option>';PORTOS_DESTINO.forEach(x=>{const o=document.createElement('option');o.value=x.pais;o.textContent=x.pais;s.appendChild(o);});}
function onPortoPaisChange(){const pais=document.getElementById('portoPaisSelect').value,s=document.getElementById('portoDestinoSelect');s.innerHTML='<option value="">Selecione o porto...</option>';s.disabled=!pais;if(!pais)return;const f=PORTOS_DESTINO.find(x=>x.pais===pais);if(!f)return;f.portos.forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p;s.appendChild(o);});}
function onPortoDestinoChange(){const porto=document.getElementById('portoDestinoSelect').value,pais=document.getElementById('portoPaisSelect').value;if(!porto){limparPortoChegada();return;}currentPortoChegada=porto;document.getElementById('portoChegadaDisplay').textContent=porto+', '+pais;document.getElementById('portoChegadaSelected').classList.remove('hidden');updateSummary();updateResumoInfoBoxes();updatePriceBadge();}
function limparPortoChegada(){currentPortoChegada='';document.getElementById('portoPaisSelect').value='';document.getElementById('portoDestinoSelect').value='';document.getElementById('portoDestinoSelect').disabled=true;document.getElementById('portoDestinoSelect').innerHTML='<option value="">Selecione o porto...</option>';document.getElementById('portoChegadaSelected').classList.add('hidden');updateSummary();updateResumoInfoBoxes();updatePriceBadge();}

// Quadros de frete / embarque / destino no Resumo
function updateResumoInfoBoxes(){
  const isMar=currentFrete==='maritimo';
  document.getElementById('resumoFreteVal').textContent=isMar?'Marítimo':'Rodoviário';
  const embarqueVal=isMar?currentPorto:'Criciúma — SC';
  document.getElementById('resumoEmbarqueLabel').textContent=isMar?'Porto de embarque':'Cidade de embarque';
  document.getElementById('resumoPortoEmbarqueVal').textContent=embarqueVal;
  document.getElementById('resumoPortoEmbarque').style.display=embarqueVal?'':'none';
  document.getElementById('resumoDestinoLabel').textContent=isMar?'Porto de destino':'Cidade de destino';
  document.getElementById('resumoPortoDestinoVal').textContent=currentPortoChegada;
  document.getElementById('resumoPortoDestino').style.display=currentPortoChegada?'':'none';
}
function updatePriceBadge(){
  const isMar=currentFrete==='maritimo';
  const partes=[currentPrice,isMar?'Marítimo':'Rodoviário'];
  if(isMar&&currentPorto)partes.push(currentPorto);
  if(!isMar)partes.push('Criciúma');
  let b=partes.join(' / ');
  if(currentPortoChegada)b+=' → '+currentPortoChegada;
  document.getElementById('priceBadge').textContent=b;
}

// CLIENTE: id do campo no formulário -> nome do campo na planilha
const CLIENTE_CAMPOS={cNome:'nome',cRut:'rut',cEndereco:'endereco',cComplemento:'complemento',cProvincia:'provincia',cCidade:'cidade',cPais:'pais',cCep:'cep',cContato:'contato',cTelefone:'telefone',cEmail:'email'};
function lerClienteForm(){const c={};Object.keys(CLIENTE_CAMPOS).forEach(k=>{c[CLIENTE_CAMPOS[k]]=document.getElementById(k).value;});c.nome=c.nome.trim();return c;}
function preencherClienteForm(c){Object.keys(CLIENTE_CAMPOS).forEach(k=>{document.getElementById(k).value=c?(c[CLIENTE_CAMPOS[k]]||''):'';});}

function showClientDropdown(q){const dd=document.getElementById('clientDropdown');const m=q?CLIENTS.filter(c=>(c.nome||'').toLowerCase().includes(q)||(c.id||'').toLowerCase().includes(q)||(c.pais||'').toLowerCase().includes(q)):CLIENTS;if(!m.length){dd.classList.add('hidden');return;}dd.innerHTML=m.map(c=>`<div class="autocomplete-item" onclick="selectClient('${esc(c.id)}')"><strong>${esc(c.nome)}</strong><small>${esc([c.id,c.pais,c.cidade].filter(Boolean).join(', '))}</small></div>`).join('');dd.classList.remove('hidden');}
document.getElementById('clientSearch').addEventListener('focus',function(){showClientDropdown(this.value.toLowerCase().trim());});
document.getElementById('clientSearch').addEventListener('input',function(){showClientDropdown(this.value.toLowerCase().trim());});
document.addEventListener('click',e=>{if(!e.target.closest('.autocomplete-wrap'))document.getElementById('clientDropdown').classList.add('hidden');});
function selectClient(id){const c=CLIENTS.find(x=>x.id===id);if(!c)return;selectedClientId=id;document.getElementById('clientSearch').value=c.nome;document.getElementById('clientDropdown').classList.add('hidden');preencherClienteForm(c);document.getElementById('clientBadge').textContent=c.pais||'';document.getElementById('btnUpdateClient').style.display='';}
function updateClient(){
  const id=selectedClientId;if(!id){showToast('Nenhum cliente selecionado','error');return;}
  const c={id,...lerClienteForm()};if(!c.nome){showToast('Informe o nome do cliente','error');return;}
  const btn=document.getElementById('btnUpdateClient');btn.disabled=true;btn.textContent='Salvando...';
  const fim=()=>{btn.disabled=false;btn.textContent='Atualizar cadastro';};
  google.script.run.withSuccessHandler(r=>{const d=JSON.parse(r);fim();if(d.success){const idx=CLIENTS.findIndex(x=>x.id===id);if(idx>=0)CLIENTS[idx]={...CLIENTS[idx],...c};document.getElementById('clientBadge').textContent=c.pais||'';showToast('Cadastro atualizado','success');}else showToast('Erro: '+d.error,'error');})
    .withFailureHandler(e=>{fim();showToast('Erro: '+e.message,'error');}).atualizarCliente(JSON.stringify(c));
}
function saveNewClient(){
  const c=lerClienteForm();if(!c.nome){showToast('Informe o nome do cliente','error');return;}
  showToast('Salvando cliente...','');
  google.script.run.withSuccessHandler(r=>{const d=JSON.parse(r);if(d.success){c.id=d.id;CLIENTS.push(c);selectedClientId=d.id;document.getElementById('clientSearch').value=c.nome;document.getElementById('clientBadge').textContent=c.pais||'';showToast('Cliente salvo. ID: '+d.id,'success');}else showToast('Erro: '+d.error,'error');})
    .withFailureHandler(e=>showToast('Erro: '+e.message,'error')).salvarCliente(JSON.stringify(c));
}


// PREÇO + PORTO EMBARQUE
function setFrete(tipo){
  currentFrete=tipo;
  document.getElementById('btnMaritimo').classList.toggle('active',tipo==='maritimo');
  document.getElementById('btnRodoviario').classList.toggle('active',tipo==='rodoviario');
  document.getElementById('freteMaritimo').style.display=tipo==='maritimo'?'':'none';
  document.getElementById('freteRodoviario').style.display=tipo==='rodoviario'?'':'none';
  // Limpar seleções ao trocar
  if(tipo==='rodoviario'){
    if(currentPorto){const b=document.getElementById('porto-'+currentPorto);if(b)b.classList.remove('active','active-itapoa');}
    currentPorto='';itapoaAcrescimo=false;
    document.getElementById('itapoaWrap').classList.add('hidden');
    limparPortoChegada();
    rodPopulatePaises();
  } else {
    limparRodChegada();
  }
  items.forEach(it=>recalcItem(it.uid));updateSummary();updateResumoInfoBoxes();updatePriceBadge();
}

function rodPopulatePaises(){
  const sel=document.getElementById('rodPaisSelect');
  const paises=[...new Set(CLIENTS.map(c=>(c.pais||'').trim()).filter(Boolean))].sort();
  sel.innerHTML='<option value="">Selecione o país...</option>'+paises.map(p=>`<option value="${p}">${p}</option>`).join('');
  document.getElementById('rodCidadeSelect').innerHTML='<option value="">Selecione a cidade...</option>';
  document.getElementById('rodCidadeSelect').disabled=true;
}

function onRodPaisChange(){
  const pais=document.getElementById('rodPaisSelect').value;
  const sel=document.getElementById('rodCidadeSelect');
  sel.innerHTML='<option value="">Selecione a cidade...</option>';
  sel.disabled=!pais;
  if(!pais)return;
  const cidades=[...new Set(CLIENTS.filter(c=>(c.pais||'').trim()===pais).map(c=>(c.cidade||'').trim()).filter(Boolean))].sort();
  cidades.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
}

function onRodCidadeChange(){
  const cidade=document.getElementById('rodCidadeSelect').value;
  const pais=document.getElementById('rodPaisSelect').value;
  if(!cidade){limparRodChegada();return;}
  currentPortoChegada=cidade+', '+pais;
  document.getElementById('rodChegadaDisplay').textContent=cidade+' · '+pais;
  document.getElementById('rodChegadaSelected').classList.remove('hidden');
  updateSummary();updateResumoInfoBoxes();updatePriceBadge();
}

function limparRodChegada(){
  currentPortoChegada='';
  const ps=document.getElementById('rodPaisSelect');
  const cs=document.getElementById('rodCidadeSelect');
  if(ps)ps.value='';
  if(cs){cs.value='';cs.disabled=true;cs.innerHTML='<option value="">Selecione a cidade...</option>';}
  const sel=document.getElementById('rodChegadaSelected');
  if(sel)sel.classList.add('hidden');
  updateSummary();updateResumoInfoBoxes();updatePriceBadge();
}
function setPrice(t){
  currentPrice=t;
  document.getElementById('btnFOB').classList.toggle('active',t==='FOB');
  document.getElementById('btnEXW').classList.toggle('active',t==='EXW');
  const pg=document.getElementById('portoGrid'),em=document.getElementById('portoExwMsg');
  if(t==='EXW'){pg.classList.add('disabled');if(em)em.style.display='block';if(currentPorto){const b=document.getElementById('porto-'+currentPorto);if(b)b.classList.remove('active','active-itapoa');}currentPorto='';document.getElementById('itapoaWrap').classList.add('hidden');itapoaAcrescimo=false;}
  else{pg.classList.remove('disabled');if(em)em.style.display='none';}
  items.forEach(it=>recalcItem(it.uid));updateSummary();updateResumoInfoBoxes();updatePriceBadge();
}
function selectPorto(p){
  if(currentPorto){const b=document.getElementById('porto-'+currentPorto);if(b)b.classList.remove('active','active-itapoa');}
  if(currentPorto===p){currentPorto='';document.getElementById('itapoaWrap').classList.add('hidden');itapoaAcrescimo=false;items.forEach(it=>recalcItem(it.uid));updateSummary();updateResumoInfoBoxes();updatePriceBadge();return;}
  currentPorto=p;const btn=document.getElementById('porto-'+p);
  if(p==='Itapoá'){btn.classList.add('active-itapoa');document.getElementById('itapoaWrap').classList.remove('hidden');document.getElementById('itapoaToggle').checked=true;itapoaAcrescimo=true;}
  else{btn.classList.add('active');document.getElementById('itapoaWrap').classList.add('hidden');itapoaAcrescimo=false;}
  items.forEach(it=>recalcItem(it.uid));updateSummary();updateResumoInfoBoxes();updatePriceBadge();
}
function onItapoaToggle(){itapoaAcrescimo=document.getElementById('itapoaToggle').checked;items.forEach(it=>recalcItem(it.uid));updateSummary();}

// DESCONTO
function getSubtotal(){return items.filter(i=>i.produto).reduce((a,b)=>a+(b.valorTotal||0),0);}
function onDescontoPercInput(){const p=parseFloat(document.getElementById('descontoPerc').value)||0;document.getElementById('descontoValor').value=p>0?(getSubtotal()*p/100).toFixed(2):'';updateDescontoPreview();updateSummary();}
function onDescontoValorInput(){const v=parseFloat(document.getElementById('descontoValor').value)||0,s=getSubtotal();document.getElementById('descontoPerc').value=v>0&&s>0?(v/s*100).toFixed(2):'';updateDescontoPreview();updateSummary();}
function getDesconto(){return{perc:parseFloat(document.getElementById('descontoPerc').value)||0,valor:parseFloat(document.getElementById('descontoValor').value)||0};}
function updateDescontoPreview(){const sub=getSubtotal();const{perc,valor}=getDesconto();const prev=document.getElementById('descontoPreview'),badge=document.getElementById('descontoBadge');if(valor>0){prev.style.display='flex';document.getElementById('previewSubtotal').textContent='US$ '+fmtN(sub);document.getElementById('previewDesconto').textContent='− US$ '+fmtN(valor);document.getElementById('previewTotal').textContent='US$ '+fmtN(sub-valor);badge.textContent='− US$ '+fmtN(valor)+(perc>0?' ('+fmtN(perc)+'%)':'');badge.style.color='var(--danger)';}else{prev.style.display='none';badge.textContent='Nenhum';badge.style.color='';}}

// Retorna o conjunto de dados correto do produto (padrão ou europallet)
function getProdData(prod, isEuro, camada) {
  const c2 = camada === 2;
  if (!isEuro) {
    return {
      preco_fob:         prod.preco_fob,
      preco_exw:         prod.preco_exw,
      cx_sqmt:           prod.cx_sqmt,
      cx_peso:           prod.cx_peso,
      pallet_caixas:     c2 ? (prod.pallet_caixas_2||prod.pallet_caixas) : prod.pallet_caixas,
      pallet_sqmt:       c2 ? (prod.pallet_sqmt_2||prod.pallet_sqmt) : prod.pallet_sqmt,
      pallet_peso:       c2 ? (prod.pallet_peso_2||prod.pallet_peso) : prod.pallet_peso,
      container_sqmt:    c2 ? (prod.container_sqmt_2||prod.container_sqmt) : prod.container_sqmt,
      container_peso:    prod.container_peso,
      container_caixas:  c2 ? (prod.container_caixas_2||prod.container_caixas) : prod.container_caixas,
      container_pallets: c2 ? (prod.container_pallets_2||prod.container_pallets) : prod.container_pallets,
    };
  }
  // EUROPALLET: usa preço NORMAL + acréscimo configurável (aplicado em recalcItem)
  // As demais colunas (m², peso, caixas, pallets) continuam usando dados europallet
  return {
    preco_fob:         prod.preco_fob,
    preco_exw:         prod.preco_exw,
    cx_sqmt:           prod.euro_cx_sqmt,
    cx_peso:           prod.euro_cx_peso,
    pallet_caixas:     c2 ? (prod.euro_pallet_caixas_2||prod.euro_pallet_caixas) : prod.euro_pallet_caixas,
    pallet_sqmt:       c2 ? (prod.euro_pallet_sqmt_2||prod.euro_pallet_sqmt) : prod.euro_pallet_sqmt,
    pallet_peso:       c2 ? (prod.euro_pallet_peso_2||prod.euro_pallet_peso) : prod.euro_pallet_peso,
    container_sqmt:    c2 ? (prod.euro_container_sqmt_2||prod.euro_container_sqmt) : prod.euro_container_sqmt,
    container_peso:    prod.euro_container_peso,
    container_caixas:  c2 ? (prod.euro_container_caixas_2||prod.euro_container_caixas) : prod.euro_container_caixas,
    container_pallets: c2 ? (prod.euro_container_pallets_2||prod.euro_container_pallets) : prod.euro_container_pallets,
  };
}

// Um produto tem opção de 2 camadas quando o valor "_2" existir e for
// diferente do valor padrão (1 camada) — senão a célula não tinha "/".
function temOpcaoCamadas(prod, isEuro) {
  if (!prod) return false;
  const a = isEuro ? prod.euro_pallet_caixas : prod.pallet_caixas;
  const b = isEuro ? prod.euro_pallet_caixas_2 : prod.pallet_caixas_2;
  return !!(b && b !== a);
}

// Container real: soma a configuração de 1 camada + 2 camadas (quando existir
// a segunda). Se não existir, usa só o valor único normalmente.
function getContainerTotais(prod, isEuro) {
  if (!prod) return { sqmt: 0, caixas: 0, pallets: 0 };
  const p = isEuro ? 'euro_' : '';
  const sqmt1 = prod[p+'container_sqmt'] || 0;
  const sqmt2 = prod[p+'container_sqmt_2'] || 0;
  const cx1   = prod[p+'container_caixas'] || 0;
  const cx2   = prod[p+'container_caixas_2'] || 0;
  const pal1  = prod[p+'container_pallets'] || 0;
  const pal2  = prod[p+'container_pallets_2'] || 0;
  const temSegunda = temOpcaoCamadas(prod, isEuro);
  return {
    sqmt: temSegunda ? sqmt1+sqmt2 : sqmt1,
    caixas: temSegunda ? cx1+cx2 : cx1,
    pallets: temSegunda ? pal1+pal2 : pal1
  };
}

// ITENS DO PEDIDO (cada item é identificado por um uid fixo)
function _uid(){return'uid'+Math.random().toString(36).slice(2,9);}

function addItem(){
  const uid=_uid();
  items.push({uid,produto:null,unidade:'PALLET',quantidade:1,europallet:false});
  renderItem(uid);
  updateItemsBadge();
}

function removeItem(cardEl){
  if(items.length<=1){showToast('Mantenha pelo menos 1 item','error');return;}
  const uid=cardEl.getAttribute('data-uid');
  items=items.filter(it=>it.uid!==uid);
  cardEl.remove();
  // Atualiza só o número visual dos cards restantes
  document.getElementById('itemsList').querySelectorAll('.item-card').forEach((card,i)=>{
    const numEl=card.querySelector('.item-num');
    if(numEl)numEl.textContent=i+1;
  });
  updateSummary();
  updateItemsBadge();
  updateEuropalletOpt();
}

function getItem(uid){return items.find(it=>it.uid===uid);}
function setItem(uid,patch){const i=items.findIndex(it=>it.uid===uid);if(i>=0)items[i]={...items[i],...patch};}

function renderItem(uid){
  const formatos=[...new Set(PRODUCTS.map(p=>(p.formato||'').trim()).filter(Boolean))].sort();
  const div=document.createElement('div');
  div.className='item-card';
  div.setAttribute('data-uid',uid);
  const num=items.findIndex(it=>it.uid===uid)+1;
  div.innerHTML=`<div class="item-header">
    <div class="item-num">${num}</div>
    <div class="item-name" id="iname-${uid}">—</div>
    <button class="btn btn-sm btn-danger btn-icon" onclick="removeItem(this.closest('.item-card'))" title="Remover item" aria-label="Remover item">🗑️</button>
  </div>
  <div class="grid grid-3">
    <div><label for="formato-${uid}">Formato</label><select id="formato-${uid}" onchange="onFormatoChange('${uid}')"><option value="">Selecione...</option>${formatos.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select></div>
    <div><label for="nome-${uid}">Produto</label><select id="nome-${uid}" onchange="onNomeChange('${uid}')" disabled><option value="">Selecione o formato primeiro</option></select></div>
    <div><label for="codigo-input-${uid}">Código</label><div class="autocomplete-wrap"><input type="text" id="codigo-input-${uid}" placeholder="Buscar por código ou nome" autocomplete="off" oninput="onCodigoInput('${uid}')" onblur="hideCodigoDropdown('${uid}',300)"><div class="autocomplete-list hidden" id="codigo-dropdown-${uid}"></div></div></div>
  </div>
  <div class="grid grid-3 mt-12">
    <div><label for="unidade-${uid}">Unidade</label><select id="unidade-${uid}" onchange="onUnidadeChange('${uid}')"><option value="PALLET">Pallets</option><option value="CONTAINER">Container</option></select></div>
    <div><label for="qtd-${uid}">Quantidade</label><input type="number" id="qtd-${uid}" min="1" value="1" oninput="recalcItem('${uid}');updateSummary();"></div>
    <div><label>Tipo de pallet</label>
      <div class="europallet-row" id="euro-row-${uid}" onclick="toggleEuropallet('${uid}')">
        <input type="checkbox" id="euro-${uid}">
        <div class="euro-box" id="euro-box-${uid}"></div>
        <span>Europallet</span>
        <span class="europallet-badge" id="euro-badge-${uid}">pallet padrão</span>
      </div>
    </div>
  </div>
  <div class="mt-12 hidden" id="camadas-row-${uid}">
    <label>Camadas por pallet (este produto tem 2 configurações; escolha a usada no carregamento)</label>
    <div class="price-toggle">
      <button type="button" class="price-btn active" id="camada-btn-1-${uid}" onclick="setCamada('${uid}',1)">1 camada</button>
      <button type="button" class="price-btn" id="camada-btn-2-${uid}" onclick="setCamada('${uid}',2)">2 camadas</button>
    </div>
  </div>
  <div class="item-results" id="item-results-${uid}">
    <div class="result-box"><label id="r-sqmt-label-${uid}">Qtd total (m²)</label><div class="val" id="r-sqmt-${uid}">—</div></div>
    <div class="result-box"><label>Caixas</label><div class="val" id="r-caixas-${uid}">—</div></div>
    <div class="result-box"><label>Pallets</label><div class="val" id="r-pallets-${uid}">—</div></div>
    <div class="result-box"><label>Containers</label><div class="val" id="r-containers-${uid}">—</div></div>
    <div class="result-box"><label>Peso total (kg)</label><div class="val" id="r-weight-${uid}">—</div></div>
    <div class="result-box editavel"><label for="r-price-${uid}"><span>Preço unit. (editável)</span><button type="button" class="link-btn" id="r-price-reset-${uid}" onclick="resetPrice('${uid}')" style="display:none;">restaurar</button></label><input type="number" id="r-price-${uid}" step="0.01" min="0" placeholder="0.00" oninput="onPriceEdit('${uid}')"></div>
    <div class="result-box highlight"><label>Valor total</label><div class="val" id="r-total-${uid}">—</div></div>
  </div>`;
  document.getElementById('itemsList').appendChild(div);
}

function onFormatoChange(uid){
  const f=document.getElementById('formato-'+uid).value,s=document.getElementById('nome-'+uid);
  s.disabled=!f;
  s.innerHTML='<option value="">Selecione o nome...</option>';
  if(!f)return;
  PRODUCTS.filter(p=>(p.formato||'').trim()===f.trim()).forEach(p=>{
    const o=document.createElement('option');o.value=p.codigo;o.textContent=p.nome||p.codigo;s.appendChild(o);
  });
  const it=getItem(uid);
  if(it&&!it._restoringFromEdit){setItem(uid,{produto:null});clearItemResults(uid);}
}

function onNomeChange(uid){
  const c=document.getElementById('nome-'+uid).value;if(!c)return;
  const p=PRODUCTS.find(x=>String(x.codigo)===String(c));if(!p)return;
  setItem(uid,{produto:p});
  document.getElementById('codigo-input-'+uid).value=p.codigo;
  document.getElementById('iname-'+uid).textContent=p.nome+' · '+p.formato;
  const pi=document.getElementById('r-price-'+uid);
  if(pi){pi._manuallyEdited=false;pi._basePrice=undefined;}
  recalcItem(uid);updateSummary();
}

function onCodigoInput(uid){
  const v=document.getElementById('codigo-input-'+uid).value.trim(),dd=document.getElementById('codigo-dropdown-'+uid);
  if(!v){dd.classList.add('hidden');return;}
  const m=PRODUCTS.filter(p=>String(p.codigo).includes(v)||p.nome.toLowerCase().includes(v.toLowerCase())).slice(0,8);
  if(!m.length){dd.classList.add('hidden');return;}
  const it=getItem(uid);const isEuro=it&&it.europallet||false;
  dd.innerHTML=m.map(p=>{
    const d=getProdData(p,isEuro);
    return`<div class="autocomplete-item" onmousedown="selectProdByCodigo('${uid}','${esc(p.codigo)}')"><strong>${esc(p.codigo)} — ${esc(p.nome)}</strong><small>${esc(p.formato)}, ${currentPrice==='FOB'?'FOB US$ '+d.preco_fob:'EXW US$ '+d.preco_exw}${isEuro?', europallet':''}</small></div>`;
  }).join('');
  dd.classList.remove('hidden');
}

function hideCodigoDropdown(uid,delay){setTimeout(()=>document.getElementById('codigo-dropdown-'+uid)?.classList.add('hidden'),delay);}

function selectProdByCodigo(uid,codigo){
  const p=PRODUCTS.find(x=>String(x.codigo)===String(codigo));if(!p)return;
  setItem(uid,{produto:p,_restoringFromEdit:true});
  document.getElementById('codigo-input-'+uid).value=p.codigo;
  document.getElementById('codigo-dropdown-'+uid).classList.add('hidden');
  const pi=document.getElementById('r-price-'+uid);
  if(pi){pi._manuallyEdited=false;pi._basePrice=undefined;}
  const fs=document.getElementById('formato-'+uid);if(fs)fs.value=p.formato;
  onFormatoChange(uid);
  setTimeout(()=>{
    setItem(uid,{_restoringFromEdit:false});
    const ns=document.getElementById('nome-'+uid);if(ns)ns.value=p.codigo;
    document.getElementById('iname-'+uid).textContent=p.nome+' · '+p.formato;
    recalcItem(uid);updateSummary();
  },50);
}

function updateEuropalletOpt(){const h=items.some(i=>i.europallet),l=document.getElementById('opt-euro-label'),cb=document.getElementById('opt-euro');l.style.opacity=h?'1':'.4';l.style.pointerEvents=h?'auto':'none';cb.disabled=!h;}

function toggleEuropallet(uid){
  const cb=document.getElementById('euro-'+uid),row=document.getElementById('euro-row-'+uid);
  cb.checked=!cb.checked;
  row.classList.toggle('checked',cb.checked);
  setItem(uid,{europallet:cb.checked});
  const badge=document.getElementById('euro-badge-'+uid);
  if(badge)badge.textContent=cb.checked?'europallet':'pallet padrão';
  const pi=document.getElementById('r-price-'+uid);
  if(pi){pi._manuallyEdited=false;pi._basePrice=undefined;const rb=document.getElementById('r-price-reset-'+uid);if(rb)rb.style.display='none';}
  recalcItem(uid);updateSummary();updateEuropalletOpt();
}

function onUnidadeChange(uid){setItem(uid,{unidade:document.getElementById('unidade-'+uid).value});recalcItem(uid);updateSummary();}

function onPriceEdit(uid){
  const pi=document.getElementById('r-price-'+uid);
  const iB=(currentPorto==='Itapoá'&&itapoaAcrescimo)?0.10:0;
  const typed=parseFloat(pi.value)||0;
  pi._basePrice=typed-iB;pi._manuallyEdited=true;
  const rb=document.getElementById('r-price-reset-'+uid);if(rb)rb.style.display='inline';
  const it=getItem(uid);if(!it||!it.produto)return;
  const vt=(it.sqmt||0)*typed;
  setItem(uid,{priceUnit:typed,valorTotal:vt});
  document.getElementById('r-total-'+uid).textContent='US$ '+fmtN(vt);
  updateSummary();
}

function resetPrice(uid){
  const pi=document.getElementById('r-price-'+uid);
  pi._manuallyEdited=false;pi._basePrice=undefined;
  const rb=document.getElementById('r-price-reset-'+uid);if(rb)rb.style.display='none';
  recalcItem(uid);updateSummary();
}

function setCamada(uid,valor){
  setItem(uid,{camada:valor});
  document.getElementById('camada-btn-1-'+uid)?.classList.toggle('active',valor===1);
  document.getElementById('camada-btn-2-'+uid)?.classList.toggle('active',valor===2);
  recalcItem(uid);updateSummary();
}

function atualizarVisibilidadeCamadas(uid){
  const it=getItem(uid);if(!it||!it.produto)return;
  const row=document.getElementById('camadas-row-'+uid);if(!row)return;
  const isEuro=document.getElementById('euro-'+uid)?.checked||it.europallet||false;
  const und=document.getElementById('unidade-'+uid)?.value||it.unidade||'M2';
  const disponivel=temOpcaoCamadas(it.produto,isEuro)&&und==='PALLET';
  row.classList.toggle('hidden',!disponivel);
  if(!disponivel&&it.camada){setItem(uid,{camada:1});}
}

function recalcItem(uid){
  const item=getItem(uid);if(!item||!item.produto)return;
  const prod=item.produto;
  const und=document.getElementById('unidade-'+uid)?.value||item.unidade||'M2';
  const qtd=parseFloat(document.getElementById('qtd-'+uid)?.value)||0;
  const isEuro=document.getElementById('euro-'+uid)?.checked||item.europallet||false;
  atualizarVisibilidadeCamadas(uid);
  const camada=item.camada||1;
  const pi=document.getElementById('r-price-'+uid);
  const iB=(currentPorto==='Itapoá'&&itapoaAcrescimo)?CFG_ITAPOA:0;
  const euroB=isEuro?CFG_EUROPALLET:0;
  const d=getProdData(prod,isEuro,camada);
  const tbBase=(currentPrice==='FOB'?d.preco_fob:d.preco_exw)+euroB;
  if(pi){
    if(!pi._manuallyEdited){pi._basePrice=tbBase;pi.value=(tbBase+iB).toFixed(2);}
    else{const base=pi._basePrice!==undefined?pi._basePrice:tbBase;pi.value=(base+iB).toFixed(2);}
  }
  const pu=parseFloat(pi?pi.value:tbBase+iB)||0;
  let sqmt=0,peso=0,caixas=0,pallets=0,containers=0;
  if(und==='M2'){sqmt=qtd;const cxM2=d.cx_sqmt||1;caixas=cxM2>0?qtd/cxM2:0;peso=caixas*(d.cx_peso||0);pallets=d.pallet_caixas&&d.pallet_caixas>0?caixas/d.pallet_caixas:0;containers=d.container_pallets&&d.container_pallets>0?pallets/d.container_pallets:0;}
  else if(und==='CAIXA'){caixas=qtd;sqmt=qtd*(d.cx_sqmt||0);peso=qtd*(d.cx_peso||0);pallets=d.pallet_caixas&&d.pallet_caixas>0?qtd/d.pallet_caixas:0;containers=d.container_pallets&&d.container_pallets>0?pallets/d.container_pallets:0;}
  else if(und==='PALLET'){sqmt=qtd*(d.pallet_sqmt||0);peso=qtd*(d.pallet_peso||0);caixas=qtd*(d.pallet_caixas||0);pallets=qtd;containers=d.container_pallets&&d.container_pallets>0?qtd/d.container_pallets:0;}
  else if(und==='CONTAINER'){
    // Container: soma as duas configurações (1 e 2 camadas) quando existirem,
    // já que um container real mistura as duas — não depende do seletor de camadas.
    const ct=getContainerTotais(prod,isEuro);
    sqmt=qtd*ct.sqmt;peso=qtd*(d.container_peso||0);caixas=qtd*ct.caixas;pallets=qtd*ct.pallets;containers=qtd;
  }
  const vt=sqmt*pu;
  setItem(uid,{unidade:und,quantidade:qtd,europallet:isEuro,sqmt,peso,caixas,pallets,containers,priceUnit:pu,valorTotal:vt});
  const sqmtLabel=document.getElementById('r-sqmt-label-'+uid);if(sqmtLabel)sqmtLabel.textContent=und==='M2'?'Qtd Total (m²)':'Total m²';
  const rSqmt=document.getElementById('r-sqmt-'+uid);if(rSqmt)rSqmt.textContent=fmtN(sqmt)+' m²';
  const rTotal=document.getElementById('r-total-'+uid);if(rTotal)rTotal.textContent='US$ '+fmtN(vt);
  const rWeight=document.getElementById('r-weight-'+uid);if(rWeight)rWeight.textContent=fmtN(peso)+' kg';
  const rCaixas=document.getElementById('r-caixas-'+uid);if(rCaixas)rCaixas.textContent=fmtN(caixas);
  const rPallets=document.getElementById('r-pallets-'+uid);if(rPallets)rPallets.textContent=fmtN(pallets);
  const rc=document.getElementById('r-containers-'+uid);if(rc)rc.textContent=fmtN(containers);
}

function clearItemResults(uid){
  ['sqmt','total','weight','caixas','pallets','containers'].forEach(f=>{const e=document.getElementById('r-'+f+'-'+uid);if(e)e.textContent='—';});
  const pi=document.getElementById('r-price-'+uid);if(pi){pi.value='';pi._manuallyEdited=false;pi._basePrice=undefined;}
  const nm=document.getElementById('iname-'+uid);if(nm)nm.textContent='—';
}
function updateItemsBadge(){document.getElementById('itemsBadge').textContent=items.length+(items.length===1?' item':' itens');}

function updateSummary(){
  const tbody=document.getElementById('summaryBody'),valid=items.filter(i=>i.produto);
  if(!valid.length){tbody.innerHTML='<tr><td colspan="11" class="vazio">Nenhum item adicionado</td></tr>';document.getElementById('totalSqmt').textContent='0,00 m²';document.getElementById('totalWeight').textContent='0,00 kg';document.getElementById('totalValue').textContent='US$ 0,00';document.getElementById('subtotalRow').style.display='none';document.getElementById('descontoRow').style.display='none';return;}
  let tS=0,tW=0,tV=0;
  tbody.innerHTML=items.map((it,i)=>{if(!it.produto)return'';tS+=it.sqmt||0;tW+=it.peso||0;tV+=it.valorTotal||0;return`<tr><td class="num">${i+1}</td><td>${esc(it.produto.formato)}</td><td>${esc(it.produto.nome)}</td><td class="code">${esc(it.produto.codigo)}</td><td>${it.unidade}</td><td class="num">${it.quantidade}</td><td class="num">${fmtN(it.sqmt)} m²</td><td class="num">US$ ${fmtN(it.priceUnit)}</td><td>${it.europallet?'Sim':'<span class="muted">—</span>'}</td><td class="num forte">US$ ${fmtN(it.valorTotal)}</td><td class="num">${fmtN(it.peso)} kg</td></tr>`;}).join('');
  const{perc,valor:desc}=getDesconto(),final=tV-desc;
  document.getElementById('totalSqmt').textContent=fmtN(tS)+' m²';document.getElementById('totalWeight').textContent=fmtN(tW)+' kg';document.getElementById('totalValue').textContent='US$ '+fmtN(final);
  if(desc>0){document.getElementById('subtotalRow').style.display='flex';document.getElementById('subtotalValue').textContent='US$ '+fmtN(tV);document.getElementById('descontoRow').style.display='flex';document.getElementById('descontoRowLabel').textContent='Desconto'+(perc>0?' ('+fmtN(perc)+'%)':'');document.getElementById('descontoRowValue').textContent='− US$ '+fmtN(desc);}
  else{document.getElementById('subtotalRow').style.display='none';document.getElementById('descontoRow').style.display='none';}
  updateDescontoPreview();updateResumoInfoBoxes();
}

// BUILD PEDIDO
function buildPedidoObj(){
  const valid=items.filter(i=>i.produto);const{perc,valor:desc}=getDesconto();const sub=valid.reduce((a,b)=>a+(b.valorTotal||0),0);
  const n=new Date(),pad=x=>String(x).padStart(2,'0');
  return{numero:document.getElementById('orderNumDisplay').textContent,cliente:{id:selectedClientId||'',...lerClienteForm()},tabela_preco:currentPrice,frete:currentFrete,porto_destino:currentFrete==='maritimo'?currentPorto:'Criciúma',porto_destino_chegada:currentPortoChegada,desconto_perc:perc,desconto_valor:desc,itens:valid.map((it,i)=>({item:i+1,linha:it.produto.linha||'',formato:it.produto.formato,nome:it.produto.nome,codigo:it.produto.codigo,imagem:it.produto.imagem||'',unidade:it.unidade,quantidade:it.quantidade,qtd_total:it.sqmt,total_caixas:it.caixas||0,total_pallets:it.pallets||0,preco_unitario:it.priceUnit,europallet:it.europallet,camadas:it.camada||1,valor_total:it.valorTotal,peso_total:it.peso})),valor_total:sub-desc,observacoes:document.getElementById('observacoes').value,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Sao_Paulo',data_hora_local:pad(n.getDate())+'/'+pad(n.getMonth()+1)+'/'+n.getFullYear()+' '+pad(n.getHours())+':'+pad(n.getMinutes()),opcoes:{exibir_preco:document.getElementById('opt-preco').checked,exibir_qtd:document.getElementById('opt-qtd').checked,exibir_euro:valid.some(i=>i.europallet)&&document.getElementById('opt-euro').checked,idioma:document.querySelector('input[name="pdfLang"]:checked')?.value||'pt'}};
}

// SALVAR
function submitOrder(){
  if(!document.getElementById('cNome').value.trim()){showToast('Informe os dados do cliente','error');return;}
  if(!items.filter(i=>i.produto).length){showToast('Adicione pelo menos 1 produto','error');return;}
  const pedido=buildPedidoObj();
  if(editMode){showToast('Salvando revisão...','');google.script.run.withSuccessHandler(r=>{const d=JSON.parse(r);if(d.success){pedido.numero=d.numero;savedPedido=pedido;document.getElementById('orderNumDisplay').textContent=d.numero;document.getElementById('btnPdf').disabled=false;showToast('Revisão salva: '+d.numero,'success');loadPedidos();}else showToast('Erro: '+d.error,'error');}).withFailureHandler(e=>showToast('Erro: '+e.message,'error')).atualizarPedido(JSON.stringify(pedido),editNumeroOriginal,editLinkPdfAntigo);}
  else{showToast('Salvando pedido...','');google.script.run.withSuccessHandler(r=>{const d=JSON.parse(r);if(d.success){pedido.numero=d.numero;savedPedido=pedido;document.getElementById('orderNumDisplay').textContent=d.numero;document.getElementById('btnPdf').disabled=false;showToast('Pedido salvo: '+d.numero,'success');loadPedidos();}else showToast('Erro: '+d.error,'error');}).withFailureHandler(e=>showToast('Erro: '+e.message,'error')).salvarPedido(JSON.stringify(pedido));}
}

// PDF (+ Excel opcional)
function exportPdf(){
  if(!savedPedido){showToast('Salve o pedido antes de exportar','error');return;}
  savedPedido.porto_destino_chegada=currentPortoChegada;
  savedPedido.opcoes={exibir_preco:document.getElementById('opt-preco').checked,exibir_qtd:document.getElementById('opt-qtd').checked,exibir_euro:items.filter(i=>i.produto).some(i=>i.europallet)&&document.getElementById('opt-euro').checked,idioma:document.querySelector('input[name="pdfLang"]:checked')?.value||'pt'};
  const btn=document.getElementById('btnPdf');btn.disabled=true;btn.textContent='Gerando PDF…';showToast('Gerando PDF...','');
  const wantExcel=document.getElementById('opt-excel')?.checked;
  google.script.run
    .withSuccessHandler(r=>{
      const d=JSON.parse(r);
      btn.disabled=false;btn.textContent='Exportar PDF';
      if(d.success){
        const box=document.getElementById('pdfResultBox');
        box.classList.remove('hidden');box.style.display='flex';
        document.getElementById('pdfFileName').textContent=d.nome;
        document.getElementById('pdfLink').href=d.url;
        const exRow=document.getElementById('excelResultRow');
        exRow.classList.add('hidden');exRow.style.display='none';
        showToast('PDF salvo no Drive!','success');
        loadPedidos();
        if(wantExcel){
          showToast('Gerando Excel...','');
          google.script.run
            .withSuccessHandler(rx=>{
              const dx=JSON.parse(rx);
              if(dx.success){
                exRow.classList.remove('hidden');exRow.style.display='flex';
                document.getElementById('excelFileName').textContent=dx.nome;
                document.getElementById('excelLink').href=dx.url;
                showToast('Excel salvo no Drive!','success');
              }else showToast('Erro Excel: '+dx.error,'error');
            })
            .withFailureHandler(e=>showToast('Erro Excel: '+e.message,'error'))
            .gerarExcelESalvar(JSON.stringify(savedPedido));
        }
      }else showToast('Erro no PDF: '+d.error,'error');
    })
    .withFailureHandler(e=>{btn.disabled=false;btn.textContent='Exportar PDF';showToast('Erro: '+e.message,'error');})
    .gerarPdfESalvar(JSON.stringify(savedPedido));
}

// LIMPAR
function clearOrder(){abrirModal('modalLimpar');}
function resetFormNovoPedido(){
  items=[];savedPedido=null;selectedClientId=null;editMode=false;editNumeroOriginal='';editLinkPdfAntigo='';currentPorto='';currentPortoChegada='';itapoaAcrescimo=true;currentFrete='maritimo';setFrete('maritimo');
  preencherClienteForm(null);
  document.getElementById('clientSearch').value='';document.getElementById('clientBadge').textContent='—';document.getElementById('btnUpdateClient').style.display='none';document.getElementById('observacoes').value='';
  document.getElementById('descontoPerc').value='';document.getElementById('descontoValor').value='';document.getElementById('descontoPreview').style.display='none';document.getElementById('descontoBadge').textContent='Nenhum';document.getElementById('descontoBadge').style.color='';
  ['Imbituba','Itajaí','Navegantes','Itapoá'].forEach(p=>{const b=document.getElementById('porto-'+p);if(b)b.classList.remove('active','active-itapoa');});
  document.getElementById('itapoaWrap').classList.add('hidden');document.getElementById('portoGrid').classList.remove('disabled');const em=document.getElementById('portoExwMsg');if(em)em.style.display='none';
  document.getElementById('btnFOB').classList.add('active');document.getElementById('btnEXW').classList.remove('active');currentPrice='FOB';
  limparPortoChegada();document.getElementById('itemsList').innerHTML='';document.getElementById('btnPdf').disabled=true;document.getElementById('btnPdf').textContent='Exportar PDF';document.getElementById('pdfResultBox').classList.add('hidden');
  document.getElementById('editBanner').classList.add('hidden');document.getElementById('btnSalvar').textContent='Salvar pedido';
  updateResumoInfoBoxes();updatePriceBadge();document.getElementById('priceBadge').textContent='—';
}

function iniciarEdicao(numero){
  showToast('Carregando pedido...','');
  google.script.run.withSuccessHandler(r=>{
    const d=JSON.parse(r);if(!d.success){showToast('Erro: '+d.error,'error');return;}
    const{itens,cliente,extra}=d,pedResumo=PEDIDOS.find(p=>p.numero===numero)||{};
    resetFormNovoPedido();editMode=true;editNumeroOriginal=numero;editLinkPdfAntigo=pedResumo.link_pdf||'';
    document.getElementById('editBanner').classList.remove('hidden');
    document.getElementById('editBannerTitle').textContent='Editando '+numero;
    document.getElementById('editBannerSub').textContent='As alterações serão salvas como uma revisão.';
    document.getElementById('btnSalvar').textContent='Salvar revisão';
    if(cliente){
      preencherClienteForm(cliente);
      document.getElementById('clientSearch').value=cliente.nome||'';
      document.getElementById('clientBadge').textContent=cliente.pais||'';
      selectedClientId=cliente.id||null;
    }
    if(extra){
      setPrice(extra.tabela_preco||'FOB');
      const freteRestaurado=(extra.frete==='rodoviario'||(extra.porto_destino==='Criciúma'&&!['Imbituba','Itajaí','Navegantes','Itapoá'].includes(extra.porto_destino)))?'rodoviario':'maritimo';
      setFrete(freteRestaurado);
      if(freteRestaurado==='maritimo'){
        if(extra.porto_destino)selectPorto(extra.porto_destino);
        if(extra.porto_destino_chegada){
          currentPortoChegada=extra.porto_destino_chegada;
          document.getElementById('portoChegadaDisplay').textContent=extra.porto_destino_chegada;
          document.getElementById('portoChegadaSelected').classList.remove('hidden');
          const pF=PORTOS_DESTINO.find(x=>x.portos.includes(extra.porto_destino_chegada));
          if(pF){document.getElementById('portoPaisSelect').value=pF.pais;onPortoPaisChange();setTimeout(()=>{document.getElementById('portoDestinoSelect').value=extra.porto_destino_chegada;},50);}
          updateResumoInfoBoxes();
        }
      } else {
        if(extra.porto_destino_chegada){
          currentPortoChegada=extra.porto_destino_chegada;
          document.getElementById('rodChegadaDisplay').textContent=extra.porto_destino_chegada;
          document.getElementById('rodChegadaSelected').classList.remove('hidden');
          updateResumoInfoBoxes();
        }
      }
      if(extra.desconto_perc>0){document.getElementById('descontoPerc').value=extra.desconto_perc;document.getElementById('descontoValor').value=extra.desconto_valor;}
      document.getElementById('observacoes').value=extra.observacoes||'';
    }
    items=[];document.getElementById('itemsList').innerHTML='';
    itens.forEach((it)=>{
      const mu=u=>{if(!u)return'M2';if(u==='CAMINHAO')return'CONTAINER';return u;};
      const und=mu(it.unidade);
      const isEuro=it.europallet===true||String(it.europallet).toUpperCase()==='SIM';
      const uid=_uid();
      items.push({uid,produto:null,unidade:und,quantidade:it.quantidade||1,europallet:isEuro});
      renderItem(uid);
      const p=PRODUCTS.find(x=>String(x.codigo)===String(it.codigo));
      if(p){
        setItem(uid,{produto:p,europallet:isEuro,_restoringFromEdit:true});
        if(isEuro){const cb=document.getElementById('euro-'+uid);if(cb)cb.checked=true;const row=document.getElementById('euro-row-'+uid);if(row)row.classList.add('checked');const badge=document.getElementById('euro-badge-'+uid);if(badge)badge.textContent='europallet';}
        const fs=document.getElementById('formato-'+uid);if(fs)fs.value=p.formato;
        onFormatoChange(uid);
        setTimeout(()=>{
          setItem(uid,{_restoringFromEdit:false,europallet:isEuro});
          const ns=document.getElementById('nome-'+uid);if(ns)ns.value=p.codigo;
          const ci=document.getElementById('codigo-input-'+uid);if(ci)ci.value=p.codigo;
          const nm=document.getElementById('iname-'+uid);if(nm)nm.textContent=p.nome+' · '+p.formato;
          const us=document.getElementById('unidade-'+uid);if(us)us.value=und;
          const qs=document.getElementById('qtd-'+uid);if(qs)qs.value=it.quantidade||1;
          if(isEuro){const cb=document.getElementById('euro-'+uid);if(cb)cb.checked=true;const row=document.getElementById('euro-row-'+uid);if(row)row.classList.add('checked');const badge=document.getElementById('euro-badge-'+uid);if(badge)badge.textContent='europallet';}
          const pi=document.getElementById('r-price-'+uid);
          if(pi){pi._manuallyEdited=true;const iB=(extra&&extra.porto_destino==='Itapoá')?0.10:0;pi._basePrice=it.preco_unitario-iB;pi.value=it.preco_unitario.toFixed(2);const rb=document.getElementById('r-price-reset-'+uid);if(rb)rb.style.display='inline';}
          recalcItem(uid);
        },80);
      }
    });
    updateItemsBadge();
    setTimeout(()=>{updateSummary();updateEuropalletOpt();updateDescontoPreview();},250);
    switchTab('novo');
    window.scrollTo({top:0,behavior:'smooth'});
    showToast('Pedido carregado para edição','warn');
  }).withFailureHandler(e=>showToast('Erro: '+e.message,'error')).getItensPedido(numero);
}

function cancelarEdicao(){abrirModal('modalCancelarEdicao');}
