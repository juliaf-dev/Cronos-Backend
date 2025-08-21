// src/controllers/quizController.js
const pool = require("../config/db");
const { generateOne } = require("./questoesController");

// ----------------------
// Util: carregar alternativas de várias questões
// ----------------------
async function carregarAlternativasMap(questaoIds) {
  const altMap = new Map();
  if (!questaoIds.length) return altMap;

  const [alts] = await pool.query(
    `SELECT id, questao_id, letra, texto
       FROM alternativas
      WHERE questao_id IN (?)
   ORDER BY letra ASC`,
    [questaoIds]
  );

  for (const a of alts) {
    if (!altMap.has(a.questao_id)) altMap.set(a.questao_id, []);
    altMap.get(a.questao_id).push(a);
  }
  return altMap;
}

// ----------------------
// POST /quiz/sessoes
// ----------------------
async function criarSessao(req, res) {
  try {
    const usuario_id = req.user?.id || req.body.usuario_id;
    const { conteudo_id } = req.body;

    if (!usuario_id || !conteudo_id) {
      return res.status(400).json({
        ok: false,
        message: "usuario_id e conteudo_id são obrigatórios",
      });
    }

    let quizId, questoes, altMap, materia_id;

    // Verifica quiz existente
    const [[quizExistente]] = await pool.execute(
      `SELECT id, materia_id FROM quizzes WHERE conteudo_id = ? LIMIT 1`,
      [conteudo_id]
    );

    if (quizExistente) {
      quizId = quizExistente.id;
      materia_id = quizExistente.materia_id;

      [questoes] = await pool.query(
        `SELECT q.id, q.enunciado, q.materia_id
           FROM quiz_questoes qq
           JOIN questoes q ON q.id = qq.questao_id
          WHERE qq.quiz_id = ?
       ORDER BY qq.id ASC`,
        [quizId]
      );

      altMap = await carregarAlternativasMap(questoes.map((q) => q.id));
    } else {
      // Criar quiz novo
      let [questoesSelecionadas] = await pool.query(
        `SELECT q.id, q.enunciado, q.materia_id
           FROM questoes q
          WHERE q.conteudo_id = ?
       ORDER BY RAND()
          LIMIT 20`,
        [conteudo_id]
      );

      // Apenas questões com alternativas completas
      let altTemp = await carregarAlternativasMap(
        questoesSelecionadas.map((q) => q.id)
      );
      questoesSelecionadas = questoesSelecionadas.filter(
        (q) => altTemp.has(q.id) && altTemp.get(q.id).length === 5
      );

      // Completar com IA se faltar
      while (questoesSelecionadas.length < 10) {
        try {
          const nova = await generateOne({ conteudo_id, dificuldade: "medio" });
          if (!nova) break;
          questoesSelecionadas.push({
            id: nova.id,
            enunciado: nova.enunciado,
            materia_id:
              questoesSelecionadas[0]?.materia_id || nova.materia_id,
          });
        } catch (err) {
          console.error("⚠️ Falha ao gerar questão via IA:", err.message);
          break;
        }
      }

      // Garante mínimo de 10
      if (questoesSelecionadas.length < 10) {
        return res.status(400).json({
          ok: false,
          message:
            "Não foi possível gerar quiz completo (mínimo 10 questões necessárias).",
        });
      }

      questoes = questoesSelecionadas.slice(0, 10);
      altMap = await carregarAlternativasMap(questoes.map((q) => q.id));
      materia_id = questoes[0]?.materia_id || null;

      const [quizIns] = await pool.execute(
        `INSERT INTO quizzes (conteudo_id, materia_id, total, acertos, erros, criado_em)
         VALUES (?, ?, 10, 0, 0, NOW())`,
        [conteudo_id, materia_id]
      );
      quizId = quizIns.insertId;

      for (const q of questoes) {
        await pool.execute(
          `INSERT INTO quiz_questoes (quiz_id, questao_id) VALUES (?, ?)`,
          [quizId, q.id]
        );
      }
    }

    // Criar registros de resultados para usuário
    for (const q of questoes) {
      await pool.execute(
        `INSERT IGNORE INTO quiz_resultados (usuario_id, quiz_id, questao_id, correta, respondido_em)
         VALUES (?, ?, ?, NULL, NULL)`,
        [usuario_id, quizId, q.id]
      );
    }

    // Retornar questões com alternativas
    const questoesComAlternativas = await Promise.all(
      questoes.map(async (q) => {
        const [[corretaRow]] = await pool.execute(
          `SELECT alternativa_correta FROM questoes WHERE id = ? LIMIT 1`,
          [q.id]
        );
        return {
          id: q.id,
          enunciado: q.enunciado,
          materia_id: q.materia_id,
          alternativa_correta: corretaRow?.alternativa_correta || null,
          alternativas: altMap.get(q.id) || [],
        };
      })
    );

    return res.json({
      ok: true,
      quiz: { quiz_id: quizId, questoes: questoesComAlternativas },
    });
  } catch (err) {
    console.error("❌ Erro ao criar sessão de quiz:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ----------------------
// POST /quiz/responder
// ----------------------
async function responder(req, res) {
  try {
    const usuario_id = req.user?.id || req.body.usuario_id;
    const { quiz_id, questao_id, alternativa_id } = req.body;

    if (!usuario_id || !quiz_id || !questao_id || !alternativa_id) {
      return res.status(400).json({
        ok: false,
        message:
          "usuario_id, quiz_id, questao_id e alternativa_id são obrigatórios",
      });
    }

    console.log("➡️ Responder:", {
      usuario_id,
      quiz_id,
      questao_id,
      alternativa_id,
    });

    const [vr] = await pool.execute(
      `SELECT id FROM quiz_resultados WHERE usuario_id = ? AND quiz_id = ? AND questao_id = ? LIMIT 1`,
      [usuario_id, quiz_id, questao_id]
    );
    if (vr.length === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "Questão não pertence a este quiz" });
    }

    const [[row]] = await pool.execute(
      `SELECT a.letra AS letra_escolhida, q.alternativa_correta AS letra_correta, q.explicacao
         FROM alternativas a
         JOIN questoes q ON q.id = a.questao_id
        WHERE a.id = ? AND q.id = ?`,
      [alternativa_id, questao_id]
    );
    if (!row) {
      return res
        .status(404)
        .json({ ok: false, message: "Alternativa inválida" });
    }

    const correta =
      row.letra_escolhida.toUpperCase() ===
      row.letra_correta.toUpperCase();

    await pool.execute(
      `UPDATE quiz_resultados
          SET correta = ?, respondido_em = NOW()
        WHERE usuario_id = ? AND quiz_id = ? AND questao_id = ?`,
      [correta ? 1 : 0, usuario_id, quiz_id, questao_id]
    );

    console.log("✅ Resposta registrada:", {
      questao_id,
      correta,
      letra_correta: row.letra_correta,
    });

    return res.json({
      ok: true,
      correta,
      message: correta ? "Resposta correta!" : "Resposta incorreta.",
      explicacao: row.explicacao || "Sem explicação disponível.",
      letra_correta: row.letra_correta,
    });
  } catch (err) {
    console.error("❌ Erro ao responder questão:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ----------------------
// POST /quiz/finalizar
// ----------------------
async function finalizar(req, res) {
  try {
    const usuario_id = req.user?.id || req.body.usuario_id;
    const { quiz_id } = req.body;

    if (!usuario_id || !quiz_id) {
      return res
        .status(400)
        .json({ ok: false, message: "usuario_id e quiz_id são obrigatórios" });
    }

    const [[tot]] = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(respondido_em IS NULL) AS pendentes
         FROM quiz_resultados
        WHERE usuario_id = ? AND quiz_id = ?`,
      [usuario_id, quiz_id]
    );

    console.log("📊 Finalizar stats:", tot);

    if (tot.total !== 10) {
      return res.status(400).json({
        ok: false,
        message: `Quiz inválido: esperado 10, encontrado ${tot.total}`,
      });
    }
    if (tot.pendentes > 0) {
      return res.status(400).json({
        ok: false,
        message: `Ainda faltam ${tot.pendentes} questões para responder`,
      });
    }

    const [[agg]] = await pool.execute(
      `SELECT SUM(correta = 1) AS acertos, SUM(correta = 0) AS erros
         FROM quiz_resultados
        WHERE usuario_id = ? AND quiz_id = ?`,
      [usuario_id, quiz_id]
    );

    console.log("✅ Finalizar resultado:", agg);

    return res.json({
      ok: true,
      quiz_id,
      total: tot.total,
      acertos: agg.acertos || 0,
      erros: agg.erros || 0,
    });
  } catch (err) {
    console.error("❌ Erro ao finalizar quiz:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ----------------------
// GET /quiz/:quiz_id/resumo
// ----------------------
async function resumo(req, res) {
  try {
    const usuario_id = req.user?.id || req.query.usuario_id;
    const { quiz_id } = req.params;

    const [itens] = await pool.execute(
      `SELECT qr.questao_id, qr.correta,
              q.enunciado, q.alternativa_correta AS letra_correta,
              alt.texto AS texto_correto
         FROM quiz_resultados qr
         JOIN questoes q ON q.id = qr.questao_id
    LEFT JOIN alternativas alt ON alt.questao_id = q.id AND alt.letra = q.alternativa_correta
        WHERE qr.quiz_id = ? AND qr.usuario_id = ?
     ORDER BY qr.id ASC`,
      [quiz_id, usuario_id]
    );

    return res.json({ ok: true, quiz_id, itens });
  } catch (err) {
    console.error("❌ Erro ao carregar resumo:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ----------------------
// GET /quiz/historico/:usuario_id
// ----------------------
async function historico(req, res) {
  try {
    const { usuario_id } = req.params;

    const [rows] = await pool.execute(
      `SELECT q.id AS quiz_id, m.nome AS materia,
              COUNT(qr.id) AS total,
              SUM(qr.correta = 1) AS acertos,
              SUM(qr.correta = 0) AS erros,
              MIN(qr.respondido_em) AS iniciado_em,
              MAX(qr.respondido_em) AS finalizado_em
         FROM quiz_resultados qr
         JOIN quizzes q ON q.id = qr.quiz_id
    LEFT JOIN materias m ON m.id = q.materia_id
        WHERE qr.usuario_id = ?
     GROUP BY q.id, m.nome
     ORDER BY iniciado_em DESC`,
      [usuario_id]
    );

    return res.json({ ok: true, quizzes: rows });
  } catch (err) {
    console.error("❌ Erro ao carregar histórico:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { criarSessao, responder, finalizar, resumo, historico };
