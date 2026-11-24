// ============================================================
// LISTA DE PREÇOS > PROMOÇÕES
// Listas promocionais da fábrica (nome + frete + itens), uma por tipo de frete.
// Situação ATIVA/FINALIZADA é trocada manualmente.
// A importação usa a mesma tela do catálogo (catImpAbrir('promo')).
// Dados na aba "Promocoes" da planilha de produtos (Promocoes.gs),
// por isso aparecem em todos os dispositivos.
// ============================================================
let PROMOCOES=[],_promoCarregado=false;

function listaModo(m){
  const promo=m==='promo';
  document.getElementById('lista-modo-padrao').classList.toggle('active',!promo);
  document.getElementById('lista-modo-promo').classList.toggle('active',promo);
  document.getElementById('lista-padrao').classList.toggle('hidden',promo);
  document.getElementById('lista-promo').classList.toggle('hidden',!promo);
  document.getElementById('lista-sub').textContent=promo?'Ofertas especiais da fábrica, por tipo de frete.':'Todos os códigos, referências e preços de um formato.';
  if(promo){if(!_promoCarregado)document.getElementById('promo-lista').innerHTML='<div class="contagem">Carregando...</div>';promoCarregar();}
}

function promoCarregar(){
  return new Promise(res=>{google.script.run.withSuccessHandler(r=>{
    try{const d=JSON.parse(r);if(d.success){PROMOCOES=d.data||[];_promoCarregado=true;}else showToast('Erro: '+d.error,'error');}catch(e){}
    promoRender();res();
  }).withFailureHandler(e=>{showToast('Erro: '+e.message,'error');promoRender();res();}).getPromocoes();});
}

const _promoAtiva=p=>String(p.status||'ATIVA').toUpperCase()!=='FINALIZADA';

// Preço da tabela padrão no mesmo frete (Itapoá leva o acréscimo, como no pedido)
function _promoBase(prod,frete){
  if(!prod)return 0;
  if(/^EXW/i.test(frete))return parseFloat(prod.preco_exw)||0;
  const fob=parseFloat(prod.preco_fob)||0;
  return /Itapo/i.test(frete)?fob*(1+CFG_ITAPOA):fob;
}

function promoRender(){
  const el=document.getElementById('promo-lista');if(!el)return;
  const verFinalizadas=document.getElementById('promo-finalizadas').checked;
  const frete=document.getElementById('promo-filtro-frete').value;
  document.getElementById('promoCount').textContent=_promoCarregado?PROMOCOES.filter(_promoAtiva).length:'—';
  const lista=PROMOCOES.filter(p=>(verFinalizadas||_promoAtiva(p))&&(!frete||p.frete===frete))
    .sort((a,b)=>_promoAtiva(b)-_promoAtiva(a));
  if(!lista.length){
    el.innerHTML=`<div class="pedidos-empty"><strong>Nenhuma promoção ${verFinalizadas?'cadastrada':'ativa'}${frete?' para '+esc(frete):''}</strong>Clique em "Nova promoção" e envie o print da lista da fábrica.</div>`;
    return;
  }
  el.innerHTML=lista.map(p=>{
    const ativa=_promoAtiva(p);
    const linhas=(p.itens||[]).map(it=>{
      const prod=PRODUCTS.find(x=>x.codigo===it.codigo);
      const base=_promoBase(prod,p.frete);
      const pr=parseFloat(it.preco)||0;
      const dif=base&&pr?Math.round((pr/base-1)*1000)/10:null;
      return `<tr>
        <td>${esc(it.codigo)}</td>
        <td>${esc(prod?(prod.referencia||prod.nome):it.descricao)}</td>
        <td>${esc(prod?prod.formato:'')}</td>
        <td><strong>US$ ${pr.toFixed(2)}</strong></td>
        <td>${base?'US$ '+base.toFixed(2):'—'}</td>
        <td>${dif===null?'—':(dif>0?'+':'')+String(dif).replace('.',',')+'%'}</td>
      </tr>`;}).join('');
    return `<div class="section${ativa?'':' promo-finalizada'}">
      <div class="section-header">
        <div class="section-title">${esc(p.nome)}</div>
        <span class="chip ${ativa?'chip-ativa':'chip-finalizada'}">${ativa?'ATIVA':'FINALIZADA'}</span>
        <span class="chip">${esc(p.frete)}</span>
        <span class="section-badge">${(p.itens||[]).length} item(ns)</span>
        <button class="btn btn-sm btn-secondary" onclick="promoStatus('${esc(p.id)}')">${ativa?'Finalizar':'Reativar'}</button>
        <button class="btn btn-sm btn-danger" onclick="promoExcluir('${esc(p.id)}')">Excluir</button>
      </div>
      <div class="lista-tbl-wrap"><table class="pedidos-table">
        <thead><tr><th>Código</th><th>Referência</th><th>Formato</th><th>Promoção</th><th>Tabela padrão</th><th>Diferença</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>
    </div>`;
  }).join('');
}

// Chamada pelo botão "Salvar promoção" da tela de importação
function promoSalvar(sel){
  const nome=document.getElementById('promoNome').value.trim();
  const frete=document.getElementById('promoFrete').value;
  if(!nome){showToast('Informe o nome da promoção','error');document.getElementById('promoNome').focus();return;}
  if(!frete){showToast('Informe o frete dos preços da lista','error');document.getElementById('promoFrete').focus();return;}
  const promo={nome,frete,status:'ATIVA',itens:sel.map(l=>({codigo:l.cod,descricao:l.desc,preco:l.preco}))};
  const btn=document.getElementById('catImpBtnAdd');btn.disabled=true;
  google.script.run.withSuccessHandler(r=>{
    btn.disabled=false;
    const d=JSON.parse(r);
    if(!d.success){showToast('Erro: '+d.error,'error');return;}
    catImpFechar();showToast('Promoção salva ('+sel.length+' itens)','success');
    listaModo('promo');
  }).withFailureHandler(e=>{btn.disabled=false;showToast('Erro: '+e.message,'error');}).salvarPromocao(JSON.stringify(promo));
}

function promoStatus(id){
  const p=PROMOCOES.find(x=>x.id===id);if(!p)return;
  const novo=_promoAtiva(p)?'FINALIZADA':'ATIVA';
  google.script.run.withSuccessHandler(r=>{
    const d=JSON.parse(r);
    if(!d.success){showToast('Erro: '+d.error,'error');return;}
    p.status=novo;promoRender();showToast('Promoção '+(novo==='ATIVA'?'reativada':'finalizada'),'success');
  }).withFailureHandler(e=>showToast('Erro: '+e.message,'error')).alterarStatusPromocao(id,novo);
}

function promoExcluir(id){
  const p=PROMOCOES.find(x=>x.id===id);if(!p)return;
  if(!confirm('Excluir a promoção "'+p.nome+'" ('+p.frete+')?\n\nOs itens dela serão apagados da planilha.'))return;
  google.script.run.withSuccessHandler(r=>{
    const d=JSON.parse(r);
    if(!d.success){showToast('Erro: '+d.error,'error');return;}
    PROMOCOES=PROMOCOES.filter(x=>x.id!==id);promoRender();showToast('Promoção excluída','success');
  }).withFailureHandler(e=>showToast('Erro: '+e.message,'error')).excluirPromocao(id);
}
