const { createClient } = require('@libsql/client');
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const client = createClient({
  url: `file:${path.join(DATA_DIR, 'baterias.db')}`
});

const db = {
  async runAsync(sql, params = []) {
    const r = await client.execute({ sql, args: params });
    return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.rowsAffected };
  },
  async getAsync(sql, params = []) {
    const r = await client.execute({ sql, args: params });
    return r.rows[0] || null;
  },
  async allAsync(sql, params = []) {
    const r = await client.execute({ sql, args: params });
    return r.rows;
  }
};

async function init() {
  await client.executeMultiple(`
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
  `);
  console.log('✅ Banco de dados pronto.');
}

init().catch(err => console.error('Erro ao inicializar banco:', err));

module.exports = db;
