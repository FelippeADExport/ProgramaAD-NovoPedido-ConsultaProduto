// ============================================================
// ABA CONFIGURAÇÕES: acréscimos, aparência e links do catálogo
// ============================================================

// ACRÉSCIMOS (Itapoá / Europallet), salvos na planilha
function carregarConfiguracoes(){
  document.getElementById('configStatus').textContent='Carregando...';
  google.script.run.withSuccessHandler(r=>{
    const d=JSON.parse(r);
    if(d.success){
      document.getElementById('cfgItapoa').value=parseFloat(d.data.acrescimo_itapoa).toFixed(2);
      document.getElementById('cfgEuropallet').value=parseFloat(d.data.acrescimo_europallet).toFixed(2);
      CFG_ITAPOA=parseFloat(d.data.acrescimo_itapoa)||0.10;
      CFG_EUROPALLET=parseFloat(d.data.acrescimo_europallet)||0.15;
      document.getElementById('configStatus').textContent='Carregado';
      document.getElementById('configStatus').style.color='var(--success)';
    } else {
      document.getElementById('configStatus').textContent='Erro';
      showToast('Erro ao carregar: '+d.error,'error');
    }
  }).withFailureHandler(e=>{
    document.getElementById('configStatus').textContent='Erro';
    showToast('Erro: '+e.message,'error');
  }).getConfig();
}

function salvarConfiguracoes(){
  const itapoa=parseFloat(document.getElementById('cfgItapoa').value);
  const euro=parseFloat(document.getElementById('cfgEuropallet').value);
  if(isNaN(itapoa)||itapoa<0){showToast('Valor de Itapoá inválido','error');return;}
  if(isNaN(euro)||euro<0){showToast('Valor de Europallet inválido','error');return;}
  const btn=document.getElementById('btnSalvarConfig');
  btn.disabled=true;btn.textContent='Salvando...';
  google.script.run.withSuccessHandler(r=>{
    btn.disabled=false;btn.textContent='Salvar acréscimos';
    const d=JSON.parse(r);
    if(d.success){
      CFG_ITAPOA=itapoa;
      CFG_EUROPALLET=euro;
      atualizarTextoItapoa();
      document.getElementById('cfgInfo').style.display='block';
      document.getElementById('configStatus').textContent='Salvo';
      document.getElementById('configStatus').style.color='var(--success)';
      showToast('Acréscimos salvos','success');
      items.forEach(it=>recalcItem(it.uid));
      updateSummary();
    } else {
      showToast('Erro: '+d.error,'error');
    }
  }).withFailureHandler(e=>{
    btn.disabled=false;btn.textContent='Salvar acréscimos';
    showToast('Erro: '+e.message,'error');
  }).salvarConfig(JSON.stringify({acrescimo_itapoa:itapoa,acrescimo_europallet:euro}));
}

// APARÊNCIA (tamanho/cor de fonte, salvo só neste navegador)
const APARENCIA_DEFAULTS = {
  'navbar-fs':13,'navbar-clr':null,
  'body-fs':14,'body-clr':null,
  'table-fs':13,'table-th-clr':null,'table-td-clr':null,
  'btn-fs':14,'btn-clr':null
};
// Cores exibidas nos pickers quando não há customização — refletem o tema atual
// (devem bater com as cores definidas em css/style.css)
const APARENCIA_CORES_DARK  = {'navbar-clr':'#a9b0b8','body-clr':'#e3e6e9','table-th-clr':'#a9b0b8','table-td-clr':'#e3e6e9','btn-clr':'#ffffff'};
const APARENCIA_CORES_LIGHT = {'navbar-clr':'#4b535c','body-clr':'#1d2125','table-th-clr':'#4b535c','table-td-clr':'#1d2125','btn-clr':'#ffffff'};

function _aplicarAparenciaCSS(k,v){
  const r=document.documentElement;
  const prop={
    'navbar-fs':'--fs-navbar','navbar-clr':'--clr-navbar',
    'body-fs':'--fs-body','body-clr':'--clr-body',
    'table-fs':'--fs-table','table-th-clr':'--clr-table-th','table-td-clr':'--clr-table-td',
    'btn-fs':'--fs-btn','btn-clr':'--clr-btn'
  }[k];
  if(!prop)return;
  if(v===null||v===undefined){
    r.style.removeProperty(prop);
  } else {
    // Para tamanhos adicionar px
    r.style.setProperty(prop, k.endsWith('-fs')?v+'px':v);
  }
}

function _lerAparencia(){
  const saved=localStorage.getItem('adexport_aparencia');
  return saved?JSON.parse(saved):{...APARENCIA_DEFAULTS};
}

function initAparencia(){
  const cfg=_lerAparencia();
  Object.keys(cfg).forEach(k=>_aplicarAparenciaCSS(k,cfg[k]));
  _syncAparenciaUI(cfg);
}

function _coresAtivas(){
  // Retorna as cores do tema atual para preencher a UI quando não há cor customizada
  const isLight=(localStorage.getItem('adexport_theme')||'dark')==='light';
  return isLight?APARENCIA_CORES_LIGHT:APARENCIA_CORES_DARK;
}

function _syncAparenciaUI(cfg){
  const temaClrs=_coresAtivas();
  const getClr=k=>cfg[k]||temaClrs[k]||'#ffffff';
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  const txt=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  // Navbar
  const nc=getClr('navbar-clr');
  set('navbarClr',nc); txt('navbarClrVal',nc); txt('navbarFsVal',(cfg['navbar-fs']||13)+'px');
  // Body
  const bc=getClr('body-clr');
  set('bodyClr',bc); txt('bodyClrVal',bc); txt('bodyFsVal',(cfg['body-fs']||14)+'px');
  // Table
  const thc=getClr('table-th-clr'); const tdc=getClr('table-td-clr');
  set('tableThClr',thc); txt('tableThClrVal',thc);
  set('tableTdClr',tdc); txt('tableTdClrVal',tdc);
  txt('tableFsVal',(cfg['table-fs']||13)+'px');
  // Btn
  const bnc=getClr('btn-clr');
  set('btnClr',bnc); txt('btnClrVal',bnc); txt('btnFsVal',(cfg['btn-fs']||14)+'px');
}

function ajustarFonte(alvo, delta){
  const cfg=_lerAparencia();
  const k=alvo+'-fs';
  const cur=parseInt(cfg[k])||parseInt(APARENCIA_DEFAULTS[k])||14;
  const novo=Math.max(8,Math.min(24,cur+delta));
  cfg[k]=novo;
  _aplicarAparenciaCSS(k,novo);
  _syncAparenciaUI(cfg);
  localStorage.setItem('adexport_aparencia',JSON.stringify(cfg));
}

function aplicarCor(alvo, valor){
  const cfg=_lerAparencia();
  const k=alvo+'-clr';
  cfg[k]=valor;
  _aplicarAparenciaCSS(k,valor);
  const labelMap={'navbar':'navbarClrVal','body':'bodyClrVal','table-th':'tableThClrVal','table-td':'tableTdClrVal','btn':'btnClrVal'};
  const lbl=document.getElementById(labelMap[alvo]);
  if(lbl)lbl.textContent=valor;
  localStorage.setItem('adexport_aparencia',JSON.stringify(cfg));
}

function salvarAparencia(){
  const cfg=_lerAparencia();
  localStorage.setItem('adexport_aparencia',JSON.stringify(cfg));
  const info=document.getElementById('aparenciaInfo');
  info.style.display='block';
  document.getElementById('aparenciaStatus').textContent='Salvo';
  document.getElementById('aparenciaStatus').style.color='var(--success)';
  setTimeout(()=>{info.style.display='none';},3000);
  showToast('Aparência salva','success');
}

function resetarAparencia(){
  localStorage.removeItem('adexport_aparencia');
  const cfg={...APARENCIA_DEFAULTS};
  Object.keys(cfg).forEach(k=>_aplicarAparenciaCSS(k,cfg[k]));
  _syncAparenciaUI(cfg);
  showToast('Aparência restaurada ao padrão','');
}

// LINKS PADRÃO DO CATÁLOGO, salvos na planilha
// id do campo nesta aba -> nome do campo na planilha
const CFG_CAT_CAMPOS={cfgCatLogoForn:'logo_fornecedor_url',cfgCatLogoAd:'logo_ad_url',cfgCatCapaImg:'capa_imagem_url',cfgCatTituloPt:'titulo_pt',cfgCatTituloEs:'titulo_es',cfgCatTituloEn:'titulo_en',cfgCatSiteUrl:'site_url',cfgCatPastaUrl:'pasta_url'};
function carregarCfgCatalogo(){google.script.run.withSuccessHandler(r=>{try{const d=JSON.parse(r);if(d.success)_syncCfgCatFields(d.data);}catch(e){}}).withFailureHandler(()=>{}).getCatalogoConfig();}
function _syncCfgCatFields(d){Object.keys(CFG_CAT_CAMPOS).forEach(id=>{const el=document.getElementById(id);if(el)el.value=d[CFG_CAT_CAMPOS[id]]||'';});document.getElementById('catCfgStatus').textContent='Carregado';}
function salvarCfgCatalogo(){
  const cfg={};Object.keys(CFG_CAT_CAMPOS).forEach(id=>{cfg[CFG_CAT_CAMPOS[id]]=document.getElementById(id).value||'';});
  google.script.run.withSuccessHandler(r=>{
    const d=JSON.parse(r);
    if(d.success){document.getElementById('catCfgStatus').textContent='Salvo';const info=document.getElementById('catCfgInfo');info.style.display='block';setTimeout(()=>info.style.display='none',3000);}
    showToast(d.success?'Links salvos':'Erro: '+d.error,d.success?'success':'error');
  }).withFailureHandler(e=>showToast('Erro: '+e.message,'error')).salvarCatalogoConfig(JSON.stringify(cfg));
  catCfgLoaded=false;
}
