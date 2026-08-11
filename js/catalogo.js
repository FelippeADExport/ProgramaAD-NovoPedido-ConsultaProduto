// ============================================================
// catalogo.js — Aba "Catálogo PDF"
// Réplica do gerador original (jsPDF). Fotos de produto usam o
// cache local (IndexedDB) quando disponíveis — por isso funciona
// offline se você já rodou "Atualizar dados" antes.
// ============================================================

let catSelecionados = []; // [{ produto, fob_edit, exw_edit }]
let catMainLang = 'pt';
let _catFiles = {};
let catLocalUsoData = {};
let catCfgLoaded = false;
let _catLastBlobUrl = null;

// ---------------- Dicionário de idiomas (igual ao original) ----------------
const CAT_T = {
  pt:{superficie:'Superfície',cor:'Cor',junta:'Junta de assentamento',formato:'Formato',uso:'Indicação de uso',pecas:'Peças por caixa',versao:'Versão',vt:'Variação de tom',m2cx:'M² por Caixa',faces:'Faces',espessura:'Espessura',relevo:'Indicação de relevo',localUso:'Local de Uso',mate:'Mate',acetinado:'Acetinado',polido:'Polido',brilhante:'Brilhante',esmaltado:'Esmaltado',natural:'Natural',naturalAcetinado:'Natural Acetinado',rustico:'Rústico',antiderrapante:'Antiderrapante',marrom:'Marrom',branco:'Branco',cinza:'Cinza',bege:'Bege',preto:'Preto',pisoParede:'Piso | Parede',piso:'Piso',parede:'Parede',rt:'RT - Retificado',vt1:'VT1 - Uniforme',vt2:'VT2 - Pouca variação',vt3:'VT3 - Média variação',vt4:'VT4 - Alta variação',semRelevo:'Sem relevo',comRelevo:'Com relevo',
    packTitle:'INFORMAÇÕES DE EMBALAGEM',pieceSz:'Tamanho da Peça',thick:'Espessura (mm)',m2box:'M²/Caixa',pcsbox:'Peças/Caixa',boxpal:'Caixas/Pallet',layers:'Lastro por Pallet',m2pal:'M²/Pallet',gwbox:'Peso Bruto (Kg)/Cx',nwbox:'Peso Líquido (Kg)/Cx',gwpal:'Peso Bruto (Kg)/Pallet',nwpal:'Peso Líquido (kg)/Pallet',
    contPallets:'Total Pallets (Container)',contSqmt:'Total M² (Container)',contCartons:'Total Caixas (Container)',contGw:'Total Peso Bruto (Container)',
    palAm:'Pallet Americano',palEu:'Europallet',usdm2:'USD/m²',barcode:'Código de Barras',
    LB:'Ambientes residenciais sem acesso para a rua, como banheiros, salas, quartos e cozinhas.',LC:'Ambientes residenciais com e sem acesso para a rua, como banheiros, salas, quartos, cozinhas, garagens e varandas cobertas. Áreas comerciais de baixo tráfego.',LD:'Ambientes residenciais e comerciais com e sem acesso para a rua, como banheiros, salas, quartos, cozinhas, garagens e varandas.',LE:'Ambientes residenciais e comerciais com e sem acesso a rua, como banheiros, salas, quartos, cozinhas, garagens, varandas, áreas molhadas como calçadas e ambientes externos.'},
  es:{superficie:'Superficie',cor:'Color',junta:'Junta de colocación',formato:'Formato',uso:'Indicación de uso',pecas:'Piezas por caja',versao:'Versión',vt:'Variación de tono',m2cx:'M² por Caja',faces:'Caras',espessura:'Espesor',relevo:'Indicación de relieve',localUso:'Lugar de Uso',mate:'Mate',acetinado:'Satinado',polido:'Pulido',brilhante:'Brillante',esmaltado:'Esmaltado',natural:'Natural',naturalAcetinado:'Natural Satinado',rustico:'Rústico',antiderrapante:'Antideslizante',marrom:'Marrón',branco:'Blanco',cinza:'Gris',bege:'Beige',preto:'Negro',pisoParede:'Piso | Pared',piso:'Piso',parede:'Pared',rt:'RT - Rectificado',vt1:'VT1 - Uniforme',vt2:'VT2 - Poca variación',vt3:'VT3 - Variación media',vt4:'VT4 - Alta variación',semRelevo:'Sin relieve',comRelevo:'Con relieve',
    packTitle:'INFORMACIÓN DE EMBALAJE',pieceSz:'Tamaño de Pieza',thick:'Espesor (mm)',m2box:'M²/Caja',pcsbox:'Piezas/Caja',boxpal:'Cajas/Pallet',layers:'Camadas por Pallet',m2pal:'M²/Pallet',gwbox:'Peso Bruto (Kg)/Cja',nwbox:'Peso Neto (Kg)/Cja',gwpal:'Peso Bruto (Kg)/Pallet',nwpal:'Peso Neto (kg)/Pallet',
    contPallets:'Total Pallets (Contenedor)',contSqmt:'Total M² (Contenedor)',contCartons:'Total Cajas (Contenedor)',contGw:'Total Peso Bruto (Contenedor)',
    palAm:'Pallet Americano',palEu:'Europallet',usdm2:'USD/m²',barcode:'Código de Barras',
    LB:'Ambientes residenciales sin acceso a la calle, como baños, salas, habitaciones y cocinas.',LC:'Ambientes residenciales con y sin acceso a la calle, como baños, salas, habitaciones, cocinas, garajes y terrazas cubiertas. Áreas comerciales de bajo tráfico.',LD:'Ambientes residenciales y comerciales con y sin acceso a la calle, como baños, salas, habitaciones, cocinas, garajes y terrazas.',LE:'Ambientes residenciales y comerciales con y sin acceso a la calle, como baños, salas, habitaciones, cocinas, garajes, terrazas, áreas húmedas como aceras y ambientes externos.'},
  en:{superficie:'Surface',cor:'Color',junta:'Setting Joint',formato:'Format',uso:'Indication of Use',pecas:'Pieces per Box',versao:'Version',vt:'Tone Variation',m2cx:'M² per Box',faces:'Faces',espessura:'Thickness',relevo:'Relief Indication',localUso:'Place of Use',mate:'Matte',acetinado:'Satin',polido:'Polished',brilhante:'Glossy',esmaltado:'Glazed',natural:'Natural',naturalAcetinado:'Natural Satin',rustico:'Rustic',antiderrapante:'Anti-slip',marrom:'Brown',branco:'White',cinza:'Gray',bege:'Beige',preto:'Black',pisoParede:'Floor | Wall',piso:'Floor',parede:'Wall',rt:'RT - Rectified',vt1:'VT1 - Uniform',vt2:'VT2 - Low variation',vt3:'VT3 - Medium variation',vt4:'VT4 - High variation',semRelevo:'No relief',comRelevo:'With relief',
    packTitle:'PACKING INFORMATION',pieceSz:'Piece Size',thick:'Thickness (mm)',m2box:'M²/Box',pcsbox:'Pcs/Box',boxpal:'Boxes/Pallet',layers:'Layers per Pallet',m2pal:'M²/Pallet',gwbox:'Gross Wt (Kg)/Box',nwbox:'Net Wt (Kg)/Box',gwpal:'Gross Wt (Kg)/Pallet',nwpal:'Net Wt (kg)/Pallet',
    contPallets:'Total Pallets (Container)',contSqmt:'Total M² (Container)',contCartons:'Total Cartons (Container)',contGw:'Total Gross Wt (Container)',
    palAm:'American Pallet',palEu:'Europallet',usdm2:'USD/m²',barcode:'Barcode',
    LB:'Residential environments without street access, such as bathrooms, living rooms, bedrooms and kitchens.',LC:'Residential environments with and without street access, such as bathrooms, living rooms, bedrooms, kitchens, garages and covered verandas. Low-traffic commercial areas.',LD:'Residential and commercial environments with and without street access, such as bathrooms, living rooms, bedrooms, kitchens, garages and verandas.',LE:'Residential and commercial environments with and without street access, such as bathrooms, living rooms, bedrooms, kitchens, garages, verandas, wet areas like sidewalks and outdoor environments.'}
};
function _ct(lang, key) { return (CAT_T[lang] && CAT_T[lang][key]) || CAT_T.pt[key] || key; }
const _valMap = {'mate':'mate','matte':'mate','fosco':'mate','acetinado':'acetinado','satin':'acetinado','satinado':'acetinado','polido':'polido','pulido':'polido','polished':'polido','brilhante':'brilhante','brillante':'brilhante','glossy':'brilhante','natural acetinado':'naturalAcetinado','acetinado natural':'naturalAcetinado','esmaltado':'esmaltado','esmaltada':'esmaltado','glazed':'esmaltado','natural':'natural','rústico':'rustico','rustico':'rustico','rustic':'rustico','antiderrapante':'antiderrapante','anti-slip':'antiderrapante','branco':'branco','blanco':'branco','white':'branco','cinza':'cinza','gris':'cinza','gray':'cinza','grey':'cinza','bege':'bege','beige':'bege','preto':'preto','negro':'preto','black':'preto','marrom':'marrom','marrón':'marrom','brown':'marrom','piso | parede':'pisoParede','piso | pared':'pisoParede','floor | wall':'pisoParede','piso':'piso','floor':'piso','parede':'parede','pared':'parede','wall':'parede','rt - retificado':'rt','rt - rectificado':'rt','rt - rectified':'rt','sem relevo':'semRelevo','sin relieve':'semRelevo','no relief':'semRelevo','com relevo':'comRelevo'};
function _tradVal(lang, v) { if (!v || lang === 'pt') return v; const k = _valMap[String(v).toLowerCase().trim()]; return k ? _ct(lang, k) : v; }
function _tradVt(lang, v) { const u = String(v || '').toUpperCase().trim(); if (u.startsWith('VT1')) return _ct(lang, 'vt1'); if (u.startsWith('VT2')) return _ct(lang, 'vt2'); if (u.startsWith('VT3')) return _ct(lang, 'vt3'); if (u.startsWith('VT4')) return _ct(lang, 'vt4'); return _tradVal(lang, v); }
function _isOn(id) { return !!document.getElementById(id)?.classList.contains('active'); }
function _getSelectedFotos() { const f = []; if (_isOn('catFoto1')) f.push(1); if (_isOn('catFoto2')) f.push(2); if (_isOn('catFoto3')) f.push(3); return f.length ? f : [1]; }
function _getSecLangs() { return ['pt', 'es', 'en'].filter((l) => l !== catMainLang && _isOn('catLangSec_' + l)); }
function _formatoToInch(fmt) { const m = String(fmt || '').match(/(\d+(?:[.,]\d+)?)/g); if (!m || m.length < 2) return ''; const a = parseFloat(m[0].replace(',', '.')); const b = parseFloat(m[1].replace(',', '.')); if (isNaN(a) || isNaN(b)) return ''; return `${Math.round(a / 2.54)}' x ${Math.round(b / 2.54)}'`; }
function _n(v, dec, suf) { const n = +(v || 0); if (!n) return ''; return n.toFixed(dec || 0) + (suf || ''); }

function _buildSpecs(lang, p) {
  const T = CAT_T[lang] || CAT_T.pt;
  const thick = String(p.thickness || '').replace(',', '.');
  const thickStr = thick && !isNaN(parseFloat(thick)) ? (thick.includes('mm') ? thick : thick + ' mm') : '';
  const pcs = p.cx_pecas ? String(Math.round(p.cx_pecas)) : '';
  const faceN = String(p.face || '').match(/\d+/)?.[0];
  const faceStr = faceN ? String(parseInt(faceN)) : '';
  return [
    [T.superficie, _tradVal(lang, p.superficie || ''), T.cor, _tradVal(lang, p.cor || ''), T.junta, p.junta_assentamento || ''],
    [T.formato, p.formato || '', T.uso, _tradVal(lang, p.uso || ''), T.pecas, pcs],
    [T.versao, _tradVal(lang, p.versao || ''), T.vt, _tradVt(lang, p.vt || ''), T.m2cx, p.cx_sqmt ? _n(p.cx_sqmt, 2, ' m²') : ''],
    [T.faces, faceStr, T.espessura, thickStr, T.relevo, _tradVal(lang, p.relevo || '')]
  ];
}
function _getLocalUsoDesc(lang, code) {
  if (!code) return '';
  const entry = catLocalUsoData[code];
  if (entry && entry[lang]) return entry[lang];
  const T = CAT_T[lang] || CAT_T.pt;
  return T[code] || '';
}

// ---------------- UI: idioma, config, toggles ----------------

function catSetMainLang(lang, btn) {
  catMainLang = lang;
  ['PT', 'ES', 'EN'].forEach((l) => {
    document.getElementById('catLangMain' + l)?.classList.remove('active');
    const s = document.getElementById('catLangSec_' + l.toLowerCase());
    if (s) { s.style.display = l.toLowerCase() === lang ? 'none' : ''; if (l.toLowerCase() === lang) s.classList.remove('active'); }
  });
  btn.classList.add('active');
}

function catToggle_Preco() {
  const b = document.getElementById('catMostrarPreco');
  b.classList.toggle('active');
  document.getElementById('catPrecoOpts').classList.toggle('hidden', !b.classList.contains('active'));
  catRenderSelecionados();
}
function catToggle_EuroPallet() {
  const btn = document.getElementById('catMostrarEuroPallet');
  btn.classList.toggle('active');
  const on = btn.classList.contains('active');
  document.getElementById('catEuroAdicionalWrap').classList.toggle('hidden', !on);
  if (on) {
    const el = document.getElementById('catAdicionalEuro');
    if (el && (!el.value || el.value === '0')) el.value = (CFG.acrescimo_europallet || 0).toFixed(2);
  }
  catRenderSelecionados();
}

async function catInit() {
  montarFiltrosCatalogo();
  if (!catCfgLoaded && navigator.onLine) {
    catCfgLoaded = true;
    try {
      const cfg = await API.buscarCatalogoConfig();
      catAplicarCfg(cfg);
    } catch (e) {}
    try { catLocalUsoData = await API.buscarLocalUsoDescricoes(); } catch (e) {}
  }
  const el = document.getElementById('catAno');
  if (el && !el.value) el.value = new Date().getFullYear();
  catRenderSelecionados();
}
function catAplicarCfg(d) {
  const map = { catLogoFornUrl: 'logo_fornecedor_url', catLogoAdUrl: 'logo_ad_url', catCapaUrl: 'capa_imagem_url', catTituloPt: 'titulo_pt', catTituloEs: 'titulo_es', catTituloEn: 'titulo_en', catSiteUrl: 'site_url' };
  Object.keys(map).forEach((id) => { const el = document.getElementById(id); if (el && d[map[id]]) el.value = d[map[id]]; });
}
async function catSalvarConfig() {
  if (!navigator.onLine) { mostrarToast('Precisa de internet para salvar', 'error'); return; }
  const cfg = {
    logo_fornecedor_url: document.getElementById('catLogoFornUrl')?.value || '',
    logo_ad_url: document.getElementById('catLogoAdUrl')?.value || '',
    capa_imagem_url: document.getElementById('catCapaUrl')?.value || '',
    titulo_pt: document.getElementById('catTituloPt')?.value || '',
    titulo_es: document.getElementById('catTituloEs')?.value || '',
    titulo_en: document.getElementById('catTituloEn')?.value || '',
    site_url: document.getElementById('catSiteUrl')?.value || ''
  };
  try { await API.salvarCatalogoConfig(cfg); mostrarToast('Config salva!', 'success'); }
  catch (e) { mostrarToast('Erro: ' + e.message, 'error'); }
}

// ---------------- Seleção de produtos ----------------

function montarFiltrosCatalogo() {
  const formatos = valoresUnicos(PRODUTOS, 'formato');
  document.getElementById('cat-filtro-formato').innerHTML = '<option value="">Todos os formatos</option>' + formatos.map((f) => `<option value="${f}">${f}</option>`).join('');
  catAtualizarFiltroNomes();
}
function catAtualizarFiltroNomes() {
  const fmt = document.getElementById('catFiltroFormato')?.value || '';
  const lista = fmt ? PRODUTOS.filter((p) => p.formato === fmt) : PRODUTOS;
  document.getElementById('catFiltroProduto').innerHTML = '<option value="">Selecione...</option>' + lista.map((p) => `<option value="${p.codigo}">${p.nome || p.codigo}${p.codigo ? ' (' + p.codigo + ')' : ''}</option>`).join('');
}
function catAdicionarTodosFormato() {
  const fmt = document.getElementById('catFiltroFormato')?.value || '';
  const lista = fmt ? PRODUTOS.filter((p) => p.formato === fmt) : PRODUTOS;
  if (!lista.length) { mostrarToast('Nenhum produto no formato selecionado', 'error'); return; }
  let add = 0;
  lista.forEach((p) => { if (!catSelecionados.find((x) => x.produto.codigo === p.codigo)) { catSelecionados.push({ produto: p, fob_edit: parseFloat(p.preco_fob) || 0, exw_edit: parseFloat(p.preco_exw) || 0 }); add++; } });
  catRenderSelecionados();
  mostrarToast(add > 0 ? add + ' produto(s) adicionado(s)' : 'Todos já estão na lista', add > 0 ? 'success' : 'info');
}
function catAdicionarDaLista() {
  const cod = document.getElementById('catFiltroProduto')?.value || '';
  if (!cod) { mostrarToast('Selecione um produto', 'error'); return; }
  _catAdd(cod);
  document.getElementById('catFiltroProduto').value = '';
}
function _catAdd(cod) {
  const p = PRODUTOS.find((x) => x.codigo && x.codigo.toUpperCase() === cod.toUpperCase());
  if (!p) { mostrarToast('Produto não encontrado: ' + cod, 'error'); return; }
  if (catSelecionados.find((x) => x.produto.codigo === p.codigo)) { mostrarToast('Já adicionado', 'error'); return; }
  catSelecionados.push({ produto: p, fob_edit: parseFloat(p.preco_fob) || 0, exw_edit: parseFloat(p.preco_exw) || 0 });
  catRenderSelecionados();
  mostrarToast('Adicionado: ' + (p.nome || p.codigo), 'success');
}
function catRemoverProduto(idx) { catSelecionados.splice(idx, 1); catRenderSelecionados(); }
function catMoverProduto(idx, dir) { const ni = idx + dir; if (ni < 0 || ni >= catSelecionados.length) return; [catSelecionados[idx], catSelecionados[ni]] = [catSelecionados[ni], catSelecionados[idx]]; catRenderSelecionados(); }
function catLimparSelecionados() { if (!catSelecionados.length) return; catSelecionados = []; catRenderSelecionados(); mostrarToast('Lista limpa', 'info'); }

function catRenderSelecionados() {
  const cnt = document.getElementById('catContador');
  if (cnt) cnt.textContent = catSelecionados.length;
  const el = document.getElementById('catListaSelecionados');
  if (!el) return;
  if (!catSelecionados.length) { el.innerHTML = '<div class="empty-state"><div class="sub">Nenhum produto selecionado</div></div>'; return; }
  const sp = _isOn('catMostrarPreco'), sf = _isOn('catMostrarFob'), se = _isOn('catMostrarExw');
  el.innerHTML = catSelecionados.map((it, i) => `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
      <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">
        <button type="button" class="btn btn-secondary" onclick="catMoverProduto(${i},-1)" ${i === 0 ? 'disabled' : ''} style="padding:1px 8px;font-size:12px">↑</button>
        <button type="button" class="btn btn-secondary" onclick="catMoverProduto(${i},1)" ${i === catSelecionados.length - 1 ? 'disabled' : ''} style="padding:1px 8px;font-size:12px">↓</button>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.produto.nome || ''}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${it.produto.codigo || ''} · ${it.produto.formato || ''}</div>
        ${sp ? `<div style="display:flex;gap:10px;margin-top:7px;flex-wrap:wrap">
          ${sf ? `<label style="display:flex;align-items:center;gap:4px;font-size:12px">FOB <input type="number" step="0.01" value="${it.fob_edit}" onchange="catSelecionados[${i}].fob_edit=parseFloat(this.value)||0" style="width:70px;padding:3px 6px;font-size:12px"></label>` : ''}
          ${se ? `<label style="display:flex;align-items:center;gap:4px;font-size:12px">EXW <input type="number" step="0.01" value="${it.exw_edit}" onchange="catSelecionados[${i}].exw_edit=parseFloat(this.value)||0" style="width:70px;padding:3px 6px;font-size:12px"></label>` : ''}
        </div>` : ''}
      </div>
      <button type="button" class="item-remove" onclick="catRemoverProduto(${i})">×</button>
    </div>`).join('');
}

function catBuscaInput() {
  const q = (document.getElementById('catBuscaCodigo')?.value || '').trim().toUpperCase();
  const dd = document.getElementById('cat-busca-dropdown');
  if (!q) { dd.classList.add('hidden'); return; }
  const m = PRODUTOS.filter((p) => (p.codigo && p.codigo.toUpperCase().includes(q)) || (p.nome && p.nome.toUpperCase().includes(q))).slice(0, 12);
  if (!m.length) { dd.classList.add('hidden'); return; }
  dd.innerHTML = m.map((p) => `<div class="autocomplete-item" onmousedown="catSelFromDropdown('${p.codigo}')"><strong>${p.codigo || '—'}</strong><small>${p.nome || ''} · ${p.formato || ''}</small></div>`).join('');
  dd.classList.remove('hidden');
}
function catSelFromDropdown(cod) {
  document.getElementById('catBuscaCodigo').value = '';
  document.getElementById('cat-busca-dropdown').classList.add('hidden');
  _catAdd(cod);
}

// ---------------- Imagens (local-first, cai pra API se online) ----------------

async function _imagemProdutoDataUrl(urlOriginal) {
  const id = extrairFileId(urlOriginal);
  if (!id) return null;
  const blob = await DB.pegarImagem(id);
  if (blob) { try { return await _blobParaDataURL(blob); } catch (e) {} }
  if (navigator.onLine) {
    try {
      const resp = await API.buscarImagensPorUrl([urlOriginal]);
      return resp[urlOriginal] || null;
    } catch (e) { return null; }
  }
  return null;
}
function _blobParaDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function _resizeImg(dataUrl, maxPx, quality) {
  return new Promise((resolve) => {
    if (!dataUrl) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width || 1, img.height || 1));
      if (scale >= 0.99) { resolve(dataUrl); return; }
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality || 0.8));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
function _addImgProp(doc, data, fmt, cx, cy, maxW, maxH, alignH, alias) {
  try {
    const pr = doc.getImageProperties(data);
    const ratio = pr.width / pr.height;
    let w, h;
    if (ratio > maxW / maxH) { w = maxW; h = maxW / ratio; } else { h = maxH; w = maxH * ratio; }
    let x = cx;
    if (alignH === 'center') x = cx + (maxW - w) / 2;
    else if (alignH === 'right') x = cx + maxW - w;
    const y = cy + (maxH - h) / 2;
    doc.addImage(data, fmt, x, y, w, h, alias || undefined);
    return { w, h, x, y };
  } catch (e) { return null; }
}

// ---------------- Packing final (página por grupo) ----------------

function _drawPackingFinal(doc, items, packAm, packEu, mainLang, W, H, ml, mr, cw, getLoFornImg, getLoAdImg) {
  if (!items || !items.length) return;
  const T = CAT_T[mainLang] || CAT_T.pt;
  const _sig = (p) => [p.cx_pecas, p.cx_sqmt, p.cx_peso, p.pallet_caixas, p.pallet_sqmt, p.pallet_peso, p.euro_cx_pecas, p.euro_cx_sqmt, p.euro_cx_peso, p.euro_pallet_caixas, p.euro_pallet_sqmt, p.euro_pallet_peso].join('|');
  const groups = [];
  items.forEach((it) => {
    const sig = _sig(it.produto);
    const g = groups.find((g) => g.sig === sig);
    if (g) g.items.push(it); else groups.push({ sig, items: [it] });
  });

  groups.forEach((grp, gi) => {
    doc.addPage();
    let y = 12;
    const loFI = getLoFornImg();
    if (loFI) { const r = _addImgProp(doc, loFI, 'PNG', ml, y, cw, 13, 'center', 'pk_lf' + gi); y += (r ? r.h : 13) + 3; } else { y += 16; }
    doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.3); doc.line(ml, y, W - mr, y); y += 5;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
    doc.text(T.packTitle || 'INFORMAÇÕES DE EMBALAGEM', ml, y);
    if (groups.length > 1) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 110, 110); doc.text('(' + (gi + 1) + '/' + groups.length + ')', ml + 90, y); }
    y += 8;

    const validLbl = mainLang === 'en' ? 'Information valid for the products:' : mainLang === 'es' ? 'Información válida para los productos:' : 'Informações válidas para os produtos:';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60);
    doc.text(validLbl, ml, y); y += 5;

    const N_COLS = 3, PER_SET = 27, colW = cw / N_COLS, rowH = 4.5;
    const sets = [];
    for (let si = 0; si < grp.items.length; si += PER_SET) sets.push(grp.items.slice(si, si + PER_SET));
    sets.forEach((set, si) => {
      if (si > 0) y += 3;
      set.forEach((it, idx) => {
        const col = idx % N_COLS, row = Math.floor(idx / N_COLS);
        const x = ml + col * colW, ry = y + row * rowH;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(30, 30, 30);
        const name = it.produto.nome || it.produto.codigo || '';
        const maxChars = Math.floor(colW / 1.8);
        doc.text('• ' + (name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name), x, ry);
      });
      y += Math.ceil(set.length / N_COLS) * rowH;
    });

    y += 6;
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(ml, y, W - mr, y); y += 5;

    const p = grp.items[0].produto;
    const showAm = packAm, showEu = packEu;
    const lblW = 65, valW = (cw - lblW) / 2;
    let hx = ml + lblW;
    if (showAm) { doc.setFillColor(35, 35, 35); doc.roundedRect(hx, y - 3, valW - 1, 8, 2, 2, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text(_ct(mainLang, 'palAm'), hx + (valW - 1) / 2, y + 2.5, { align: 'center' }); hx += valW; }
    if (showEu) { doc.setFillColor(35, 35, 35); doc.roundedRect(hx, y - 3, valW - 1, 8, 2, 2, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text(_ct(mainLang, 'palEu'), hx + (valW - 1) / 2, y + 2.5, { align: 'center' }); }
    y += 11;

    const palData = (isEuro) => {
      const fmtInch = _formatoToInch(p.formato);
      const fmtStr = p.formato + (fmtInch ? ' | ' + fmtInch : '');
      const thick = String(p.thickness || '').replace(',', '.');
      const thickStr = thick && !isNaN(parseFloat(thick)) ? (thick.includes('mm') ? thick : thick + ' mm') : '';
      const cx_pecas = isEuro ? (p.euro_cx_pecas || p.cx_pecas) : p.cx_pecas;
      const cx_sqmt = isEuro ? (p.euro_cx_sqmt || p.cx_sqmt) : p.cx_sqmt;
      const cx_peso = isEuro ? (p.euro_cx_peso || p.cx_peso) : p.cx_peso;
      const pal_cx = isEuro ? (p.euro_pallet_caixas || p.pallet_caixas) : p.pallet_caixas;
      const pal_sqmt = isEuro ? (p.euro_pallet_sqmt || p.pallet_sqmt) : p.pallet_sqmt;
      const pal_peso = isEuro ? (p.euro_pallet_peso || p.pallet_peso) : p.pallet_peso;
      const tot_pal = isEuro ? (p.euro_container_pallets || p.container_pallets) : p.container_pallets;
      const tot_sqmt = isEuro ? (p.euro_container_sqmt || p.container_sqmt) : p.container_sqmt;
      const tot_cart = isEuro ? (p.euro_container_caixas || p.container_caixas) : p.container_caixas;
      const tot_gw = isEuro ? (p.euro_container_peso || p.container_peso) : p.container_peso;
      return [fmtStr, thickStr, _n(cx_sqmt, 2, ' m²'), _n(cx_pecas, 0), _n(pal_cx, 0), '1', _n(pal_sqmt, 2, ' m²'), _n(cx_peso, 2, ' kg'), _n(cx_peso * 0.988, 2, ' kg'), _n(pal_peso, 2, ' kg'), _n(pal_peso * 0.988, 2, ' kg'), _n(tot_pal, 0), _n(tot_sqmt, 2, ' m²'), _n(tot_cart, 0), _n(tot_gw, 2, ' kg')];
    };
    const rowLabels = [T.pieceSz, T.thick, T.m2box, T.pcsbox, T.boxpal, T.layers, T.m2pal, T.gwbox, T.nwbox, T.gwpal, T.nwpal, T.contPallets, T.contSqmt, T.contCartons, T.contGw];
    const amD = showAm ? palData(false) : null;
    const euD = showEu ? palData(true) : null;
    const rowH2 = 6.8;
    rowLabels.forEach((lbl, ri) => {
      const ry = y + ri * rowH2;
      doc.setFillColor(ri % 2 === 0 ? 246 : 255, ri % 2 === 0 ? 246 : 255, ri % 2 === 0 ? 246 : 255);
      doc.rect(ml, ry - 4.5, cw, rowH2, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
      doc.text(lbl || '', ml + 2, ry);
      let vx = ml + lblW;
      if (amD) { doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.text(String(amD[ri] || ''), vx + (valW - 1) / 2, ry, { align: 'center' }); vx += valW; }
      if (euD) { doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.text(String(euD[ri] || ''), vx + (valW - 1) / 2, ry, { align: 'center' }); }
    });
    const loAI = getLoAdImg();
    if (loAI) _addImgProp(doc, loAI, 'PNG', W - mr - 40, H - 13, 40, 10, 'right', 'pk_la' + gi);
  });
}

// ---------------- Geração principal ----------------

async function gerarCatalogoPdf() {
  if (!catSelecionados.length) { mostrarToast('Adicione ao menos um produto', 'error'); return; }
  if (typeof window.jspdf === 'undefined') { mostrarToast('Biblioteca jsPDF não carregada', 'error'); return; }

  const mainLang = catMainLang;
  const secLangs = _getSecLangs();
  const allLangs = [mainLang, ...secLangs];
  const selFotos = _getSelectedFotos();
  const showPreco = _isOn('catMostrarPreco'), showFob = _isOn('catMostrarFob'), showExw = _isOn('catMostrarExw');
  const showEuro = _isOn('catMostrarEuroPallet');
  const addEuro = showEuro ? parseFloat(document.getElementById('catAdicionalEuro')?.value || '0') || 0 : 0;
  const showBarcode = _isOn('catMostrarBarcode');
  const packAm = _isOn('catPackAmericano'), packEu = _isOn('catPackEuro');
  const doPack = packAm || packEu;
  const titulos = { pt: document.getElementById('catTituloPt')?.value || '', es: document.getElementById('catTituloEs')?.value || '', en: document.getElementById('catTituloEn')?.value || '' };
  const ano = document.getElementById('catAno')?.value || new Date().getFullYear();
  const capaUrl = (document.getElementById('catCapaUrl')?.value || '').trim();
  const loFornUrl = (document.getElementById('catLogoFornUrl')?.value || '').trim();
  const loAdUrl = (document.getElementById('catLogoAdUrl')?.value || '').trim();
  const siteUrl = (document.getElementById('catSiteUrl')?.value || '').trim();
  const _nf = (url) => url && url !== '(arquivo local)';

  const btn = document.getElementById('btnGerarCatalogo');
  const status = document.getElementById('catGerandoStatus');
  btn.disabled = true; status.style.display = '';

  const imgs = {};
  try {
    status.textContent = '⏳ Buscando imagens...';
    if (_nf(capaUrl) && !_catFiles.catCapa) { const d = await _imagemProdutoDataUrl(capaUrl); if (d) imgs[capaUrl] = await _resizeImg(d, 900, 0.82); }
    if (_nf(loFornUrl) && !_catFiles.catLogoForn) { const d = await _imagemProdutoDataUrl(loFornUrl); if (d) imgs[loFornUrl] = await _resizeImg(d, 350, 0.82); }
    if (_nf(loAdUrl) && !_catFiles.catLogoAd) { const d = await _imagemProdutoDataUrl(loAdUrl); if (d) imgs[loAdUrl] = await _resizeImg(d, 350, 0.82); }

    let feito = 0;
    const totalFotos = catSelecionados.length * selFotos.length;
    for (const it of catSelecionados) {
      for (const n of selFotos) {
        const u = ((n === 2 ? it.produto.imagem2 : n === 3 ? it.produto.imagem3 : it.produto.imagem) || '').trim();
        if (u && !imgs[u]) { const d = await _imagemProdutoDataUrl(u); if (d) imgs[u] = d; }
        feito++;
        status.textContent = `⏳ Buscando imagens (${feito}/${totalFotos})...`;
      }
    }
    if (_catFiles.catCapa) imgs['__cc__'] = _catFiles.catCapa;
    if (_catFiles.catLogoForn) imgs['__lf__'] = _catFiles.catLogoForn;
    if (_catFiles.catLogoAd) imgs['__la__'] = _catFiles.catLogoAd;

    const getCapaImg = () => imgs['__cc__'] || (_nf(capaUrl) ? imgs[capaUrl] : null) || null;
    const getLoFornImg = () => imgs['__lf__'] || (_nf(loFornUrl) ? imgs[loFornUrl] : null) || null;
    const getLoAdImg = () => imgs['__la__'] || (_nf(loAdUrl) ? imgs[loAdUrl] : null) || null;
    const getProdImg = (it, n) => { const u = ((n === 2 ? it.produto.imagem2 : n === 3 ? it.produto.imagem3 : it.produto.imagem) || '').trim(); const r = u ? imgs[u] : null; return (r && r !== '') ? r : null; };

    status.textContent = '⏳ Gerando PDF...';
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const W = 210, H = 297, ml = 15, mr = 15, cw = W - ml - mr;
    const titulo = titulos.pt || '';
    const subTitulos = [titulos.es, titulos.en].filter(Boolean);

    const capImg = getCapaImg();
    if (capImg) { try { const pr = doc.getImageProperties(capImg); const capH = Math.min(95, W * pr.height / pr.width); doc.addImage(capImg, 'JPEG', 0, 0, W, capH, 'capa'); } catch (e) { try { doc.addImage(capImg, 'JPEG', 0, 0, W, 90, 'capa'); } catch (e2) {} } }
    let y = 108;
    const loFImg = getLoFornImg();
    if (loFImg) { const r = _addImgProp(doc, loFImg, 'PNG', ml, y, cw, 22, 'center', 'logo_forn'); y += (r ? r.h : 20) + 8; } else { y += 28; }
    doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.4); doc.line(ml, y, W - mr, y); y += 12;
    if (titulo) { doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(20, 20, 20); doc.text(titulo, W / 2, y, { align: 'center' }); y += 9; }
    subTitulos.forEach((s) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(110, 110, 110); doc.text(s, W / 2, y, { align: 'center' }); y += 7; });
    y += 4; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(140, 140, 140); doc.text(String(ano), W / 2, y, { align: 'center' });
    if (siteUrl) { y += 8; doc.setFontSize(9); doc.setTextColor(0, 102, 204); doc.text(siteUrl, W / 2, y, { align: 'center' }); }
    const loAImg = getLoAdImg();
    if (loAImg) _addImgProp(doc, loAImg, 'PNG', W - mr - 42, H - 17, 42, 12, 'right', 'logo_ad');

    catSelecionados.forEach((it) => {
      doc.addPage();
      const p = it.produto;
      let y = 10;
      const loFI = getLoFornImg();
      if (loFI) { const r = _addImgProp(doc, loFI, 'PNG', ml, y, cw, 14, 'center', 'logo_forn_p'); y += (r ? r.h : 14) + 4; } else { y += 18; }
      doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.4); doc.line(ml, y, W - mr, y); y += 5;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 15, 15);
      const nL = doc.splitTextToSize(p.nome || '', cw); doc.text(nL, ml, y); y += nL.length * 6 + 1;
      if (p.codigo) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(130, 130, 130); doc.text(p.codigo, ml, y); y += 4; }
      doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.3); doc.line(ml, y, W - mr, y); y += 3;

      const availImgs = selFotos.map((n) => ({ n, img: getProdImg(it, n) })).filter((x) => !!x.img);
      const nF = availImgs.length;
      if (nF === 0) { y += 10; }
      else if (nF === 1) {
        const fi = availImgs[0]; const maxH = 100, maxW = 128;
        try { const pr = doc.getImageProperties(fi.img); const ratio = pr.width / pr.height; let iW = maxW, iH = maxW / ratio; if (iH > maxH) { iH = maxH; iW = maxH * ratio; } const ix = ml + (cw - iW) / 2; doc.addImage(fi.img, 'JPEG', ix, y, iW, iH, `p_${p.codigo}_f${fi.n}`); y += iH + 4; } catch (e) { y += 10; }
      } else {
        const gap = 3, cWi = (cw - gap * (nF - 1)) / nF, maxH = 82; let usedH = 0;
        availImgs.forEach((fi, idx) => {
          const xC = ml + idx * (cWi + gap);
          try { const pr = doc.getImageProperties(fi.img); const ratio = pr.width / pr.height; let iW = cWi, iH = cWi / ratio; if (iH > maxH) { iH = maxH; iW = maxH * ratio; } if (iW > cWi) { iW = cWi; iH = cWi / ratio; } const ix = xC + (cWi - iW) / 2, iy = y + (maxH - iH) / 2; doc.addImage(fi.img, 'JPEG', ix, iy, iW, iH, `p_${p.codigo}_f${fi.n}`); usedH = Math.max(usedH, iH); }
          catch (e) { usedH = Math.max(usedH, maxH); }
        });
        y += Math.max(usedH, maxH) + 4;
      }
      doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.3); doc.line(ml, y, W - mr, y); y += 3;

      const mainSpecs = _buildSpecs(mainLang, p);
      const secSpecsArr = secLangs.map((sl) => _buildSpecs(sl, p));
      const nSec = secLangs.length;
      const rowH = 12 + (nSec > 0 ? 6 : 0);
      const sc = cw / 3;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          const x = ml + col * sc; let cy = y;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(145, 145, 145);
          doc.text(String(mainSpecs[row][col * 2] || ''), x, cy); cy += 3.2;
          if (nSec > 0) {
            const _mLbl = String(mainSpecs[row][col * 2] || '');
            const secLbls = secSpecsArr.map((ss) => String(ss[row][col * 2] || '')).filter((l) => l && l !== _mLbl).join(' / ');
            if (secLbls) { doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(165, 165, 165); doc.text(secLbls, x, cy); cy += 3.2; }
          }
          cy += 0.8;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(15, 15, 15);
          doc.text(String(mainSpecs[row][col * 2 + 1] || ''), x, cy); cy += 4.2;
          if (nSec > 0) {
            const _mVal = String(mainSpecs[row][col * 2 + 1] || '');
            const secVals = secSpecsArr.map((ss) => String(ss[row][col * 2 + 1] || '')).filter((v) => v && v !== _mVal).join(' / ');
            if (secVals) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110, 110, 110); doc.text(secVals, x, cy); }
          }
        }
        y += rowH;
      }
      doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.3); doc.line(ml, y, W - mr, y); y += 3;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
      const luLbl = allLangs.map((l) => _ct(l, 'localUso')).join(' / ');
      doc.text(luLbl.toUpperCase(), ml, y); y += 3;
      const lCode = (p.local_uso || '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
      if (lCode) {
        doc.setFillColor(40, 40, 40); doc.roundedRect(ml, y, 14, 14, 2, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
        doc.text(lCode, ml + 7, y + 9, { align: 'center' });
        let lineCount = 0;
        allLangs.forEach((lang, li) => {
          const desc = _getLocalUsoDesc(lang, lCode);
          if (!desc) return;
          const lines = doc.splitTextToSize(desc, cw - 18);
          const fs = li === 0 ? 7.5 : 6.5; const clr = li === 0 ? [40, 40, 40] : [110, 110, 110];
          doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(clr[0], clr[1], clr[2]);
          doc.text(lines, ml + 17, y + 2 + lineCount * 4);
          lineCount += lines.length;
        });
        y += Math.max(17, lineCount * 4 + 4);
      }

      if (showPreco && (showFob || showExw)) {
        y += 2;
        const priceGroups = [];
        if (showFob) priceGroups.push('FOB');
        if (showExw) priceGroups.push('EXW');
        const nGrp = priceGroups.length;
        const pH = 20, gW = (cw - (nGrp - 1) * 4) / nGrp;
        const nCol = showEuro ? 2 : 1;
        const colW = gW / nCol;
        priceGroups.forEach((type, gi) => {
          const gx = ml + gi * (gW + 4);
          const amVal = type === 'FOB' ? Number(it.fob_edit || 0) : Number(it.exw_edit || 0);
          const amLbl = (type + ' PALLET AMERICANO (' + _ct(mainLang, 'usdm2') + ')').toUpperCase();
          const amStr = 'US$ ' + amVal.toFixed(2).replace('.', ',');
          doc.setFillColor(255, 255, 255); doc.setDrawColor(60, 60, 60); doc.setLineWidth(0.6);
          doc.roundedRect(gx, y, gW, pH, 3, 3, 'FD');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(70, 70, 70);
          doc.text(amLbl, gx + colW / 2, y + 6, { align: 'center' });
          doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(10, 10, 10);
          doc.text(amStr, gx + colW / 2, y + 15, { align: 'center' });
          if (showEuro) {
            doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.3);
            doc.line(gx + colW, y + 3, gx + colW, y + pH - 3);
            const euroVal = amVal + addEuro;
            const euroLbl = (type + ' EUROPALLET (' + _ct(mainLang, 'usdm2') + ')').toUpperCase();
            const euroStr = 'US$ ' + euroVal.toFixed(2).replace('.', ',');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(70, 70, 70);
            doc.text(euroLbl, gx + colW + colW / 2, y + 6, { align: 'center' });
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(10, 10, 10);
            doc.text(euroStr, gx + colW + colW / 2, y + 15, { align: 'center' });
          }
        });
        y += pH + 3;
      }

      if (showBarcode && p.barcode) {
        y += 3;
        const barcodeLabel = allLangs.map((l) => _ct(l, 'barcode')).filter((v, i, arr) => arr.indexOf(v) === i).join(' / ');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 90, 90);
        doc.text(barcodeLabel + ': ', ml, y);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 15, 15); doc.text(String(p.barcode), ml + 44, y);
      }
      const loAI = getLoAdImg();
      if (loAI) _addImgProp(doc, loAI, 'PNG', W - mr - 40, H - 13, 40, 10, 'right', 'logo_ad_p');
    });

    if (doPack) _drawPackingFinal(doc, catSelecionados, packAm, packEu, mainLang, W, H, ml, mr, cw, getLoFornImg, getLoAdImg);

    try { _catLastBlobUrl = URL.createObjectURL(doc.output('blob')); } catch (e) {}
    const anoStr = String(ano).replace(/\//g, '-');
    const fn = 'Catalogo_' + (titulos.pt || titulos.es || 'AD').replace(/[^a-zA-Z0-9]/g, '_') + '_' + anoStr + '.pdf';
    doc.save(fn);
    mostrarToast('PDF gerado: ' + fn, 'success');
  } catch (e) {
    mostrarToast('Erro: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    status.style.display = 'none';
  }
}
