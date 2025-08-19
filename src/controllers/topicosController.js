// src/controllers/topicosController.js
const pool = require('../config/db');
const { ok } = require('../utils/http');

async function list(req, res) {
  const [rows] = await pool.execute(
    'SELECT * FROM topicos ORDER BY ordem ASC, id ASC'
  );
  return ok(res, rows);
}

async function listByMateria(req, res) {
  const { materiaId } = req.params;

  try {
    // busca os tópicos da matéria
    const [topicos] = await pool.execute(
      'SELECT * FROM topicos WHERE materia_id = ? ORDER BY ordem ASC, id ASC',
      [materiaId]
    );

    // para cada tópico, busca os subtopicos
    for (let topico of topicos) {
      const [subs] = await pool.execute(
        'SELECT id, nome, topico_id FROM subtopicos WHERE topico_id = ? ORDER BY id ASC',
        [topico.id]
      );
      topico.subtopicos = subs; // adiciona ao objeto
    }

    return ok(res, topicos);
  } catch (err) {
    console.error("Erro ao buscar tópicos e subtopicos:", err);
    return res.status(500).json({ ok: false, message: "Erro ao buscar tópicos" });
  }
}

async function create(req, res) {
  const { materia_id, nome, ordem = 0 } = req.body;
  const [r] = await pool.execute(
    'INSERT INTO topicos (materia_id, nome, ordem) VALUES (?, ?, ?)',
    [materia_id, nome, ordem]
  );
  return ok(res, { id: r.insertId }, 201);
}

async function update(req, res) {
  const { id } = req.params;
  const { nome, ordem } = req.body;
  await pool.execute(
    'UPDATE topicos SET nome = ?, ordem = ? WHERE id = ?',
    [nome, ordem, id]
  );
  return ok(res, { id: Number(id) });
}

async function remove(req, res) {
  const { id } = req.params;
  await pool.execute('DELETE FROM topicos WHERE id = ?', [id]);
  return ok(res, { id: Number(id) });
}

module.exports = { list, listByMateria, create, update, remove };
