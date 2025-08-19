const { getPool } = require('../config/db');
const { ok } = require('../utils/http');

async function random(req, res) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT id, texto, autor FROM motivacoes WHERE ativo = 1 ORDER BY RAND() * peso DESC LIMIT 1'
  );
  return ok(res, rows[0] || null);
}

async function list(req, res) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM motivacoes ORDER BY id DESC');
  return ok(res, rows);
}

async function create(req, res) {
  const { texto, autor = null, ativo = 1, peso = 1 } = req.body;
  const pool = await getPool();
  const [r] = await pool.execute(
    'INSERT INTO motivacoes (texto, autor, ativo, peso) VALUES (?, ?, ?, ?)',
    [texto, autor, ativo, peso]
  );
  return ok(res, { id: r.insertId }, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const { texto, autor = null, ativo = 1, peso = 1 } = req.body;
  const pool = await getPool();
  await pool.execute('UPDATE motivacoes SET texto=?, autor=?, ativo=?, peso=? WHERE id=?',
    [texto, autor, ativo, peso, id]
  );
  return ok(res, { id: Number(id) });
}

async function remove(req, res) {
  const { id } = req.params;
  const pool = await getPool();
  await pool.execute('DELETE FROM motivacoes WHERE id = ?', [id]);
  return ok(res, { id: Number(id) });
}

module.exports = { random, list, create, update, remove };
