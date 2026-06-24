const express   = require('express');
const bcrypt    = require('bcrypt');
const crypto    = require('crypto');
const validator = require('validator');
const db        = require('../database');
const { enviarResetSenha } = require('../utils/email');
const router    = express.Router();

const SALT_ROUNDS = 12;

// ── Páginas ───────────────────────────────────────────────────
router.get('/login',         (req, res) => { if (req.session.userId) return res.redirect('/'); res.sendFile('login.html',         { root: 'public' }); });
router.get('/registro',      (req, res) => { if (req.session.userId) return res.redirect('/'); res.sendFile('registro.html',      { root: 'public' }); });
router.get('/esqueci-senha', (req, res) => { if (req.session.userId) return res.redirect('/'); res.sendFile('esqueci-senha.html', { root: 'public' }); });

router.get('/redefinir-senha', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/login');
  const registro = await db.getAsync(
    `SELECT id FROM tokens_reset WHERE token = ? AND usado = 0 AND datetime(expira_em) > datetime('now')`, [token]
  );
  if (!registro) return res.redirect('/login?erro=link_expirado');
  res.sendFile('redefinir-senha.html', { root: 'public' });
});

// ── POST /api/auth/registro ───────────────────────────────────
router.post('/api/auth/registro', async (req, res) => {
  try {
    const { usuario, email, senha, confirmar } = req.body;

    if (!usuario || !senha || !confirmar)
      return res.json({ ok: false, erro: 'Preencha usuário, senha e confirmação.' });
    if (usuario.trim().length < 3)
      return res.json({ ok: false, erro: 'Usuário deve ter no mínimo 3 caracteres.' });
    if (senha.length < 6)
      return res.json({ ok: false, erro: 'Senha deve ter no mínimo 6 caracteres.' });
    if (senha !== confirmar)
      return res.json({ ok: false, erro: 'As senhas não coincidem.' });

    let emailFinal = null;
    if (email && email.trim()) {
      if (!validator.isEmail(email.trim()))
        return res.json({ ok: false, erro: 'E-mail inválido.' });
      const emailExiste = await db.getAsync('SELECT id FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
      if (emailExiste) return res.json({ ok: false, erro: 'Este e-mail já está cadastrado.' });
      emailFinal = email.trim().toLowerCase();
    }

    const usuarioExiste = await db.getAsync('SELECT id FROM usuarios WHERE usuario = ?', [usuario.trim()]);
    if (usuarioExiste) return res.json({ ok: false, erro: 'Este usuário já está em uso.' });

    const hash   = await bcrypt.hash(senha, SALT_ROUNDS);
    const result = await db.runAsync('INSERT INTO usuarios (usuario, email, senha_hash) VALUES (?, ?, ?)', [usuario.trim(), emailFinal, hash]);
    const sessao = await db.runAsync('INSERT INTO sessoes_acesso (usuario_id, ip) VALUES (?, ?)', [result.lastInsertRowid, req.ip]);

    // Salva sessão e aguarda confirmação antes de responder
    req.session.userId   = result.lastInsertRowid;
    req.session.nome     = usuario.trim();
    req.session.admin    = false;
    req.session.sessaoId = sessao.lastInsertRowid;

    req.session.save((err) => {
      if (err) {
        console.error('[registro] erro ao salvar sessão:', err);
        return res.json({ ok: false, erro: 'Erro ao criar sessão.' });
      }
      console.log('[registro] sessão salva, userId:', req.session.userId);
      res.json({ ok: true });
    });

  } catch (err) {
    console.error('[registro]', err);
    res.json({ ok: false, erro: 'Erro interno. Tente novamente.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    if (!usuario || !senha)
      return res.json({ ok: false, erro: 'Preencha usuário e senha.' });

    const user = await db.getAsync('SELECT * FROM usuarios WHERE usuario = ? AND ativo = 1', [usuario.trim()]);
    const senhaOk = user ? await bcrypt.compare(senha, user.senha_hash) : false;
    if (!user || !senhaOk)
      return res.json({ ok: false, erro: 'Usuário ou senha incorretos.' });

    await db.runAsync('UPDATE usuarios SET ultimo_login = datetime("now","localtime") WHERE id = ?', [user.id]);
    const sessao = await db.runAsync('INSERT INTO sessoes_acesso (usuario_id, ip) VALUES (?, ?)', [user.id, req.ip]);

    req.session.userId   = user.id;
    req.session.nome     = user.usuario;
    req.session.admin    = !!user.admin;
    req.session.sessaoId = sessao.lastInsertRowid;

    req.session.save((err) => {
      if (err) {
        console.error('[login] erro ao salvar sessão:', err);
        return res.json({ ok: false, erro: 'Erro ao criar sessão.' });
      }
      console.log('[login] sessão salva, userId:', req.session.userId);
      res.json({ ok: true });
    });

  } catch (err) {
    console.error('[login]', err);
    res.json({ ok: false, erro: 'Erro interno. Tente novamente.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/api/auth/logout', async (req, res) => {
  if (req.session.sessaoId)
    await db.runAsync('UPDATE sessoes_acesso SET saida = datetime("now","localtime") WHERE id = ?', [req.session.sessaoId]);
  req.session.destroy(() => res.json({ ok: true }));
});

// ── POST /api/auth/esqueci-senha ──────────────────────────────
router.post('/api/auth/esqueci-senha', async (req, res) => {
  try {
    const { usuario, email } = req.body;
    if (!usuario || !email)
      return res.json({ ok: false, erro: 'Informe seu usuário e o e-mail cadastrado.' });
    if (!validator.isEmail(email))
      return res.json({ ok: false, erro: 'E-mail inválido.' });

    const user = await db.getAsync(
      'SELECT * FROM usuarios WHERE usuario = ? AND email = ? AND ativo = 1',
      [usuario.trim(), email.trim().toLowerCase()]
    );
    if (!user) return res.json({ ok: true });

    await db.runAsync('UPDATE tokens_reset SET usado = 1 WHERE usuario_id = ?', [user.id]);
    const token     = crypto.randomBytes(32).toString('hex');
    const expiraStr = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace('T',' ').substring(0, 19);
    await db.runAsync('INSERT INTO tokens_reset (usuario_id, token, expira_em) VALUES (?, ?, ?)', [user.id, token, expiraStr]);

    const link = `${process.env.APP_URL || 'http://localhost:3000'}/redefinir-senha?token=${token}`;
    await enviarResetSenha({ para: user.email, nome: user.usuario, link });
    res.json({ ok: true });
  } catch (err) {
    console.error('[esqueci-senha]', err);
    res.json({ ok: false, erro: 'Erro ao enviar e-mail. Configure EMAIL_USER e EMAIL_PASS no arquivo .env' });
  }
});

// ── POST /api/auth/redefinir-senha ────────────────────────────
router.post('/api/auth/redefinir-senha', async (req, res) => {
  try {
    const { token, senha, confirmar } = req.body;
    if (!token || !senha || !confirmar)
      return res.json({ ok: false, erro: 'Dados incompletos.' });
    if (senha.length < 6)
      return res.json({ ok: false, erro: 'Senha deve ter no mínimo 6 caracteres.' });
    if (senha !== confirmar)
      return res.json({ ok: false, erro: 'As senhas não coincidem.' });

    const registro = await db.getAsync(
      `SELECT * FROM tokens_reset WHERE token = ? AND usado = 0 AND datetime(expira_em) > datetime('now')`, [token]
    );
    if (!registro) return res.json({ ok: false, erro: 'Link inválido ou expirado. Solicite um novo.' });

    const hash = await bcrypt.hash(senha, SALT_ROUNDS);
    await db.runAsync('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [hash, registro.usuario_id]);
    await db.runAsync('UPDATE tokens_reset SET usado = 1 WHERE id = ?', [registro.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[redefinir-senha]', err);
    res.json({ ok: false, erro: 'Erro interno. Tente novamente.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/api/auth/me', (req, res) => {
  console.log('[me] session:', req.session.userId);
  if (!req.session.userId) return res.json({ logado: false });
  res.json({ logado: true, nome: req.session.nome, admin: req.session.admin });
});

module.exports = router;
