// ============================================================
// PROMOÇÕES — listas promocionais da fábrica (aba Lista de preços)
//
// COMO INSTALAR (uma vez):
// 1. No editor do Apps Script, crie um arquivo "Promocoes" e cole este código.
// 2. No Codigo.gs, acrescente na lista _RPC_PERMITIDAS:
//      'getPromocoes', 'salvarPromocao', 'alterarStatusPromocao', 'editarPromocao', 'excluirPromocao'
// 3. Implantar > Gerenciar implantações > editar > Nova versão > Implantar.
//
// A aba "Promocoes" é criada sozinha na planilha de produtos.
// Uma linha por item; os itens da mesma promoção têm o mesmo ID.
// STATUS = ATIVA ou FINALIZADA (pode ser trocado no app ou direto na planilha).
// ============================================================
const PROMO_ABA = 'Promocoes';
const PROMO_CAB = ['ID', 'NOME', 'FRETE', 'STATUS', 'CODIGO', 'DESCRICAO_LIDA', 'PRECO', 'CRIADO_EM'];

function _promoSheet() {
  const ss = SpreadsheetApp.openById(PRODUTOS_SHEET_ID);
  let sh = ss.getSheetByName(PROMO_ABA);
  if (!sh) {
    sh = ss.insertSheet(PROMO_ABA);
    sh.getRange(1, 1, 1, PROMO_CAB.length).setValues([PROMO_CAB]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function getPromocoes() {
  try {
    const rows = _promoSheet().getDataRange().getValues();
    const mapa = {}, ordem = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const id = String(r[0] || '').trim();
      if (!id) continue;
      if (!mapa[id]) {
        mapa[id] = { id: id, nome: String(r[1] || ''), frete: String(r[2] || '').trim(),
                     status: String(r[3] || 'ATIVA').trim().toUpperCase(), itens: [] };
        ordem.push(id);
      }
      mapa[id].itens.push({ codigo: String(r[4] || '').trim(), descricao: String(r[5] || ''), preco: parseFloat(r[6]) || 0 });
    }
    return JSON.stringify({ success: true, data: ordem.map(function (id) { return mapa[id]; }) });
  } catch (e) { return JSON.stringify({ success: false, error: e.message }); }
}

function salvarPromocao(json) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const p = JSON.parse(json);
    if (!p.nome || !p.frete || !p.itens || !p.itens.length) throw new Error('Promoção incompleta');
    const id = 'PROMO-' + new Date().getTime();
    const agora = new Date();
    const linhas = p.itens.map(function (it) {
      return [id, p.nome, p.frete, 'ATIVA', it.codigo, it.descricao || '', Number(it.preco) || 0, agora];
    });
    const sh = _promoSheet();
    sh.getRange(sh.getLastRow() + 1, 1, linhas.length, PROMO_CAB.length).setValues(linhas);
    return JSON.stringify({ success: true, id: id });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  } finally { lock.releaseLock(); }
}

function alterarStatusPromocao(id, status) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    status = String(status || '').toUpperCase();
    if (status !== 'ATIVA' && status !== 'FINALIZADA') throw new Error('Status inválido');
    const sh = _promoSheet();
    const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    for (let i = 1; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === id) sh.getRange(i + 1, 4).setValue(status);
    }
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  } finally { lock.releaseLock(); }
}

// Troca nome e fretes de uma promoção (todas as linhas dela)
function editarPromocao(id, json) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(json);
    if (!d.nome || !d.frete) throw new Error('Nome e frete são obrigatórios');
    const sh = _promoSheet();
    const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    for (let i = 1; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === id) sh.getRange(i + 1, 2, 1, 2).setValues([[d.nome, d.frete]]);
    }
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  } finally { lock.releaseLock(); }
}

function excluirPromocao(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = _promoSheet();
    const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    for (let i = ids.length - 1; i >= 1; i--) {
      if (String(ids[i][0]).trim() === id) sh.deleteRow(i + 1);
    }
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  } finally { lock.releaseLock(); }
}
