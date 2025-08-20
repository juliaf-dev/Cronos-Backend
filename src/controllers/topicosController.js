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
  const body = req.body;

  try {
    // Caso venha um array → inserção em massa
    if (Array.isArray(body)) {
      const results = [];
      for (let item of body) {
        if (!item.materia_id || !item.nome) {
          return res.status(400).json({ ok: false, message: "materia_id e nome são obrigatórios" });
        }
        const [r] = await pool.execute(
          'INSERT INTO topicos (materia_id, nome, ordem) VALUES (?, ?, ?)',
          [item.materia_id, item.nome, item.ordem ?? 0]
        );
        results.push({ id: r.insertId, nome: item.nome });
      }
      return ok(res, { inserted: results }, 201);
    }

    // Caso venha um único objeto
    const { materia_id, nome, ordem = 0 } = body;
    if (!materia_id || !nome) {
      return res.status(400).json({ ok: false, message: "materia_id e nome são obrigatórios" });
    }

    const [r] = await pool.execute(
      'INSERT INTO topicos (materia_id, nome, ordem) VALUES (?, ?, ?)',
      [materia_id, nome, ordem]
    );
    return ok(res, { id: r.insertId, nome }, 201);

  } catch (err) {
    console.error("Erro ao criar tópico:", err);
    return res.status(500).json({ ok: false, message: "Erro ao criar tópico" });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { nome, ordem } = req.body;

  if (!nome || ordem === undefined) {
    return res.status(400).json({ ok: false, message: "nome e ordem são obrigatórios" });
  }

  await pool.execute(
    'UPDATE topicos SET nome = ?, ordem = ? WHERE id = ?',
    [nome, ordem, id]
  );
  return ok(res, { id: Number(id), nome });
}

async function remove(req, res) {
  const { id } = req.params;
  await pool.execute('DELETE FROM topicos WHERE id = ?', [id]);
  return ok(res, { id: Number(id) });
}

module.exports = { list, listByMateria, create, update, remove };
