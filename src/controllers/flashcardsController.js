// src/controllers/flashcardsController.js
const pool = require("../config/db");

// Criar flashcard
async function create(req, res) {
  try {
    const { materia_id, pergunta, resposta, nivel_dificuldade } = req.body;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ ok: false, error: "Usuário não autenticado." });
    }

    if (!materia_id || !pergunta || !resposta) {
      return res.status(400).json({ ok: false, error: "Preencha todos os campos obrigatórios." });
    }

    const [result] = await pool.execute(
      `INSERT INTO flashcards 
        (usuario_id, materia_id, pergunta, resposta, nivel_dificuldade, status, criado_em) 
        VALUES (?, ?, ?, ?, ?, 'a_revisar', NOW())`,
      [usuarioId, materia_id, pergunta, resposta, nivel_dificuldade || "medio"]
    );

    res.json({
      ok: true,
      message: "Flashcard criado com sucesso!",
      data: { id: result.insertId, materia_id, pergunta, resposta, nivel_dificuldade },
    });
  } catch (err) {
    console.error("❌ Erro ao criar flashcard:", err);
    res.status(500).json({ ok: false, error: "Erro interno no servidor." });
  }
}

// Registrar revisão
async function registrarRevisao(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "Usuário não autenticado." });

    const { id } = req.params;

    const [rows] = await pool.execute(
      "SELECT nivel_dificuldade FROM flashcards WHERE id = ? AND usuario_id = ?",
      [id, usuarioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Flashcard não encontrado." });
    }

    const nivel = rows[0].nivel_dificuldade;

    let dias;
    switch (nivel) {
      case "facil": dias = 5; break;
      case "medio": dias = 3; break;
      case "dificil": dias = 1; break;
      default: dias = 2;
    }

    await pool.execute(
      "UPDATE flashcards SET status = 'revisado', revisar_em = DATE_ADD(CURDATE(), INTERVAL ? DAY) WHERE id = ? AND usuario_id = ?",
      [dias, id, usuarioId]
    );

    res.json({ ok: true, message: "Revisão registrada com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao registrar revisão:", err);
    res.status(500).json({ ok: false, error: "Erro interno no servidor." });
  }
}

// Listar todos flashcards do usuário
async function listByUsuario(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "Usuário não autenticado." });

    const [rows] = await pool.execute(
      "SELECT * FROM flashcards WHERE usuario_id = ? ORDER BY criado_em DESC",
      [usuarioId]
    );

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("❌ Erro ao listar flashcards:", err);
    res.status(500).json({ ok: false, error: "Erro interno no servidor." });
  }
}

// Listar flashcards por matéria
async function listByMateria(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "Usuário não autenticado." });

    const { materiaId } = req.params;

    const [rows] = await pool.execute(
      "SELECT * FROM flashcards WHERE usuario_id = ? AND materia_id = ? ORDER BY criado_em DESC",
      [usuarioId, materiaId]
    );

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("❌ Erro ao listar flashcards por matéria:", err);
    res.status(500).json({ ok: false, error: "Erro interno no servidor." });
  }
}

// Atualizar flashcard
async function update(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "Usuário não autenticado." });

    const { id } = req.params;
    const { pergunta, resposta } = req.body;

    if (!pergunta || !resposta) {
      return res.status(400).json({ ok: false, error: "Pergunta e resposta são obrigatórias." });
    }

    const [result] = await pool.execute(
      "UPDATE flashcards SET pergunta = ?, resposta = ? WHERE id = ? AND usuario_id = ?",
      [pergunta, resposta, id, usuarioId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Flashcard não encontrado." });
    }

    res.json({ ok: true, message: "Flashcard atualizado com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao atualizar flashcard:", err);
    res.status(500).json({ ok: false, error: "Erro interno no servidor." });
  }
}

// Remover flashcard
async function remove(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "Usuário não autenticado." });

    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM flashcards WHERE id = ? AND usuario_id = ?",
      [id, usuarioId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Flashcard não encontrado." });
    }

    res.json({ ok: true, message: "Flashcard removido com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao remover flashcard:", err);
    res.status(500).json({ ok: false, error: "Erro interno no servidor." });
  }
}

// Registrar acerto/erro
async function registrarResultado(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "Usuário não autenticado." });

    const { id } = req.params;
    const { correta } = req.body;

    const [check] = await pool.execute(
      "SELECT id FROM flashcards WHERE id = ? AND usuario_id = ?",
      [id, usuarioId]
    );
    if (check.length === 0) {
      return res.status(403).json({ ok: false, error: "Acesso negado a este flashcard." });
    }

    await pool.execute(
      `INSERT INTO flashcard_resultados 
        (flashcard_id, usuario_id, correta, respondido_em) 
        VALUES (?, ?, ?, NOW())`,
      [id, usuarioId, correta ? 1 : 0]
    );

    res.json({ ok: true, message: "Resultado registrado com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao registrar resultado:", err);
    res.status(500).json({ ok: false, error: "Erro interno no servidor." });
  }
}

module.exports = {
  create,
  registrarRevisao,
  listByUsuario,
  listByMateria,
  update,
  remove,
  registrarResultado
};
