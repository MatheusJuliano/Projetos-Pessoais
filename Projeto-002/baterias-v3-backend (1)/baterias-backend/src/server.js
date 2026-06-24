require('dotenv').config();
const express     = require('express');
const session     = require('express-session');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const fs          = require('fs');

const authRoutes    = require('./routes/auth');
const estoqueRoutes = require('./routes/estoque');

const app  = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Segurança ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc:      ["'self'", "'unsafe-inline'"],
      fontSrc:       ["'self'"],
      imgSrc:        ["'self'", "data:"],
    }
  }
}));

// Rate limit geral
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// Rate limit para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { ok: false, erro: 'Muitas tentativas. Aguarde 15 minutos.' }
});
app.use('/api/auth/login',           authLimiter);
app.use('/api/auth/registro',        authLimiter);
app.use('/api/auth/esqueci-senha',   authLimiter);
app.use('/api/auth/redefinir-senha', authLimiter);

// ── Parsers ───────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Sessões (armazenadas em memória — simples e sem dependências nativas) ──
app.use(session({
  secret:            process.env.SESSION_SECRET || 'baterias-secret-2026',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   false, // true apenas em produção com HTTPS
    sameSite: 'strict',
    maxAge:   8 * 60 * 60 * 1000, // 8 horas
  },
  name: 'baterias.sid',
}));

// ── Arquivos estáticos ────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Rotas ─────────────────────────────────────────────────────
app.use('/', authRoutes);
app.use('/', estoqueRoutes);

app.get('/', (req, res) => {
  if (req.session.userId) return res.sendFile('index.html', { root: 'public' });
  res.redirect('/login');
});

app.use((req, res) => res.redirect('/'));

app.listen(PORT, () => {
  console.log('');
  console.log('🔋 ════════════════════════════════════════════');
  console.log(`🔋  Sistema de Baterias rodando!`);
  console.log(`🔋  Acesse: http://localhost:${PORT}`);
  console.log('🔋 ════════════════════════════════════════════');
  console.log('');
});
