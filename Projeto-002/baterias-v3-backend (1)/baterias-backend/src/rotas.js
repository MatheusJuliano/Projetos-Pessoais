// ═══════════════════════════════════════════════════════════════
//  ROTAS.JS — Todas as rotas da API
// ═══════════════════════════════════════════════════════════════

const express  = require("express");
const bcrypt   = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db       = require("./db");
const { gerarToken, verificarToken, apenasAdmin } = require("./auth");
const { enviarEmailRecuperacao } = require("./email");

const router = express.Router();

// ─────────────────────────────────────────────────────────────
//  AUTH — Login / Cadastro / Recuperação de senha
// ─────────────────────────────────────────────────────────────

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });

  const banco = await db.init();
  const user  = db.get(banco, "SELECT * FROM usuarios WHERE email = ? AND ativo = 1", [email.trim().toLowerCase()]);

  if (!user) return res.status(401).json({ erro: "E-mail ou senha incorretos." });

  const ok = await bcrypt.compare(senha, user.senha_hash);
  if (!ok) return res.status(401).json({ erro: "E-mail ou senha incorretos." });

  // Registra acesso
  db.run(banco,
    "INSERT INTO acessos (usuario_id, usuario, entrada) VALUES (?, ?, datetime('now','localtime'))",
    [user.id, user.nome]
  );

  // Pega o id do acesso recem inserido
  const acesso = db.get(banco, "SELECT last_insert_rowid() as id");
  const acessoId = acesso?.id;

  const token = gerarToken({ id: user.id, nome: user.nome, email: user.email, papel: user.papel, acessoId });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge:   12 * 60 * 60 * 1000, // 12h
  });

  res.json({ ok: true, usuario: { id: user.id, nome: user.nome, email: user.email, papel: user.papel } });
});

// POST /api/auth/cadastro
router.post("/auth/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: "Nome, e-mail e senha são obrigatórios." });
  if (senha.length < 6) return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });

  const banco = await db.init();
  const existe = db.get(banco, "SELECT id FROM usuarios WHERE email = ?", [email.trim().toLowerCase()]);
  if (existe) return res.status(409).json({ erro: "Este e-mail já está cadastrado." });

  const hash = await bcrypt.hash(senha, 12);

  // Primeiro usuário cadastrado vira admin automaticamente
  const total = db.get(banco, "SELECT COUNT(*) as n FROM usuarios");
  const papel = total?.n === 0 ? "admin" : "operador";

  db.run(banco,
    "INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
    [nome.trim(), email.trim().toLowerCase(), hash, papel]
  );

  res.json({ ok: true, mensagem: "Conta criada com sucesso!", papel });
});

// POST /api/auth/recuperar-senha
router.post("/auth/recuperar-senha", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: "Informe o e-mail." });

  const banco = await db.init();
  const user  = db.get(banco, "SELECT * FROM usuarios WHERE email = ? AND ativo = 1", [email.trim().toLowerCase()]);

  // Sempre responde OK (não revela se o e-mail existe)
  if (!user) {
    return res.json({ ok: true, mensagem: "Se este e-mail estiver cadastrado, você receberá as instruções em breve." });
  }

  // Gera token único
  const token   = uuidv4();
  const expira  = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

  // Remove tokens antigos deste usuário
  db.run(banco, "DELETE FROM reset_tokens WHERE usuario_id = ?", [user.id]);

  // Salva novo token
  db.run(banco,
    "INSERT INTO reset_tokens (usuario_id, token, expira_em) VALUES (?, ?, ?)",
    [user.id, token, expira]
  );

  const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const link = `${BASE_URL}/redefinir-senha.html?token=${token}`;

  try {
    await enviarEmailRecuperacao({ para: user.email, nome: user.nome, link });
    res.json({ ok: true, mensagem: "E-mail enviado! Verifique sua caixa de entrada (e o spam)." });
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err.message);
    res.status(500).json({ erro: "Não foi possível enviar o e-mail. Verifique as configurações de SMTP." });
  }
});

// POST /api/auth/redefinir-senha
router.post("/auth/redefinir-senha", async (req, res) => {
  const { token, senha } = req.body;
  if (!token || !senha) return res.status(400).json({ erro: "Token e nova senha são obrigatórios." });
  if (senha.length < 6) return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });

  const banco  = await db.init();
  const record = db.get(banco,
    "SELECT * FROM reset_tokens WHERE token = ? AND usado = 0",
    [token]
  );

  if (!record) return res.status(400).json({ erro: "Link inválido ou já utilizado." });
  if (new Date(record.expira_em) < new Date()) {
    return res.status(400).json({ erro: "Este link expirou. Solicite um novo." });
  }

  const hash = await bcrypt.hash(senha, 12);
  db.run(banco, "UPDATE usuarios SET senha_hash = ? WHERE id = ?", [hash, record.usuario_id]);
  db.run(banco, "UPDATE reset_tokens SET usado = 1 WHERE id = ?", [record.id]);

  res.json({ ok: true, mensagem: "Senha redefinida com sucesso! Faça login com a nova senha." });
});

// POST /api/auth/logout
router.post("/auth/logout", verificarToken, async (req, res) => {
  const banco = await db.init();

  // Registra saída
  if (req.usuario?.acessoId) {
    db.run(banco,
      "UPDATE acessos SET saida = datetime('now','localtime') WHERE id = ?",
      [req.usuario.acessoId]
    );
  }

  res.clearCookie("token");
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/auth/me", verificarToken, async (req, res) => {
  res.json({ usuario: req.usuario });
});

// ─────────────────────────────────────────────────────────────
//  ESTOQUE
// ─────────────────────────────────────────────────────────────

// GET /api/estoque
router.get("/estoque", verificarToken, async (req, res) => {
  const banco  = await db.init();
  const itens  = db.all(banco, "SELECT * FROM estoque ORDER BY marca, modelo");
  res.json(itens);
});

// POST /api/estoque/adicionar
router.post("/estoque/adicionar", verificarToken, async (req, res) => {
  const { marca, modelo, qtd, obs } = req.body;
  if (!marca || !modelo || !qtd || qtd <= 0) {
    return res.status(400).json({ erro: "Marca, modelo e quantidade são obrigatórios." });
  }

  const banco = await db.init();
  const bat   = db.get(banco, "SELECT * FROM estoque WHERE marca = ? AND modelo = ?", [marca, modelo]);

  if (bat) {
    db.run(banco, "UPDATE estoque SET qtd = qtd + ? WHERE id = ?", [qtd, bat.id]);
  } else {
    db.run(banco, "INSERT INTO estoque (marca, modelo, qtd, obs) VALUES (?, ?, ?, ?)", [marca, modelo, qtd, obs || ""]);
  }

  db.run(banco,
    "INSERT INTO movimentacoes (tipo, marca, modelo, qtd, operador_id, operador) VALUES ('Entrada', ?, ?, ?, ?, ?)",
    [marca, modelo, qtd, req.usuario.id, req.usuario.nome]
  );

  res.json({ ok: true });
});

// POST /api/estoque/vender
router.post("/estoque/vender", verificarToken, async (req, res) => {
  const { marca, modelo, qtd } = req.body;
  if (!marca || !modelo || !qtd || qtd <= 0) {
    return res.status(400).json({ erro: "Marca, modelo e quantidade são obrigatórios." });
  }

  const banco = await db.init();
  const bat   = db.get(banco, "SELECT * FROM estoque WHERE marca = ? AND modelo = ?", [marca, modelo]);

  if (!bat || bat.qtd < qtd) {
    return res.status(400).json({ erro: `Estoque insuficiente. Disponível: ${bat ? bat.qtd : 0}` });
  }

  db.run(banco, "UPDATE estoque SET qtd = qtd - ? WHERE id = ?", [qtd, bat.id]);

  db.run(banco,
    "INSERT INTO movimentacoes (tipo, marca, modelo, qtd, operador_id, operador) VALUES ('Venda', ?, ?, ?, ?, ?)",
    [marca, modelo, qtd, req.usuario.id, req.usuario.nome]
  );

  res.json({ ok: true });
});

// POST /api/estoque/estornar
router.post("/estoque/estornar", verificarToken, async (req, res) => {
  const { movId } = req.body;
  if (!movId) return res.status(400).json({ erro: "ID da movimentação é obrigatório." });

  const banco  = await db.init();
  const ultima = db.get(banco, "SELECT * FROM movimentacoes WHERE id = ?", [movId]);

  if (!ultima) return res.status(404).json({ erro: "Movimentação não encontrada." });
  if (ultima.tipo.startsWith("Estorno")) return res.status(400).json({ erro: "Não é possível estornar um estorno." });

  const bat = db.get(banco, "SELECT * FROM estoque WHERE marca = ? AND modelo = ?", [ultima.marca, ultima.modelo]);

  if (ultima.tipo === "Entrada") {
    if (!bat || bat.qtd < ultima.qtd) {
      return res.status(400).json({ erro: "Não é possível estornar: estoque atual menor que a quantidade da entrada." });
    }
    db.run(banco, "UPDATE estoque SET qtd = qtd - ? WHERE id = ?", [ultima.qtd, bat.id]);
  } else if (ultima.tipo === "Venda") {
    if (bat) {
      db.run(banco, "UPDATE estoque SET qtd = qtd + ? WHERE id = ?", [ultima.qtd, bat.id]);
    } else {
      db.run(banco, "INSERT INTO estoque (marca, modelo, qtd, obs) VALUES (?, ?, ?, '')", [ultima.marca, ultima.modelo, ultima.qtd]);
    }
  }

  db.run(banco,
    "INSERT INTO movimentacoes (tipo, marca, modelo, qtd, operador_id, operador) VALUES (?, ?, ?, ?, ?, ?)",
    [`Estorno (${ultima.tipo})`, ultima.marca, ultima.modelo, ultima.qtd, req.usuario.id, req.usuario.nome]
  );

  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────
//  MOVIMENTAÇÕES
// ─────────────────────────────────────────────────────────────

// GET /api/movimentacoes
router.get("/movimentacoes", verificarToken, async (req, res) => {
  const banco = await db.init();
  const { data } = req.query;
  let rows;
  if (data) {
    rows = db.all(banco,
      "SELECT * FROM movimentacoes WHERE date(data) = date(?) ORDER BY id DESC",
      [data]
    );
  } else {
    rows = db.all(banco, "SELECT * FROM movimentacoes ORDER BY id DESC LIMIT 200");
  }
  res.json(rows);
});

// ─────────────────────────────────────────────────────────────
//  ACESSOS
// ─────────────────────────────────────────────────────────────

// GET /api/acessos
router.get("/acessos", verificarToken, async (req, res) => {
  const banco = await db.init();
  const rows  = db.all(banco,
    "SELECT * FROM acessos ORDER BY id DESC LIMIT 100"
  );
  res.json(rows);
});

// ─────────────────────────────────────────────────────────────
//  ADMIN — Usuários
// ─────────────────────────────────────────────────────────────

// GET /api/admin/usuarios
router.get("/admin/usuarios", verificarToken, apenasAdmin, async (req, res) => {
  const banco = await db.init();
  const rows  = db.all(banco, "SELECT id, nome, email, papel, ativo, criado_em FROM usuarios ORDER BY criado_em DESC");
  res.json(rows);
});

// PATCH /api/admin/usuarios/:id/papel
router.patch("/admin/usuarios/:id/papel", verificarToken, apenasAdmin, async (req, res) => {
  const { papel } = req.body;
  if (!["admin","operador"].includes(papel)) return res.status(400).json({ erro: "Papel inválido." });
  const banco = await db.init();
  db.run(banco, "UPDATE usuarios SET papel = ? WHERE id = ?", [papel, req.params.id]);
  res.json({ ok: true });
});

// PATCH /api/admin/usuarios/:id/ativo
router.patch("/admin/usuarios/:id/ativo", verificarToken, apenasAdmin, async (req, res) => {
  const { ativo } = req.body;
  const banco = await db.init();
  db.run(banco, "UPDATE usuarios SET ativo = ? WHERE id = ?", [ativo ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
