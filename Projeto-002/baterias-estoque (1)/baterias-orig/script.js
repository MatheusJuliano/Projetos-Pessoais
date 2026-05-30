// ── Dados globais (do usuário logado) ─────────────────────────────────────────
let estoque = [];
let mov = [];

// ── Carregar e salvar por usuário ─────────────────────────────────────────────
function carregarUsuario(nome) {
  let todos = JSON.parse(localStorage.getItem("usuarios")) || {};
  if (!todos[nome]) {
    todos[nome] = { estoque: [], mov: [], acessos: [] };
    localStorage.setItem("usuarios", JSON.stringify(todos));
  }
  estoque = todos[nome].estoque;
  mov = todos[nome].mov;
}

function salvar() {
  if (!usuarioAtual) return;
  let todos = JSON.parse(localStorage.getItem("usuarios")) || {};
  todos[usuarioAtual.usuario].estoque = estoque;
  todos[usuarioAtual.usuario].mov = mov;
  todos[usuarioAtual.usuario].acessos =
    todos[usuarioAtual.usuario].acessos || [];

  // atualiza o registro de acesso deste usuário
  let acessosUser = todos[usuarioAtual.usuario].acessos;
  let idx = acessosUser.findIndex(
    (a) =>
      new Date(a.entrada).getTime() ===
      new Date(usuarioAtual.entrada).getTime(),
  );
  if (idx >= 0) acessosUser[idx] = usuarioAtual;
  else acessosUser.push(usuarioAtual);

  localStorage.setItem("usuarios", JSON.stringify(todos));
}

// ── Renderização ──────────────────────────────────────────────────────────────
function atualizar() {
  // Estoque
  let tabela = document.getElementById("tabelaEstoque");
  tabela.innerHTML = "";
  let total = 0;
  estoque.forEach((b) => {
    total += b.qtd;
    tabela.innerHTML += `
      <tr>
        <td>${b.marca}</td>
        <td>${b.modelo}</td>
        <td>${b.qtd}</td>
        <td class="destaque">${b.obs || ""}</td>
      </tr>`;
  });
  document.getElementById("total").innerText = total;

  // Movimentações
  let movTable = document.getElementById("mov");
  movTable.innerHTML = "";
  mov.forEach((m) => {
    movTable.innerHTML += `
      <tr>
        <td>${m.tipo}</td>
        <td>${m.modelo}</td>
        <td>${m.qtd}</td>
        <td>${m.data}</td>
      </tr>`;
  });

  // Acessos do usuário atual
  let lista = document.getElementById("acessos");
  lista.innerHTML = "";
  if (usuarioAtual) {
    let todos = JSON.parse(localStorage.getItem("usuarios")) || {};
    let acessosUser = todos[usuarioAtual.usuario]?.acessos || [];
    acessosUser.forEach((a) => {
      let ent = new Date(a.entrada).toLocaleString("pt-BR");
      let sai = a.saida
        ? new Date(a.saida).toLocaleString("pt-BR")
        : "ainda logado";
      lista.innerHTML += `<li><b>${a.usuario}</b> — entrada: ${ent} | saída: ${sai}</li>`;
    });
  }

  // Relatório do dia atual
  let hoje = new Date();
  let dd = String(hoje.getDate()).padStart(2, "0");
  let mm = String(hoje.getMonth() + 1).padStart(2, "0");
  let aaaa = hoje.getFullYear();
  filtrarRelatorio(dd + "/" + mm + "/" + aaaa);
}

function limparTela() {
  document.getElementById("tabelaEstoque").innerHTML = "";
  document.getElementById("total").innerText = "0";
  document.getElementById("mov").innerHTML = "";
  document.getElementById("acessos").innerHTML = "";
  document.getElementById("relatorio").innerHTML = "";
}

// ── Adicionar bateria ─────────────────────────────────────────────────────────
function adicionar() {
  if (!usuarioAtual) {
    alert("Faça login primeiro.");
    return;
  }

  let marca = document.getElementById("marca").value;
  let modelo = document.getElementById("modelo").value;
  let qtd = Number(document.getElementById("quantidade").value);
  let obs = document.getElementById("obs").value;

  if (!marca || !modelo || qtd <= 0) {
    alert("Preencha todos os campos.");
    return;
  }

  let bat = estoque.find((b) => b.modelo === modelo && b.marca === marca);
  if (bat) {
    bat.qtd += qtd;
  } else {
    estoque.push({ marca, modelo, qtd, obs });
  }

  usuarioAtual.acoes.push({
    tipo: "Entrada",
    marca,
    modelo,
    quantidade: qtd,
    obs,
    hora: new Date(),
  });

  mov.push({
    tipo: "Entrada",
    marca,
    modelo,
    qtd,
    data: new Date().toLocaleString("pt-BR"),
  });
  salvar();
  atualizar();
}

// ── Registrar venda ───────────────────────────────────────────────────────────
function vender() {
  if (!usuarioAtual) {
    alert("Faça login primeiro.");
    return;
  }

  let modelo = document.getElementById("modeloVenda").value;
  let qtd = Number(document.getElementById("qtdVenda").value);

  if (!modelo || qtd <= 0) {
    alert("Preencha todos os campos.");
    return;
  }

  let marca = document.getElementById("marcaVenda").value;

  let bat = estoque.find((b) => b.modelo === modelo && b.marca === marca);
  if (!bat || bat.qtd < qtd) {
    alert("Estoque insuficiente");
    return;
  }

  bat.qtd -= qtd;

  usuarioAtual.acoes.push({
    tipo: "Venda",
    marca,
    modelo,
    quantidade: qtd,
    hora: new Date(),
  });

  mov.push({
    tipo: "Venda",
    marca,
    modelo,
    qtd,
    data: new Date().toLocaleString("pt-BR"),
  });
  salvar();
  atualizar();
}

// ── Relatório por data ────────────────────────────────────────────────────────
function filtrarRelatorio(dataFmt) {
  let tabela = document.getElementById("relatorio");
  tabela.innerHTML = "";
  let encontrou = false;

  mov.forEach((m) => {
    let dataMov = m.data.split(",")[0].trim();
    let pts = dataMov.split("/");
    let normalizada =
      pts[0].padStart(2, "0") + "/" + pts[1].padStart(2, "0") + "/" + pts[2];

    if (normalizada === dataFmt) {
      encontrou = true;
      let hora = m.data.split(", ")[1] || "";
      tabela.innerHTML += `
        <tr>
          <td>${m.tipo}</td>
          <td>${m.modelo}</td>
          <td>${m.qtd}</td>
          <td>${hora}</td>
        </tr>`;
    }
  });

  if (!encontrou) {
    tabela.innerHTML =
      "<tr><td colspan='4'>Nenhuma movimentação encontrada.</td></tr>";
  }
}

function relatorio() {
  let data = document.getElementById("dataBusca").value;
  if (!data) {
    alert("Selecione uma data.");
    return;
  }

  let partes = data.split("-");
  let dataFmt = partes[2] + "/" + partes[1] + "/" + partes[0];
  filtrarRelatorio(dataFmt);
}

// ── Exportar Excel ────────────────────────────────────────────────────────────
function exportarExcel() {
  let dados = "Tipo,Marca,Modelo,Quantidade,Data\n";
  mov.forEach((m) => {
    dados += `${m.tipo},${m.marca},${m.modelo},${m.qtd},${m.data}\n`;
  });
  let blob = new Blob([dados], { type: "text/csv;charset=utf-8;" });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "relatorio_baterias.csv";
  link.click();
}
