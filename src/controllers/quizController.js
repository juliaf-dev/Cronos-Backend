// src/controllers/quizController.js
const pool = require("../config/db");
const { gerarQuestoesComContexto } = require("../services/ia/geminiService");

/* ----------------------
   Utils
----------------------- */

// Limpa resposta da Gemini (remove ```json ... ```)
function limparJsonGemini(raw) {
  if (!raw) return null;
  const match = raw.match(/```json([\s\S]*?)```/i) || raw.match(/```([\s\S]*?)```/i);
  return (match ? match[1] : raw).trim();
}

// Normaliza alternativas (aceita "A) ..." ou { A: "..." })
function normalizarAlternativas(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((alt, idx) => {
    if (typeof alt === "string") {
      const m = alt.match(/^\s*([A-Ea-e])[)\.\-–—:]?\s*(.*)$/);
      return {
        letra: m ? m[1].toUpperCase() : String.fromCharCode(65 + idx),
        texto: m ? m[2] : alt,
      };
    }
    if (alt && typeof alt === "object") {
      const key = Object.keys(alt)[0];
      return { letra: key.toUpperCase(), texto: alt[key] };
    }
    return { letra: String.fromCharCode(65 + idx), texto: String(alt) };
  });
}

// Carrega alternativas de várias questões
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

/* ----------------------
   POST /quiz/sessoes
----------------------- */
async function criarSessao(req, res) {
  try {
    const usuario_id = req.user?.id || req.body.usuario_id;
    let { conteudo_id, materia, topico, subtopico, conteudo } = req.body;

    if (!usuario_id) {
      return res.status(401).json({ ok: false, message: "Usuário não autenticado" });
    }
    if (!conteudo_id) {
      return res.status(400).json({ ok: false, message: "conteudo_id é obrigatório" });
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
      altMap = await carregarAlternativasMap(questoes.map(q => q.id));
    } else {
      // Buscar questões do banco
      let [questoesSelecionadas] = await pool.query(
        `SELECT q.id, q.enunciado, q.materia_id
           FROM questoes q
          WHERE q.conteudo_id = ?
       ORDER BY RAND()
          LIMIT 20`,
        [conteudo_id]
      );

      let altTemp = await carregarAlternativasMap(questoesSelecionadas.map(q => q.id));
      questoesSelecionadas = questoesSelecionadas.filter(
        q => altTemp.has(q.id) && altTemp.get(q.id).length === 5
      );

      // Se não houver 10, gerar via IA
      if (questoesSelecionadas.length < 10) {
        console.log("⚡ Gerando questões via Gemini...");

        // 🔹 Buscar conteúdo se não foi enviado no body
        if (!conteudo) {
          const [[rowConteudo]] = await pool.execute(
            `SELECT texto_html, texto FROM conteudos WHERE id = ? LIMIT 1`,
            [conteudo_id]
          );
          conteudo = rowConteudo?.texto_html || rowConteudo?.texto || null;
        }

        if (!conteudo) {
          return res.status(400).json({
            ok: false,
            message: "Não foi possível gerar questões: conteúdo não encontrado no banco.",
          });
        }

        const raw = await gerarQuestoesComContexto({ materia, topico, subtopico, conteudo });
        const cleaned = limparJsonGemini(raw);
        let novas;
        try {
          novas = JSON.parse(cleaned);
        } catch (err) {
          console.error("❌ JSON inválido da Gemini:", cleaned);
          return res.status(500).json({ ok: false, message: "Falha ao interpretar resposta da Gemini" });
        }

        for (const q of novas) {
          const [ins] = await pool.execute(
            `INSERT INTO questoes (conteudo_id, enunciado, alternativa_correta, explicacao)
             VALUES (?, ?, ?, ?)`,
            [conteudo_id, q.pergunta, q.resposta_correta, q.explicacao]
          );
          const questaoId = ins.insertId;

          const alternativas = normalizarAlternativas(q.alternativas);
          for (const alt of alternativas) {
            await pool.execute(
              `INSERT INTO alternativas (questao_id, letra, texto)
               VALUES (?, ?, ?)`,
              [questaoId, alt.letra, alt.texto]
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
        return res.status(400).json({ ok: false, message: "Não foi possível gerar quiz completo" });
      }

      questoes = questoesSelecionadas.slice(0, 10);
      altMap = await carregarAlternativasMap(questoes.map(q => q.id));
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

    // Criar registros de resultados
    for (const q of questoes) {
      await pool.execute(
        `INSERT IGNORE INTO quiz_resultados (usuario_id, quiz_id, questao_id, correta, respondido_em)
         VALUES (?, ?, ?, NULL, NULL)`,
        [usuario_id, quizId, q.id]
      );
    }

    // Montar retorno
    const questoesComAlternativas = await Promise.all(
      questoes.map(async q => {
        const [[row]] = await pool.execute(
          `SELECT enunciado, alternativa_correta, explicacao FROM questoes WHERE id = ? LIMIT 1`,
          [q.id]
        );
        return {
          id: q.id,
          enunciado: row?.enunciado || q.enunciado,
          materia_id: q.materia_id,
          alternativa_correta: row?.alternativa_correta,
          explicacao: row?.explicacao,
          alternativas: altMap.get(q.id) || [],
        };
      })
    );

    return res.json({ ok: true, quiz: { quiz_id: quizId, questoes: questoesComAlternativas } });
  } catch (err) {
    console.error("❌ Erro ao criar sessão de quiz:", err);
    return res.status(500).json({ ok: false, message: "Erro interno ao criar quiz", error: err.message });
  }
}

/* ----------------------
   POST /quiz/responder
----------------------- */
async function responder(req, res) {
  try {
    const usuario_id = req.user?.id || req.body.usuario_id;
    const { quiz_id, questao_id, alternativa_id } = req.body;

    if (!usuario_id || !quiz_id || !questao_id || !alternativa_id) {
      return res.status(400).json({ ok: false, message: "usuario_id, quiz_id, questao_id e alternativa_id são obrigatórios" });
    }

    const [vr] = await pool.execute(
      `SELECT id FROM quiz_resultados WHERE usuario_id = ? AND quiz_id = ? AND questao_id = ? LIMIT 1`,
      [usuario_id, quiz_id, questao_id]
    );
    if (vr.length === 0) {
      return res.status(400).json({ ok: false, message: "Questão não pertence a este quiz" });
    }

    const [[row]] = await pool.execute(
      `SELECT a.letra AS letra_escolhida, q.alternativa_correta AS letra_correta, q.explicacao
         FROM alternativas a
         JOIN questoes q ON q.id = a.questao_id
        WHERE a.id = ? AND q.id = ?`,
      [alternativa_id, questao_id]
    );
    if (!row) {
      return res.status(404).json({ ok: false, message: "Alternativa inválida" });
    }

    const correta = row.letra_escolhida.toUpperCase() === row.letra_correta.toUpperCase();

    await pool.execute(
      `UPDATE quiz_resultados
          SET correta = ?, respondido_em = NOW()
        WHERE usuario_id = ? AND quiz_id = ? AND questao_id = ?`,
      [correta ? 1 : 0, usuario_id, quiz_id, questao_id]
    );

    return res.json({
      ok: true,
      correta,
      message: correta ? "Resposta correta!" : "Resposta incorreta.",
      explicacao: row.explicacao || "Sem explicação disponível.",
      letra_correta: row.letra_correta,
    });
  } catch (err) {
    console.error("❌ Erro ao responder questão:", err);
    return res.status(500).json({ ok: false, message: "Erro interno ao responder", error: err.message });
  }
}

/* ----------------------
   POST /quiz/finalizar
----------------------- */
async function finalizar(req, res) {
  try {
    const usuario_id = req.user?.id || req.body.usuario_id;
    const { quiz_id } = req.body;

    if (!usuario_id || !quiz_id) {
      return res.status(400).json({ ok: false, message: "usuario_id e quiz_id são obrigatórios" });
    }

    const [[tot]] = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(respondido_em IS NULL) AS pendentes
         FROM quiz_resultados
        WHERE usuario_id = ? AND quiz_id = ?`,
      [usuario_id, quiz_id]
    );

    if (tot.total !== 10) {
      return res.status(400).json({ ok: false, message: `Quiz inválido: esperado 10, encontrado ${tot.total}` });
    }
    if (tot.pendentes > 0) {
      return res.status(400).json({ ok: false, message: `Ainda faltam ${tot.pendentes} questões para responder` });
    }

    const [[agg]] = await pool.execute(
      `SELECT SUM(correta = 1) AS acertos, SUM(correta = 0) AS erros
         FROM quiz_resultados
        WHERE usuario_id = ? AND quiz_id = ?`,
      [usuario_id, quiz_id]
    );

    return res.json({ ok: true, quiz_id, total: tot.total, acertos: agg.acertos || 0, erros: agg.erros || 0 });
  } catch (err) {
    console.error("❌ Erro ao finalizar quiz:", err);
    return res.status(500).json({ ok: false, message: "Erro interno ao finalizar quiz", error: err.message });
  }
}

/* ----------------------
   GET /quiz/:quiz_id/resumo
----------------------- */
async function resumo(req, res) {
  try {
    const usuario_id = req.user?.id || req.query.usuario_id;
    const { quiz_id } = req.params;

    if (!usuario_id) {
      return res.status(401).json({ ok: false, message: "Usuário não autenticado" });
    }

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
    return res.status(500).json({ ok: false, message: "Erro interno ao carregar resumo", error: err.message });
  }
}

/* ----------------------
   GET /quiz/historico/:usuario_id
----------------------- */
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
    return res.status(500).json({ ok: false, message: "Erro interno ao carregar histórico", error: err.message });
  }
}

module.exports = { criarSessao, responder, finalizar, resumo, historico };
