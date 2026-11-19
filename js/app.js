// ============================================================
// APP: estado global, tema, carregamento inicial e troca de abas
// ============================================================

// ESTADO
let CLIENTS=[],PRODUCTS=[],PEDIDOS=[],PORTOS_DESTINO=[];
let currentPrice='FOB',currentPorto='',currentPortoChegada='',itapoaAcrescimo=true;
let currentFrete='maritimo';
let items=[],selectedClientId=null,savedPedido=null;
let editMode=false,editNumeroOriginal='',editLinkPdfAntigo='';
let CFG_ITAPOA=0.10, CFG_EUROPALLET=0.15;

// TEMA
function initTheme(){const s=localStorage.getItem('adexport_theme')||'dark';applyTheme(s);}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t==='light'?'light':'');
  // Ícone mostra o tema para o qual o botão vai trocar
  document.getElementById('themeLabel').textContent=t==='light'?'🌙':'☀️';
  const tb=document.getElementById('themeToggle'),dica=t==='light'?'Mudar para tema escuro':'Mudar para tema claro';tb.title=dica;tb.setAttribute('aria-label',dica);
  localStorage.setItem('adexport_theme',t);
}
function toggleTheme(){
  applyTheme((localStorage.getItem('adexport_theme')||'dark')==='light'?'dark':'light');
  // Atualizar pickers de cor na aba config para refletir cores do novo tema
  _syncAparenciaUI(_lerAparencia());
}

// INIT
window.onload=function(){
  initTheme();
  initAparencia();
  initExcluirListeners();
  Promise.all([loadClients(),loadProducts(),loadPortosDestino(),loadConfig()]).then(()=>{
    document.getElementById('loader').style.display='none';
    document.getElementById('app').style.display='block';
    addItem();updateOrderNum();loadPedidos();cnsInit();
  }).catch(e=>{document.getElementById('loader').innerHTML='<div class="loader-erro">Erro ao carregar dados.<br><small>'+esc(e)+'</small></div>';});
};

// CARREGAMENTO DE DADOS (planilha)
function loadClients(){return new Promise((res,rej)=>{google.script.run.withSuccessHandler(r=>{const d=JSON.parse(r);d.success?(CLIENTS=d.data,res()):rej(d.error);}).withFailureHandler(e=>rej(e.message)).getClientes();});}
function loadProducts(){return new Promise((res,rej)=>{google.script.run.withSuccessHandler(r=>{const d=JSON.parse(r);d.success?(PRODUCTS=d.data.map(p=>({
  ...p,
  formato:(p.formato||'').trim(),
  nome:(p.nome||'').trim(),
  codigo:(p.codigo||'').trim(),
  euro_preco_fob:         p.euro_preco_fob         ?? p.preco_fob,
  euro_preco_exw:         p.euro_preco_exw         ?? p.preco_exw,
  euro_cx_sqmt:           p.euro_cx_sqmt           ?? p.cx_sqmt,
  euro_cx_peso:           p.euro_cx_peso           ?? p.cx_peso,
  euro_pallet_caixas:     p.euro_pallet_caixas     ?? p.pallet_caixas,
  euro_pallet_sqmt:       p.euro_pallet_sqmt       ?? p.pallet_sqmt,
  euro_pallet_peso:       p.euro_pallet_peso       ?? p.pallet_peso,
  euro_container_sqmt:    p.euro_container_sqmt    ?? p.container_sqmt,
  euro_container_peso:    p.euro_container_peso    ?? p.container_peso,
  euro_container_caixas:  p.euro_container_caixas  ?? p.container_caixas,
  euro_container_pallets: p.euro_container_pallets ?? p.container_pallets,
})),res()):rej(d.error);}).withFailureHandler(e=>rej(e.message)).getProdutos();});}
function loadPortosDestino(){return new Promise(res=>{google.script.run.withSuccessHandler(r=>{try{const d=JSON.parse(r);if(d.success&&d.data){
  const mapa={};
  d.data.forEach(row=>{const pais=String(row.pais||'').trim(),porto=String(row.porto||'').trim();if(!pais||!porto)return;if(!mapa[pais])mapa[pais]=[];if(!mapa[pais].includes(porto))mapa[pais].push(porto);});
  PORTOS_DESTINO=Object.keys(mapa).sort().map(pais=>({pais,portos:mapa[pais].sort()}));
  populatePortoPaisSelect();
}}catch(e){}res();}).withFailureHandler(()=>res()).getPortosDestino();});}
function loadConfig(){return new Promise(res=>{google.script.run.withSuccessHandler(r=>{try{const d=JSON.parse(r);if(d.success&&d.data){CFG_ITAPOA=parseFloat(d.data.acrescimo_itapoa)||0.10;CFG_EUROPALLET=parseFloat(d.data.acrescimo_europallet)||0.15;atualizarTextoItapoa();}}catch(e){}res();}).withFailureHandler(()=>res()).getConfig();});}

// Botão "Atualizar": recarrega os dados e também baixa as fotos para uso offline
function refreshAll(){
  const btn=document.getElementById('btnRefresh');
  const fim=()=>{btn.disabled=false;btn.classList.remove('girando');};
  btn.disabled=true;btn.classList.add('girando');
  Promise.all([loadClients(),loadProducts(),loadPortosDestino(),loadPedidos()])
    .then(()=>{fim();cnsInit();showToast('Dados atualizados','success');})
    .catch(e=>{fim();showToast('Erro: '+e,'error');});
  sincronizacaoCompleta();
}
setInterval(()=>{loadProducts().catch(()=>{});loadClients().catch(()=>{});},5*60*1000);

// ABAS
function switchTab(t){
  document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(e=>e.classList.remove('active'));
  const tabEl=document.getElementById('tab-'+t);
  const btnEl=document.getElementById('tab-'+t+'-btn');
  if(tabEl)tabEl.classList.add('active');
  if(btnEl)btnEl.classList.add('active');
  if(t==='novo'&&!editMode)novoPedidoEmBranco();
  if(t==='todos')loadPedidos();
  if(t==='consulta')cnsInit();
  if(t==='lista')listaInit();
  if(t==='clientes')renderClientes();
  if(t==='config'){carregarConfiguracoes();_syncAparenciaUI(_lerAparencia());carregarCfgCatalogo();}
  if(t==='catalogo')catInit();
}
