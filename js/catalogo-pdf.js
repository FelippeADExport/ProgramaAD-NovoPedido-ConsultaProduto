// ============================================================
// CATÁLOGO PDF: geração do arquivo com jsPDF
// (textos traduzidos, montagem das páginas, packing)
// ============================================================

// DICIONÁRIOS
const CAT_T={
  pt:{superficie:'Superfície',cor:'Cor',junta:'Junta de assentamento',formato:'Formato',uso:'Indicação de uso',pecas:'Peças por caixa',versao:'Versão',vt:'Variação de tom',m2cx:'M² por Caixa',faces:'Faces',espessura:'Espessura',relevo:'Indicação de relevo',localUso:'Local de Uso',face_s:'face',faces_s:'faces',mate:'Mate',acetinado:'Acetinado',polido:'Polido',brilhante:'Brilhante',esmaltado:'Esmaltado',natural:'Natural',naturalAcetinado:'Natural Acetinado',rustico:'Rústico',antiderrapante:'Antiderrapante',marrom:'Marrom',branco:'Branco',cinza:'Cinza',bege:'Bege',preto:'Preto',pisoParede:'Piso | Parede',piso:'Piso',parede:'Parede',rt:'RT - Retificado',vt1:'VT1 - Uniforme',vt2:'VT2 - Pouca variação',vt3:'VT3 - Média variação',vt4:'VT4 - Alta variação',semRelevo:'Sem relevo',comRelevo:'Com relevo',
    packTitle:'INFORMAÇÕES DE EMBALAGEM',pieceSz:'Tamanho da Peça',thick:'Espessura',pcsbox:'Peças/Caixa',m2box:'M²/Caixa',gwbox:'Peso Bruto Kg/Cx',layers:'Camadas por Pallet',boxpal:'Caixas/Pallet',m2pal:'M²/Pallet',gwpal:'Peso Bruto Kg/Pallet',
    contCartons:'Total Caixas - Container',contPallets:'Total Pallets - Container',contSqmt:'Total M² - Container',contGw:'Total Peso Bruto - Container',
    palAm:'Pallet Americano',palEu:'Europallet',priceLabel:'Preço',usdm2:'USD/m²',barcode:'Código de Barras',
    LB:'Ambientes residenciais sem acesso para a rua, como banheiros, salas, quartos e cozinhas.',LC:'Ambientes residenciais com e sem acesso para a rua, como banheiros, salas, quartos, cozinhas, garagens e varandas cobertas. Áreas comerciais de baixo tráfego.',LD:'Ambientes residenciais e comerciais com e sem acesso para a rua, como banheiros, salas, quartos, cozinhas, garagens e varandas.',LE:'Ambientes residenciais e comerciais com e sem acesso a rua, como banheiros, salas, quartos, cozinhas, garagens, varandas, áreas molhadas como calçadas e ambientes externos.'},
  es:{superficie:'Superficie',cor:'Color',junta:'Junta de colocación',formato:'Formato',uso:'Indicación de uso',pecas:'Piezas por caja',versao:'Versión',vt:'Variación de tono',m2cx:'M² por Caja',faces:'Caras',espessura:'Espesor',relevo:'Indicación de relieve',localUso:'Lugar de Uso',face_s:'cara',faces_s:'caras',mate:'Mate',acetinado:'Satinado',polido:'Pulido',brilhante:'Brillante',esmaltado:'Esmaltado',natural:'Natural',naturalAcetinado:'Natural Satinado',rustico:'Rústico',antiderrapante:'Antideslizante',marrom:'Marrón',branco:'Blanco',cinza:'Gris',bege:'Beige',preto:'Negro',pisoParede:'Piso | Pared',piso:'Piso',parede:'Pared',rt:'RT - Rectificado',vt1:'VT1 - Uniforme',vt2:'VT2 - Poca variación',vt3:'VT3 - Variación media',vt4:'VT4 - Alta variación',semRelevo:'Sin relieve',comRelevo:'Con relieve',
    packTitle:'INFORMACIÓN DE EMBALAJE',pieceSz:'Tamaño de Pieza',thick:'Espesor',pcsbox:'Piezas/Caja',m2box:'M²/Caja',gwbox:'Peso Bruto Kg/Caja',layers:'Camadas por Pallet',boxpal:'Cajas/Pallet',m2pal:'M²/Pallet',gwpal:'Peso Bruto Kg/Pallet',
    contCartons:'Total Cajas - Contenedor',contPallets:'Total Pallets - Contenedor',contSqmt:'Total M² - Contenedor',contGw:'Total Peso Bruto - Contenedor',
    palAm:'Pallet Americano',palEu:'Europallet',priceLabel:'Precio',usdm2:'USD/m²',barcode:'Código de Barras',
    LB:'Ambientes residenciales sin acceso a la calle, como baños, salas, habitaciones y cocinas.',LC:'Ambientes residenciales con y sin acceso a la calle, como baños, salas, habitaciones, cocinas, garajes y terrazas cubiertas. Áreas comerciales de bajo tráfico.',LD:'Ambientes residenciales y comerciales con y sin acceso a la calle, como baños, salas, habitaciones, cocinas, garajes y terrazas.',LE:'Ambientes residenciales y comerciales con y sin acceso a la calle, como baños, salas, habitaciones, cocinas, garajes, terrazas, áreas húmedas como aceras y ambientes externos.'},
  en:{superficie:'Surface',cor:'Color',junta:'Setting Joint',formato:'Format',uso:'Indication of Use',pecas:'Pieces per Box',versao:'Version',vt:'Tone Variation',m2cx:'M² per Box',faces:'Faces',espessura:'Thickness',relevo:'Relief Indication',localUso:'Place of Use',face_s:'face',faces_s:'faces',mate:'Matte',acetinado:'Satin',polido:'Polished',brilhante:'Glossy',esmaltado:'Glazed',natural:'Natural',naturalAcetinado:'Natural Satin',rustico:'Rustic',antiderrapante:'Anti-slip',marrom:'Brown',branco:'White',cinza:'Gray',bege:'Beige',preto:'Black',pisoParede:'Floor | Wall',piso:'Floor',parede:'Wall',rt:'RT - Rectified',vt1:'VT1 - Uniform',vt2:'VT2 - Low variation',vt3:'VT3 - Medium variation',vt4:'VT4 - High variation',semRelevo:'No relief',comRelevo:'With relief',
    packTitle:'PACKING INFORMATION',pieceSz:'Piece Size',thick:'Thickness',pcsbox:'Pcs/Box',m2box:'M²/Box',gwbox:'Gross Wt Kg/Box',layers:'Layers per Pallet',boxpal:'Boxes/Pallet',m2pal:'M²/Pallet',gwpal:'Gross Wt Kg/Pallet',
    contCartons:'Total Boxes - Container',contPallets:'Total Pallets - Container',contSqmt:'Total M² - Container',contGw:'Total Gross Weight - Container',
    palAm:'American Pallet',palEu:'Europallet',priceLabel:'Price',usdm2:'USD/m²',barcode:'Barcode',
    LB:'Residential environments without street access, such as bathrooms, living rooms, bedrooms and kitchens.',LC:'Residential environments with and without street access, such as bathrooms, living rooms, bedrooms, kitchens, garages and covered verandas. Low-traffic commercial areas.',LD:'Residential and commercial environments with and without street access, such as bathrooms, living rooms, bedrooms, kitchens, garages and verandas.',LE:'Residential and commercial environments with and without street access, such as bathrooms, living rooms, bedrooms, kitchens, garages, verandas, wet areas like sidewalks and outdoor environments.'}
};
function _ct(lang,key){return (CAT_T[lang]&&CAT_T[lang][key])||CAT_T.pt[key]||key;}
const _valMap={'mate':'mate','matte':'mate','fosco':'mate',
  'acetinado':'acetinado','satin':'acetinado','satinado':'acetinado',
  'polido':'polido','pulido':'polido','polished':'polido',
  'brilhante':'brilhante','brillante':'brilhante','glossy':'brilhante','natural acetinado':'naturalAcetinado','acetinado natural':'naturalAcetinado',
  'esmaltado':'esmaltado','esmaltada':'esmaltado','glazed':'esmaltado',
  'natural':'natural','rústico':'rustico','rustico':'rustico','rustic':'rustico',
  'antiderrapante':'antiderrapante','anti-slip':'antiderrapante',
  'branco':'branco','blanco':'branco','white':'branco',
  'cinza':'cinza','gris':'cinza','gray':'cinza','grey':'cinza',
  'bege':'bege','beige':'bege','preto':'preto','negro':'preto','black':'preto',
  'marrom':'marrom','marrón':'marrom','brown':'marrom',
  'piso | parede':'pisoParede','piso | pared':'pisoParede','floor | wall':'pisoParede',
  'piso':'piso','floor':'piso','parede':'parede','pared':'parede','wall':'parede',
  'rt - retificado':'rt','rt - rectificado':'rt','rt - rectified':'rt',
  'sem relevo':'semRelevo','sin relieve':'semRelevo','no relief':'semRelevo','com relevo':'comRelevo'};
function _tradVal(lang,v){if(!v||lang==='pt')return v;const s=String(v);const k=_valMap[s.toLowerCase().trim()];return k?_ct(lang,k):v;}
function _tradVt(lang,v){const u=String(v||'').toUpperCase().trim();if(u.startsWith('VT1'))return _ct(lang,'vt1');if(u.startsWith('VT2'))return _ct(lang,'vt2');if(u.startsWith('VT3'))return _ct(lang,'vt3');if(u.startsWith('VT4'))return _ct(lang,'vt4');return _tradVal(lang,v);}


// HELPERS
function _resizeImg(dataUrl,maxPx,quality){return new Promise(resolve=>{if(!dataUrl||dataUrl===''){resolve(dataUrl);return;}const img=new Image();img.onload=()=>{const scale=Math.min(1,maxPx/Math.max(img.width||1,img.height||1));if(scale>=0.99){resolve(dataUrl);return;}const w=Math.round(img.width*scale),h=Math.round(img.height*scale);const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);let transp=false;try{const px=ctx.getImageData(0,0,w,h).data;for(let i=3;i<px.length;i+=4){if(px[i]<255){transp=true;break;}}}catch(_){transp=!/^data:image\/jpe?g/i.test(dataUrl);}if(transp){resolve(c.toDataURL('image/png'));return;}resolve(c.toDataURL('image/jpeg',quality||0.80));};img.onerror=()=>resolve(dataUrl);img.src=dataUrl;});}
// Dimensões das imagens calculadas UMA vez por PDF (getImageProperties decodifica a imagem inteira a cada chamada)
let _catDims=new Map();
function _catProps(doc,data){let pr=_catDims.get(data);if(!pr){const r=doc.getImageProperties(data);pr={width:r.width,height:r.height};_catDims.set(data,pr);}return pr;}
// Libera o navegador entre etapas (MessageChannel não sofre o atraso que o setTimeout tem em abas/janelas em segundo plano)
function _catYield(){return new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();r();};c.port2.postMessage(0);});}
function _addImgProp(doc,data,fmt,cx,cy,maxW,maxH,alignH,alias){try{const pr=_catProps(doc,data);const ratio=pr.width/pr.height;let w,h;if(ratio>maxW/maxH){w=maxW;h=maxW/ratio;}else{h=maxH;w=maxH*ratio;}let x=cx;if(alignH==='center')x=cx+(maxW-w)/2;else if(alignH==='right')x=cx+maxW-w;const y=cy+(maxH-h)/2;doc.addImage(data,fmt,x,y,w,h,alias||undefined);return{w,h,x,y};}catch(e){console.error('[catálogo] _addImgProp falhou:',e,data?String(data).slice(0,60):data);return null;}}
function _formatoToInch(fmt){const m=String(fmt||'').match(/(\d+(?:[.,]\d+)?)/g);if(!m||m.length<2)return'';const a=parseFloat(m[0].replace(',','.'));const b=parseFloat(m[1].replace(',','.'));if(isNaN(a)||isNaN(b))return'';return`${Math.round(a/2.54)}' x ${Math.round(b/2.54)}'`;}
function _n(v,dec,suf){const n=+(v||0);if(!n)return'';return n.toFixed(dec||0)+(suf||'');}

// SPECS BUILDER
function _buildSpecs(lang,p){
  const T=CAT_T[lang]||CAT_T.pt;
  const thick=String(p.thickness||'').replace(',','.');
  const thickStr=thick&&!isNaN(parseFloat(thick))?(thick.includes('mm')?thick:thick+' mm'):'';
  // Peças: apenas número; Faces: apenas número
  const pcs=p.cx_pecas?String(Math.round(p.cx_pecas)):'';
  const faceN=String(p.face||'').match(/\d+/)?.[0];
  const faceStr=faceN?String(parseInt(faceN)):'';
  return [
    [T.superficie,_tradVal(lang,p.superficie||''),  T.cor,_tradVal(lang,p.cor||''),   T.junta,p.junta_assentamento||''],
    [T.formato,p.formato||'',                        T.uso,_tradVal(lang,p.uso||''),   T.pecas,pcs],
    [T.versao,_tradVal(lang,p.versao||''),           T.vt,_tradVt(lang,p.vt||''),     T.m2cx,p.cx_sqmt?_n(p.cx_sqmt,2,' m²'):''],
    [T.faces,faceStr,                                T.espessura,thickStr,            T.relevo,_tradVal(lang,p.relevo||'')],
  ];
}

// LOCAL DE USO
function _getLocalUsoDesc(lang,code){
  if(!code)return'';
  const entry=catLocalUsoData[code];
  if(entry&&entry[lang])return entry[lang];
  const T=CAT_T[lang]||CAT_T.pt;
  return T[code]||'';
}

// ============================================================
// PACKING – tabela 3 colunas + container
// ============================================================
async function _drawPackingFinal(doc,items,packAm,packEu,mainLang,W,H,ml,mr,cw,getLoFornImg,getLoAdImg,showFob,showExw){
  if(!items||!items.length)return;
  const T=CAT_T[mainLang]||CAT_T.pt;

  // Colunas a exibir: combina tipo de preço (FOB/EXW) x tipo de pallet (Americano/Europallet)
  const priceTypes=[];
  if(showFob)priceTypes.push('FOB');
  if(showExw)priceTypes.push('EXW');
  if(!priceTypes.length)priceTypes.push('FOB'); // preço não exibido: usa FOB como padrão, mas ainda rotula
  const palletTypes=[];
  if(packAm)palletTypes.push('Americano');
  if(packEu)palletTypes.push('Europallet');
  const colunas=[];
  priceTypes.forEach(pt=>palletTypes.forEach(plt=>colunas.push({priceType:pt,palletType:plt})));
  if(!colunas.length)return;

  // ── Agrupar produtos por assinatura de packing (considerando FOB e EXW) ──
  const _sig=p=>[p.cx_pecas,p.cx_sqmt,p.cx_peso,p.pallet_caixas,p.pallet_sqmt,p.pallet_peso,
    p.euro_cx_pecas,p.euro_cx_sqmt,p.euro_cx_peso,p.euro_pallet_caixas,p.euro_pallet_sqmt,p.euro_pallet_peso,
    p.exw_cx_pecas,p.exw_cx_sqmt,p.exw_cx_peso,p.exw_pallet_caixas,p.exw_pallet_sqmt,p.exw_pallet_peso,
    p.camadas_fob,p.camadas_exw].join('|');

  const groups=[];
  items.forEach(it=>{
    const sig=_sig(it.produto);
    const g=groups.find(g=>g.sig===sig);
    if(g)g.items.push(it);
    else groups.push({sig,items:[it]});
  });

  // ── Renderizar uma página por grupo ─────────────────────────
  for(const [gi,grp] of groups.entries()){
    await _catYield(); // libera o navegador entre páginas, evita travar a aba
    doc.addPage();
    let y=12;

    // Logo
    const loFI=getLoFornImg();
    if(loFI){const r=_addImgProp(doc,loFI,'PNG',ml,y,cw,13,'center','logo_forn');y+=(r?r.h:13)+3;}else{y+=16;}
    doc.setDrawColor(190,190,190);doc.setLineWidth(0.3);doc.line(ml,y,W-mr,y);y+=5;

    // Título
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(20,20,20);
    doc.text(T.packTitle||'INFORMAÇÕES DE EMBALAGEM',ml,y);
    if(groups.length>1){
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(110,110,110);
      doc.text('('+(gi+1)+'/'+groups.length+')',ml+90,y);
    }
    y+=8;

    const validLbl=mainLang==='en'?'Information valid for the products:':mainLang==='es'?'Información válida para los productos:':'Informações válidas para os produtos:';
    doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(60,60,60);
    doc.text(validLbl,ml,y);y+=5;

    const N_COLS=3,PER_SET=27;
    const colW=cw/N_COLS;
    const rowH=4.5;
    const sets=[];
    for(let si=0;si<grp.items.length;si+=PER_SET)sets.push(grp.items.slice(si,si+PER_SET));

    sets.forEach((set,si)=>{
      if(si>0)y+=3;
      set.forEach((it,idx)=>{
        const col=idx%N_COLS;
        const row=Math.floor(idx/N_COLS);
        const x=ml+col*colW;
        const ry=y+row*rowH;
        doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(30,30,30);
        const name=it.produto.nome||it.produto.codigo||'';
        const maxChars=Math.floor(colW/1.8);
        doc.text('• '+(name.length>maxChars?name.slice(0,maxChars-1)+'…':name),x,ry);
      });
      y+=Math.ceil(set.length/N_COLS)*rowH;
    });

    y+=6;
    doc.setDrawColor(200,200,200);doc.setLineWidth(0.2);doc.line(ml,y,W-mr,y);y+=5;

    const p=grp.items[0].produto;
    const nCols=colunas.length;
    const lblW=nCols>2?50:65;
    const valW=(cw-lblW)/nCols;
    const headerFs=nCols>2?6.5:8;

    // Cabeçalhos de coluna (ex: "FOB - Pallet Americano")
    let hx=ml+lblW;
    colunas.forEach(col=>{
      const rotulo=(col.priceType?col.priceType+' - ':'')+_ct(mainLang,col.palletType==='Americano'?'palAm':'palEu');
      doc.setFillColor(35,35,35);doc.roundedRect(hx,y-3,valW-1,8,2,2,'F');
      doc.setFont('helvetica','bold');doc.setFontSize(headerFs);doc.setTextColor(255,255,255);
      doc.text(rotulo,hx+(valW-1)/2,y+2.5,{align:'center'});
      hx+=valW;
    });
    y+=11;

    const palData=(col)=>{
      const isEuro=col.palletType==='Europallet';
      const isExw=col.priceType==='EXW';
      const fmtInch=_formatoToInch(p.formato);
      const fmtStr=p.formato+(fmtInch?' | '+fmtInch:'');
      const thick=String(p.thickness||'').replace(',','.');
      const thickStr=thick&&!isNaN(parseFloat(thick))?(thick.includes('mm')?thick:thick+' mm'):'';

      // usa o texto exato da planilha quando tiver "/" (ex: "28 / 56"),
      // senão cai pro número formatado como antes
      const val=(txt,numVal,dec,suf)=>{
        if(txt&&/\//.test(txt))return txt.replace(/\s*\/\s*/g,' / '); // padroniza espaço em volta da barra
        return _n(numVal,dec,suf);
      };

      let cx_pecas,cx_sqmt,cx_peso,pal_cx,pal_sqmt,pal_peso,tot_pal,tot_sqmt,tot_cart,tot_gw;
      if(isEuro){
        // Europallet: só usa os dados PRÓPRIOS de europallet — se estiverem
        // vazios na planilha, fica em branco (não copia do pallet normal).
        cx_pecas=val(p.euro_cx_pecas_txt, p.euro_cx_pecas, 0);
        cx_sqmt=val(p.euro_cx_sqmt_txt, p.euro_cx_sqmt, 2,' m²');
        cx_peso=val(p.euro_cx_peso_txt, p.euro_cx_peso, 2,' kg');
        pal_cx=val(p.euro_pallet_caixas_txt, p.euro_pallet_caixas, 0);
        pal_sqmt=val(p.euro_pallet_sqmt_txt, p.euro_pallet_sqmt, 2,' m²');
        pal_peso=val(p.euro_pallet_peso_txt, p.euro_pallet_peso, 2,' kg');
        tot_pal=val(p.euro_container_pallets_txt, p.euro_container_pallets, 0);
        tot_sqmt=val(p.euro_container_sqmt_txt, p.euro_container_sqmt, 2,' m²');
        tot_cart=val(p.euro_container_caixas_txt, p.euro_container_caixas, 0);
        tot_gw=val(p.euro_container_peso_txt, p.euro_container_peso, 2,' kg');
      }else if(isExw){
        cx_pecas=val(p.exw_cx_pecas_txt, p.exw_cx_pecas||p.cx_pecas, 0);
        cx_sqmt=val(p.exw_cx_sqmt_txt, p.exw_cx_sqmt||p.cx_sqmt, 2,' m²');
        cx_peso=val(p.exw_cx_peso_txt, p.exw_cx_peso||p.cx_peso, 2,' kg');
        pal_cx=val(p.exw_pallet_caixas_txt, p.exw_pallet_caixas||p.pallet_caixas, 0);
        pal_sqmt=val(p.exw_pallet_sqmt_txt, p.exw_pallet_sqmt||p.pallet_sqmt, 2,' m²');
        pal_peso=val(p.exw_pallet_peso_txt, p.exw_pallet_peso||p.pallet_peso, 2,' kg');
        tot_pal=val(p.exw_total_pallets_txt, p.exw_total_pallets||p.container_pallets, 0);
        tot_sqmt=val(p.exw_total_sqmt_txt, p.exw_total_sqmt||p.container_sqmt, 2,' m²');
        tot_cart=val(p.exw_total_cartons_txt, p.exw_total_cartons||p.container_caixas, 0);
        tot_gw=val(p.exw_total_gw_txt, p.exw_total_gw||p.container_peso, 2,' kg');
      }else{
        cx_pecas=val(p.cx_pecas_txt, p.cx_pecas, 0);
        cx_sqmt=val(p.cx_sqmt_txt, p.cx_sqmt, 2,' m²');
        cx_peso=val(p.cx_peso_txt, p.cx_peso, 2,' kg');
        pal_cx=val(p.pallet_caixas_txt, p.pallet_caixas, 0);
        pal_sqmt=val(p.pallet_sqmt_txt, p.pallet_sqmt, 2,' m²');
        pal_peso=val(p.pallet_peso_txt, p.pallet_peso, 2,' kg');
        tot_pal=val(p.container_pallets_txt, p.container_pallets, 0);
        tot_sqmt=val(p.container_sqmt_txt, p.container_sqmt, 2,' m²');
        tot_cart=val(p.container_caixas_txt, p.container_caixas, 0);
        tot_gw=val(p.container_peso_txt, p.container_peso, 2,' kg');
      }
      const camadasTxt=isEuro?(isExw?p.camadas_euro_exw_txt:p.camadas_euro_fob_txt):(isExw?p.camadas_exw_txt:p.camadas_fob_txt);
      const camadasNum=isEuro?(isExw?(p.camadas_euro_exw||p.camadas_euro_fob):p.camadas_euro_fob):(isExw?(p.camadas_exw||p.camadas_fob):p.camadas_fob);
      const camadas=val(camadasTxt,camadasNum,0);

      return[fmtStr,thickStr,cx_pecas,cx_sqmt,cx_peso,camadas,pal_cx,pal_sqmt,pal_peso,
        tot_cart,tot_pal,tot_sqmt,tot_gw];
    };

    const rowLabels=[T.pieceSz,T.thick,T.pcsbox,T.m2box,T.gwbox,T.layers,T.boxpal,T.m2pal,T.gwpal,
      T.contCartons,T.contPallets,T.contSqmt,T.contGw];
    const colData=colunas.map(col=>palData(col));
    const rowH2=6.8;

    rowLabels.forEach((lbl,ri)=>{
      const ry=y+ri*rowH2;
      doc.setFillColor(ri%2===0?246:255,ri%2===0?246:255,ri%2===0?246:255);
      doc.rect(ml,ry-4.5,cw,rowH2,'F');
      doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(80,80,80);
      doc.text(lbl||'',ml+2,ry);
      let vx=ml+lblW;
      colData.forEach(dados=>{
        doc.setFont('helvetica','bold');doc.setFontSize(nCols>2?7:7.5);doc.setTextColor(20,20,20);
        doc.text(String(dados[ri]||''),vx+(valW-1)/2,ry,{align:'center'});
        vx+=valW;
      });
    });

    const loAI=getLoAdImg();
    if(loAI)_addImgProp(doc,loAI,'PNG',W-mr-40,H-13,40,10,'right','logo_ad');
  } // fim grupos
}



// ============================================================
// PDF PRINCIPAL
// ============================================================
async function gerarCatalogoPdf(){
  if(!catSelecionados.length){showToast('Adicione ao menos um produto','error');return;}
  if(!window.jspdf){showToast('Biblioteca jsPDF não carregada','error');return;}
  // Nome do arquivo = Título + Linha 1 (Título obrigatório)
  const _linha1=(document.getElementById('catTituloPt')?.value||'').trim();
  const _linha2=(document.getElementById('catTituloEs')?.value||'').trim();
  if(!_linha1){showToast('Preencha o Título (é o nome do arquivo)','error');document.getElementById('catTituloPt')?.focus();return;}

  const mainLang=catMainLang;
  const secLangs=_getSecLangs();
  const allLangs=[mainLang,...secLangs];
  const selFotos=_getSelectedFotos();
  const showPreco=_isOn('catMostrarPreco'),showFob=_isOn('catMostrarFob'),showExw=_isOn('catMostrarExw');
  const showEuro=_isOn('catMostrarEuroPallet');
  const addEuro=showEuro?parseFloat(document.getElementById('catAdicionalEuro')?.value||'0')||0:0;
  const showBarcode=_isOn('catMostrarBarcode');
  const packAm=_isOn('catPackAmericano'),packEu=_isOn('catPackEuro');
  const doPack=packAm||packEu;
  const titulos={pt:document.getElementById('catTituloPt')?.value||'',es:document.getElementById('catTituloEs')?.value||'',en:document.getElementById('catTituloEn')?.value||''};
  const ano=document.getElementById('catAno')?.value||new Date().getFullYear();
  const capaUrl=(document.getElementById('catCapaUrl')?.value||'').trim();
  const loFornUrl=(document.getElementById('catLogoFornUrl')?.value||'').trim();
  const loAdUrl=(document.getElementById('catLogoAdUrl')?.value||'').trim();
  const siteUrl=(document.getElementById('catSiteUrl')?.value||'').trim();

  const toFetch=new Set();
  const _nf=url=>url&&url!=='(arquivo local)';
  if(_nf(capaUrl)&&!_catFiles.catCapa)toFetch.add(capaUrl);
  if(_nf(loFornUrl)&&!_catFiles.catLogoForn)toFetch.add(loFornUrl);
  if(_nf(loAdUrl)&&!_catFiles.catLogoAd)toFetch.add(loAdUrl);
  catSelecionados.forEach(it=>{selFotos.forEach(n=>{const u=((n===2?it.produto.imagem2:n===3?it.produto.imagem3:it.produto.imagem)||'').trim();if(u)toFetch.add(u);});});

  const btn=document.getElementById('btnGerarCatalogo');
  const status=document.getElementById('catGerandoStatus');
  btn.disabled=true;status.style.display='';

  let imgs={};
  if(toFetch.size>0){
    status.textContent='Buscando imagens ('+toFetch.size+')...';
    try{imgs=await new Promise((res,rej)=>{google.script.run.withSuccessHandler(r=>{const d=JSON.parse(r);d.success?res(d.data):rej(new Error(d.error));}).withFailureHandler(e=>rej(e)).buscarImagensBase64(JSON.stringify([...toFetch]));});}
    catch(e){showToast('Erro ao buscar imagens: '+e.message,'error');btn.disabled=false;status.style.display='none';return;}
    // Otimização de tamanho do PDF:
    // - Logos e capa podem vir em alta resolução → redimensionar
    // - Imagens de produto já chegam em w600 do Drive → usar JPEG original
    //   (compressão Google > re-codificação canvas; preserva qualidade e reduz arquivo)
    status.textContent='Otimizando logos...';
    for(const url of Object.keys(imgs)){
      if(!imgs[url]||imgs[url]==='')continue;
      const isLogo=url===loFornUrl||url===loAdUrl;
      const isCapa=url===capaUrl;
      if(isLogo)     imgs[url]=await _resizeImg(imgs[url],1600,0.92);
      else if(isCapa)imgs[url]=await _resizeImg(imgs[url],2400,0.92);
      else           imgs[url]=await _resizeImg(imgs[url],1000,0.82); // fotos de produto: comprime pra acelerar a geração
    }
  }
  // Capa e logos: só reduz imagens gigantes, mantendo alta qualidade
  if(_catFiles.catCapa)imgs['__cc__']=await _resizeImg(_catFiles.catCapa,2400,0.92);
  if(_catFiles.catLogoForn)imgs['__lf__']=await _resizeImg(_catFiles.catLogoForn,1600,0.92);
  if(_catFiles.catLogoAd)imgs['__la__']=await _resizeImg(_catFiles.catLogoAd,1600,0.92);

  const getCapaImg=()=>imgs['__cc__']||(_nf(capaUrl)?imgs[capaUrl]:null)||null;
  const getLoFornImg=()=>imgs['__lf__']||(_nf(loFornUrl)?imgs[loFornUrl]:null)||null;
  const getLoAdImg=()=>imgs['__la__']||(_nf(loAdUrl)?imgs[loAdUrl]:null)||null;
  const getProdImg=(it,n)=>{const u=((n===2?it.produto.imagem2:n===3?it.produto.imagem3:it.produto.imagem)||'').trim();const r=u?imgs[u]:null;return(r&&r!=='')?r:null;};

  status.textContent='Gerando PDF...';
  _catDims=new Map();
  await _catYield();
  try{
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const W=210,H=297,ml=15,mr=15,cw=W-ml-mr;
    const T=CAT_T[mainLang]||CAT_T.pt;
    // Título sempre do campo "Título"; Linha 1 e 2 sempre como subtítulos
    const titulo=titulos.pt||'';
    const subTitulos=[titulos.es,titulos.en].filter(Boolean);

    // ── CAPA ──────────────────────────────────────
    const capImg=getCapaImg();
    if(capImg){try{const pr=_catProps(doc,capImg);const capH=Math.min(95,W*pr.height/pr.width);doc.addImage(capImg,'JPEG',0,0,W,capH,'capa');}catch(e){doc.addImage(capImg,'JPEG',0,0,W,90,'capa');}}
    let y=108;
    const loFImg=getLoFornImg();
    if(loFImg){const r=_addImgProp(doc,loFImg,'PNG',ml,y,cw,22,'center','logo_forn');y+=(r?r.h:20)+8;}else{y+=28;}
    doc.setDrawColor(190,190,190);doc.setLineWidth(0.4);doc.line(ml,y,W-mr,y);y+=12;
    if(titulo){doc.setFont('helvetica','bold');doc.setFontSize(17);doc.setTextColor(20,20,20);doc.text(titulo,W/2,y,{align:'center'});y+=9;}
    subTitulos.forEach(s=>{doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(110,110,110);doc.text(s,W/2,y,{align:'center'});y+=7;});
    y+=4;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(140,140,140);doc.text(String(ano),W/2,y,{align:'center'});
    if(siteUrl){y+=8;doc.setFontSize(9);doc.setTextColor(0,102,204);doc.text(siteUrl,W/2,y,{align:'center'});}
    const loAImg=getLoAdImg();
    if(loAImg)_addImgProp(doc,loAImg,'PNG',W-mr-42,H-17,42,12,'right','logo_ad');

    // ── PÁGINAS DE PRODUTO ─────────────────────────
    for(const [prodIdx,it] of catSelecionados.entries()){
      if(prodIdx%3===0){status.textContent='Gerando PDF... produto '+(prodIdx+1)+' de '+catSelecionados.length;await _catYield();} // libera o navegador a cada 3 produtos
      doc.addPage();
      const p=it.produto;
      let y=10;

      // Logo
      const loFI=getLoFornImg();
      if(loFI){const r=_addImgProp(doc,loFI,'PNG',ml,y,cw,14,'center','logo_forn');y+=(r?r.h:14)+4;}else{y+=18;}
      doc.setDrawColor(190,190,190);doc.setLineWidth(0.4);doc.line(ml,y,W-mr,y);y+=5;

      // Nome + código
      doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(15,15,15);
      // Comentário do produto: à direita do nome, em negrito (máx. 100 caracteres)
      const com=String(it.comentario||'').trim().slice(0,100);
      const comW=cw*0.5,yTop=y;
      const nL=doc.splitTextToSize(p.nome||'',com?cw-comW-6:cw);doc.text(nL,ml,y);y+=nL.length*6+1;
      if(p.codigo){doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(130,130,130);doc.text(p.codigo,ml,y);y+=4;}
      if(com){
        doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(15,15,15);
        const cL=doc.splitTextToSize(com,comW);
        doc.text(cL,W-mr,yTop,{align:'right'});
        y=Math.max(y,yTop+(cL.length-1)*4.1+2.5);
      }
      doc.setDrawColor(190,190,190);doc.setLineWidth(0.3);doc.line(ml,y,W-mr,y);y+=3;

      // ── FOTOS ────────────────────────────────────
      let availImgs=selFotos.map(n=>({n,img:getProdImg(it,n)})).filter(x=>!!x.img);
      const nF=availImgs.length;
      if(nF===0){y+=10;}
      else if(nF===1){
        const fi=availImgs[0];const maxH=100,maxW=128;
        try{const pr=_catProps(doc,fi.img);const ratio=pr.width/pr.height;let iW=maxW,iH=maxW/ratio;if(iH>maxH){iH=maxH;iW=maxH*ratio;}const ix=ml+(cw-iW)/2;doc.addImage(fi.img,'JPEG',ix,y,iW,iH,`p_${p.codigo}_f${fi.n}`);y+=iH+4;}catch(e){console.error('[catálogo] falha ao inserir foto do produto:',e,fi.img?String(fi.img).slice(0,60):fi.img);y+=10;}
      }else{
        const gap=3,cW=(cw-gap*(nF-1))/nF,maxH=82;let usedH=0;
        availImgs.forEach((fi,idx)=>{
          const xC=ml+idx*(cW+gap);
          try{const pr=_catProps(doc,fi.img);const ratio=pr.width/pr.height;let iW=cW,iH=cW/ratio;if(iH>maxH){iH=maxH;iW=maxH*ratio;}if(iW>cW){iW=cW;iH=cW/ratio;}const ix=xC+(cW-iW)/2,iy=y+(maxH-iH)/2;doc.addImage(fi.img,'JPEG',ix,iy,iW,iH,`p_${p.codigo}_f${fi.n}`);usedH=Math.max(usedH,iH);}
          catch(e){usedH=Math.max(usedH,maxH);}
        });
        y+=Math.max(usedH,maxH)+4;
      }

      doc.setDrawColor(190,190,190);doc.setLineWidth(0.3);doc.line(ml,y,W-mr,y);y+=3;

      // ── SPECS (idiomas): principal + secundários na mesma linha ──
      const mainSpecs=_buildSpecs(mainLang,p);
      const secSpecsArr=secLangs.map(sl=>_buildSpecs(sl,p));
      const nSec=secLangs.length;
      const rowH=12+(nSec>0?6:0);
      const sc=cw/3;

      for(let row=0;row<4;row++){
        for(let col=0;col<3;col++){
          const x=ml+col*sc;let cy=y;
          // Label principal
          doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(145,145,145);
          doc.text(String(mainSpecs[row][col*2]||''),x,cy);cy+=3.2;
          // Labels secundárias: todas na mesma linha separadas por " / "
          if(nSec>0){
            const _mLbl=String(mainSpecs[row][col*2]||'');
            const secLbls=secSpecsArr.map(ss=>String(ss[row][col*2]||'')).filter(l=>l&&l!==_mLbl).join(' / ');
            if(secLbls){doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.setTextColor(165,165,165);doc.text(secLbls,x,cy);cy+=3.2;}
          }
          cy+=0.8;
          // Valor principal
          doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(15,15,15);
          doc.text(String(mainSpecs[row][col*2+1]||''),x,cy);cy+=4.2;
          // Valores secundários: todos na mesma linha separados por " / "
          if(nSec>0){
            const _mVal=String(mainSpecs[row][col*2+1]||'');
            const secVals=secSpecsArr.map(ss=>String(ss[row][col*2+1]||'')).filter(v=>v&&v!==_mVal).join(' / ');
            if(secVals){doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(110,110,110);doc.text(secVals,x,cy);}
          }
        }
        y+=rowH;
      }

      doc.setDrawColor(190,190,190);doc.setLineWidth(0.3);doc.line(ml,y,W-mr,y);y+=3;

      // ── LOCAL DE USO ─────────────────────────────
      doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(140,140,140);
      const luLbl=allLangs.map(l=>_ct(l,'localUso')).join(' / ');
      doc.text(luLbl.toUpperCase(),ml,y);y+=3;
      const lCode=(p.local_uso||'').trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,2);
      if(lCode){
        doc.setFillColor(40,40,40);doc.roundedRect(ml,y,14,14,2,2,'F');
        doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(255,255,255);
        doc.text(lCode,ml+7,y+9,{align:'center'});
        let lineCount=0;
        allLangs.forEach((lang,li)=>{
          const desc=_getLocalUsoDesc(lang,lCode);
          if(!desc)return;
          const lines=doc.splitTextToSize(desc,cw-18);
          const fs=li===0?7.5:6.5;const clr=li===0?[40,40,40]:[110,110,110];
          doc.setFont('helvetica','normal');doc.setFontSize(fs);doc.setTextColor(...clr);
          doc.text(lines,ml+17,y+2+lineCount*4);
          lineCount+=lines.length;
        });
        y+=Math.max(17,lineCount*4+4);
      }

      // ── PREÇO: grupos FOB/EXW, cada um com Am|Euro ──
      if(showPreco&&(showFob||showExw)){
        y+=2;
        const priceGroups=[];
        if(showFob)priceGroups.push('FOB');
        if(showExw)priceGroups.push('EXW');
        const nGrp=priceGroups.length;
        const pH=20,gW=(cw-(nGrp-1)*4)/nGrp;
        const nCol=showEuro?2:1;
        const colW=gW/nCol;

        priceGroups.forEach((type,gi)=>{
          const gx=ml+gi*(gW+4);
          const amVal=type==='FOB'?Number(it.fob_edit||0):Number(it.exw_edit||0);
          const amLbl=(type+' PALLET AMERICANO ('+_ct(mainLang,'usdm2')+')').toUpperCase();
          const amStr='US$ '+amVal.toFixed(2).replace('.',',');

          // Box externo
          doc.setFillColor(255,255,255);doc.setDrawColor(60,60,60);doc.setLineWidth(0.6);
          doc.roundedRect(gx,y,gW,pH,3,3,'FD');

          // Coluna Am
          doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(70,70,70);
          doc.text(amLbl,gx+colW/2,y+6,{align:'center'});
          doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(10,10,10);
          doc.text(amStr,gx+colW/2,y+15,{align:'center'});

          if(showEuro){
            // Divisória vertical
            doc.setDrawColor(190,190,190);doc.setLineWidth(0.3);
            doc.line(gx+colW,y+3,gx+colW,y+pH-3);

            // Coluna Euro
            const euroVal=amVal+addEuro;
            const euroLbl=(type+' EUROPALLET ('+_ct(mainLang,'usdm2')+')').toUpperCase();
            const euroStr='US$ '+euroVal.toFixed(2).replace('.',',');
            doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(70,70,70);
            doc.text(euroLbl,gx+colW+colW/2,y+6,{align:'center'});
            doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(10,10,10);
            doc.text(euroStr,gx+colW+colW/2,y+15,{align:'center'});
          }
        });
        y+=pH+3;
      }

      // ── CÓDIGO DE BARRAS ─────────────────────────
      if(showBarcode&&p.barcode){
        y+=3;
        const barcodeLabel=allLangs.map(l=>_ct(l,'barcode')).filter((v,i,arr)=>arr.indexOf(v)===i).join(' / ');
        doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(90,90,90);
        doc.text(barcodeLabel+': ',ml,y);
        doc.setFont('helvetica','bold');doc.setTextColor(15,15,15);doc.text(String(p.barcode),ml+44,y);
      }

      // Logo AD rodapé
      const loAI=getLoAdImg();
      if(loAI)_addImgProp(doc,loAI,'PNG',W-mr-40,H-13,40,10,'right','logo_ad');

      // ── PACKING APÓS CADA PRODUTO ─────────────────
      // packing agora vai ao final do catálogo
    }

    // Packing ao final (uma vez para todos os produtos)
    if(doPack){status.textContent='Gerando PDF... packing';await _catYield();}
    if(doPack)await _drawPackingFinal(doc,catSelecionados,packAm,packEu,mainLang,W,H,ml,mr,cw,getLoFornImg,getLoAdImg,showFob,showExw);

    // Salvar: gera o arquivo UMA vez só e reaproveita para baixar e para o botão "Abrir PDF"
    status.textContent='Salvando arquivo...';await _catYield();
    const fn=(_linha1+(_linha2?' '+_linha2:'')).replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim()+'.pdf';
    const blob=doc.output('blob');
    if(_catLastBlobUrl){try{URL.revokeObjectURL(_catLastBlobUrl);}catch(_){}}
    _catLastBlobUrl=URL.createObjectURL(blob);
    const ab=document.getElementById('catBtnAbrirPdf');if(ab)ab.style.display='';
    const a=document.createElement('a');a.href=_catLastBlobUrl;a.download=fn;document.body.appendChild(a);a.click();a.remove();
    showToast('PDF gerado: '+fn,'success');

  }catch(e){showToast('Erro: '+e.message,'error');console.error('PDF error:',e);}
  finally{
    btn.disabled=false;status.style.display='none';
    // Liberar memória das imagens para o próximo PDF
    imgs={};_catDims=new Map();
    if(typeof window.gc==='function')try{window.gc();}catch(_){}
  }
}
