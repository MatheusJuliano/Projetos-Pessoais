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
