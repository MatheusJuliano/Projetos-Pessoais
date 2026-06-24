// ═══════════════════════════════════════════════════════════════
//  DB.JS — Banco de dados SQLite via sql.js (puro JS, sem binários)
// ═══════════════════════════════════════════════════════════════

const path = require("path");
const fs   = require("fs");
const initSqlJs = require("sql.js");

const DB_PATH = path.join(__dirname, "../data/baterias.db");

let _db   = null;
let _sqlJs = null;

// Persiste o banco em disco após cada escrita
function salvar() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Inicializa (ou carrega) o banco de dados
async function init() {
  if (_db) return _db;

  _sqlJs = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new _sqlJs.Database(fileBuffer);
  } else {
    _db = new _sqlJs.Database();
  }

  // Cria tabelas se não existirem
  _db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT    NOT NULL UNIQUE,
      email      TEXT    NOT NULL UNIQUE,
      senha_hash TEXT    NOT NULL,
      papel      TEXT    NOT NULL DEFAULT 'operador',
      ativo      INTEGER NOT NULL DEFAULT 1,
      criado_em  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      token      TEXT    NOT NULL UNIQUE,
      expira_em  TEXT    NOT NULL,
      usado      INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS estoque (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      marca TEXT    NOT NULL,
      modelo TEXT   NOT NULL,
      qtd   INTEGER NOT NULL DEFAULT 0,
      obs   TEXT,
      UNIQUE(marca, modelo)
    );
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS movimentacoes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo        TEXT    NOT NULL,
      marca       TEXT    NOT NULL,
      modelo      TEXT    NOT NULL,
      qtd         INTEGER NOT NULL,
      operador_id INTEGER,
      operador    TEXT,
      data        TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (operador_id) REFERENCES usuarios(id)
    );
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS acessos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER NOT NULL,
      usuario     TEXT    NOT NULL,
      entrada     TEXT    NOT NULL,
      saida       TEXT,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `);

  salvar();
  console.log("✅ Banco de dados iniciado em:", DB_PATH);
  return _db;
}

// Helpers ─────────────────────────────────────────────────────

function get(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(db, sql, params = []) {
  const stmt   = db.prepare(sql);
  const rows   = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(db, sql, params = []) {
  db.run(sql, params);
  salvar();
}

module.exports = { init, get, all, run, salvar };
