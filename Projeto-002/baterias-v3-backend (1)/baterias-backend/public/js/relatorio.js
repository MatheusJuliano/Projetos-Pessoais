// ═══════════════════════════════════════════════════════════════
//  RELATORIO.JS — Geração de PDFs (usa jsPDF)
// ═══════════════════════════════════════════════════════════════

function gerarPDF() {
  if (!mov.length) { alert('Nenhuma movimentação para gerar relatório.'); return; }
  const { jsPDF } = window.jspdf;
  let doc = new jsPDF();
  let y = 10;
  function pula(n) { if (y + (n||8) > 277) { doc.addPage(); y = 10; } }

  doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text('Relatorio de Movimentacoes', 10, y); y += 8;
  doc.setFontSize(11); doc.setFont('helvetica','normal');
  doc.text('Operador: ' + (usuarioAtual?.nome || '—'), 10, y); y += 6;
  doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 10, y); y += 10;

  mov.slice(0, 100).forEach(m => {
    pula(8);
    doc.text(`${m.tipo} | ${m.marca||''} ${m.modelo} | Qtd: ${m.qtd} | ${formatarData(m.data)}`, 10, y); y += 6;
  });

  doc.save('relatorio_' + new Date().toLocaleDateString('pt-BR').replace(/\//g,'-') + '.pdf');
}

function EstoqueReal() {
  if (!estoque || !estoque.length) { alert('O estoque está vazio.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });

  const geradoEm = new Date().toLocaleString('pt-BR');
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const pL = 12, pW = 273;

  doc.setFillColor(42,123,228); doc.rect(0,0,297,28,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text('Relatorio de Estoque de Baterias', pL, 12);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  doc.text('Operador: '+(usuarioAtual?.nome||'—')+'   |   Data: '+dataHoje+'   |   Gerado em: '+geradoEm, pL, 20);
  doc.text('Matheus Juliano - Sistema de Controle de Estoque de Baterias - Versao 3.0', pL, 25);

  let y = 36;
  doc.setTextColor(30,30,30);

  const totalUnidades = estoque.reduce((s,b)=>s+b.qtd,0);
  const totalModelos  = estoque.length;
  const semEstoque    = estoque.filter(b=>b.qtd===0).length;
  const estoqueBaixo  = estoque.filter(b=>b.qtd>0&&b.qtd<=5).length;

  const boxes=[
    {label:'Modelos cadastrados',valor:totalModelos, cor:[232,240,254]},
    {label:'Unidades em estoque',valor:totalUnidades,cor:[230,244,234]},
    {label:'Estoque baixo',      valor:estoqueBaixo, cor:[253,244,225]},
    {label:'Sem estoque',        valor:semEstoque,   cor:[253,232,232]},
  ];
  const bW=pW/4-3;
  boxes.forEach((b,i)=>{
    const bx=pL+i*(bW+4);
    doc.setFillColor(...b.cor); doc.roundedRect(bx,y,bW,18,3,3,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(40,40,40);
    doc.text(String(b.valor),bx+bW/2,y+11,{align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(90,90,90);
    doc.text(b.label,bx+bW/2,y+16.5,{align:'center'});
  });
  y+=25;

  const colW=[10,50,55,40,63,55];
  const colX=[];let cx=pL;
  colW.forEach(w=>{colX.push(cx);cx+=w;});
  const ROW_H=9,HEAD_H=10;

  function celula(ci,yl,texto,opts){
    const x=colX[ci],w=colW[ci],h=opts.altura||ROW_H,pad=3;
    if(opts.bg){doc.setFillColor(...opts.bg);doc.rect(x,yl,w,h,'F');}
    doc.setDrawColor(190,190,190);doc.setLineWidth(0.25);doc.line(x+w,yl,x+w,yl+h);
    doc.setTextColor(...(opts.cor||[30,30,30]));
    doc.setFont('helvetica',opts.negrito?'bold':'normal');doc.setFontSize(opts.tamanho||9);
    const mc=Math.floor((w-pad*2)/(opts.tamanho||9)*5.5);let t=String(texto);
    if(t.length>mc)t=t.substring(0,mc-1)+'...';
    const al=opts.centro?'center':'left',tx=opts.centro?x+w/2:x+pad;
    doc.text(t,tx,yl+h/2+1.5,{align:al});
  }
  function linhaH(yp,cor,esp){doc.setDrawColor(...(cor||[190,190,190]));doc.setLineWidth(esp||0.25);doc.line(pL,yp,pL+pW,yp);}
  function cabecalho(yp){
    const headers=['No','MARCA','MODELO','QTD DISPONIVEL','OBSERVACAO','STATUS'];
    doc.setFillColor(42,123,228);doc.rect(pL,yp,pW,HEAD_H,'F');
    headers.forEach((h,i)=>celula(i,yp,h,{cor:[255,255,255],negrito:true,tamanho:9,centro:true,altura:HEAD_H}));
    linhaH(yp+HEAD_H,[42,123,228],0.5);return yp+HEAD_H;
  }
  y=cabecalho(y);

  const itens=[...estoque].sort((a,b)=>{const p=v=>v===0?0:v<=5?1:2;return p(a.qtd)-p(b.qtd)||a.marca.localeCompare(b.marca);});
  itens.forEach((b,idx)=>{
    if(y+ROW_H>196){doc.addPage();y=12;y=cabecalho(y);}
    let bgRow=b.qtd===0?[253,232,232]:b.qtd<=5?[255,248,225]:idx%2===0?[245,248,255]:[255,255,255];
    doc.setFillColor(...bgRow);doc.rect(pL,y,pW,ROW_H,'F');
    celula(0,y,idx+1,{cor:[130,130,130],centro:true,tamanho:8});
    celula(1,y,b.marca,{negrito:true,tamanho:9});
    celula(2,y,b.modelo,{tamanho:9});
    let qtdCor=b.qtd===0?[180,0,0]:b.qtd<=5?[160,100,0]:[20,120,60];
    celula(3,y,b.qtd,{cor:qtdCor,negrito:true,centro:true,tamanho:11});
    celula(4,y,b.obs||'-',{cor:[80,80,80],tamanho:8.5});
    let statusTxt,sBg,sCor;
    if(b.qtd===0){statusTxt='SEM ESTOQUE';sBg=[253,232,232];sCor=[180,0,0];}
    else if(b.qtd<=5){statusTxt='REABASTECER';sBg=[255,248,225];sCor=[160,100,0];}
    else{statusTxt='OK';sBg=[230,244,234];sCor=[20,120,60];}
    const bx=colX[5]+3,bw=colW[5]-6;
    doc.setFillColor(...sBg);doc.roundedRect(bx,y+1.5,bw,ROW_H-3,1.5,1.5,'F');
    doc.setTextColor(...sCor);doc.setFont('helvetica','bold');doc.setFontSize(7.5);
    doc.text(statusTxt,bx+bw/2,y+ROW_H/2+1.5,{align:'center',maxWidth:bw-2});
    linhaH(y+ROW_H,[200,200,200],0.2);
    doc.setDrawColor(190,190,190);doc.setLineWidth(0.25);doc.line(pL,y,pL,y+ROW_H);
    y+=ROW_H;
  });

  linhaH(y,[150,150,150],0.5);y+=3;
  doc.setFillColor(42,123,228);doc.rect(pL,y,pW,10,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(10);
  doc.text('TOTAL DE UNIDADES EM ESTOQUE:',pL+4,y+7);
  doc.text(String(totalUnidades),pL+pW-4,y+7,{align:'right'});

  const totalPags=doc.internal.getNumberOfPages();
  for(let p=1;p<=totalPags;p++){
    doc.setPage(p);doc.setFontSize(7.5);doc.setTextColor(160,160,160);
    doc.text('Sistema de Controle de Estoque de Baterias - Matheus Juliano - Pagina '+p+' de '+totalPags,pL,204);
  }

  doc.save('estoque_'+dataHoje.replace(/\//g,'-')+'.pdf');
}
