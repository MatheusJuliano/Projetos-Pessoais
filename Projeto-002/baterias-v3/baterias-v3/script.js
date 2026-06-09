// ═══════════════════════════════════════════════════════════════
//  SCRIPT.JS — Controle de Estoque de Baterias v2.0
//  Correções: estoque global, campos limpos, estorno, sem duplicata
// ═══════════════════════════════════════════════════════════════

// Estoque e movimentações são GLOBAIS (compartilhados por todos)
let estoque = [];
let mov     = [];

// ── Chaves do localStorage ────────────────────────────────────
const KEY_ESTOQUE = "estoque_global";
const KEY_MOV     = "mov_global";
const KEY_USERS   = "usuarios_v2";

// ── Carregar dados globais ────────────────────────────────────
function carregarGlobal() {
  estoque = JSON.parse(localStorage.getItem(KEY_ESTOQUE)) || [];
  mov     = JSON.parse(localStorage.getItem(KEY_MOV))     || [];
}

// ── Salvar dados globais ──────────────────────────────────────
function salvarGlobal() {
  localStorage.setItem(KEY_ESTOQUE, JSON.stringify(estoque));
  localStorage.setItem(KEY_MOV,     JSON.stringify(mov));
}

// ── Salvar perfil do usuário atual ────────────────────────────
function salvarUsuario() {
  if (!usuarioAtual) return;
  let usuarios = JSON.parse(localStorage.getItem(KEY_USERS)) || {};
  let u = usuarios[usuarioAtual.usuario];
  // atualiza sessão atual dentro do histórico de acessos
  let idx = u.acessos.findIndex(
    a => new Date(a.entrada).getTime() === new Date(usuarioAtual.entrada).getTime()
  );
  if (idx >= 0) u.acessos[idx] = usuarioAtual;
  else u.acessos.push(usuarioAtual);
  localStorage.setItem(KEY_USERS, JSON.stringify(usuarios));
}

// ── Renderização ──────────────────────────────────────────────
function atualizar() {
  // Tabela de estoque
  let tabela = document.getElementById("tabelaEstoque");
  tabela.innerHTML = "";
  let total = 0;
  estoque.forEach(b => {
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

  // Movimentações (mais recentes primeiro) + botão de estorno
  let movTable = document.getElementById("mov");
  movTable.innerHTML = "";
  [...mov].reverse().forEach((m, idxRev) => {
    const idxReal = mov.length - 1 - idxRev;
    // Só permite estornar a última movimentação para evitar inconsistências
    const podeEstornar = idxReal === mov.length - 1 && usuarioAtual;
    movTable.innerHTML += `
      <tr>
        <td>${m.tipo}</td>
        <td>${m.marca || ""}</td>
        <td>${m.modelo}</td>
        <td>${m.qtd}</td>
        <td>${m.data}</td>
        <td>${podeEstornar
          ? `<button class="btn-estorno" onclick="estornar()">↩ Estornar</button>`
          : ""}</td>
      </tr>`;
  });

  // Acessos do usuário logado
  let lista = document.getElementById("acessos");
  lista.innerHTML = "";
  if (usuarioAtual) {
    let usuarios = JSON.parse(localStorage.getItem(KEY_USERS)) || {};
    let acessos  = usuarios[usuarioAtual.usuario]?.acessos || [];
    [...acessos].reverse().forEach(a => {
      let ent = new Date(a.entrada).toLocaleString("pt-BR");
      let sai = a.saida ? new Date(a.saida).toLocaleString("pt-BR") : "ainda logado";
      lista.innerHTML += `<li><b>${a.usuario}</b> — entrada: ${ent} | saída: ${sai}</li>`;
    });
  }

  // Relatório do dia
  let hoje = new Date();
  filtrarRelatorio(
    String(hoje.getDate()).padStart(2,"0") + "/" +
    String(hoje.getMonth()+1).padStart(2,"0") + "/" +
    hoje.getFullYear()
  );
}

function limparTela() {
  document.getElementById("tabelaEstoque").innerHTML = "";
  document.getElementById("total").innerText = "0";
  document.getElementById("mov").innerHTML = "";
  document.getElementById("acessos").innerHTML = "";
  document.getElementById("relatorio").innerHTML = "";
}

// ── Adicionar bateria ─────────────────────────────────────────
function adicionar() {
  if (!usuarioAtual) { alert("Faça login primeiro."); return; }

  let marca = document.getElementById("marca").value.trim();
  let modelo = document.getElementById("modelo").value.trim();
  let qtd   = Number(document.getElementById("quantidade").value);
  let obs   = document.getElementById("obs").value.trim();

  if (!marca || !modelo || qtd <= 0) {
    alert("Preencha Marca, Modelo e Quantidade corretamente.");
    return;
  }

  let bat = estoque.find(b => b.modelo === modelo && b.marca === marca);
  if (bat) bat.qtd += qtd;
  else estoque.push({ marca, modelo, qtd, obs });

  mov.push({
    tipo: "Entrada",
    marca, modelo, qtd,
    operador: usuarioAtual.usuario,
    data: new Date().toLocaleString("pt-BR")
  });

  usuarioAtual.acoes.push({ tipo:"Entrada", marca, modelo, quantidade:qtd, obs, hora:new Date() });

  salvarGlobal();
  salvarUsuario();
  atualizar();

  // Limpa campos após registrar (evita duplicata por clique duplo)
  document.getElementById("marca").value     = "";
  document.getElementById("modelo").value    = "";
  document.getElementById("quantidade").value = "";
  document.getElementById("obs").value       = "";
}

// ── Registrar venda ───────────────────────────────────────────
function vender() {
  if (!usuarioAtual) { alert("Faça login primeiro."); return; }

  let marca  = document.getElementById("marcaVenda").value.trim();
  let modelo = document.getElementById("modeloVenda").value.trim();
  let qtd    = Number(document.getElementById("qtdVenda").value);

  if (!marca || !modelo || qtd <= 0) {
    alert("Preencha Marca, Modelo e Quantidade corretamente.");
    return;
  }

  let bat = estoque.find(b => b.modelo === modelo && b.marca === marca);
  if (!bat || bat.qtd < qtd) {
    alert("Estoque insuficiente. Disponível: " + (bat ? bat.qtd : 0));
    return;
  }

  bat.qtd -= qtd;

  mov.push({
    tipo: "Venda",
    marca, modelo, qtd,
    operador: usuarioAtual.usuario,
    data: new Date().toLocaleString("pt-BR")
  });

  usuarioAtual.acoes.push({ tipo:"Venda", marca, modelo, quantidade:qtd, hora:new Date() });

  salvarGlobal();
  salvarUsuario();
  atualizar();

  // Limpa campos
  document.getElementById("marcaVenda").value  = "";
  document.getElementById("modeloVenda").value = "";
  document.getElementById("qtdVenda").value    = "";
}

// ── Estornar última movimentação ──────────────────────────────
function estornar() {
  if (!usuarioAtual) { alert("Faça login primeiro."); return; }
  if (mov.length === 0) { alert("Nenhuma movimentação para estornar."); return; }

  let ultima = mov[mov.length - 1];
  let conf   = confirm(
    "Estornar última movimentação?\n\n" +
    "Tipo: " + ultima.tipo + "\n" +
    "Modelo: " + ultima.marca + " " + ultima.modelo + "\n" +
    "Quantidade: " + ultima.qtd + "\n" +
    "Data: " + ultima.data + "\n\n" +
    "Esta ação é irreversível."
  );
  if (!conf) return;

  // Reverte o estoque
  let bat = estoque.find(b => b.modelo === ultima.modelo && b.marca === ultima.marca);
  if (ultima.tipo === "Entrada") {
    if (bat) bat.qtd -= ultima.qtd;
  } else if (ultima.tipo === "Venda") {
    if (bat) bat.qtd += ultima.qtd;
    else estoque.push({ marca: ultima.marca, modelo: ultima.modelo, qtd: ultima.qtd, obs: "" });
  }

  // Registra o estorno como movimentação
  mov.push({
    tipo: "Estorno (" + ultima.tipo + ")",
    marca: ultima.marca,
    modelo: ultima.modelo,
    qtd: ultima.qtd,
    operador: usuarioAtual.usuario,
    data: new Date().toLocaleString("pt-BR")
  });

  // Remove a movimentação original
  mov.splice(mov.length - 2, 1);

  salvarGlobal();
  salvarUsuario();
  atualizar();
  alert("Estorno registrado com sucesso.");
}

// ── Relatório por data ────────────────────────────────────────
function filtrarRelatorio(dataFmt) {
  let tabela = document.getElementById("relatorio");
  tabela.innerHTML = "";
  let encontrou = false;
  mov.forEach(m => {
    let pts  = m.data.split(",")[0].trim().split("/");
    let norm = pts[0].padStart(2,"0") + "/" + pts[1].padStart(2,"0") + "/" + pts[2];
    if (norm === dataFmt) {
      encontrou = true;
      let hora = m.data.split(", ")[1] || "";
      tabela.innerHTML += `<tr>
        <td>${m.tipo}</td>
        <td>${m.modelo}</td>
        <td>${m.qtd}</td>
        <td>${hora}</td>
      </tr>`;
    }
  });
  if (!encontrou)
    tabela.innerHTML = "<tr><td colspan='4'>Nenhuma movimentação encontrada.</td></tr>";
}

function relatorio() {
  let data = document.getElementById("dataBusca").value;
  if (!data) { alert("Selecione uma data."); return; }
  let p = data.split("-");
  filtrarRelatorio(p[2] + "/" + p[1] + "/" + p[0]);
}

// ── Exportar Excel ────────────────────────────────────────────
function exportarExcel() {
  let csv = "Tipo,Marca,Modelo,Quantidade,Operador,Data\n";
  mov.forEach(m => {
    csv += `${m.tipo},${m.marca||""},${m.modelo},${m.qtd},${m.operador||""},${m.data}\n`;
  });
  let blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "relatorio_baterias.csv";
  link.click();
}
