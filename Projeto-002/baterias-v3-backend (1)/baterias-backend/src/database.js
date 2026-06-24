const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'baterias.db');
const db = new sqlite3.Database(DB_PATH);

// Promisify para usar com async/await
const { promisify } = require('util');
db.runAsync = function(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    });
  });
};
db.getAsync = function(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
  });
};
db.allAsync = function(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows || []); });
  });
};
db.execAsync = function(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => { if (err) reject(err); else resolve(); });
  });
};

// Cria as tabelas ao iniciar
db.serialize(() => {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS usuarios (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      email        TEXT    UNIQUE COLLATE NOCASE,
      senha_hash   TEXT    NOT NULL,
      ativo        INTEGER NOT NULL DEFAULT 1,
      admin        INTEGER NOT NULL DEFAULT 0,
      criado_em    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      ultimo_login TEXT
    );

    CREATE TABLE IF NOT EXISTS tokens_reset (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER NOT NULL,
      token       TEXT    NOT NULL UNIQUE,
      expira_em   TEXT    NOT NULL,
      usado       INTEGER NOT NULL DEFAULT 0,
      criado_em   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sessoes_acesso (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER NOT NULL,
      entrada     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      saida       TEXT,
      ip          TEXT
    );

    CREATE TABLE IF NOT EXISTS estoque (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      marca   TEXT NOT NULL,
      modelo  TEXT NOT NULL,
      qtd     INTEGER NOT NULL DEFAULT 0,
      obs     TEXT DEFAULT '',
      UNIQUE(marca, modelo)
    );

    CREATE TABLE IF NOT EXISTS movimentacoes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo        TEXT    NOT NULL,
      marca       TEXT,
      modelo      TEXT    NOT NULL,
      qtd         INTEGER NOT NULL,
      operador    TEXT,
      usuario_id  INTEGER,
      data        TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `, (err) => { if (err) console.error('Erro ao criar tabelas:', err); else console.log('✅ Banco de dados pronto.'); });
});

module.exports = db;
