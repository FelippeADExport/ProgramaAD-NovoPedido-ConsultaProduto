// ============================================================
// API_PWA.gs — Referência de todas as rotas usadas pelo PWA.
// Substitua _apiRoteadorGet e _apiRoteadorPost no seu Codigo.gs
// por estas versões (elas já incluem todas as rotas novas).
// Depois: Implantar > Gerenciar implantações > ✎ > Nova versão > Implantar.
// ============================================================

function _apiRoteadorGet(e) {
  const action = e.parameter.action;
  let resultado;
  try {
    switch (action) {
      case 'produtos':
        resultado = JSON.parse(getProdutos());
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
      case 'pedidos':
        resultado = JSON.parse(getPedidos());
        break;
      case 'itens_pedido':
        resultado = JSON.parse(getItensPedido(e.parameter.numero));
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
      case 'atualizar_pedido':
        resultado = JSON.parse(atualizarPedido(JSON.stringify(body.pedido), body.numeroOriginal, body.linkPdfAntigo || ''));
        break;
      case 'excluir_pedido':
        resultado = JSON.parse(excluirPedido(body.numero, body.linkPdf || ''));
        break;
      case 'gerar_pdf':
        resultado = JSON.parse(gerarPdfESalvar(JSON.stringify(body)));
        break;
      case 'cliente_novo':
        resultado = JSON.parse(salvarCliente(JSON.stringify(body)));
        break;
      case 'cliente_editar':
        resultado = JSON.parse(atualizarCliente(JSON.stringify(body)));
        break;
      case 'salvar_config':
        resultado = JSON.parse(salvarConfig(JSON.stringify(body)));
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
// doGet / doPost no Codigo.gs devem ser exatamente:
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
// function doPost(e) {
//   return _apiRoteadorPost(e);
// }
// ============================================================
