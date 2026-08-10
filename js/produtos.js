// ============================================================
// produtos.js — Sincronização de imagens (alta qualidade / WebP)
// e tela de Consulta Produto (réplica do layout original)
// ============================================================

const IMG_MAX_LADO = 2200;
const IMG_QUALIDADE = 0.87;
const LOTE_IMAGENS = 8;

let PRODUTOS = [];
let cnsProdutoAtual = null;
let cnsFotosAtuais = [];
let cnsPrecoVisivel = true;

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
      throw e;
    }
    for (const fileId of lote) {
      const dataUrl = respostas[fileId];
      if (dataUrl) {
        try {
          const blob = await otimizarImagem(dataUrl);
          await DB.salvarImagem(fileId, blob);
        } catch (e) { /* pula imagem com problema */ }
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

function valoresUnicos(produtos, campo) {
  return Array.from(new Set(produtos.map((p) => (p[campo] || '').trim()).filter(Boolean))).sort();
}

// ---------------- Tela: Consulta Produto (dropdowns, igual ao original) ----------------

function montarFiltrosConsulta() {
  const formatos = valoresUnicos(PRODUTOS, 'formato');
  const sel = document.getElementById('cns-formato');
  sel.innerHTML = '<option value="">Selecione...</option>' + formatos.map((f) => `<option value="${f}">${f}</option>`).join('');
}

function cnsOnFormatoChange() {
  const f = document.getElementById('cns-formato').value;
  const sel = document.getElementById('cns-nome');
  sel.disabled = !f;
  sel.innerHTML = '<option value="">Selecione...</option>';
  if (!f) return;
  PRODUTOS.filter((p) => p.formato === f).forEach((p) => {
    const o = document.createElement('option');
    o.value = p.codigo; o.textContent = p.nome;
    sel.appendChild(o);
  });
}

function cnsOnNomeChange() {
  const codigo = document.getElementById('cns-nome').value;
  if (!codigo) return;
  cnsSelecionarProduto(codigo);
}

function cnsOnCodigoInput() {
  const v = document.getElementById('cns-codigo').value.trim();
  const dd = document.getElementById('cns-codigo-dd');
  if (!v) { dd.classList.add('hidden'); return; }
  const m = PRODUTOS.filter((p) => String(p.codigo).includes(v) || p.nome.toLowerCase().includes(v.toLowerCase())).slice(0, 8);
  if (!m.length) { dd.classList.add('hidden'); return; }
  dd.innerHTML = m.map((p) => `<div class="autocomplete-item" onmousedown="cnsSelecionarProduto('${p.codigo}')"><strong>${p.codigo} — ${p.nome}</strong><small>${p.formato}</small></div>`).join('');
  dd.classList.remove('hidden');
}

async function cnsSelecionarProduto(codigo) {
  const p = PRODUTOS.find((x) => String(x.codigo) === String(codigo));
  if (!p) return;
  cnsProdutoAtual = p;
  document.getElementById('cns-formato').value = p.formato;
  cnsOnFormatoChange();
  document.getElementById('cns-nome').value = p.codigo;
  document.getElementById('cns-codigo').value = p.codigo;
  document.getElementById('cns-codigo-dd').classList.add('hidden');
  await cnsRenderResultado(p);
}

async function cnsRenderResultado(p) {
  document.getElementById('cns-empty').classList.add('hidden');
  document.getElementById('cns-resultado').classList.add('aberto');

  // Identificação
  document.getElementById('cns-r-formato').textContent = p.formato || '—';
  document.getElementById('cns-r-codigo').textContent = p.codigo || '—';
  document.getElementById('cns-r-barcode').textContent = p.barcode || '—';
  document.getElementById('cns-r-nome').textContent = p.referencia || p.nome || '—';

  // Características
  document.getElementById('cns-r-face').textContent = p.face || '—';
  document.getElementById('cns-r-local').textContent = p.local_uso || '—';
  document.getElementById('cns-r-vt').textContent = p.vt || '—';
  document.getElementById('cns-r-thick').textContent = p.thickness || '—';

  // Packing List — Pallet Americano
  document.getElementById('cns-cx-pecas').textContent = fmtN(p.cx_pecas);
  document.getElementById('cns-cx-sqmt').textContent = fmtN(p.cx_sqmt);
  document.getElementById('cns-cx-peso').textContent = fmtN(p.cx_peso);
  document.getElementById('cns-pal-caixas').textContent = fmtN(p.pallet_caixas);
  document.getElementById('cns-pal-sqmt').textContent = fmtN(p.pallet_sqmt);
  document.getElementById('cns-pal-peso').textContent = fmtN(p.pallet_peso);
  document.getElementById('cns-con-caixas').textContent = fmtN(p.container_caixas);
  document.getElementById('cns-con-pallets').textContent = fmtN(p.container_pallets);
  document.getElementById('cns-con-sqmt').textContent = fmtN(p.container_sqmt);
  document.getElementById('cns-con-peso').textContent = fmtN(p.container_peso);

  // Packing List — Euro Pallet
  document.getElementById('cns-euro-cx-pecas').textContent = fmtN(p.euro_cx_pecas);
  document.getElementById('cns-euro-cx-sqmt').textContent = fmtN(p.euro_cx_sqmt);
  document.getElementById('cns-euro-cx-peso').textContent = fmtN(p.euro_cx_peso);
  document.getElementById('cns-euro-pal-caixas').textContent = fmtN(p.euro_pallet_caixas);
  document.getElementById('cns-euro-pal-sqmt').textContent = fmtN(p.euro_pallet_sqmt);
  document.getElementById('cns-euro-pal-peso').textContent = fmtN(p.euro_pallet_peso);
  document.getElementById('cns-euro-con-caixas').textContent = fmtN(p.euro_container_caixas);
  document.getElementById('cns-euro-con-pallets').textContent = fmtN(p.euro_container_pallets);
  document.getElementById('cns-euro-con-sqmt').textContent = fmtN(p.euro_container_sqmt);
  document.getElementById('cns-euro-con-peso').textContent = fmtN(p.euro_container_peso);

  // Preços
  document.getElementById('cns-r-fob').textContent = 'US$ ' + fmtN(p.preco_fob);
  document.getElementById('cns-r-exw').textContent = 'US$ ' + fmtN(p.preco_exw);

  // Fotos
  const urls = [p.imagem, p.imagem2, p.imagem3].filter(Boolean);
  cnsFotosAtuais = [];
  const wrap = document.getElementById('cns-foto-wrap');
  const imgEl = document.getElementById('cns-foto');
  const placeholder = document.getElementById('cns-foto-placeholder');
  const thumbsEl = document.getElementById('cns-thumbs');
  thumbsEl.innerHTML = '';
  imgEl.style.display = 'none';
  placeholder.style.display = 'flex';

  for (const url of urls) {
    const objUrl = await urlDaImagem(url);
    if (objUrl) cnsFotosAtuais.push(objUrl);
  }

  if (cnsFotosAtuais.length) {
    imgEl.src = cnsFotosAtuais[0];
    imgEl.style.display = 'block';
    placeholder.style.display = 'none';
    cnsFotosAtuais.forEach((u, i) => {
      const t = document.createElement('div');
      t.className = 'cns-thumb' + (i === 0 ? ' active' : '');
      t.innerHTML = `<img src="${u}">`;
      t.onclick = () => {
        imgEl.src = u;
        thumbsEl.querySelectorAll('.cns-thumb').forEach((el) => el.classList.remove('active'));
        t.classList.add('active');
      };
      thumbsEl.appendChild(t);
    });
  } else {
    placeholder.textContent = '📦 sem foto local';
  }
}

function cnsAbrirZoom() {
  const imgEl = document.getElementById('cns-foto');
  if (!imgEl.src || imgEl.style.display === 'none') return;
  document.getElementById('mp-foto-zoom').src = imgEl.src;
  document.getElementById('modal-produto').classList.add('aberto');
}

function fecharModalProduto() {
  document.getElementById('modal-produto').classList.remove('aberto');
}

function cnsTogglePreco() {
  const checked = document.getElementById('cns-preco-toggle').checked;
  cnsPrecoVisivel = checked;
  document.getElementById('cns-preco-label').textContent = checked ? 'Ocultar' : 'Mostrar';
  document.getElementById('cns-preco-box').classList.toggle('hidden', !checked);
}
