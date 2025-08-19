// src/controllers/alternativasController.js
const { getPool } = require('../config/db');
const { ok } = require('../utils/http');

async function listByQuestao(req, res) {
  const { questaoId } = req.params;
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT id, questao_id, letra, texto FROM alternativas WHERE questao_id = ? ORDER BY letra ASC',
    [questaoId]
  );
  return ok(res, rows);
}

async function createMany(req, res) {
  const { questao_id, alternativas } = req.body;

  if (!questao_id || !Array.isArray(alternativas) || alternativas.length < 2) {
    return res.status(400).json({ ok: false, message: 'questao_id e ao menos 2 alternativas são obrigatórios' });
  }

  const pool = await getPool();

  // Verifica se a questão existe
  const [[q]] = await pool.execute('SELECT id FROM questoes WHERE id = ? LIMIT 1', [questao_id]);
  if (!q) return res.status(400).json({ ok: false, message: 'questao_id inválido' });

  // Normaliza letras e textos
  const values = alternativas.map(a => [
    questao_id,
    String(a.letra || '').toUpperCase(),
    String(a.texto || '')
  ]);

  await pool.query(
    `INSERT INTO alternativas (questao_id, letra, texto) VALUES ${values.map(() => '(?, ?, ?)').join(',')}`,
    values.flat()
  );

  return ok(res, { questao_id }, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const { letra, texto } = req.body;
  const pool = await getPool();

  await pool.execute(
    'UPDATE alternativas SET letra = COALESCE(?, letra), texto = COALESCE(?, texto) WHERE id = ?',
    [letra ? letra.toUpperCase() : null, texto ?? null, id]
  );

  return ok(res, { id: Number(id) });
}

async function remove(req, res) {
  const { id } = req.params;
  const pool = await getPool();
  await pool.execute('DELETE FROM alternativas WHERE id = ?', [id]);
  return ok(res, { id: Number(id) });
}

module.exports = { listByQuestao, createMany, update, remove };
