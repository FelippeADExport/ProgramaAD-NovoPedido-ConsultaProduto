// ============================================================
// AD EXPORT — CONSULTA DE PRODUTOS (VERSÃO CLIENTE)
// Programa somente leitura. NÃO envia preços ao navegador.
// ============================================================
const PRODUTOS_SHEET_ID = '1BAPsQMcrd1UzysjGteK0DNpMcGMDlL3XuD3dvNdWa1k';

// ============================================================
// PONTO DE ENTRADA
// Aceita ?lang=pt | es | en no link para abrir já no idioma
// ============================================================
function doGet(e) {
  const t = HtmlService.createTemplateFromFile('Index');
  const lang = String((e && e.parameter && e.parameter.lang) || '').toLowerCase();
  t.langParam = ['pt', 'es', 'en'].indexOf(lang) >= 0 ? lang : '';
  return t.evaluate()
    .setTitle('AD EXPORT')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// PRODUTOS — somente campos públicos (sem preços)
// Packing lido como TEXTO para manter valores duplos "28 / 56"
// ============================================================
function getProdutosCliente() {
  try {
    const ss = SpreadsheetApp.openById(PRODUTOS_SHEET_ID);
    const sheet = ss.getSheetByName('Banco de dados - Produto') ||
                  ss.getSheetByName('banco de dados - produto') ||
                  ss.getSheetByName('Produtos');
    if (!sheet) return JSON.stringify({ success: false, error: 'Aba de produtos não encontrada' });

    // Linhas 1-3 são cabeçalho; dados a partir da linha 4
    const rows = sheet.getDataRange().getValues().slice(3);

    const toImg = s => {
      if (!s) return '';
      const str = String(s).trim();
      const m1 = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (m1) return 'https://drive.google.com/thumbnail?id=' + m1[1] + '&sz=w600';
      const m2 = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m2) return 'https://drive.google.com/thumbnail?id=' + m2[1] + '&sz=w600';
      return str;
    };
    const gs = (r, i) => String(r[i] !== undefined && r[i] !== null ? r[i] : '').trim();

    // Bloco de packing: b = 1ª coluna (Pieces), size = coluna Pallet Size
    const pk = (r, b, size, camadas) => ({
      cx_pecas:    gs(r, b),
      cx_sqmt:     gs(r, b + 1),
      cx_peso:     gs(r, b + 2),
      pal_caixas:  gs(r, b + 3),
      pal_sqmt:    gs(r, b + 4),
      pal_peso:    gs(r, b + 5),
      con_pallets: gs(r, b + 6),
      con_sqmt:    gs(r, b + 7),
      con_caixas:  gs(r, b + 8),
      con_peso:    gs(r, b + 9),
      medidas:     gs(r, size),
      camadas:     camadas
    });

    const produtos = [];
    rows.forEach(r => {
      const codigo = gs(r, 2);
      if (!codigo) return;
      produtos.push({
        // Identificação
        formato:    gs(r, 1),
        codigo:     codigo,
        barcode:    gs(r, 3),
        nome:       gs(r, 4),
        // Imagens
        imagem:     toImg(r[5]),
        imagem2:    toImg(r[6]),
        imagem3:    toImg(r[7]),
        // Características
        face:       gs(r, 8),
        local_uso:  gs(r, 9),
        thickness:  gs(r, 10),
        vt:         gs(r, 14),
        // Colunas R-S e AE-AF (preços) propositalmente NÃO lidas
        pack: {
          // Pallet Americano: T-AC, medidas AD, camadas BC
          am:  pk(r, 19, 29, [{ l: '', v: gs(r, 54) }]),
          // Europallet: AG-AP, medidas AQ, camadas BE
          eu:  pk(r, 32, 42, [{ l: '', v: gs(r, 56) }]),
          // EXW: AR-BA, medidas BB, camadas BD (americano) e BF (euro)
          exw: pk(r, 43, 53, [{ l: 'palAm', v: gs(r, 55) }, { l: 'palEu', v: gs(r, 57) }])
        }
      });
    });
    return JSON.stringify({ success: true, data: produtos });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ============================================================
// TESTE — rodar pelo editor (▶ Executar) para autorizar o acesso
// ao Drive e ver no log se a 1ª foto do 1º produto baixa
// ============================================================
function testarFoto() {
  // Força o Google a pedir TODAS as permissões que ainda faltam
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  const prods = JSON.parse(getProdutosCliente()).data;
  const p = prods.find(x => x.imagem);
  if (!p) { Logger.log('Nenhum produto com foto na coluna F'); return; }
  const r = JSON.parse(getFotoDownload(p.codigo, 1));
  Logger.log(r.success
    ? 'OK: ' + p.codigo + ' | ' + r.mime + ' | ' + Math.round(r.data.length * 0.75 / 1024) + ' KB'
    : 'ERRO: ' + p.codigo + ' | ' + r.error);
}

// ============================================================
// DOWNLOAD DE FOTO — devolve a imagem em base64 (alta resolução)
// Segurança: recebe CÓDIGO + nº da foto (1,2,3), nunca um ID do
// Drive. Assim o cliente só baixa fotos cadastradas na planilha.
// ============================================================
function getFotoDownload(codigo, idx) {
  try {
    const n = parseInt(idx, 10);
    if (!(n >= 1 && n <= 3)) throw new Error('Foto inválida');
    const ss = SpreadsheetApp.openById(PRODUTOS_SHEET_ID);
    const sheet = ss.getSheetByName('Banco de dados - Produto') ||
                  ss.getSheetByName('banco de dados - produto') ||
                  ss.getSheetByName('Produtos');
    const rows = sheet.getDataRange().getValues().slice(3);
    const row = rows.find(r => String(r[2] || '').trim() === String(codigo).trim());
    if (!row) throw new Error('Produto não encontrado');

    const link = String(row[4 + n] || '').trim();       // F, G, H
    const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (!m) throw new Error('Foto não encontrada');
    const fid = m[1];

    let blob = DriveApp.getFileById(fid).getBlob();
    let mime = blob.getContentType() || '';
    // Formatos que o navegador não abre bem (HEIC etc.) → JPEG via thumbnail grande
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0) {
      const resp = UrlFetchApp.fetch('https://drive.google.com/thumbnail?id=' + fid + '&sz=w3000', {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (resp.getResponseCode() !== 200) throw new Error('Não foi possível converter a foto');
      blob = resp.getBlob();
      mime = 'image/jpeg';
    }
    const ext = mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : 'jpg');
    return JSON.stringify({ success: true, mime: mime, ext: ext, data: Utilities.base64Encode(blob.getBytes()) });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
}
