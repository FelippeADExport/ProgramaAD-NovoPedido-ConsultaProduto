// ============================================================
// produtos.js — Sincronização de imagens (alta qualidade / WebP)
// e tela de Consulta Produto
// ============================================================

const IMG_MAX_LADO = 2200;   // px no lado maior — nítido em qualquer tela, inclusive com zoom
const IMG_QUALIDADE = 0.87;  // WebP — qualidade alta, arquivo leve
const LOTE_IMAGENS = 8;      // quantas imagens buscar por chamada à API (evita timeout no Apps Script)

let PRODUTOS = [];

function extrairFileId(url) {
  if (!url) return null;
  const m1 = String(url).match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m1) return m1[1];
  const m2 = String(url).match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m2) return m2[1];
  return null;
}

function coletarFileIds(produtos) {
  const ids = new Set();
  produtos.forEach((p) => {
    [p.imagem, p.imagem2, p.imagem3].forEach((url) => {
      const id = extrairFileId(url);
      if (id) ids.add(id);
    });
  });
  return Array.from(ids);
}

// Redimensiona/comprime uma imagem base64 (data URL) para WebP otimizado
function otimizarImagem(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > IMG_MAX_LADO) {
        height = Math.round((height * IMG_MAX_LADO) / width);
        width = IMG_MAX_LADO;
      } else if (height > IMG_MAX_LADO) {
        width = Math.round((width * IMG_MAX_LADO) / height);
        height = IMG_MAX_LADO;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar WebP'))), 'image/webp', IMG_QUALIDADE);
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = dataUrl;
  });
}

// Baixa e otimiza somente as imagens que ainda não estão salvas localmente.
// Chama onProgress(feitos, total) a cada imagem processada.
async function sincronizarImagens(produtos, onProgress) {
  const todosIds = coletarFileIds(produtos);
  const faltando = [];
  for (const id of todosIds) {
    const ja = await DB.temImagem(id);
    if (!ja) faltando.push(id);
  }
  let feitos = 0;
  const total = faltando.length;
  onProgress && onProgress(feitos, total);
  if (total === 0) return;

  for (let i = 0; i < faltando.length; i += LOTE_IMAGENS) {
    const lote = faltando.slice(i, i + LOTE_IMAGENS);
    let respostas;
    try {
      respostas = await API.buscarImagensLote(lote);
    } catch (e) {
      // sem internet no meio do processo — para aqui, o que já baixou fica salvo
      throw e;
    }
    for (const fileId of lote) {
      const dataUrl = respostas[fileId];
      if (dataUrl) {
        try {
          const blob = await otimizarImagem(dataUrl);
          await DB.salvarImagem(fileId, blob);
        } catch (e) { /* imagem com problema, pula */ }
      }
      feitos++;
      onProgress && onProgress(feitos, total);
    }
  }
}

async function urlDaImagem(urlOriginal) {
  const id = extrairFileId(urlOriginal);
  if (!id) return null;
  const blob = await DB.pegarImagem(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

// ---------------- Tela: Consulta Produto ----------------

function valoresUnicos(produtos, campo) {
  return Array.from(new Set(produtos.map((p) => (p[campo] || '').trim()).filter(Boolean))).sort();
}

function filtrarProdutos(produtos, termo, filtros) {
  const t = (termo || '').trim().toLowerCase();
  return produtos.filter((p) => {
    if (filtros.linha && p.linha !== filtros.linha) return false;
    if (filtros.formato && p.formato !== filtros.formato) return false;
    if (filtros.cor && p.cor !== filtros.cor) return false;
    if (!t) return true;
    return (
      String(p.codigo).toLowerCase().includes(t) ||
      String(p.nome).toLowerCase().includes(t) ||
      String(p.linha).toLowerCase().includes(t) ||
      String(p.cor).toLowerCase().includes(t)
    );
  });
}

function montarFiltrosConsulta() {
  const linhas = valoresUnicos(PRODUTOS, 'linha');
  const formatos = valoresUnicos(PRODUTOS, 'formato');
  const cores = valoresUnicos(PRODUTOS, 'cor');
  const sel = (id, opts) => {
    const el = document.getElementById(id);
    el.innerHTML = '<option value="">Todos</option>' + opts.map((o) => `<option value="${o}">${o}</option>`).join('');
  };
  sel('cp-filtro-linha', linhas);
  sel('cp-filtro-formato', formatos);
  sel('cp-filtro-cor', cores);
}

async function renderizarGridConsulta() {
  const termo = document.getElementById('cp-busca').value;
  const filtros = {
    linha: document.getElementById('cp-filtro-linha').value,
    formato: document.getElementById('cp-filtro-formato').value,
    cor: document.getElementById('cp-filtro-cor').value
  };
  const lista = filtrarProdutos(PRODUTOS, termo, filtros);
  const grid = document.getElementById('cp-grid');
  document.getElementById('cp-contagem').textContent = lista.length + (lista.length === 1 ? ' produto' : ' produtos');

  if (!lista.length) {
    grid.innerHTML = '<div class="empty-state">Nenhum produto encontrado.</div>';
    return;
  }

  grid.innerHTML = lista
    .map(
      (p, i) => `
    <div class="prod-card" data-idx="${i}">
      <div class="prod-card-img" id="cp-img-${i}"><div class="img-placeholder">carregando…</div></div>
      <div class="prod-card-body">
        <div class="prod-card-title">${p.nome}</div>
        <div class="prod-card-sub">${p.formato} · ${p.linha}</div>
        <div class="prod-card-tags">
          <span class="chip">${p.codigo}</span>
          <span class="chip">${p.cor}</span>
        </div>
        <div class="prod-card-prices">
          <div><label>FOB</label><span>US$ ${Number(p.preco_fob || 0).toFixed(2)}</span></div>
          <div><label>EXW</label><span>US$ ${Number(p.preco_exw || 0).toFixed(2)}</span></div>
        </div>
      </div>
    </div>`
    )
    .join('');

  lista.forEach(async (p, i) => {
    const url = await urlDaImagem(p.imagem);
    const container = document.getElementById('cp-img-' + i);
    if (!container) return;
    if (url) {
      container.innerHTML = `<img src="${url}" loading="lazy" onclick="abrirDetalheProduto('${p.codigo}')">`;
    } else {
      container.innerHTML = '<div class="img-placeholder">sem foto local</div>';
    }
  });
}

function abrirDetalheProduto(codigo) {
  const p = PRODUTOS.find((x) => String(x.codigo) === String(codigo));
  if (!p) return;
  const modal = document.getElementById('modal-produto');
  document.getElementById('mp-titulo').textContent = p.nome + ' · ' + p.formato;
  document.getElementById('mp-corpo').innerHTML = `
    <div class="mp-imgs" id="mp-imgs"></div>
    <div class="mp-specs">
      <div><label>Código</label><span>${p.codigo}</span></div>
      <div><label>Linha</label><span>${p.linha}</span></div>
      <div><label>Cor</label><span>${p.cor}</span></div>
      <div><label>Superfície</label><span>${p.superficie}</span></div>
      <div><label>Espessura</label><span>${p.thickness}</span></div>
      <div><label>Uso</label><span>${p.uso}</span></div>
      <div><label>Variação de tom</label><span>${p.vt}</span></div>
      <div><label>Relevo</label><span>${p.relevo}</span></div>
      <div><label>Preço FOB</label><span>US$ ${Number(p.preco_fob || 0).toFixed(2)}</span></div>
      <div><label>Preço EXW</label><span>US$ ${Number(p.preco_exw || 0).toFixed(2)}</span></div>
      <div><label>m²/caixa</label><span>${p.cx_sqmt}</span></div>
      <div><label>Peso/caixa</label><span>${p.cx_peso} kg</span></div>
    </div>`;
  [p.imagem, p.imagem2, p.imagem3].filter(Boolean).forEach(async (url) => {
    const objUrl = await urlDaImagem(url);
    if (objUrl) {
      document.getElementById('mp-imgs').insertAdjacentHTML('beforeend', `<img src="${objUrl}">`);
    }
  });
  modal.classList.add('aberto');
}

function fecharModalProduto() {
  document.getElementById('modal-produto').classList.remove('aberto');
}
