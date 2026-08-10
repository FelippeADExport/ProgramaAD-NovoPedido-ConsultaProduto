// ============================================================
// catalogo.js — Aba "Catálogo PDF"
// Gera o PDF no próprio navegador (jsPDF) usando as fotos já
// salvas localmente — por isso funciona mesmo offline.
// ============================================================

let catSelecionados = []; // array de códigos de produto

function montarFiltrosCatalogo() {
  const formatos = valoresUnicos(PRODUTOS, 'formato');
  document.getElementById('cat-filtro-formato').innerHTML = '<option value="">Todos</option>' + formatos.map((f) => `<option value="${f}">${f}</option>`).join('');
  catAtualizarNomes();
}

function catAtualizarNomes() {
  const f = document.getElementById('cat-filtro-formato').value;
  const lista = f ? PRODUTOS.filter((p) => p.formato === f) : PRODUTOS;
  document.getElementById('cat-filtro-produto').innerHTML = '<option value="">Selecione...</option>' + lista.map((p) => `<option value="${p.codigo}">${p.codigo} — ${p.nome}</option>`).join('');
}

function catAdicionarSelecionado() {
  const codigo = document.getElementById('cat-filtro-produto').value;
  if (!codigo) return;
  if (!catSelecionados.includes(codigo)) catSelecionados.push(codigo);
  catRenderSelecionados();
}

function catAdicionarTodosFormato() {
  const f = document.getElementById('cat-filtro-formato').value;
  const lista = f ? PRODUTOS.filter((p) => p.formato === f) : PRODUTOS;
  lista.forEach((p) => { if (!catSelecionados.includes(p.codigo)) catSelecionados.push(p.codigo); });
  catRenderSelecionados();
}

function catRemoverSelecionado(codigo) {
  catSelecionados = catSelecionados.filter((c) => c !== codigo);
  catRenderSelecionados();
}

function catRenderSelecionados() {
  document.getElementById('cat-contagem').textContent = catSelecionados.length;
  const box = document.getElementById('cat-lista-selecionados');
  if (!catSelecionados.length) {
    box.innerHTML = '<div class="empty-state"><div class="sub">Nenhum produto selecionado</div></div>';
    return;
  }
  box.innerHTML = catSelecionados.map((codigo) => {
    const p = PRODUTOS.find((x) => x.codigo === codigo);
    if (!p) return '';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${p.codigo} — ${p.nome}</span>
      <button class="item-remove" onclick="catRemoverSelecionado('${codigo}')">×</button>
    </div>`;
  }).join('');
}

function _blobParaDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function _imagemParaDataURL(urlOriginal) {
  const id = extrairFileId(urlOriginal);
  if (!id) return null;
  const blob = await DB.pegarImagem(id);
  if (!blob) return null;
  try {
    return await _blobParaDataURL(blob);
  } catch (e) { return null; }
}

async function gerarCatalogoPdf() {
  if (!catSelecionados.length) { mostrarToast('Selecione ao menos um produto', 'error'); return; }
  if (typeof window.jspdf === 'undefined') { mostrarToast('Biblioteca de PDF não carregou (precisa de internet na primeira vez)', 'error'); return; }

  const btn = document.getElementById('cat-btn-gerar');
  btn.disabled = true;
  btn.textContent = 'Gerando PDF...';

  try {
    const mostrarPreco = document.getElementById('cat-mostrar-preco').checked;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    for (let i = 0; i < catSelecionados.length; i++) {
      const p = PRODUTOS.find((x) => x.codigo === catSelecionados[i]);
      if (!p) continue;
      if (i > 0) doc.addPage();

      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(p.nome || '', 15, 20);
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`${p.formato || ''}  ·  Código: ${p.codigo || ''}`, 15, 28);

      let y = 38;
      const dataUrl = await _imagemParaDataURL(p.imagem);
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, 'WEBP', 15, y, 90, 90, undefined, 'FAST');
        } catch (e) {
          try { doc.addImage(dataUrl, 'JPEG', 15, y, 90, 90, undefined, 'FAST'); } catch (e2) {}
        }
      }

      const infoX = 115;
      let infoY = y + 6;
      const linha = (label, valor) => {
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(label, infoX, infoY);
        doc.setFontSize(11);
        doc.setTextColor(20);
        doc.text(String(valor || '—'), infoX, infoY + 5);
        infoY += 13;
      };
      linha('Cor', p.cor);
      linha('Superfície', p.superficie);
      linha('Local de Uso', p.local_uso);
      linha('Espessura', p.thickness);
      if (mostrarPreco) linha('Preço FOB (US$/m²)', p.preco_fob);

      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('AD EXPORT', 15, 285);
    }

    doc.save('catalogo_ad_export_' + Date.now() + '.pdf');
    mostrarToast('PDF gerado!', 'success');
  } catch (e) {
    mostrarToast('Erro ao gerar PDF: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📄 Gerar PDF do catálogo';
  }
}
