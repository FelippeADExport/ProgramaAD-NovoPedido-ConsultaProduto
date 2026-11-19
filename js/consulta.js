// ============================================================
// ABAS CONSULTA PRODUTO e CONSULTA LISTA
// ============================================================

// Galeria de fotos + modal de zoom
let _cnsAllFotos=[];
let _cnsFotoIdx=0;

function cnsZoomFoto(container){
  if(!_cnsAllFotos.length) return;
  // Garantir que o modal existe
  let modal=document.getElementById('cns-zoom-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='cns-zoom-modal';
    modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;';
    // Fechar ao clicar no fundo (não nas setas/imagem)
    modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
    // Seta esquerda
    const bl=document.createElement('button');
    bl.id='cns-zoom-prev';
    bl.innerHTML='&#8249;';
    bl.style.cssText='position:absolute;left:16px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.15);border:none;border-radius:50%;width:48px;height:48px;color:#fff;font-size:28px;cursor:pointer;z-index:2;backdrop-filter:blur(4px);line-height:1;';
    bl.onclick=e=>{e.stopPropagation();cnsZoomNav(-1);};
    // Seta direita
    const br=document.createElement('button');
    br.id='cns-zoom-next';
    br.innerHTML='&#8250;';
    br.style.cssText='position:absolute;right:16px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.15);border:none;border-radius:50%;width:48px;height:48px;color:#fff;font-size:28px;cursor:pointer;z-index:2;backdrop-filter:blur(4px);line-height:1;';
    br.onclick=e=>{e.stopPropagation();cnsZoomNav(1);};
    // Imagem
    const zimg=document.createElement('img');
    zimg.id='cns-zoom-img';
    zimg.style.cssText='max-width:88vw;max-height:88vh;border-radius:10px;object-fit:contain;box-shadow:0 8px 60px #000;cursor:default;';
    zimg.onerror=function(){
      const id=cnsExtractId(this.src);
      this._tried=(this._tried||0)+1;
      const next=cnsBuildUrl(id,this._tried);
      if(next) this.src=next;
    };
    zimg.onclick=e=>e.stopPropagation();
    // Contador
    const zcount=document.createElement('div');
    zcount.id='cns-zoom-counter';
    zcount.style.cssText='position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;padding:4px 12px;border-radius:4px;';
    // Fechar (X)
    const bx=document.createElement('button');
    bx.innerHTML='&#x2715;';
    bx.style.cssText='position:absolute;top:16px;right:20px;background:rgba(255,255,255,.15);border:none;border-radius:50%;width:36px;height:36px;color:#fff;font-size:16px;cursor:pointer;z-index:2;';
    bx.onclick=()=>modal.style.display='none';
    modal.appendChild(bl);modal.appendChild(br);modal.appendChild(zimg);modal.appendChild(zcount);modal.appendChild(bx);
    document.body.appendChild(modal);
    // Navegação por teclado
    document.addEventListener('keydown',e=>{
      if(modal.style.display==='none') return;
      if(e.key==='ArrowLeft') cnsZoomNav(-1);
      if(e.key==='ArrowRight') cnsZoomNav(1);
      if(e.key==='Escape') modal.style.display='none';
    });
  }
  _cnsFotoIdx=_cnsAllFotos.indexOf(document.getElementById('cns-foto').src);
  if(_cnsFotoIdx<0) _cnsFotoIdx=0;
  cnsZoomUpdate();
  modal.style.display='flex';
}

function cnsZoomNav(dir){
  if(!_cnsAllFotos.length) return;
  _cnsFotoIdx=(_cnsFotoIdx+dir+_cnsAllFotos.length)%_cnsAllFotos.length;
  cnsZoomUpdate();
  // Sincronizar foto principal
  cnsSetFotoByIdx(_cnsFotoIdx);
}

function cnsZoomUpdate(){
  const zimg=document.getElementById('cns-zoom-img');
  const zcount=document.getElementById('cns-zoom-counter');
  const zprev=document.getElementById('cns-zoom-prev');
  const znext=document.getElementById('cns-zoom-next');
  if(zimg){
    const zid=cnsExtractId(_cnsAllFotos[_cnsFotoIdx]||'');
    zimg._tried=0;
    zimg.src=cnsBuildUrl(zid,0)||_cnsAllFotos[_cnsFotoIdx]||'';
  }
  if(zcount) zcount.textContent=(_cnsFotoIdx+1)+' / '+_cnsAllFotos.length;
  const multiple=_cnsAllFotos.length>1;
  if(zprev) zprev.style.display=multiple?'':'none';
  if(znext) znext.style.display=multiple?'':'none';
}

// Checkbox "Mostrar preços"
function cnsTogglePreco(){
  document.getElementById('cns-preco-box').style.display=document.getElementById('cns-preco-toggle').checked?'':'none';
}

// Fallback progressivo de imagem: thumbnail → lh3 → placeholder
// Extrai o fileId de qualquer URL do Google Drive
function cnsExtractId(url){
  if(!url) return '';
  // formato thumbnail: ?id=XXX ou &id=XXX
  let m=url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if(m) return m[1];
  // formato lh3: /d/XXX=
  m=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if(m) return m[1];
  return '';
}

// Detectar Safari (inclui iOS/iPadOS)
const _isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
               || /iPad|iPhone|iPod/.test(navigator.userAgent);

// Gera URL pelo índice de tentativa
// Safari: pula thumbnail (bloqueado por cookies) e começa pelo lh3
function cnsBuildUrl(id, tried){
  if(!id) return '';
  if(_isSafari){
    if(tried===0) return 'https://lh3.googleusercontent.com/d/'+id+'=s2000';
    if(tried===1) return 'https://drive.google.com/uc?export=view&id='+id;
    if(tried===2) return 'https://drive.google.com/thumbnail?id='+id+'&sz=w2000';
  } else {
    if(tried===0) return 'https://drive.google.com/thumbnail?id='+id+'&sz=w2000';
    if(tried===1) return 'https://lh3.googleusercontent.com/d/'+id+'=s2000';
    if(tried===2) return 'https://drive.google.com/uc?export=view&id='+id;
  }
  return '';
}

function cnsFotoFallback(img){
  const id=img._fileId||'';
  img._tried=(img._tried||0)+1;
  const nextUrl=cnsBuildUrl(id, img._tried);
  if(nextUrl){
    img.src=nextUrl;
  } else {
    img.style.display='none';
    const ph=document.getElementById('cns-foto-placeholder');
    if(ph) ph.style.display='flex';
  }
}

function listaInit(){
  const sel=document.getElementById('lista-formato');
  if(!sel) return;
  if(!PRODUCTS||!PRODUCTS.length){
    sel.innerHTML='<option value="">Selecione...</option>';
    return;
  }
  const formatos=[...new Set(PRODUCTS.map(p=>(p.formato||'').trim()).filter(Boolean))].sort();
  const cur=sel.value;
  sel.innerHTML='<option value="">Selecione...</option>'+formatos.map(f=>`<option value="${f}">${f}</option>`).join('');
  if(cur) sel.value=cur;
  listaRender();
}

function listaRender(){
  const formato=document.getElementById('lista-formato').value;
  const showFob=document.getElementById('lista-fob').checked;
  const showExw=document.getElementById('lista-exw').checked;
  document.getElementById('lista-th-fob').style.display=showFob?'':'none';
  document.getElementById('lista-th-exw').style.display=showExw?'':'none';

  const wrap=document.getElementById('lista-table-wrap');
  const empty=document.getElementById('lista-empty');
  const contagem=document.getElementById('lista-contagem');

  if(!formato){
    wrap.classList.add('hidden');
    empty.classList.remove('hidden');
    contagem.textContent='';
    return;
  }
  const lista=(PRODUCTS||[]).filter(p=>(p.formato||'').trim()===formato.trim())
    .sort((a,b)=>(a.referencia||a.nome||'').localeCompare(b.referencia||b.nome||''));

  if(!lista.length){
    wrap.classList.add('hidden');
    empty.classList.remove('hidden');
    contagem.textContent='';
    return;
  }

  empty.classList.add('hidden');
  wrap.classList.remove('hidden');
  contagem.textContent=lista.length+' produto(s)';

  document.getElementById('lista-tbody').innerHTML=lista.map(p=>`
    <tr>
      <td>${p.codigo||'—'}</td>
      <td>${p.referencia||p.nome||'—'}</td>
      <td style="${showFob?'':'display:none'}">${p.preco_fob?('US$ '+Number(p.preco_fob).toFixed(2)):'—'}</td>
      <td style="${showExw?'':'display:none'}">${p.preco_exw?('US$ '+Number(p.preco_exw).toFixed(2)):'—'}</td>
    </tr>`).join('');
}

function cnsInit(){
  const sel=document.getElementById('cns-formato');
  if(!sel) return;
  if(!PRODUCTS||!PRODUCTS.length){
    // produtos ainda não carregaram — mostrar estado vazio sem erro
    sel.innerHTML='<option value="">Selecione...</option>';
    return;
  }
  const formatos=[...new Set(PRODUCTS.map(p=>(p.formato||'').trim()).filter(Boolean))].sort();
  const cur=sel.value;
  sel.innerHTML='<option value="">Selecione...</option>'+formatos.map(f=>`<option value="${f}">${f}</option>`).join('');
  if(cur) sel.value=cur;
}

function cnsOnFormatoChange(){
  const f=document.getElementById('cns-formato').value;
  const s=document.getElementById('cns-nome');
  s.disabled=!f;
  s.innerHTML='<option value="">Selecione o nome...</option>';
  document.getElementById('cns-codigo').value='';
  if(!f){cnsClearResult();return;}
  PRODUCTS.filter(p=>(p.formato||'').trim()===f.trim()).forEach(p=>{
    const o=document.createElement('option');o.value=p.codigo;o.textContent=p.nome||p.codigo;s.appendChild(o);
  });
  cnsClearResult();
}

function cnsOnNomeChange(){
  const c=document.getElementById('cns-nome').value;if(!c){cnsClearResult();return;}
  const p=PRODUCTS.find(x=>String(x.codigo)===String(c));if(!p)return;
  document.getElementById('cns-codigo').value=p.codigo;
  cnsShowProduto(p);
}

function cnsOnCodigoInput(){
  const v=document.getElementById('cns-codigo').value.trim();
  const dd=document.getElementById('cns-codigo-dd');
  if(!v){dd.classList.add('hidden');return;}
  const m=PRODUCTS.filter(p=>String(p.codigo).toLowerCase().includes(v.toLowerCase())||p.nome.toLowerCase().includes(v.toLowerCase())).slice(0,10);
  if(!m.length){dd.classList.add('hidden');return;}
  dd.innerHTML=m.map(p=>`<div class="autocomplete-item" onmousedown="cnsSelectByCodigo('${esc(p.codigo)}')" ontouchstart="cnsSelectByCodigo('${esc(p.codigo)}')">`
    +`<strong>${esc(p.codigo)} — ${esc(p.nome)}</strong><small>${esc(p.formato)}</small></div>`).join('');
  dd.classList.remove('hidden');
}

// Fechar dropdown ao clicar/tocar fora
document.addEventListener('mousedown', e=>{
  const dd=document.getElementById('cns-codigo-dd');
  const inp=document.getElementById('cns-codigo');
  if(dd&&inp&&!dd.contains(e.target)&&e.target!==inp) dd.classList.add('hidden');
});
document.addEventListener('touchstart', e=>{
  const dd=document.getElementById('cns-codigo-dd');
  const inp=document.getElementById('cns-codigo');
  if(dd&&inp&&!dd.contains(e.target)&&e.target!==inp) dd.classList.add('hidden');
},{passive:true});

function cnsSelectByCodigo(codigo){
  const p=PRODUCTS.find(x=>String(x.codigo)===String(codigo));if(!p)return;
  const dd=document.getElementById('cns-codigo-dd');if(dd)dd.classList.add('hidden');
  document.getElementById('cns-codigo').value=p.codigo;
  // Sincronizar selects
  const fs=document.getElementById('cns-formato');
  if(fs)fs.value=p.formato;
  cnsOnFormatoChange();
  setTimeout(()=>{
    const ns=document.getElementById('cns-nome');if(ns)ns.value=p.codigo;
    cnsShowProduto(p);
  },50);
}

function cnsVal(v){return(v===undefined||v===null||v===''||v===0)?'—':String(v);}

function cnsShowProduto(p){
  document.getElementById('cns-empty').style.display='none';
  document.getElementById('cns-resultado').classList.remove('hidden');

  // Foto
  const img=document.getElementById('cns-foto');
  const ph=document.getElementById('cns-foto-placeholder');
  // Galeria — coletar fotos disponíveis
  _cnsAllFotos=[p.imagem,p.imagem2,p.imagem3].filter(Boolean);
  _cnsFotoIdx=0;
  if(_cnsAllFotos.length){
    ph.style.display='none';
    img.style.display='block';
    img._fileId=cnsExtractId(_cnsAllFotos[0]);
    img._tried=0;
    img.src=cnsBuildUrl(img._fileId,0)||_cnsAllFotos[0];
  } else{img.style.display='none';ph.style.display='flex';}
  // Renderizar miniaturas
  const thumbsEl=document.getElementById('cns-thumbs');
  thumbsEl.innerHTML='';
  _cnsAllFotos.forEach((url,idx)=>{
    const wrap=document.createElement('div');
    wrap.className='cns-thumb'+(idx===0?' active':'');
    wrap.dataset.url=url;
    wrap.dataset.idx=idx;
    wrap.onclick=()=>cnsSelectThumb(wrap,url);
    const ti=document.createElement('img');
    const tid=cnsExtractId(url);
    ti._fileId=tid;
    ti._tried=0;
    ti.src=cnsBuildUrl(tid,0)||url;
    ti.onerror=function(){
      this._tried=(this._tried||0)+1;
      const next=cnsBuildUrl(this._fileId,this._tried);
      if(next){this.src=next;}
      else{this.style.display='none';wrap.textContent='Sem foto';}
    };
    wrap.appendChild(ti);
    thumbsEl.appendChild(wrap);
  });

  // Identificação
  document.getElementById('cns-r-formato').textContent=cnsVal(p.formato);
  document.getElementById('cns-r-codigo').textContent=cnsVal(p.codigo);
  document.getElementById('cns-r-barcode').textContent=cnsVal(p.barcode);
  document.getElementById('cns-r-nome').textContent=cnsVal(p.nome);

  // Características
  document.getElementById('cns-r-face').textContent=cnsVal(p.face);
  document.getElementById('cns-r-local').textContent=cnsVal(p.local_uso);
  document.getElementById('cns-r-vt').textContent=cnsVal(p.vt);
  document.getElementById('cns-r-thick').textContent=cnsVal(p.thickness);

  // Preços
  const fmtPrice=v=>{const n=parseFloat(v);return(!v&&v!==0)||isNaN(n)?'—':'US$ '+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});};
  document.getElementById('cns-r-fob').textContent=fmtPrice(p.preco_fob);
  document.getElementById('cns-r-exw').textContent=fmtPrice(p.preco_exw);

  // Packing (Americano / Europallet / EXW)
  cnsRenderPack(p);
}

// ============================================================
// PACKING — aceita valores duplos "28 / 56" e formata cada parte
// ============================================================
function cnsNumParse(s){
  s=String(s).trim();
  if(s.indexOf(',')>=0) s=s.replace(/\./g,'').replace(',','.');
  if(!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return parseFloat(s);
}
// dec=true → 2 casas decimais; dec=false → inteiro
function cnsFmtMulti(raw,dec,unit){
  const s=String(raw==null?'':raw).trim();
  if(!s||s==='0') return '—';
  const opt=dec?{minimumFractionDigits:2,maximumFractionDigits:2}:{maximumFractionDigits:0};
  const out=s.split('/').map(x=>x.trim()).filter(Boolean).map(x=>{
    const v=cnsNumParse(x);
    return v===null?x:v.toLocaleString('pt-BR',opt);
  }).join(' / ');
  return out+(unit?' '+unit:'');
}
function cnsTemValor(v){const s=String(v==null?'':v).trim();return !!s&&s!=='0';}

const CNS_PACK_TABS=[{k:'am',lbl:'Pallet americano'},{k:'eu',lbl:'Europallet'},{k:'exw',lbl:'EXW'}];
let CNS_PACK_TAB='am', CNS_PACK_PROD=null;

// Monta os 3 blocos de packing a partir dos campos de texto do getProdutos
function cnsGetPack(p){
  return {
    am:{cx_pecas:p.cx_pecas_txt,cx_sqmt:p.cx_sqmt_txt,cx_peso:p.cx_peso_txt,
        pal_caixas:p.pallet_caixas_txt,pal_sqmt:p.pallet_sqmt_txt,pal_peso:p.pallet_peso_txt,
        con_pallets:p.container_pallets_txt,con_sqmt:p.container_sqmt_txt,con_caixas:p.container_caixas_txt,con_peso:p.container_peso_txt,
        medidas:p.pallet_size,camadas:[{l:'',v:p.camadas_fob_txt}]},
    eu:{cx_pecas:p.euro_cx_pecas_txt,cx_sqmt:p.euro_cx_sqmt_txt,cx_peso:p.euro_cx_peso_txt,
        pal_caixas:p.euro_pallet_caixas_txt,pal_sqmt:p.euro_pallet_sqmt_txt,pal_peso:p.euro_pallet_peso_txt,
        con_pallets:p.euro_container_pallets_txt,con_sqmt:p.euro_container_sqmt_txt,con_caixas:p.euro_container_caixas_txt,con_peso:p.euro_container_peso_txt,
        medidas:p.euro_pallet_size,camadas:[{l:'',v:p.camadas_euro_fob_txt}]},
    exw:{cx_pecas:p.exw_cx_pecas_txt,cx_sqmt:p.exw_cx_sqmt_txt,cx_peso:p.exw_cx_peso_txt,
        pal_caixas:p.exw_pallet_caixas_txt,pal_sqmt:p.exw_pallet_sqmt_txt,pal_peso:p.exw_pallet_peso_txt,
        con_pallets:p.exw_total_pallets_txt,con_sqmt:p.exw_total_sqmt_txt,con_caixas:p.exw_total_cartons_txt,con_peso:p.exw_total_gw_txt,
        medidas:p.exw_pallet_size,camadas:[{l:'Pallet Americano',v:p.camadas_exw_txt},{l:'Europallet',v:p.camadas_euro_exw_txt}]}
  };
}
function cnsHasPack(d){
  return !!d&&['cx_pecas','cx_sqmt','pal_caixas','con_pallets','medidas'].some(k=>cnsTemValor(d[k]));
}
function cnsPackHtml(d,tab){
  const row=(l,v,cls)=>'<div class="cns-pack-row'+(cls?' '+cls:'')+'"><span>'+esc(l)+'</span><span>'+esc(v)+'</span></div>';
  const cam=(d.camadas||[]).filter(c=>cnsTemValor(c.v))
    .map(c=>row(c.l?'Camadas ('+c.l+')':'Camadas',cnsFmtMulti(c.v,false))).join('');
  const med=String(d.medidas||'').trim();
  const medHtml=med?row('Medidas do pallet',med.split('/').map(x=>x.trim()).filter(Boolean).join('\n'),'med'):'';
  const tit3=tab==='exw'?'Caminhão':'Container';
  return ''+
  '<div class="cns-pack-card"><h4>Caixa</h4>'+
    row('Peças',cnsFmtMulti(d.cx_pecas,false))+row('m²',cnsFmtMulti(d.cx_sqmt,true,'m²'))+row('Peso (kg)',cnsFmtMulti(d.cx_peso,true,'kg'))+'</div>'+
  '<div class="cns-pack-card"><h4>Pallet</h4>'+
    row('Caixas',cnsFmtMulti(d.pal_caixas,false))+row('m²',cnsFmtMulti(d.pal_sqmt,true,'m²'))+row('Peso (kg)',cnsFmtMulti(d.pal_peso,true,'kg'))+
    cam+medHtml+'</div>'+
  '<div class="cns-pack-card"><h4>'+tit3+'</h4>'+
    row('Caixas',cnsFmtMulti(d.con_caixas,false))+row('Pallets',cnsFmtMulti(d.con_pallets,false))+row('m²',cnsFmtMulti(d.con_sqmt,true,'m²'))+row('Peso (kg)',cnsFmtMulti(d.con_peso,true,'kg'))+'</div>';
}
function cnsRenderPack(p){
  CNS_PACK_PROD=p;
  const pack=cnsGetPack(p);
  const avail=CNS_PACK_TABS.filter(x=>cnsHasPack(pack[x.k]));
  const wrap=document.getElementById('cns-pack-wrap');
  wrap.classList.toggle('hidden',!avail.length);
  if(!avail.length) return;
  if(!avail.some(x=>x.k===CNS_PACK_TAB)) CNS_PACK_TAB=avail[0].k;
  document.getElementById('cns-pack-tabs').innerHTML=avail.map(x=>
    '<button class="cns-pack-tab'+(x.k===CNS_PACK_TAB?' active':'')+'" onclick="cnsSetPackTab(\''+x.k+'\')">'+x.lbl+'</button>').join('');
  const box=document.getElementById('cns-pack-box');
  box.innerHTML=cnsPackHtml(pack[CNS_PACK_TAB],CNS_PACK_TAB);
}
function cnsSetPackTab(k){CNS_PACK_TAB=k;if(CNS_PACK_PROD) cnsRenderPack(CNS_PACK_PROD);}

function cnsSetFotoByIdx(idx){
  const url=_cnsAllFotos[idx];
  // Atualizar miniatura ativa
  document.querySelectorAll('#cns-thumbs > div').forEach((d,i)=>d.classList.toggle('active',i===idx));
  // Trocar foto principal — extrair ID de qualquer formato de URL
  const img=document.getElementById('cns-foto');
  const ph=document.getElementById('cns-foto-placeholder');
  const id=cnsExtractId(url);
  ph.style.display='none';
  img.style.display='block';
  img._fileId=id;
  img._tried=0;
  // Começar já pelo thumbnail (tried=0) com URL limpa
  img.src='';
  setTimeout(()=>{ img.src=cnsBuildUrl(id,0)||url; },10);
}

function cnsSelectThumb(wrap,url){
  _cnsFotoIdx=parseInt(wrap.dataset.idx||0);
  cnsSetFotoByIdx(_cnsFotoIdx);
  // Sincronizar zoom se aberto
  const modal=document.getElementById('cns-zoom-modal');
  if(modal&&modal.style.display!=='none') cnsZoomUpdate();
}

function cnsClearResult(){
  document.getElementById('cns-resultado').classList.add('hidden');
  document.getElementById('cns-empty').style.display='';
  document.getElementById('cns-codigo').value='';
  const t=document.getElementById('cns-thumbs');if(t)t.innerHTML='';
}
