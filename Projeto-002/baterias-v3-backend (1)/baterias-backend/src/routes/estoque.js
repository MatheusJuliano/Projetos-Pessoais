const express = require('express');
const db      = require('../database');
const { requireAuth } = require('../middleware/auth');
const router  = express.Router();

router.use(requireAuth);

router.get('/api/estoque', async (req, res) => {
  const items = await db.allAsync('SELECT * FROM estoque ORDER BY marca, modelo');
  res.json(items);
});

router.get('/api/movimentacoes', async (req, res) => {
  const { data } = req.query;
  let rows;
  if (data) {
    rows = await db.allAsync(`SELECT * FROM movimentacoes WHERE date(data) = ? ORDER BY id DESC`, [data]);
  } else {
    rows = await db.allAsync(`SELECT * FROM movimentacoes ORDER BY id DESC LIMIT 200`);
  }
  res.json(rows);
});

router.get('/api/acessos', async (req, res) => {
  const rows = await db.allAsync(
    `SELECT s.*, u.usuario as nome FROM sessoes_acesso s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.usuario_id = ? ORDER BY s.id DESC LIMIT 30`,
    [req.session.userId]
  );
  res.json(rows);
});

router.post('/api/estoque/entrada', async (req, res) => {
  try {
    const { marca, modelo, qtd, obs } = req.body;
    if (!marca || !modelo || !qtd || Number(qtd) <= 0)
      return res.json({ ok: false, erro: 'Preencha marca, modelo e quantidade.' });

    const qtdN   = Math.floor(Number(qtd));
    const existe = await db.getAsync('SELECT * FROM estoque WHERE marca = ? AND modelo = ?', [marca.trim(), modelo.trim()]);

    if (existe) {
      await db.runAsync('UPDATE estoque SET qtd = qtd + ?, obs = ? WHERE id = ?', [qtdN, obs || existe.obs, existe.id]);
    } else {
      await db.runAsync('INSERT INTO estoque (marca, modelo, qtd, obs) VALUES (?, ?, ?, ?)', [marca.trim(), modelo.trim(), qtdN, obs || '']);
    }

    await db.runAsync(
      'INSERT INTO movimentacoes (tipo, marca, modelo, qtd, operador, usuario_id) VALUES (?,?,?,?,?,?)',
      ['Entrada', marca.trim(), modelo.trim(), qtdN, req.session.nome, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[entrada]', err);
    res.json({ ok: false, erro: 'Erro ao registrar entrada.' });
  }
});

router.post('/api/estoque/venda', async (req, res) => {
  try {
    const { marca, modelo, qtd } = req.body;
    if (!marca || !modelo || !qtd || Number(qtd) <= 0)
      return res.json({ ok: false, erro: 'Preencha marca, modelo e quantidade.' });

    const qtdN = Math.floor(Number(qtd));
    const bat  = await db.getAsync('SELECT * FROM estoque WHERE marca = ? AND modelo = ?', [marca.trim(), modelo.trim()]);

    if (!bat || bat.qtd < qtdN)
      return res.json({ ok: false, erro: `Estoque insuficiente. Disponível: ${bat ? bat.qtd : 0}` });

    await db.runAsync('UPDATE estoque SET qtd = qtd - ? WHERE id = ?', [qtdN, bat.id]);
    await db.runAsync(
      'INSERT INTO movimentacoes (tipo, marca, modelo, qtd, operador, usuario_id) VALUES (?,?,?,?,?,?)',
      ['Venda', marca.trim(), modelo.trim(), qtdN, req.session.nome, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[venda]', err);
    res.json({ ok: false, erro: 'Erro ao registrar venda.' });
  }
});

router.post('/api/estoque/estorno', async (req, res) => {
  try {
    const ultima = await db.getAsync(
      `SELECT * FROM movimentacoes WHERE tipo IN ('Entrada','Venda') ORDER BY id DESC LIMIT 1`
    );
    if (!ultima) return res.json({ ok: false, erro: 'Nenhuma movimentação para estornar.' });

    const bat = await db.getAsync('SELECT * FROM estoque WHERE marca = ? AND modelo = ?', [ultima.marca, ultima.modelo]);

    if (ultima.tipo === 'Entrada') {
      if (bat) await db.runAsync('UPDATE estoque SET qtd = qtd - ? WHERE id = ?', [ultima.qtd, bat.id]);
    } else {
      if (bat) await db.runAsync('UPDATE estoque SET qtd = qtd + ? WHERE id = ?', [ultima.qtd, bat.id]);
      else await db.runAsync('INSERT INTO estoque (marca,modelo,qtd) VALUES (?,?,?)', [ultima.marca, ultima.modelo, ultima.qtd]);
    }

    await db.runAsync(
      'INSERT INTO movimentacoes (tipo,marca,modelo,qtd,operador,usuario_id) VALUES (?,?,?,?,?,?)',
      [`Estorno (${ultima.tipo})`, ultima.marca, ultima.modelo, ultima.qtd, req.session.nome, req.session.userId]
    );
    await db.runAsync('DELETE FROM movimentacoes WHERE id = ?', [ultima.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[estorno]', err);
    res.json({ ok: false, erro: 'Erro ao realizar estorno.' });
  }
});

module.exports = router;
