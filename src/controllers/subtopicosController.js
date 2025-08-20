// src/controllers/subtopicosController.js
const pool = require('../config/db');
const { ok } = require('../utils/http');

// Criar subtopico(s)
async function create(req, res) {
  const body = req.body;

  try {
    // Caso venha um array → inserção em massa
    if (Array.isArray(body)) {
      const results = [];
      for (let item of body) {
        if (!item.topico_id || !item.nome) {
          return res.status(400).json({ ok: false, message: "topico_id e nome são obrigatórios" });
        }

        const [r] = await pool.execute(
          "INSERT INTO subtopicos (topico_id, nome) VALUES (?, ?)",
          [item.topico_id, item.nome]
        );

        results.push({ id: r.insertId, topico_id: item.topico_id, nome: item.nome });
      }
      return ok(res, { inserted: results }, 201);
    }

    // Caso venha apenas um objeto
    const { topico_id, nome } = body;
    if (!topico_id || !nome) {
      return res.status(400).json({ ok: false, message: "topico_id e nome são obrigatórios" });
    }

    const [r] = await pool.execute(
      "INSERT INTO subtopicos (topico_id, nome) VALUES (?, ?)",
      [topico_id, nome]
    );

    return ok(res, { id: r.insertId, topico_id, nome }, 201);
  } catch (err) {
    console.error("Erro em subtopicosController.create:", err);
    return res.status(500).json({ ok: false, message: "Erro ao criar subtopico" });
  }
}

// Listar por tópico
async function listByTopico(req, res) {
  try {
    const { topicoId } = req.params;
    const [rows] = await pool.execute(
      "SELECT id, topico_id, nome FROM subtopicos WHERE topico_id = ? ORDER BY id ASC",
      [topicoId]
    );
    return ok(res, rows);
  } catch (err) {
    console.error("Erro em subtopicosController.listByTopico:", err);
    return res.status(500).json({ ok: false, message: "Erro ao listar subtopicos" });
  }
}

// Obter matéria a partir de um subtopico
async function getMateriaFromSubtopico(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT m.id, m.nome
         FROM subtopicos s
         JOIN topicos t ON t.id = s.topico_id
         JOIN materias m ON m.id = t.materia_id
        WHERE s.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Matéria não encontrada para este subtopico" });
    }

    return res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("Erro em subtopicosController.getMateriaFromSubtopico:", err);
    return res.status(500).json({ ok: false, message: "Erro ao buscar matéria do subtopico" });
  }
}

// Atualizar nome
async function update(req, res) {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ ok: false, message: "nome é obrigatório" });

    await pool.execute("UPDATE subtopicos SET nome = ? WHERE id = ?", [nome, id]);
    return ok(res, { id: Number(id), nome });
  } catch (err) {
    console.error("Erro em subtopicosController.update:", err);
    return res.status(500).json({ ok: false, message: "Erro ao atualizar subtopico" });
  }
}

// Remover
async function remove(req, res) {
  try {
    const { id } = req.params;
    await pool.execute("DELETE FROM subtopicos WHERE id = ?", [id]);
    return ok(res, { id: Number(id) });
  } catch (err) {
    console.error("Erro em subtopicosController.remove:", err);
    return res.status(500).json({ ok: false, message: "Erro ao remover subtopico" });
  }
}

module.exports = { create, listByTopico, getMateriaFromSubtopico, update, remove };
