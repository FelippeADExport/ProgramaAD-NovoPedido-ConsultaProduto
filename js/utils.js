// ============================================================
// UTILITÁRIOS usados em todo o app
// ============================================================

// Número no formato brasileiro com 2 casas (1.234,56)
function fmtN(n){return isNaN(n)?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}

// Escapa texto para inserir com segurança dentro de HTML
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// Mostra/esconde modais que usam a classe .hidden
function abrirModal(id){document.getElementById(id).classList.remove('hidden');}
function fecharModal(id){document.getElementById(id).classList.add('hidden');}

function showToast(msg,type){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+(type||'');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),3200);}
