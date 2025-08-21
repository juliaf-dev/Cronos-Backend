// src/controllers/quizController.js
const pool = require("../config/db");
const { gerarQuestoesComContexto } = require("../services/ia/geminiService");

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
    altMap.get(a.questao_id).push({
      id: a.id,
      letra: (a.letra || "").toUpperCase(),
      texto: (a.texto || "").trim(),
    });
  }
  return altMap;
}

// ----------------------
// POST /quiz/sessoes
// ----------------------
async function criarSessao(req, res) {
  try {
    const usuario_id = req.user?.id || req.body.usuario_id;
    const { conteudo_id, materia, topico, subtopico, conteudo } = req.body;

    if (!usuario_id) {
      return res.status(401).json({
        ok: false,
        message: "Usuário não autenticado (usuario_id ausente).",
      });
    }
    if (!conteudo_id) {
      return res.status(400).json({
        ok: false,
        message: "conteudo_id é obrigatório",
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
      // Buscar questões existentes do banco
      let [questoesSelecionadas] = await pool.query(
        `SELECT q.id, q.enunciado, q.materia_id
           FROM questoes q
          WHERE q.conteudo_id = ?
       ORDER BY RAND()
          LIMIT 20`,
        [conteudo_id]
      );

      let altTemp = await carregarAlternativasMap(
        questoesSelecionadas.map((q) => q.id)
      );
      questoesSelecionadas = questoesSelecionadas.filter(
        (q) => altTemp.has(q.id) && altTemp.get(q.id).length === 5
      );

      // 👉 Se não tiver 10 questões, gerar via Gemini
      if (questoesSelecionadas.length < 10) {
        console.log("⚡ Gerando questões via Gemini...");
        const json = await gerarQuestoesComContexto({ materia, topico, subtopico, conteudo });
        let novas;
        try {
          novas = JSON.parse(json);
        } catch (err) {
          return res.status(500).json({
            ok: false,
            message: "Falha ao interpretar resposta da Gemini",
            error: err.message,
          });
        }

        for (const q of novas) {
          const [ins] = await pool.execute(
            `INSERT INTO questoes (conteudo_id, enunciado, alternativa_correta, explicacao)
             VALUES (?, ?, ?, ?)`,
            [conteudo_id, q.pergunta, q.resposta_correta, q.explicacao]
          );
          const questaoId = ins.insertId;

          for (const alt of q.alternativas) {
            const letra = alt[0];
            const texto = alt.substring(3).trim();
            await pool.execute(
              `INSERT INTO alternativas (questao_id, letra, texto)
               VALUES (?, ?, ?)`,
              [questaoId, letra, texto]
            );
          }

          questoesSelecionadas.push({
            id: questaoId,
            enunciado: q.pergunta,
            materia_id: questoesSelecionadas[0]?.materia_id || null,
          });
        }
      }

      if (questoesSelecionadas.length < 10) {
        return res.status(400).json({
          ok: false,
          message: "Não foi possível gerar quiz completo (mínimo 10 questões necessárias).",
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

    const questoesComAlternativas = await Promise.all(
      questoes.map(async (q) => {
        const [[row]] = await pool.execute(
          `SELECT enunciado, alternativa_correta, explicacao
             FROM questoes
            WHERE id = ?
            LIMIT 1`,
          [q.id]
        );

        return {
          id: q.id,
          enunciado: row?.enunciado || q.enunciado,
          materia_id: q.materia_id,
          alternativa_correta: row?.alternativa_correta,
          explicacao: row?.explicacao,
          alternativas: (altMap.get(q.id) || []),
        };
      })
    );

    return res.json({
      ok: true,
      quiz: { quiz_id: quizId, questoes: questoesComAlternativas },
    });
  } catch (err) {
    console.error("❌ Erro ao criar sessão de quiz:", err);
    return res.status(500).json({
      ok: false,
      message: "Erro interno ao criar quiz",
      error: err.message,
    });
  }
}
