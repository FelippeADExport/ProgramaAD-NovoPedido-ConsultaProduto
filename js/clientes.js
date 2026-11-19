// ============================================================
// ABA CONSULTA CLIENTE: lista, filtros, criar/editar/excluir
// ============================================================
let _cliEditId = null;
// Campos de texto simples do modal (id do input = 'mc-' + nome do campo); e-mail e observações são tratados à parte
const MC_CAMPOS=['nome','rut','endereco','complemento','provincia','cidade','pais','cep','contato','telefone'];

function cliPopulatePaises(){
  const sel=document.getElementById('cli-filtro-pais');
  const cur=sel.value;
  const paises=[...new Set(CLIENTS.map(c=>(c.pais||'').trim()).filter(Boolean))].sort();
  sel.innerHTML='<option value="">Todos os países</option>'+paises.map(p=>`<option value="${p}">${p}</option>`).join('');
  if(cur)sel.value=cur;
}

function cliPopulateCidades(){
  const pais=(document.getElementById('cli-filtro-pais').value||'').trim();
  const sel=document.getElementById('cli-filtro-cidade');
  const cur=sel.value;
  const fonte=pais?CLIENTS.filter(c=>(c.pais||'').trim()===pais):CLIENTS;
  const cidades=[...new Set(fonte.map(c=>(c.cidade||'').trim()).filter(Boolean))].sort();
  sel.innerHTML='<option value="">Todas as cidades</option>'+cidades.map(c=>`<option value="${c}">${c}</option>`).join('');
  if(cur&&cidades.includes(cur))sel.value=cur;
  filtrarClientes();
}

function renderClientes(){
  const loading=document.getElementById('cli-loading');
  const wrap=document.getElementById('cli-table-wrap');
  const empty=document.getElementById('cli-empty');
  if(!CLIENTS.length){
    loading.style.display='none';
    empty.classList.remove('hidden');
    wrap.classList.add('hidden');
    document.getElementById('cli-count').style.display='none';
    return;
  }
  loading.style.display='none';
  cliPopulatePaises();
  cliPopulateCidades();
  filtrarClientes();
  document.getElementById('tabClientesCount').textContent=CLIENTS.length;
}

function filtrarClientes(){
  const qNome=(document.getElementById('cli-filtro-nome').value||'').toLowerCase().trim();
  const qPais=(document.getElementById('cli-filtro-pais').value||'').trim();
  const qCidade=(document.getElementById('cli-filtro-cidade').value||'').trim();
  const lista=CLIENTS.filter(c=>{
    if(qNome&&!(c.nome||'').toLowerCase().includes(qNome)&&!(c.id||'').toLowerCase().includes(qNome))return false;
    if(qPais&&(c.pais||'').trim()!==qPais)return false;
    if(qCidade&&(c.cidade||'').trim()!==qCidade)return false;
    return true;
  });
  const wrap=document.getElementById('cli-table-wrap');
  const empty=document.getElementById('cli-empty');
  const cnt=document.getElementById('cli-count');
  if(!lista.length){
    wrap.classList.add('hidden');
    empty.classList.remove('hidden');
    cnt.style.display='none';
    return;
  }
  wrap.classList.remove('hidden');
  wrap.style.display='block';
  empty.classList.add('hidden');
  cnt.style.display='block';
  cnt.textContent=lista.length+' cliente'+(lista.length!==1?'s':'')+(CLIENTS.length!==lista.length?' de '+CLIENTS.length:'');
  document.getElementById('cli-tbody').innerHTML=lista.map(c=>`<tr>
    <td class="code">${esc(c.id)}</td>
    <td class="ped-client-cell">${esc(c.nome)}</td>
    <td class="txt-left">${esc(c.pais||'—')}</td>
    <td class="txt-left">${esc(c.cidade||'—')}</td>
    <td class="txt-left">${esc(c.contato||'—')}</td>
    <td class="txt-left">${esc(c.telefone||'—')}</td>
    <td class="txt-left cli-email">${(c.email||'—').split(';').map(e=>esc(e.trim())).filter(Boolean).join('<br>')}</td>
    <td class="txt-left cli-obs">${esc(c.obs||'—')}</td>
    <td><button class="btn btn-sm btn-secondary btn-icon" onclick="abrirModalCliente('${esc(c.id)}')" title="Editar" aria-label="Editar">✏️</button></td>
  </tr>`).join('');
}

function abrirModalNovoCliente(){
  _cliEditId=null;
  document.getElementById('modalClienteTitulo').textContent='Novo cliente';
  document.getElementById('modalClienteId').textContent='ID gerado automaticamente';
  ['mc-nome','mc-rut','mc-endereco','mc-complemento','mc-provincia',
   'mc-cidade','mc-pais','mc-cep','mc-contato','mc-telefone','mc-email','mc-obs']
    .forEach(id=>document.getElementById(id).value='');
  // Ocultar botão excluir no modal de novo cliente
  document.getElementById('btnExcluirModalCliente').style.display='none';
  document.getElementById('modalCliente').classList.remove('hidden');
}

function abrirModalCliente(id){
  const c=CLIENTS.find(x=>x.id===id);
  if(!c)return;
  _cliEditId=id;
  document.getElementById('btnExcluirModalCliente').style.display='';
  document.getElementById('modalClienteTitulo').textContent='Editar cliente';
  document.getElementById('modalClienteId').textContent='ID: '+id;
  MC_CAMPOS.forEach(k=>{document.getElementById('mc-'+k).value=c[k]||'';});
  // Email: substituir ; por newline para exibição
  document.getElementById('mc-email').value=(c.email||'').replace(/;/g,'\n');
  document.getElementById('mc-obs').value=c.obs||'';
  document.getElementById('modalCliente').classList.remove('hidden');
}

function fecharModalCliente(){
  document.getElementById('modalCliente').classList.add('hidden');
  _cliEditId=null;
}

function salvarClienteModal(){
  const nome=document.getElementById('mc-nome').value.trim();
  if(!nome){showToast('Nome obrigatório','error');return;}
  const emailRaw=document.getElementById('mc-email').value;
  const email=emailRaw.split('\n').map(e=>e.trim()).filter(Boolean).join(';');
  const c={id:_cliEditId||''};
  MC_CAMPOS.forEach(k=>{c[k]=document.getElementById('mc-'+k).value.trim();});
  c.email=email;
  c.obs=document.getElementById('mc-obs').value.trim();
  const btn=document.getElementById('btnSalvarCliente');
  btn.disabled=true;btn.textContent='Salvando...';
  const isNovo=!_cliEditId;
  const payload=JSON.stringify(c);
  const runner=google.script.run
    .withSuccessHandler(r=>{
      btn.disabled=false;btn.textContent='Salvar';
      const d=JSON.parse(r);
      if(d.success){
        if(isNovo){
          c.id=d.id;
          CLIENTS.unshift(c);
          document.getElementById('tabClientesCount').textContent=CLIENTS.length;
        } else {
          const idx=CLIENTS.findIndex(x=>x.id===_cliEditId);
          if(idx>=0)CLIENTS[idx]={...CLIENTS[idx],...c};
        }
        fecharModalCliente();
        cliPopulatePaises();
        cliPopulateCidades();
        filtrarClientes();
        showToast(isNovo?'Cliente criado. ID: '+d.id:'Cliente atualizado','success');
      }else showToast('Erro: '+d.error,'error');
    })
    .withFailureHandler(e=>{btn.disabled=false;btn.textContent='Salvar';showToast('Erro: '+e.message,'error');});
  if(isNovo){runner.salvarCliente(payload);}
  else{runner.atualizarCliente(payload);}
}

function excluirClienteModal(){
  if(!_cliEditId)return;
  const c=CLIENTS.find(x=>x.id===_cliEditId);
  document.getElementById('modalExcluirClienteNome').textContent=(c?c.nome:_cliEditId);
  document.getElementById('modalCliente').classList.add('hidden');
  document.getElementById('modalExcluirCliente').classList.remove('hidden');
}

function confirmarExcluirCliente(){
  const btn=document.getElementById('btnConfirmarExcluirCliente');
  btn.disabled=true;btn.textContent='Excluindo...';
  google.script.run
    .withSuccessHandler(r=>{
      btn.disabled=false;btn.textContent='Excluir';
      const d=JSON.parse(r);
      if(d.success){
        CLIENTS=CLIENTS.filter(x=>x.id!==_cliEditId);
        _cliEditId=null;
        document.getElementById('modalExcluirCliente').classList.add('hidden');
        cliPopulatePaises();
        cliPopulateCidades();
        filtrarClientes();
        document.getElementById('tabClientesCount').textContent=CLIENTS.length;
        showToast('Cliente excluído','success');
      }else showToast('Erro: '+d.error,'error');
    })
    .withFailureHandler(e=>{btn.disabled=false;btn.textContent='Excluir';showToast('Erro: '+e.message,'error');})
    .excluirCliente(_cliEditId);
}

document.addEventListener('click',e=>{
  if(e.target===document.getElementById('modalCliente'))fecharModalCliente();
  if(e.target===document.getElementById('modalExcluirCliente'))document.getElementById('modalExcluirCliente').classList.add('hidden');
});
