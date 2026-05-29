document.addEventListener("DOMContentLoaded", () => {

  // Modo noturno
  function toggleNoturno() {
    var ativo = document.body.classList.toggle("noturno");
    document.getElementById("toggleIcon").textContent = ativo ? "☀️" : "🌙";
    localStorage.setItem("modoNoturno", ativo ? "1" : "0");
  }
  if (localStorage.getItem("modoNoturno") === "1") {
    document.body.classList.add("noturno");
    document.getElementById("toggleIcon").textContent = "☀️";
  }
  document.getElementById("toggleNoturno").addEventListener("click", toggleNoturno);

  // Botões com onclick no HTML são mantidos — apenas o toggle precisa do addEventListener
  // pois o onclick inline foi removido para atender à CSP da extensão.
});
