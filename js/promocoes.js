// ============================================================
// LISTA DE PREÇOS > PROMOÇÕES
// Listas promocionais da fábrica (nome + fretes + itens); uma lista pode valer para vários fretes.
// Situação ATIVA/FINALIZADA é trocada manualmente.
// A importação usa a mesma tela do catálogo (catImpAbrir('promo')).
// Dados na aba "Promocoes" da planilha de produtos (Promocoes.gs),
// por isso aparecem em todos os dispositivos.
// ============================================================
let PROMOCOES=[],_promoCarregado=false;
// Preferências da tela (só neste navegador): cards recolhidos e colunas de comparação
const _promoFechadas=new Set(JSON.parse(localStorage.getItem('adexport_promo_fechadas')||'[]'));
let _promoComparar=localStorage.getItem('adexport_promo_comparar')!=='0';
let _promoEdId=null;

function promoAlternar(id,el){
  const card=el.closest('.section');
  card.classList.toggle('promo-fechada');
  if(card.classList.contains('promo-fechada'))_promoFechadas.add(id);else _promoFechadas.delete(id);
  localStorage.setItem('adexport_promo_fechadas',JSON.stringify([..._promoFechadas]));
}
function promoComparar(on){
  _promoComparar=on;localStorage.setItem('adexport_promo_comparar',on?'1':'0');
  document.getElementById('promo-lista').classList.toggle('promo-sem-comparar',!on);
}

function listaModo(m){
  const promo=m==='promo';
  document.getElementById('lista-modo-padrao').classList.toggle('active',!promo);
  document.getElementById('lista-modo-promo').classList.toggle('active',promo);
  document.getElementById('lista-padrao').classList.toggle('hidden',promo);
  document.getElementById('lista-promo').classList.toggle('hidden',!promo);
  document.getElementById('lista-sub').textContent=promo?'Ofertas especiais da fábrica, por tipo de frete.':'Todos os códigos, referências e preços de um formato.';
  if(promo){document.getElementById('promo-comparar').checked=_promoComparar;promoComparar(_promoComparar);if(!_promoCarregado)document.getElementById('promo-lista').innerHTML='<div class="contagem">Carregando...</div>';promoCarregar();}
}

function promoCarregar(){
  return new Promise(res=>{google.script.run.withSuccessHandler(r=>{
    try{const d=JSON.parse(r);if(d.success){PROMOCOES=d.data||[];_promoCarregado=true;}else showToast('Erro: '+d.error,'error');}catch(e){}
    promoRender();res();
  }).withFailureHandler(e=>{showToast('Erro: '+e.message,'error');promoRender();res();}).getPromocoes();});
}

const _promoAtiva=p=>String(p.status||'ATIVA').toUpperCase()!=='FINALIZADA';
// Uma lista pode valer para vários fretes: gravado como "FOB Imbituba, FOB Itajaí"
const _promoFretes=p=>String(p.frete||'').split(',').map(s=>s.trim()).filter(Boolean);

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
  const lista=PROMOCOES.filter(p=>(verFinalizadas||_promoAtiva(p))&&(!frete||_promoFretes(p).includes(frete)))
    .sort((a,b)=>_promoAtiva(b)-_promoAtiva(a));
  if(!lista.length){
    el.innerHTML=`<div class="pedidos-empty"><strong>Nenhuma promoção ${verFinalizadas?'cadastrada':'ativa'}${frete?' para '+esc(frete):''}</strong>Clique em "Nova promoção" e envie o print da lista da fábrica.</div>`;
    return;
  }
  el.innerHTML=lista.map(p=>{
    const ativa=_promoAtiva(p);
    const fretes=_promoFretes(p);
    // Compara com o frete do filtro; sem filtro, com o primeiro frete da lista
    const fBase=frete||fretes[0]||'';
    const linhas=(p.itens||[]).map(it=>{
      const prod=PRODUCTS.find(x=>x.codigo===it.codigo);
      const base=_promoBase(prod,fBase);
      const pr=parseFloat(it.preco)||0;
      const dif=base&&pr?Math.round((pr/base-1)*1000)/10:null;
      return `<tr>
        <td>${esc(it.codigo)}</td>
        <td>${esc(prod?(prod.referencia||prod.nome):it.descricao)}</td>
        <td>${esc(prod?prod.formato:'')}</td>
        <td><strong>US$ ${pr.toFixed(2)}</strong></td>
        <td class="col-padrao">${base?'US$ '+base.toFixed(2):'—'}</td>
        <td class="col-padrao">${dif===null?'—':(dif>0?'+':'')+String(dif).replace('.',',')+'%'}</td>
      </tr>`;}).join('');
    const id=esc(p.id);
    return `<div class="section${ativa?'':' promo-finalizada'}${_promoFechadas.has(p.id)?' promo-fechada':''}">
      <div class="section-header promo-head" onclick="promoAlternar('${id}',this)" title="Mostrar/ocultar a lista">
        <span class="promo-seta">▾</span>
        <div class="section-title">${esc(p.nome)}</div>
        <span class="chip ${ativa?'chip-ativa':'chip-finalizada'}">${ativa?'ATIVA':'FINALIZADA'}</span>
        ${fretes.map(f=>`<span class="chip chip-frete">${esc(f)}</span>`).join(' ')}
        <span class="section-badge">${(p.itens||[]).length} item(ns)</span>
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();promoEdAbrir('${id}')">Editar</button>
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();promoStatus('${id}')">${ativa?'Finalizar':'Reativar'}</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();promoExcluir('${id}')">Excluir</button>
      </div>
      <div class="lista-tbl-wrap"><table class="pedidos-table">
        <thead><tr><th>Código</th><th>Referência</th><th>Formato</th><th>Promoção</th><th class="col-padrao">Tabela padrão${fretes.length>1?' ('+esc(fBase)+')':''}</th><th class="col-padrao">Diferença</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>
    </div>`;
  }).join('');
}

// Chamada pelo botão "Salvar promoção" da tela de importação
function promoSalvar(sel){
  const nome=document.getElementById('promoNome').value.trim();
  const frete=[...document.querySelectorAll('#promoFrete .cat-toggle.active')].map(b=>b.textContent.trim()).join(', ');
  if(!nome){showToast('Informe o nome da promoção','error');document.getElementById('promoNome').focus();return;}
  if(!frete){showToast('Marque ao menos um frete','error');return;}
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

function promoEdAbrir(id){
  const p=PROMOCOES.find(x=>x.id===id);if(!p)return;
  _promoEdId=id;
  const fretes=_promoFretes(p);
  document.getElementById('promoEdNome').value=p.nome;
  document.querySelectorAll('#promoEdFrete .cat-toggle').forEach(b=>b.classList.toggle('active',fretes.includes(b.textContent.trim())));
  document.getElementById('modalPromoEd').style.display='flex';
}
function promoEdFechar(){document.getElementById('modalPromoEd').style.display='none';}
function promoEdSalvar(){
  const p=PROMOCOES.find(x=>x.id===_promoEdId);if(!p)return;
  const nome=document.getElementById('promoEdNome').value.trim();
  const frete=[...document.querySelectorAll('#promoEdFrete .cat-toggle.active')].map(b=>b.textContent.trim()).join(', ');
  if(!nome){showToast('Informe o nome da promoção','error');return;}
  if(!frete){showToast('Marque ao menos um frete','error');return;}
  const btn=document.getElementById('promoEdBtn');btn.disabled=true;
  google.script.run.withSuccessHandler(r=>{
    btn.disabled=false;
    const d=JSON.parse(r);
    if(!d.success){showToast('Erro: '+d.error,'error');return;}
    p.nome=nome;p.frete=frete;promoEdFechar();promoRender();showToast('Promoção atualizada','success');
  }).withFailureHandler(e=>{btn.disabled=false;showToast('Erro: '+e.message,'error');}).editarPromocao(p.id,JSON.stringify({nome,frete}));
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
