// ============================================================
// API_PWA.gs
// Adicione este arquivo como NOVO arquivo .gs no mesmo projeto
// Apps Script do Codigo.gs (Extensões > Apps Script > ícone "+"
// ao lado de Arquivos > Script). Cole este conteúdo nele.
//
// Depois, veja no final deste arquivo a ÚNICA alteração necessária
// no doGet() do Codigo.gs original.
// ============================================================

// ---------- Roteador GET (produtos, clientes, config, portos) ----------
function _apiRoteadorGet(e) {
  const action = e.parameter.action;
  let resultado;
  try {
    switch (action) {
      case 'produtos':
        resultado = _apiProdutos();
        break;
      case 'clientes':
        resultado = JSON.parse(getClientes());
        break;
      case 'config':
        resultado = JSON.parse(getConfig());
        break;
      case 'portos':
        resultado = JSON.parse(getPortosDestino());
        break;
      default:
        resultado = { success: false, error: 'Ação GET desconhecida: ' + action };
    }
  } catch (err) {
    resultado = { success: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

// getProdutos() já existe no Codigo.gs — só reaproveitamos
function _apiProdutos() {
  return JSON.parse(getProdutos());
}

// ---------- Roteador POST (imagens em lote, pedido, cliente) ----------
function _apiRoteadorPost(e) {
  const action = e.parameter.action;
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  let resultado;
  try {
    switch (action) {
      case 'imagens':
        resultado = { success: true, data: _apiImagensLote(body.ids || []) };
        break;
      case 'pedido':
        resultado = JSON.parse(salvarPedido(JSON.stringify(body)));
        break;
      case 'cliente_novo':
        resultado = JSON.parse(salvarCliente(JSON.stringify(body)));
        break;
      case 'cliente_editar':
        resultado = JSON.parse(atualizarCliente(JSON.stringify(body)));
        break;
      default:
        resultado = { success: false, error: 'Ação POST desconhecida: ' + action };
    }
  } catch (err) {
    resultado = { success: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

// Busca imagens em MÁXIMA qualidade (arquivo original do Drive, não thumbnail).
// O app cliente é quem redimensiona/comprime para WebP antes de salvar localmente.
function _apiImagensLote(fileIds) {
  const result = {};
  fileIds.forEach((fileId) => {
    try {
      const blob = DriveApp.getFileById(fileId).getBlob();
      const mime = blob.getContentType() || 'image/jpeg';
      result[fileId] = 'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes());
    } catch (err) {
      result[fileId] = '';
    }
  });
  return result;
}

// ============================================================
// ÚNICA ALTERAÇÃO NECESSÁRIA no Codigo.gs original:
//
// Troque a função doGet() atual (que só serve o Index.html) por esta:
//
// function doGet(e) {
//   if (e && e.parameter && e.parameter.action) {
//     return _apiRoteadorGet(e);
//   }
//   return HtmlService.createHtmlOutputFromFile('Index')
//     .setTitle('Pedidos de Compra — AD EXPORT')
//     .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
// }
//
// E adicione esta função doPost (não existe uma ainda no projeto):
//
// function doPost(e) {
//   return _apiRoteadorPost(e);
// }
//
// Depois de salvar, vá em Implantar > Gerenciar implantações > ✎ (editar)
// > Nova versão > Implantar, para que o link já existente passe a
// responder com essa lógica nova.
// ============================================================
