// src/controllers/materiasController.js
const pool = require('../config/db');
const { ok } = require('../utils/http');

async function list(req, res) {
  const [rows] = await pool.execute(
    `SELECT m.*,
            (SELECT COUNT(*) FROM topicos t WHERE t.materia_id = m.id) AS total_topicos
       FROM materias m
   ORDER BY m.ordem ASC, m.nome ASC`
  );
  return ok(res, rows);
}

async function getById(req, res) {
  const { id } = req.params;

  const [rows] = await pool.execute(
    `SELECT m.*,
            (SELECT COUNT(*) FROM topicos t WHERE t.materia_id = m.id) AS total_topicos
       FROM materias m
      WHERE m.id = ?`,
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ ok: false, message: 'Matéria não encontrada' });
  }

  return ok(res, rows[0]);
}

async function create(req, res) {
  let { nome, slug, ordem } = req.body;

  if (!nome) {
    return res.status(400).json({ ok: false, message: 'O campo nome é obrigatório' });
  }

  // Gera slug automático se não vier
  if (!slug) {
    slug = String(nome)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s-]/g, '')    // remove chars não permitidos
      .trim()
      .replace(/\s+/g, '-');           // troca espaços por "-"
  }

  if (ordem === undefined) ordem = 0;

  const [r] = await pool.execute(
    'INSERT INTO materias (nome, slug, ordem) VALUES (?, ?, ?)',
    [nome, slug, ordem]
  );
  return ok(res, { id: r.insertId }, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const { nome, slug, ordem } = req.body;

  await pool.execute(
    'UPDATE materias SET nome = ?, slug = ?, ordem = ? WHERE id = ?',
    [nome, slug, ordem, id]
  );

  return ok(res, { id: Number(id) });
}

async function remove(req, res) {
  const { id } = req.params;

  await pool.execute('DELETE FROM materias WHERE id = ?', [id]);

  return ok(res, { id: Number(id) });
}

module.exports = { list, getById, create, update, remove };
