// src/controllers/evolucaoController.js
const pool = require('../config/db');
const { ok } = require('../utils/http');

/**
 * Painel de evolução do usuário
 * - Mapa de calor de acessos/minutos (tabela evolucao)
 * - Desempenho por matéria (tabela quizzes)
 * - Progresso geral (% acertos)
 */
async function painel(req, res) {
  try {
    const { usuarioId } = req.params;

    // 1) Evolução temporal (mapa de calor)
    const [mapa] = await pool.execute(
      `SELECT data, minutos_estudados, acessos
         FROM evolucao
        WHERE usuario_id = ?
     ORDER BY data ASC`,
      [usuarioId]
    );

    // 2) Desempenho por matéria
    const [materias] = await pool.execute(
      `SELECT q.materia_id, m.nome AS materia,
              SUM(q.acertos) AS acertos,
              SUM(q.erros)   AS erros,
              COUNT(*)       AS total_quizzes
         FROM quizzes q
    LEFT JOIN materias m ON m.id = q.materia_id
        WHERE q.usuario_id = ? AND q.finalizado_em IS NOT NULL
     GROUP BY q.materia_id, m.nome
     ORDER BY m.nome ASC`,
      [usuarioId]
    );

    // 3) Progresso geral (% acertos global)
    const [[agg]] = await pool.execute(
      `SELECT SUM(acertos) AS acertos, SUM(erros) AS erros
         FROM quizzes
        WHERE usuario_id = ? AND finalizado_em IS NOT NULL`,
      [usuarioId]
    );
    const totalQuestoes = (agg.acertos || 0) + (agg.erros || 0);
    const progressoGeral = totalQuestoes > 0
      ? Number(((agg.acertos / totalQuestoes) * 100).toFixed(1))
      : 0;

    return ok(res, {
      progressoGeral,           // % acertos
      desempenhoPorMateria: materias, // [{materia_id, materia, acertos, erros, total_quizzes}]
      mapa                      // evolução temporal [{data, minutos_estudados, acessos}]
    });
  } catch (err) {
    console.error('Erro em evolucaoController.painel:', err);
    return res.status(500).json({
      ok: false,
      message: 'Erro ao carregar painel',
      error: err.message
    });
  }
}

module.exports = { painel };
