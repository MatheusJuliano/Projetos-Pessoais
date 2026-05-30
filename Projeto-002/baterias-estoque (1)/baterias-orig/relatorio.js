let usuarioAtual = null;

// ── Login ─────────────────────────────────────────────────────────────────────
function login() {
  let nome = document.getElementById("usuario").value.trim();
  if (!nome) {
    alert("Digite um nome de usuário.");
    return;
  }

  // carrega os dados deste usuário do localStorage
  carregarUsuario(nome);

  usuarioAtual = {
    usuario: nome,
    entrada: new Date(),
    saida: null,
    acoes: [],
  };

  salvar();
  atualizar();
  alert("Bem-vindo, " + nome + "!");
}

// ── Saída ─────────────────────────────────────────────────────────────────────
function sair() {
  if (!usuarioAtual) {
    alert("Nenhum usuário logado.");
    return;
  }
  if (usuarioAtual.saida) {
    alert("Saída já registrada.");
    return;
  }

  usuarioAtual.saida = new Date();
  salvar();
  alert("Saída registrada para: " + usuarioAtual.usuario);

  // limpa tudo e reseta estado
  usuarioAtual = null;
  estoque = [];
  mov = [];
  limparTela();
  document.getElementById("usuario").value = "";
}

// ── Gerar PDF do usuário atual ────────────────────────────────────────────────
function gerarPDF() {
  if (!usuarioAtual) {
    alert("Nenhum usuário logado.");
    return;
  }

  const { jsPDF } = window.jspdf;
  let doc = new jsPDF();
  let y = 10;

  function checarPagina(n) {
    if (y + (n || 8) > 277) {
      doc.addPage();
      y = 10;
    }
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Relatorio de Acesso", 10, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  let u = usuarioAtual;
  let ent = new Date(u.entrada).toLocaleString("pt-BR");
  let sai = u.saida
    ? new Date(u.saida).toLocaleString("pt-BR")
    : "Ainda logado";

  doc.text("Usuario: " + u.usuario, 10, y);
  y += 6;
  doc.text("Entrada: " + ent, 10, y);
  y += 6;
  doc.text("Saida:   " + sai, 10, y);
  y += 6;

  if (u.saida) {
    let mins = Math.round((new Date(u.saida) - new Date(u.entrada)) / 60000);
    doc.text(
      "Tempo logado: " + Math.floor(mins / 60) + "h " + (mins % 60) + "min",
      10,
      y,
    );
  } else {
    doc.text("Tempo logado: sessao em andamento", 10, y);
  }
  y += 10;

  let te = 0,
    tv = 0;
  u.acoes.forEach((a) => {
    if (a.tipo === "Entrada") te += a.quantidade;
    if (a.tipo === "Venda") tv += a.quantidade;
  });

  doc.setFont("helvetica", "bold");
  doc.text(
    "Resumo: " +
      u.acoes.length +
      " movimentacao(oes) | Entradas: " +
      te +
      " | Vendas: " +
      tv,
    10,
    y,
  );
  doc.setFont("helvetica", "normal");
  y += 10;

  if (u.acoes.length === 0) {
    doc.text("Nenhuma movimentacao neste acesso.", 10, y);
  } else {
    doc.setFont("helvetica", "bold");
    doc.text("Movimentacoes:", 10, y);
    y += 6;
    doc.setFont("helvetica", "normal");

    u.acoes.forEach((a) => {
      checarPagina(12);
      let hora = new Date(a.hora).toLocaleTimeString("pt-BR");
      let linha =
        a.tipo + " | " + a.modelo + " | Qtd: " + a.quantidade + " | " + hora;
      doc.text(linha, 12, y);
      y += 6;
      if (a.obs) {
        checarPagina(6);
        doc.text("Obs: " + a.obs, 14, y);
        y += 6;
      }
    });

    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Total entradas: " + te, 12, y);
    y += 6;
    doc.text("Total vendas:   " + tv, 12, y);
  }

  let nomeArquivo =
    "relatorio_" +
    u.usuario +
    "_" +
    new Date(u.entrada).toLocaleDateString("pt-BR").replace(/\//g, "-") +
    ".pdf";
  doc.save(nomeArquivo);
}
// ── Relatório de Estoque em PDF (estilo Excel, paisagem) ──────────────────────
function EstoqueReal() {
  if (!usuarioAtual) {
    alert("Faça login antes de gerar o relatório.");
    return;
  }
  if (!estoque || estoque.length === 0) {
    alert("O estoque está vazio. Nenhum dado para gerar o relatório.");
    return;
  }

  const { jsPDF } = window.jspdf;
  // Paisagem → muito mais espaço horizontal, igual a uma planilha
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const geradoEm = new Date().toLocaleString("pt-BR");
  const dataHoje = new Date().toLocaleDateString("pt-BR");
  const operador = usuarioAtual.usuario;

  // Margens e largura total disponível em paisagem: 297 - 2×12 = 273 mm
  const pL = 12;
  const pW = 273;

  // ── Cabeçalho azul ──────────────────────────────────────────────────────────
  doc.setFillColor(42, 123, 228);
  doc.rect(0, 0, 297, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Relatório de Estoque de Baterias", pL, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "Operador: " +
      operador +
      "   |   Data: " +
      dataHoje +
      "   |   Gerado em: " +
      geradoEm,
    pL,
    20,
  );
  doc.text(
    "Matheus Juliano — Sistema de Controle de Estoque de Baterias · Versão 1.0",
    pL,
    25,
  );

  let y = 36;
  doc.setTextColor(30, 30, 30);

  // ── Resumo ───────────────────────────────────────────────────────────────────
  const totalUnidades = estoque.reduce((s, b) => s + b.qtd, 0);
  const totalModelos = estoque.length;
  const semEstoque = estoque.filter((b) => b.qtd === 0).length;
  const estoqueBaixo = estoque.filter((b) => b.qtd > 0 && b.qtd <= 5).length;

  const boxes = [
    { label: "Modelos cadastrados", valor: totalModelos, cor: [232, 240, 254] },
    {
      label: "Unidades em estoque",
      valor: totalUnidades,
      cor: [230, 244, 234],
    },
    { label: "Estoque baixo", valor: estoqueBaixo, cor: [253, 244, 225] },
    { label: "Sem estoque", valor: semEstoque, cor: [253, 232, 232] },
  ];
  const bW = pW / 4 - 3;
  boxes.forEach((b, i) => {
    const bx = pL + i * (bW + 4);
    doc.setFillColor(...b.cor);
    doc.roundedRect(bx, y, bW, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(String(b.valor), bx + bW / 2, y + 11, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(b.label, bx + bW / 2, y + 16.5, { align: "center" });
  });
  y += 25;

  // ── Definição das colunas ─────────────────────────────────────────────────────
  // #  | Marca | Modelo | Qtd Disponível | Observação | Status
  // Larguras (mm): 10 | 50 | 55 | 40 | 80 | 38  → total = 273
  const colW = [10, 50, 55, 40, 63, 55];
  const colX = [];
  let cx = pL;
  colW.forEach((w) => {
    colX.push(cx);
    cx += w;
  });

  const ROW_H = 9; // altura de cada linha de dados
  const HEAD_H = 10; // altura do cabeçalho

  // Função auxiliar: desenha uma célula (retângulo + texto recortado)
  function celula(colIdx, yLinha, texto, opts) {
    const x = colX[colIdx];
    const w = colW[colIdx];
    const h = opts.altura || ROW_H;
    const pad = 3;

    // Fundo
    if (opts.bg) {
      doc.setFillColor(...opts.bg);
      doc.rect(x, yLinha, w, h, "F");
    }

    // Borda direita (divisória entre colunas)
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.25);
    doc.line(x + w, yLinha, x + w, yLinha + h);

    // Texto
    doc.setTextColor(...(opts.cor || [30, 30, 30]));
    doc.setFont("helvetica", opts.negrito ? "bold" : "normal");
    doc.setFontSize(opts.tamanho || 9);

    const maxChars = Math.floor(((w - pad * 2) / (opts.tamanho || 9)) * 5.5);
    let t = String(texto);
    if (t.length > maxChars) t = t.substring(0, maxChars - 1) + "…";

    const align = opts.centro ? "center" : "left";
    const tx = opts.centro ? x + w / 2 : x + pad;
    doc.text(t, tx, yLinha + h / 2 + 1.5, { align });
  }

  // Função: desenha linha horizontal completa
  function linhaH(yPos, cor, espessura) {
    doc.setDrawColor(...(cor || [190, 190, 190]));
    doc.setLineWidth(espessura || 0.25);
    doc.line(pL, yPos, pL + pW, yPos);
  }

  // Função: repete cabeçalho da tabela
  function cabecalhoTabela(yPos) {
    const headers = [
      "Nº",
      "MARCA",
      "MODELO",
      "QTD DISPONÍVEL",
      "OBSERVAÇÃO",
      "STATUS",
    ];
    doc.setFillColor(42, 123, 228);
    doc.rect(pL, yPos, pW, HEAD_H, "F");
    linhaH(yPos, [42, 123, 228], 0.5);
    headers.forEach((h, i) => {
      celula(i, yPos, h, {
        bg: null,
        cor: [255, 255, 255],
        negrito: true,
        tamanho: 9,
        centro: true,
        altura: HEAD_H,
      });
    });
    linhaH(yPos + HEAD_H, [42, 123, 228], 0.5);
    return yPos + HEAD_H;
  }

  y = cabecalhoTabela(y);

  // ── Ordenar ───────────────────────────────────────────────────────────────────
  const itens = [...estoque].sort((a, b) => {
    const p = (v) => (v === 0 ? 0 : v <= 5 ? 1 : 2);
    return p(a.qtd) - p(b.qtd) || a.marca.localeCompare(b.marca);
  });

  // ── Linhas de dados ───────────────────────────────────────────────────────────
  itens.forEach((b, idx) => {
    // Nova página se necessário
    if (y + ROW_H > 196) {
      doc.addPage();
      y = 12;
      y = cabecalhoTabela(y);
    }

    // Cor de fundo por status (tem prioridade) ou zebra
    let bgRow;
    if (b.qtd === 0) bgRow = [253, 232, 232];
    else if (b.qtd <= 5) bgRow = [255, 248, 225];
    else if (idx % 2 === 0) bgRow = [245, 248, 255];
    else bgRow = [255, 255, 255];

    // Fundo da linha inteira
    doc.setFillColor(...bgRow);
    doc.rect(pL, y, pW, ROW_H, "F");

    // Coluna 0 — Nº
    celula(0, y, idx + 1, {
      bg: null,
      cor: [130, 130, 130],
      centro: true,
      tamanho: 8,
    });

    // Coluna 1 — Marca
    celula(1, y, b.marca, { bg: null, negrito: true, tamanho: 9 });

    // Coluna 2 — Modelo
    celula(2, y, b.modelo, { bg: null, tamanho: 9 });

    // Coluna 3 — Quantidade (centralizada, colorida)
    let qtdCor;
    if (b.qtd === 0) qtdCor = [180, 0, 0];
    else if (b.qtd <= 5) qtdCor = [160, 100, 0];
    else qtdCor = [20, 120, 60];
    celula(3, y, b.qtd, {
      bg: null,
      cor: qtdCor,
      negrito: true,
      centro: true,
      tamanho: 11,
    });

    // Coluna 4 — Observação (texto longo → tem 80 mm)
    celula(4, y, b.obs || "—", { bg: null, cor: [80, 80, 80], tamanho: 8.5 });

    // Coluna 5 — Status
    let statusTxt, sBg, sCor;
    if (b.qtd === 0) {
      statusTxt = "SEM ESTOQUE";
      sBg = [253, 232, 232];
      sCor = [180, 0, 0];
    } else if (b.qtd <= 5) {
      statusTxt = "REABASTECER";
      sBg = [255, 248, 225];
      sCor = [160, 100, 0];
    } else {
      statusTxt = "OK";
      sBg = [230, 244, 234];
      sCor = [20, 120, 60];
    }
    // Badge centralizado dentro da célula
    const bx = colX[5] + 3;
    const bw = colW[5] - 6;
    doc.setFillColor(...sBg);
    doc.roundedRect(bx, y + 1.5, bw, ROW_H - 3, 1.5, 1.5, "F");
    doc.setTextColor(...sCor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(statusTxt, bx + bw / 2, y + ROW_H / 2 + 1.5, {
      align: "center",
      maxwidth: bw - 2,
    });

    // Borda inferior da linha
    linhaH(y + ROW_H, [200, 200, 200], 0.2);

    // Borda esquerda geral
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.25);
    doc.line(pL, y, pL, y + ROW_H);

    y += ROW_H;
  });

  // Borda inferior da última linha
  linhaH(y, [150, 150, 150], 0.5);

  // ── Linha de total ────────────────────────────────────────────────────────────
  y += 3;
  doc.setFillColor(42, 123, 228);
  doc.rect(pL, y, pW, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL DE UNIDADES EM ESTOQUE:", pL + 4, y + 7);
  doc.text(String(totalUnidades), pL + pW - 4, y + 7, { align: "right" });

  // ── Legenda ───────────────────────────────────────────────────────────────────
  y += 16;
  if (y > 185) {
    doc.addPage();
    y = 15;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("Legenda de cores:", pL, y);
  y += 5;

  [
    [
      253,
      232,
      232,
      180,
      0,
      0,
      "SEM ESTOQUE — quantidade zerada. Reposição imediata necessária.",
    ],
    [
      255,
      248,
      225,
      160,
      100,
      0,
      "REABASTECER — estoque baixo (5 unidades ou menos).",
    ],
    [245, 248, 255, 30, 30, 100, "OK (linhas pares) — estoque adequado."],
    [255, 255, 255, 30, 30, 30, "OK (linhas ímpares) — estoque adequado."],
  ].forEach(([r, g, b, tr, tg, tb, txt]) => {
    doc.setFillColor(r, g, b);
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.3);
    doc.rect(pL, y - 3.5, 10, 5, "FD");
    doc.setTextColor(tr, tg, tb);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(txt, pL + 12, y);
    y += 6;
  });

  // ── Rodapé em todas as páginas ────────────────────────────────────────────────
  const totalPags = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPags; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    doc.text(
      "Sistema de Controle de Estoque de Baterias · Matheus Juliano · Página " +
        p +
        " de " +
        totalPags,
      pL,
      204,
    );
  }

  // ── Salvar ────────────────────────────────────────────────────────────────────
  const nomeArquivo = "estoque_" + dataHoje.replace(/\//g, "-") + ".pdf";
  doc.save(nomeArquivo);
}
