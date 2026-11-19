// ============================================================
// ABA CATÁLOGO PDF: opções, capa e lista de produtos
// (a geração do PDF fica em catalogo-pdf.js)
// ============================================================
let catSelecionados = [];
let catCfgLoaded    = false;
let _catFiles       = {};
let catMainLang     = 'pt';
let catLocalUsoData = {};
let _catLastBlobUrl = null;

// Botões de opção do catálogo usam a classe .active como "ligado"
function _isOn(id){return !!document.getElementById(id)?.classList.contains('active');}
function _getSelectedFotos(){const f=[];if(_isOn('catFoto1'))f.push(1);if(_isOn('catFoto2'))f.push(2);if(_isOn('catFoto3'))f.push(3);return f.length?f:[1];}

function catAbrirPdf(){
  if(_catLastBlobUrl)window.open(_catLastBlobUrl,'_blank');
  else showToast('Gere o PDF primeiro','error');
}
function catLimparSelecionados(){
  if(!catSelecionados.length)return;
  catSelecionados=[];catRenderSelecionados();showToast('Lista limpa','');
}
function catToggle_EuroPallet(){
  const btn=document.getElementById('catMostrarEuroPallet');
  btn.classList.toggle('active');
  const on=btn.classList.contains('active');
  document.getElementById('catEuroAdicionalWrap').style.display=on?'flex':'none';
  // Preencher com o valor já configurado em Configurações > Acréscimo Europallet
  if(on){const el=document.getElementById('catAdicionalEuro');if(!el.value||el.value==='0')el.value=CFG_EUROPALLET.toFixed(2);}
  catRenderSelecionados();
}
function catToggle_Preco(){const b=document.getElementById('catMostrarPreco');b.classList.toggle('active');document.getElementById('catPrecoOpts').style.display=b.classList.contains('active')?'block':'none';catRenderSelecionados();}

// IDIOMA: principal + secundários (o principal não pode ser secundário)
function catSetMainLang(lang,btn){
  catMainLang=lang;
  ['PT','ES','EN'].forEach(l=>{
    document.getElementById('catLangMain'+l)?.classList.remove('active');
    const s=document.getElementById('catLangSec_'+l.toLowerCase());
    if(s){s.style.display=l.toLowerCase()===lang?'none':'';if(l.toLowerCase()===lang)s.classList.remove('active');}
  });
  btn.classList.add('active');
}
function _getSecLangs(){return['pt','es','en'].filter(l=>l!==catMainLang&&_isOn('catLangSec_'+l));}

// INIT: carrega config da capa e descrições de "local de uso" uma vez
function catInit(){
  catPopulateFiltros();
  if(!catCfgLoaded){
    catCfgLoaded=true;
    google.script.run.withSuccessHandler(r=>{try{const d=JSON.parse(r);if(d.success)catAplicarCfg(d.data);}catch(e){console.error(e);}}).withFailureHandler(e=>console.error(e)).getCatalogoConfig();
    google.script.run.withSuccessHandler(r=>{try{const d=JSON.parse(r);if(d.success)catLocalUsoData=d.data;}catch(e){console.error(e);}}).withFailureHandler(e=>console.error('LocalUso:',e)).getLocalUsoDescricoes();
  }
  const el=document.getElementById('catAno');if(el&&!el.value)el.value=new Date().getFullYear();
  catRenderSelecionados();
}

// CAPA: id do campo nesta aba -> nome do campo na planilha
const CAT_CAPA_CAMPOS={catLogoFornUrl:'logo_fornecedor_url',catLogoAdUrl:'logo_ad_url',catCapaUrl:'capa_imagem_url',catTituloPt:'titulo_pt',catTituloEs:'titulo_es',catTituloEn:'titulo_en',catSiteUrl:'site_url'};
function catAplicarCfg(d){
  Object.keys(CAT_CAPA_CAMPOS).forEach(id=>{const el=document.getElementById(id);if(el&&d[CAT_CAPA_CAMPOS[id]])el.value=d[CAT_CAPA_CAMPOS[id]];});
}
function catSalvarConfig(){
  const cfg={};Object.keys(CAT_CAPA_CAMPOS).forEach(id=>{cfg[CAT_CAPA_CAMPOS[id]]=document.getElementById(id).value||'';});
  google.script.run.withSuccessHandler(r=>{const d=JSON.parse(r);showToast(d.success?'Padrão salvo':'Erro: '+d.error,d.success?'success':'error');})
    .withFailureHandler(e=>showToast('Erro: '+e.message,'error')).salvarCatalogoConfig(JSON.stringify(cfg));
}

// UPLOAD de imagem local (capa / logos)
function catHandleFile(input,key){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{_catFiles[key]=e.target.result;const prev=document.getElementById(key+'Preview');if(prev){prev.src=e.target.result;prev.style.display='';}const inp=document.getElementById(key+'Url');if(inp)inp.value='(arquivo local)';};reader.readAsDataURL(file);}

// BUSCA por código ou nome
function catBuscaInput(){const q=(document.getElementById('catBuscaCodigo')?.value||'').trim().toUpperCase();const dd=document.getElementById('cat-busca-dropdown');if(!q){dd.style.display='none';return;}const matches=PRODUCTS.filter(p=>(p.codigo&&p.codigo.toUpperCase().includes(q))||(p.nome&&p.nome.toUpperCase().includes(q))).slice(0,12);if(!matches.length){dd.style.display='none';return;}dd.innerHTML=matches.map(p=>`<div class="autocomplete-item" onclick="catSelFromDropdown('${esc(p.codigo)}')"><strong>${esc(p.codigo||'—')}</strong><small>${esc(p.nome||'')}, ${esc(p.formato||'')}</small></div>`).join('');dd.style.display='block';}
function catSelFromDropdown(cod){const el=document.getElementById('catBuscaCodigo');if(el)el.value='';document.getElementById('cat-busca-dropdown').style.display='none';_catAdd(cod);}
document.addEventListener('click',e=>{if(!e.target.closest('#catBuscaCodigo')&&!e.target.closest('#cat-busca-dropdown')){const d=document.getElementById('cat-busca-dropdown');if(d)d.style.display='none';}});

// FILTROS e LISTA DE PRODUTOS SELECIONADOS
function catPopulateFiltros(){const fmts=[...new Set(PRODUCTS.map(p=>p.formato).filter(Boolean))].sort();const sel=document.getElementById('catFiltroFormato');if(!sel)return;sel.innerHTML='<option value="">Todos os formatos</option>'+fmts.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('');catAtualizarFiltroNomes();}
function catAtualizarFiltroNomes(){const fmt=document.getElementById('catFiltroFormato')?.value||'';const list=fmt?PRODUCTS.filter(p=>p.formato===fmt):PRODUCTS;const sel=document.getElementById('catFiltroProduto');if(!sel)return;sel.innerHTML='<option value="">Selecione...</option>'+list.map(p=>`<option value="${esc(p.codigo)}">${esc(p.nome||p.codigo)}${p.codigo?' ('+esc(p.codigo)+')':''}</option>`).join('');}
function _catNovoItem(p){return{produto:p,fob_edit:parseFloat(p.preco_fob)||0,exw_edit:parseFloat(p.preco_exw)||0};}
function catAdicionarTodosFormato(){
  const fmt=document.getElementById('catFiltroFormato')?.value||'';
  const list=fmt?PRODUCTS.filter(p=>p.formato===fmt):PRODUCTS;
  if(!list.length){showToast('Nenhum produto no formato selecionado','error');return;}
  let adicionados=0;
  list.forEach(p=>{
    if(!catSelecionados.find(x=>x.produto.codigo===p.codigo)){catSelecionados.push(_catNovoItem(p));adicionados++;}
  });
  catRenderSelecionados();
  if(adicionados>0)showToast(adicionados+' produto(s) adicionado(s)','success');
  else showToast('Todos os produtos já estão na lista','');
}
function catAdicionarDaLista(){const cod=document.getElementById('catFiltroProduto')?.value||'';if(!cod){showToast('Selecione um produto','error');return;}_catAdd(cod);document.getElementById('catFiltroProduto').value='';}
function _catAdd(cod){const p=PRODUCTS.find(x=>x.codigo&&x.codigo.toUpperCase()===cod.toUpperCase());if(!p){showToast('Produto não encontrado: '+cod,'error');return;}if(catSelecionados.find(x=>x.produto.codigo===p.codigo)){showToast('Já adicionado','error');return;}catSelecionados.push(_catNovoItem(p));catRenderSelecionados();showToast('Adicionado: '+(p.nome||p.codigo),'success');}
function catRemoverProduto(idx){catSelecionados.splice(idx,1);catRenderSelecionados();}
function catMoverProduto(idx,dir){const ni=idx+dir;if(ni<0||ni>=catSelecionados.length)return;[catSelecionados[idx],catSelecionados[ni]]=[catSelecionados[ni],catSelecionados[idx]];catRenderSelecionados();}
function catRenderSelecionados(){
  const el=document.getElementById('catListaSelecionados');const cnt=document.getElementById('catContador');if(cnt)cnt.textContent=catSelecionados.length;
  if(!el)return;if(!catSelecionados.length){el.innerHTML='<div class="vazio">Nenhum produto selecionado. Use os filtros ou a busca acima.</div>';return;}
  const sp=_isOn('catMostrarPreco'),sf=_isOn('catMostrarFob'),se=_isOn('catMostrarExw');
  el.innerHTML=catSelecionados.map((it,i)=>`<div class="cat-item">
    <div class="cat-item-ordem">
      <button class="btn btn-secondary btn-xs" onclick="catMoverProduto(${i},-1)" ${i===0?'disabled':''} title="Subir">↑</button>
      <button class="btn btn-secondary btn-xs" onclick="catMoverProduto(${i},1)" ${i===catSelecionados.length-1?'disabled':''} title="Descer">↓</button>
    </div>
    <div class="cat-item-info">
      <div class="cat-item-nome">${esc(it.produto.nome||'')}</div>
      <div class="sub">${esc(it.produto.codigo||'')}, ${esc(it.produto.formato||'')}</div>
      ${sp?`<div class="cat-item-precos">
        ${sf?`<label>FOB <input type="number" step="0.01" value="${it.fob_edit}" onchange="catSelecionados[${i}].fob_edit=parseFloat(this.value)||0"></label>`:''}
        ${se?`<label>EXW <input type="number" step="0.01" value="${it.exw_edit}" onchange="catSelecionados[${i}].exw_edit=parseFloat(this.value)||0"></label>`:''}
      </div>`:''}
      <input type="text" class="input-sm" maxlength="100" placeholder="Comentário no PDF (ex.: Estoque: 500 m²)" value="${esc(it.comentario||'')}" oninput="catSelecionados[${i}].comentario=this.value">
    </div>
    <button class="btn btn-sm btn-danger btn-icon" onclick="catRemoverProduto(${i})" title="Remover da lista" aria-label="Remover da lista">🗑️</button>
  </div>`).join('');
}
