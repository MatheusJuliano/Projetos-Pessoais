// ── Sistema de Votação — app.js ──────────────────────────────

var candSel = null;
var nomes   = ["Ana Martins", "Carlos Pinto", "Fernanda Lima"];

// Alterna qual tela está visível
function show(id) {
  document.querySelectorAll(".screen").forEach(function(s) {
    s.classList.remove("active");
  });
  document.getElementById(id).classList.add("active");
}

// ── Login ─────────────────────────────────────────────────────
function doLogin() {
  var contrato = document.getElementById("f-contrato").value.trim();
  var usuario  = document.getElementById("f-usuario").value.trim();
  var senha    = document.getElementById("f-senha").value.trim();
  var err      = document.getElementById("login-err");

  if (!contrato || !usuario || !senha) {
    err.textContent = "Preencha todos os campos para acessar.";
    return;
  }

  err.textContent = "";

  // Preenche o nome do votante na tela de votação
  document.getElementById("vt-user").textContent =
    usuario + " — Contrato: " + contrato;

  // Reseta estado da votação
  candSel = null;
  document.querySelectorAll(".cand").forEach(function(c) {
    c.classList.remove("sel");
  });
  document.querySelectorAll("input[name=voto]").forEach(function(r) {
    r.checked = false;
  });
  document.getElementById("ta-porque").value = "";
  document.getElementById("ta-pedir").value  = "";
  document.getElementById("vf").style.display = "none";
  document.getElementById("btn-vt").disabled  = true;
  document.getElementById("vt-hint").textContent =
    "Selecione um candidato para continuar.";

  show("sc-vote");
}

// ── Selecionar candidato ──────────────────────────────────────
function selCand(idx) {
  candSel = idx;

  // Marca o card selecionado
  document.querySelectorAll(".cand").forEach(function(c, i) {
    c.classList.toggle("sel", i === idx);
  });
  document.getElementById("r" + idx).checked = true;

  // Mostra campos de justificativa
  document.getElementById("vf").style.display = "block";
  document.getElementById("vf-nome").textContent = nomes[idx];

  // Libera botão e atualiza dica
  document.getElementById("btn-vt").disabled = false;
  document.getElementById("vt-hint").textContent =
    "Preencha os campos abaixo e clique em Finalizar voto.";
}

// ── Finalizar voto ────────────────────────────────────────────
function finalizarVoto() {
  if (candSel === null) {
    alert("Selecione um candidato antes de finalizar.");
    return;
  }

  var porque = document.getElementById("ta-porque").value.trim();
  var pedir  = document.getElementById("ta-pedir").value.trim();

  if (!porque) {
    alert("Por favor, escreva o motivo do seu voto.");
    document.getElementById("ta-porque").focus();
    return;
  }

  if (!pedir) {
    alert("Por favor, escreva sua solicitação ao candidato.");
    document.getElementById("ta-pedir").focus();
    return;
  }

  // Gera número de protocolo único
  var protocolo = "#" + Date.now().toString(36).toUpperCase().slice(-8);
  document.getElementById("suc-id").textContent = "Protocolo: " + protocolo;

  show("sc-suc");
}

// ── Voltar ao login (próximo votante) ─────────────────────────
function voltarLogin() {
  document.getElementById("f-contrato").value = "";
  document.getElementById("f-usuario").value  = "";
  document.getElementById("f-senha").value    = "";
  document.getElementById("login-err").textContent = "";
  show("sc-login");
}
