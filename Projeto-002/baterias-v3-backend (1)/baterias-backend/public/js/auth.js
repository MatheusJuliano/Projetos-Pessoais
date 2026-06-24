// auth.js — lógica das páginas de login / cadastro / recuperação

// Toggle noturno
if (localStorage.getItem("modoNoturno") === "1") {
  document.body.classList.add("noturno");
  document.getElementById("toggleIcon").textContent = "☀️";
}
document.getElementById("toggleNoturno").addEventListener("click", () => {
  const ativo = document.body.classList.toggle("noturno");
  document.getElementById("toggleIcon").textContent = ativo ? "☀️" : "🌙";
  localStorage.setItem("modoNoturno", ativo ? "1" : "0");
});

// Enter nos campos
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const painel = document.querySelector('[id^="painel"]:not([style*="display:none"]),[id^="painel"]:not([style])');
  if (document.getElementById("painelLogin") && !document.getElementById("painelLogin").hidden) {
    fazerLogin();
  }
});

function mostrarPainel(qual) {
  ["Login","Cadastro","Recuperar"].forEach(p => {
    const el = document.getElementById("painel" + p);
    if (el) el.style.display = (p.toLowerCase() === qual) ? "block" : "none";
  });
  // Limpa msgs
  ["msgErro","msgErroCadastro","msgErroRecuperar","msgOkRecuperar"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ""; el.style.display = ""; }
  });
}

// Faz com que Enter funcione no painel ativo
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  if (document.getElementById("painelLogin")?.style.display !== "none"
    && !document.getElementById("painelLogin")?.hidden) {
    // painel login visível
    if (document.activeElement?.id === "senha") fazerLogin();
  }
});

// ── LOGIN ─────────────────────────────────────────────────────
async function fazerLogin() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  const msg   = document.getElementById("msgErro");
  msg.textContent = "";

  if (!email) { msg.textContent = "⚠️ Digite seu e-mail."; return; }
  if (!senha) { msg.textContent = "⚠️ Digite sua senha."; return; }

  const btn = document.querySelector("#painelLogin .btn-primary");
  btn.textContent = "Entrando..."; btn.disabled = true;

  try {
    const r = await fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, senha }),
      credentials: "include"
    });
    const d = await r.json();

    if (r.ok && d.ok) {
      window.location.replace("/");
    } else {
      msg.textContent = "❌ " + (d.erro || "Erro ao entrar.");
      btn.textContent = "Entrar"; btn.disabled = false;
    }
  } catch (e) {
    msg.textContent = "❌ Erro de conexão. O servidor está ligado?";
    btn.textContent = "Entrar"; btn.disabled = false;
  }
}

// ── CADASTRO ──────────────────────────────────────────────────
async function fazerCadastro() {
  const nome  = document.getElementById("cNome").value.trim();
  const email = document.getElementById("cEmail").value.trim();
  const senha = document.getElementById("cSenha").value;
  const senha2= document.getElementById("cSenha2").value;
  const msg   = document.getElementById("msgErroCadastro");
  msg.textContent = "";

  if (!nome)           { msg.textContent = "⚠️ Digite seu nome."; return; }
  if (!email)          { msg.textContent = "⚠️ Digite seu e-mail."; return; }
  if (senha.length < 6){ msg.textContent = "⚠️ A senha deve ter pelo menos 6 caracteres."; return; }
  if (senha !== senha2){ msg.textContent = "⚠️ As senhas não coincidem."; return; }

  const btn = document.querySelector("#painelCadastro .btn-primary");
  btn.textContent = "Criando conta..."; btn.disabled = true;

  try {
    const r = await fetch("/api/auth/cadastro", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ nome, email, senha })
    });
    const d = await r.json();

    if (r.ok && d.ok) {
      // Loga automaticamente após cadastro
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ email, senha }),
        credentials: "include"
      });
      window.location.replace("/");
    } else {
      msg.textContent = "❌ " + (d.erro || "Erro ao criar conta.");
      btn.textContent = "Criar Conta"; btn.disabled = false;
    }
  } catch (e) {
    msg.textContent = "❌ Erro de conexão.";
    btn.textContent = "Criar Conta"; btn.disabled = false;
  }
}

// ── RECUPERAR SENHA ───────────────────────────────────────────
async function recuperarSenha() {
  const email  = document.getElementById("rEmail").value.trim();
  const msgErr = document.getElementById("msgErroRecuperar");
  const msgOk  = document.getElementById("msgOkRecuperar");
  msgErr.textContent = ""; msgOk.style.display = "none";

  if (!email) { msgErr.textContent = "⚠️ Digite seu e-mail."; return; }

  const btn = document.querySelector("#painelRecuperar .btn-primary");
  btn.textContent = "Enviando..."; btn.disabled = true;

  try {
    const r = await fetch("/api/auth/recuperar-senha", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email })
    });
    const d = await r.json();

    if (r.ok && d.ok) {
      msgOk.textContent = "✅ " + d.mensagem;
      msgOk.style.display = "block";
      btn.textContent = "Reenviar";
      btn.disabled = false;
    } else {
      msgErr.textContent = "❌ " + (d.erro || "Erro ao enviar e-mail.");
      btn.textContent = "Enviar Link"; btn.disabled = false;
    }
  } catch (e) {
    msgErr.textContent = "❌ Erro de conexão.";
    btn.textContent = "Enviar Link"; btn.disabled = false;
  }
}

// Foco e Enter
document.getElementById("senha")?.addEventListener("keydown", e => {
  if (e.key === "Enter") fazerLogin();
});
document.getElementById("email")?.addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("senha")?.focus();
});
document.getElementById("cSenha2")?.addEventListener("keydown", e => {
  if (e.key === "Enter") fazerCadastro();
});
document.getElementById("rEmail")?.addEventListener("keydown", e => {
  if (e.key === "Enter") recuperarSenha();
});
