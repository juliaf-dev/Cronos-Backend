// src/controllers/evolucaoController.js
const pool = require("../config/db");
const { ok } = require("../utils/http");

/**
 * Painel de evolução do usuário
 */
async function painel(req, res) {
  try {
    const usuarioId = req.params.usuarioId;
    if (!usuarioId) {
      return res.status(400).json({ ok: false, message: "Usuário não informado" });
    }

    const hoje = new Date().toISOString().slice(0, 10);

    // 🔹 Garante que o dia existe na tabela
    await pool.execute(
      `INSERT INTO evolucao (usuario_id, data, minutos_estudados, acessos, dias_seguidos)
       VALUES (?, ?, 0, 0, 0)
       ON DUPLICATE KEY UPDATE usuario_id = usuario_id`,
      [usuarioId, hoje]
    );

    // 1) Evolução temporal (mapa de calor)
    const [mapa] = await pool.execute(
      `SELECT data, minutos_estudados, acessos, dias_seguidos
         FROM evolucao
        WHERE usuario_id = ?
     ORDER BY data ASC`,
      [usuarioId]
    );

    // 2) Desempenho por matéria (sempre lista todas as matérias)
    const [materias] = await pool.execute(
      `SELECT m.id AS materia_id,
              m.nome AS materia,
              COALESCE(SUM(CASE WHEN qr.correta = 1 THEN 1 ELSE 0 END),0) AS acertos,
              COALESCE(SUM(CASE WHEN qr.correta = 0 THEN 1 ELSE 0 END),0) AS erros,
              COALESCE(COUNT(qr.id),0) AS total_questoes
         FROM materias m
    LEFT JOIN questoes q ON q.materia_id = m.id
    LEFT JOIN quiz_resultados qr 
           ON qr.questao_id = q.id 
          AND qr.usuario_id = ? 
          AND qr.respondido_em IS NOT NULL
     GROUP BY m.id, m.nome
     ORDER BY m.nome ASC`,
      [usuarioId]
    );

    // 3) Progresso geral
    const [[agg]] = await pool.execute(
      `SELECT SUM(CASE WHEN correta = 1 THEN 1 ELSE 0 END) AS acertos,
              SUM(CASE WHEN correta = 0 THEN 1 ELSE 0 END) AS erros,
              COUNT(*) AS total
         FROM quiz_resultados
        WHERE usuario_id = ? AND respondido_em IS NOT NULL`,
      [usuarioId]
    );

    const totalQuestoes = agg?.total || 0;
    const progressoGeral =
      totalQuestoes > 0 ? Number(((agg.acertos / totalQuestoes) * 100).toFixed(1)) : 0;

    // 4) Tempo total
    const [[tempo]] = await pool.execute(
      `SELECT COALESCE(SUM(minutos_estudados),0) AS total_minutos
         FROM evolucao
        WHERE usuario_id = ?`,
      [usuarioId]
    );

    // 5) Total de resumos
    const [[resumos]] = await pool.execute(
      `SELECT COUNT(*) AS total_resumos
         FROM resumos
        WHERE usuario_id = ?`,
      [usuarioId]
    );

    // 6) Questões respondidas
    const [[resumoQuestoes]] = await pool.execute(
      `SELECT SUM(CASE WHEN correta = 1 THEN 1 ELSE 0 END) AS total_acertos,
              SUM(CASE WHEN correta = 0 THEN 1 ELSE 0 END) AS total_erros
         FROM quiz_resultados
        WHERE usuario_id = ? AND respondido_em IS NOT NULL`,
      [usuarioId]
    );

    const total_respondidas =
      (resumoQuestoes?.total_acertos || 0) + (resumoQuestoes?.total_erros || 0);

    // 7) Streak atual
    const [[streakAtual]] = await pool.execute(
      `SELECT dias_seguidos 
         FROM evolucao
        WHERE usuario_id = ?
     ORDER BY data DESC
        LIMIT 1`,
      [usuarioId]
    );

    const streak = streakAtual?.dias_seguidos || 0;

    return ok(res, {
      resumo: {
        progressoGeral,
        tempo_total: tempo?.total_minutos || 0,
        total_resumos: resumos?.total_resumos || 0,
        total_acertos: resumoQuestoes?.total_acertos || 0,
        total_respondidas,
        streak,
      },
      desempenhoPorMateria: materias || [],
      mapa: mapa || [],
    });
  } catch (err) {
    console.error("❌ Erro em evolucaoController.painel:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Erro ao carregar painel", error: err.message });
  }
}

/**
 * Registrar atividade (tempo, acessos, streak)
 */
async function registrar(req, res) {
  try {
    const usuarioId = req.user.id;
    const hoje = new Date().toISOString().slice(0, 10);

    // Verifica último acesso
    const [[ultimoRegistro]] = await pool.execute(
      `SELECT data, dias_seguidos
         FROM evolucao
        WHERE usuario_id = ?
     ORDER BY data DESC
        LIMIT 1`,
      [usuarioId]
    );

    let diasSeguidos = 1;
    if (ultimoRegistro) {
      const ultimaData = new Date(ultimoRegistro.data);
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);

      if (ultimaData.toISOString().slice(0, 10) === ontem.toISOString().slice(0, 10)) {
        diasSeguidos = ultimoRegistro.dias_seguidos + 1;
      }
    }

    // Atualiza registro do dia
    await pool.execute(
      `INSERT INTO evolucao (usuario_id, data, minutos_estudados, acessos, dias_seguidos)
       VALUES (?, ?, 1, 1, ?)
       ON DUPLICATE KEY UPDATE 
         minutos_estudados = minutos_estudados + 1,
         acessos = acessos + 1,
         dias_seguidos = VALUES(dias_seguidos)`,
      [usuarioId, hoje, diasSeguidos]
    );

    return res.json({ ok: true, msg: "Evolução registrada" });
  } catch (err) {
    console.error("❌ Erro em evolucaoController.registrar:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Erro ao registrar evolução", error: err.message });
  }
  
}

module.exports = {
  painel,
  registrar,
};
