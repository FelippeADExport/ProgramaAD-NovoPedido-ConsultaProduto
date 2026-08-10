// ============================================================
// config.js — Aba "Configurações"
// ============================================================

function carregarConfiguracoesUI() {
  document.getElementById('cfg-itapoa').value = ((CFG.acrescimo_itapoa || 0) * 100).toFixed(2);
  document.getElementById('cfg-europallet').value = ((CFG.acrescimo_europallet || 0) * 100).toFixed(2);
}

async function salvarConfiguracoes() {
  if (!navigator.onLine) { mostrarToast('Precisa de internet para salvar', 'error'); return; }
  const itapoa = parseFloat(document.getElementById('cfg-itapoa').value) / 100;
  const europallet = parseFloat(document.getElementById('cfg-europallet').value) / 100;
  if (isNaN(itapoa) || isNaN(europallet)) { mostrarToast('Valores inválidos', 'error'); return; }
  try {
    await API.salvarConfig({ acrescimo_itapoa: itapoa, acrescimo_europallet: europallet });
    CFG.acrescimo_itapoa = itapoa;
    CFG.acrescimo_europallet = europallet;
    await DB.setMeta('config', CFG);
    mostrarToast('Configurações salvas', 'success');
  } catch (e) {
    mostrarToast('Erro ao salvar: ' + e.message, 'error');
  }
}
