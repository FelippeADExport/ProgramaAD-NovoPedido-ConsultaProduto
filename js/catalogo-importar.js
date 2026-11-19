// ============================================================
// CATÁLOGO: IMPORTAR PRODUTOS DE IMAGEM (Gemini)
// ============================================================
const CAT_IMP_KEY='adexport_gemini_key', CAT_IMP_MODEL='adexport_gemini_model';
let _catImp={imgs:[],dest:'fob',linhas:[]};

function _catImpLS(k,v){try{if(v===undefined)return localStorage.getItem(k)||'';localStorage.setItem(k,v);}catch(e){return '';}}

function catImpAbrir(){
  if(!PRODUCTS.length){showToast('Produtos ainda não carregados','error');return;}
  _catImp={imgs:[],dest:_catImp.dest||'fob',linhas:[]};
  document.getElementById('catImpKey').value=_catImpLS(CAT_IMP_KEY);
  _catImpThumbs();
  catImpDest(_catImp.dest);
  catImpVoltar();
  document.getElementById('modalCatImp').style.display='flex';
}
function catImpFechar(){document.getElementById('modalCatImp').style.display='none';}
function catImpVoltar(){
  document.getElementById('catImpEtapa1').style.display='';
  document.getElementById('catImpEtapa2').style.display='none';
  document.getElementById('catImpBtnLer').style.display='';
  document.getElementById('catImpBtnAdd').style.display='none';
  document.getElementById('catImpBtnVoltar').style.display='none';
  _catImpStatus('');
}
function catImpDest(d){
  _catImp.dest=d;
  document.getElementById('catImpDestFob').classList.toggle('active',d==='fob');
  document.getElementById('catImpDestExw').classList.toggle('active',d==='exw');
}
function _catImpStatus(msg,erro){const el=document.getElementById('catImpStatus');el.style.display=msg?'block':'none';el.style.color=erro?'var(--danger)':'var(--text2)';el.textContent=msg;}

// Lê os arquivos, reduz para no máx. 2000px (envio mais rápido) e guarda em base64
function catImpArquivos(files){
  const lista=[...(files||[])].filter(f=>/^image\//.test(f.type));
  if(!lista.length){showToast('Escolha arquivos de imagem','error');return;}
  lista.forEach(catImpArquivo);
}
function catImpArquivo(file){
  if(!file||!/^image\//.test(file.type))return;
  const fr=new FileReader();
  fr.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const max=2000,k=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
      const url=c.toDataURL('image/jpeg',0.92);
      _catImp.imgs.push({url,b64:url.split(',')[1],mime:'image/jpeg'});
      _catImpThumbs();_catImpStatus('');
    };
    img.src=e.target.result;
  };
  fr.readAsDataURL(file);
}
function catImpRemoverImg(i){_catImp.imgs.splice(i,1);_catImpThumbs();}
function _catImpThumbs(){
  const el=document.getElementById('catImpThumbs');if(!el)return;
  el.innerHTML=_catImp.imgs.map((im,i)=>`<div class="imp-thumb">
    <img src="${im.url}" alt="Imagem ${i+1}">
    <span class="imp-thumb-num">${i+1}</span>
    <button onclick="catImpRemoverImg(${i})" title="Remover imagem" aria-label="Remover imagem ${i+1}">×</button>
  </div>`).join('');
}
// Colar (Ctrl+V) e arrastar
document.addEventListener('paste',e=>{
  const m=document.getElementById('modalCatImp');if(!m||m.style.display==='none')return;
  const its=[...(e.clipboardData?.items||[])].filter(i=>i.type.startsWith('image/'));
  if(its.length){e.preventDefault();its.forEach(i=>catImpArquivo(i.getAsFile()));}
});
document.addEventListener('dragover',e=>{if(e.target.closest&&e.target.closest('#catImpDrop'))e.preventDefault();});
document.addEventListener('drop',e=>{if(e.target.closest&&e.target.closest('#catImpDrop')){e.preventDefault();catImpArquivos(e.dataTransfer.files);}});

// ---------- Gemini ----------
const _CAT_IMP_PROMPT='Esta imagem é uma tabela de preços de revestimentos cerâmicos enviada pela fábrica. '+
 'Extraia TODAS as linhas de produto, na ordem em que aparecem. Para cada linha retorne: '+
 'descricao = texto da coluna de descrição/produto, sem anotações entre parênteses como "(Lançamento)"; '+
 'formato = formato da peça (ex.: 60x60, 31x60), da coluna de formato ou do próprio nome; '+
 'preco = preço como número com ponto decimal (a tabela usa vírgula decimal, ex.: 2,85 -> 2.85). '+
 'Ignore cabeçalhos, totais e linhas cortadas que não dão para ler inteiras. Não invente linhas.';

async function _catGeminiReq(key,model,im){
  const body={
    contents:[{parts:[{text:_CAT_IMP_PROMPT},{inline_data:{mime_type:im.mime,data:im.b64}}]}],
    generationConfig:{temperature:0,responseMimeType:'application/json',
      responseSchema:{type:'ARRAY',items:{type:'OBJECT',properties:{descricao:{type:'STRING'},formato:{type:'STRING'},preco:{type:'NUMBER'}},required:['descricao','preco']}}}
  };
  return fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+encodeURIComponent(key),
    {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
}
// Se o modelo salvo deixar de existir, procura o "flash" mais novo disponível
async function _catGeminiAcharModelo(key){
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key='+encodeURIComponent(key));
  if(!r.ok)return '';
  const d=await r.json();
  const ver=n=>parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/)||[])[1]||0);
  const ms=(d.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent'))
    .map(m=>m.name.replace('models/','')).filter(n=>/^gemini-.*flash/i.test(n)&&!/lite|image|tts|live|audio|exp|8b|thinking/i.test(n))
    .sort((a,b)=>(ver(b)-ver(a))||(/preview/.test(a)-/preview/.test(b))||(a.length-b.length));
  return ms[0]||'';
}
async function _catGemini(key,im){
  let model=_catImpLS(CAT_IMP_MODEL)||'gemini-2.5-flash';
  let r=await _catGeminiReq(key,model,im);
  if(r.status===404){
    const novo=await _catGeminiAcharModelo(key);
    if(novo&&novo!==model){model=novo;_catImpLS(CAT_IMP_MODEL,model);r=await _catGeminiReq(key,model,im);}
  }
  if(!r.ok){
    let msg='';try{msg=(await r.json()).error?.message||'';}catch(e){}
    if(r.status===400&&/API key/i.test(msg))throw new Error('Chave da API inválida');
    if(r.status===429)throw new Error('Limite da cota gratuita atingido. Aguarde 1 minuto e tente de novo.');
    throw new Error('Gemini '+r.status+(msg?': '+msg:''));
  }
  const d=await r.json();
  const txt=(d.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('').replace(/^```(?:json)?|```$/gm,'').trim();
  const arr=JSON.parse(txt||'[]');
  if(!Array.isArray(arr))throw new Error('Resposta inesperada da IA');
  return arr;
}

async function catImpLer(){
  const key=(document.getElementById('catImpKey').value||'').trim();
  if(!_catImp.imgs.length){showToast('Escolha ao menos uma imagem','error');return;}
  if(!key){showToast('Informe a chave da API Gemini','error');return;}
  _catImpLS(CAT_IMP_KEY,key);
  const btn=document.getElementById('catImpBtnLer');btn.disabled=true;
  const n=_catImp.imgs.length,falhas=[];let lidos=[];
  try{
    for(let i=0;i<n;i++){
      _catImpStatus(`Lendo imagem ${i+1} de ${n}... (até 30 s cada)`);
      try{lidos=lidos.concat(await _catGemini(key,_catImp.imgs[i]));}
      catch(e){
        if(/Chave da API/.test(e.message||''))throw e;
        falhas.push('imagem '+(i+1)+': '+(e.message||e));
      }
    }
    // Remove linhas repetidas (mesma linha aparecendo em dois prints)
    const vistos=new Set();
    lidos=lidos.filter(l=>{const k=_catImpNorm(l.descricao)+'|'+_catImpFmt(l.formato||l.descricao)+'|'+(Math.round((parseFloat(l.preco)||0)*100));if(vistos.has(k))return false;vistos.add(k);return true;});
    if(!lidos.length)throw new Error(falhas.length?falhas.join(' | '):'Nenhum produto encontrado nas imagens');
    _catImp.linhas=lidos.map(l=>_catImpCasar(l));
    _catImpMarcarDuplicados();
    _catImpRender();
    document.getElementById('catImpEtapa1').style.display='none';
    document.getElementById('catImpEtapa2').style.display='';
    btn.style.display='none';
    document.getElementById('catImpBtnAdd').style.display='';
    document.getElementById('catImpBtnVoltar').style.display='';
    _catImpStatus(falhas.length?'Não foi possível ler: '+falhas.join(' | '):'',!!falhas.length);
  }catch(e){
    _catImpStatus('Erro: '+(e.message||e),true);
  }finally{btn.disabled=false;}
}

// ---------- Casamento com a planilha (nome + formato) ----------
function _catImpFmt(s){
  const m=String(s||'').toUpperCase().replace(/O(?=\d)|(?<=\d)O/g,'0').match(/(\d+(?:[.,]\d+)?)\s*[X×]\s*(\d+(?:[.,]\d+)?)/);
  return m?(m[1].replace(',','.')+'X'+m[2].replace(',','.')):'';
}
function _catImpNorm(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase()
    .replace(/\(.*?(\)|$)/g,' ')
    .replace(/(?<=\d)O|O(?=\d)/g,'0')
    .replace(/\d+(?:[.,]\d+)?\s*[X×]\s*\d+(?:[.,]\d+)?/g,' ')
    .replace(/\bCM\b/g,' ')
    .replace(/[^A-Z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
}
function _catImpBigr(s){const a=[];s=s.replace(/ /g,'');for(let i=0;i<s.length-1;i++)a.push(s.substr(i,2));return a;}
function _catImpDice(a,b){
  const A=_catImpBigr(a),B=_catImpBigr(b);if(!A.length||!B.length)return a===b?1:0;
  const m={};A.forEach(x=>m[x]=(m[x]||0)+1);let c=0;B.forEach(x=>{if(m[x]>0){c++;m[x]--;}});
  return 2*c/(A.length+B.length);
}
function _catImpTokEq(a,b){
  if(a===b)return true;
  if(a.length>=3&&b.length>=3&&(a.startsWith(b)||b.startsWith(a)))return true;
  return a.length>=5&&b.length>=5&&_catImpDice(a,b)>=0.8;
}
function _catImpScore(nLido,fLido,p){
  const nP=_catImpNorm(p.nome);if(!nP)return 0;
  const tA=nLido.split(' ').filter(Boolean),tB=nP.split(' ').filter(Boolean);
  let inter=0;const usados=new Set();
  tB.forEach(b=>{const i=tA.findIndex((a,ix)=>!usados.has(ix)&&_catImpTokEq(a,b));if(i>=0){usados.add(i);inter++;}});
  const tok=tA.length+tB.length?2*inter/(tA.length+tB.length):0;
  let sc=0.6*tok+0.4*_catImpDice(nLido,nP);
  // 1ª palavra do nome lido (ex.: ANGELUS, SHINE) precisa existir no produto
  if(tA[0]&&!tB.some(b=>_catImpTokEq(tA[0],b)))sc*=0.6;
  const fP=_catImpFmt(p.formato)||_catImpFmt(p.nome);
  if(fLido&&fP)sc=(fLido===fP)?Math.min(1,sc+0.12):sc*0.7;
  return sc;
}
function _catImpCasar(l){
  const desc=String(l.descricao||'').trim();
  const fLido=_catImpFmt(l.formato)||_catImpFmt(desc);
  const nLido=_catImpNorm(desc);
  const cands=PRODUCTS.filter(p=>p.codigo).map(p=>({p,s:_catImpScore(nLido,fLido,p)})).sort((a,b)=>b.s-a.s).slice(0,8);
  const b=cands[0],s2=cands[1]?cands[1].s:0;
  let status='nao',cod='';
  if(b&&b.s>=0.5){cod=b.p.codigo;status=(b.s>=0.97||(b.s>=0.8&&b.s-s2>=0.06)||(b.s>=0.6&&b.s-s2>=0.3))?'ok':'duvida';}
  return {desc,formato:l.formato||'',preco:Math.round((parseFloat(l.preco)||0)*100)/100,cands,cod,status,statusOrig:status};
}
function _catImpMarcarDuplicados(){
  const cont={};_catImp.linhas.forEach(l=>{if(l.cod)cont[l.cod]=(cont[l.cod]||0)+1;});
  _catImp.linhas.forEach(l=>{if(l.cod&&!l.confirmado&&cont[l.cod]>1&&l.status==='ok')l.status='duvida';});
}
function catImpEscolher(i,cod){
  const l=_catImp.linhas[i];l.cod=cod;l.confirmado=false;l.status=cod?'ok':'nao';l.statusOrig=l.status;
  _catImpMarcarDuplicados();_catImpRender();
}
function catImpRemoverLinha(i){
  _catImp.linhas.splice(i,1);
  _catImp.linhas.forEach(l=>{if(l.status==='duvida'&&!l.confirmado&&l.cod)l.status='ok';});
  // recalcula o status original de dúvida (sem perder confirmações)
  _catImp.linhas.forEach(l=>{if(!l.confirmado&&l.cod&&l.statusOrig==='duvida')l.status='duvida';});
  _catImpMarcarDuplicados();_catImpRender();
}
function catImpConfirmarLinha(i){
  const l=_catImp.linhas[i];if(!l.cod)return;
  l.confirmado=true;l.status='ok';_catImpRender();
}
function catImpConfirmarTodas(){
  let n=0;_catImp.linhas.forEach(l=>{if(l.cod&&l.status==='duvida'){l.confirmado=true;l.status='ok';n++;}});
  _catImpRender();if(n)showToast(n+' item(ns) confirmado(s)','success');
}
function _catImpRender(){
  const L=_catImp.linhas;
  const n={ok:0,duvida:0,nao:0};L.forEach(l=>n[l.status]++);
  document.getElementById('catImpResumo').innerHTML=
    `<strong>${L.length}</strong> linhas lidas · <span class="st-ok">✅ ${n.ok} ok</span> · <span class="st-duvida">⚠️ ${n.duvida} conferir</span> · <span class="st-nao">❌ ${n.nao} sem correspondência</span>`+
    (n.duvida?` <button class="btn btn-secondary btn-xs" onclick="catImpConfirmarTodas()">Confirmar todos</button>`:'')+
    `<div class="hint">Confira os itens ⚠️ (clique em ✓ quando estiver certo) e ❌. Preços em ${_catImp.dest.toUpperCase()}. Linhas em "Ignorar" não entram na lista.</div>`;
  const ic={ok:'✅',duvida:'⚠️',nao:'❌'};
  document.getElementById('catImpTabela').innerHTML=`<table class="imp-tabela">
    <thead><tr><th></th><th>Lido na imagem</th><th>Produto na planilha</th><th>Preço</th><th></th></tr></thead>
    <tbody>${L.map((l,i)=>{
      const opts=l.cands.map(c=>`<option value="${esc(c.p.codigo)}" ${c.p.codigo===l.cod?'selected':''}>${esc(c.p.nome)} · ${esc(c.p.formato||'')} (${esc(c.p.codigo)})</option>`).join('');
      return `<tr class="imp-${l.status}">
        <td class="nowrap">${ic[l.status]}${l.status==='duvida'&&l.cod?` <button class="btn btn-secondary btn-xs" onclick="catImpConfirmarLinha(${i})" title="Está correto" aria-label="Confirmar">✓</button>`:''}</td>
        <td><div class="forte">${esc(l.desc)}</div><div class="sub">${esc(l.formato)}</div></td>
        <td><select class="input-sm" onchange="catImpEscolher(${i},this.value)"><option value="">— Ignorar —</option>${opts}</select></td>
        <td><input type="number" class="input-sm input-preco" step="0.01" value="${l.preco}" onchange="_catImp.linhas[${i}].preco=parseFloat(this.value)||0"></td>
        <td><button class="btn btn-sm btn-danger btn-icon" onclick="catImpRemoverLinha(${i})" title="Remover da lista" aria-label="Remover da lista">✕</button></td>
      </tr>`;}).join('')}</tbody></table>`;
}

function catImpConfirmar(){
  const sel=_catImp.linhas.filter(l=>l.cod);
  if(!sel.length){showToast('Nenhum produto selecionado','error');return;}
  if(document.getElementById('catImpLimpar').classList.contains('active'))catSelecionados=[];
  const dest=_catImp.dest;let add=0,upd=0;
  sel.forEach(l=>{
    const p=PRODUCTS.find(x=>x.codigo===l.cod);if(!p)return;
    let it=catSelecionados.find(x=>x.produto.codigo===p.codigo);
    if(it){upd++;}
    else{it={produto:p,fob_edit:parseFloat(p.preco_fob)||0,exw_edit:parseFloat(p.preco_exw)||0};catSelecionados.push(it);add++;}
    if(dest==='fob')it.fob_edit=l.preco;else it.exw_edit=l.preco;
  });
  // Liga a exibição de preço no modal escolhido
  if(!_isOn('catMostrarPreco'))catToggle_Preco();
  document.getElementById('catMostrarFob').classList.toggle('active',dest==='fob');
  document.getElementById('catMostrarExw').classList.toggle('active',dest==='exw');
  catRenderSelecionados();
  catImpFechar();
  showToast(add+' adicionado(s)'+(upd?', '+upd+' atualizado(s)':''),'success');
}
