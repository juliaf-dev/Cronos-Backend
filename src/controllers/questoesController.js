// src/controllers/questoesController.js
const pool = require("../config/db");
const { gerarQuestoesComContexto } = require("../services/ia/geminiService");
const { ok, error } = require("../utils/http");

/**
 * Função auxiliar: sanitizar e salvar 1 questão no banco
 */
async function salvarQuestao(conteudo, q) {
  if (!q?.pergunta || !q?.alternativas || !q?.resposta_correta) {
    console.error("❌ Questão gerada está incompleta:", q);
    return null;
  }

  // 🔹 Sanitizar enunciado (flashcard pronto para virar pergunta)
  let enunciado = String(q.pergunta)
    .replace(/^PERGUNTA[:\-]?\s*/i, "")
    .replace(/RESPOSTA\s+CORRETA.*/i, "")
    .replace(/EXPLICAÇÃO.*/i, "")
    .trim();

  if (!enunciado) {
    console.error("❌ Enunciado vazio após sanitização:", q);
    return null;
  }

  // 🔹 Normalizar resposta correta
  const resposta_correta = q.resposta_correta
    ? q.resposta_correta.trim().charAt(0).toUpperCase()
    : null;

  // 🔹 Sanitizar explicação
  let explicacao = q.explicacao
    ? String(q.explicacao).replace(/^EXPLICAÇÃO[:\-]?\s*/i, "").trim()
    : "";

  // Inserir questão
  const [r] = await pool.execute(
    `INSERT INTO questoes 
       (materia_id, topico_id, subtopico_id, conteudo_id, enunciado, alternativa_correta, explicacao) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      conteudo.materia_id,
      conteudo.topico_id,
      conteudo.subtopico_id,
      conteudo.id,
      enunciado,
      resposta_correta,
      explicacao,
    ]
  );
  const questaoId = r.insertId;

  // Inserir alternativas
  for (const alt of q.alternativas) {
    if (!alt) continue;

    const letra = alt.trim().charAt(0).toUpperCase();
    const texto = alt.replace(/^[A-E]\)\s*/i, "").trim();

    if (!texto) continue;

    await pool.execute(
      "INSERT INTO alternativas (questao_id, letra, texto) VALUES (?, ?, ?)",
      [questaoId, letra, texto]
    );
  }

  return {
    id: questaoId,
    enunciado,
    gabarito: resposta_correta,
    explicacao,
  };
}

/**
 * Rota HTTP → gerar exatamente 10 questões de uma vez
 */
async function generate(req, res) {
  try {
    const { conteudo_id } = req.body;

    // Buscar contexto do conteúdo
    const [[conteudo]] = await pool.execute(
      `SELECT c.id, c.titulo, c.texto, c.texto_html,
              m.id AS materia_id, m.nome AS materia,
              t.id AS topico_id, t.nome AS topico,
              s.id AS subtopico_id, s.nome AS subtopico
         FROM conteudos c
         JOIN materias m ON m.id = c.materia_id
         JOIN topicos t ON t.id = c.topico_id
         JOIN subtopicos s ON s.id = c.subtopico_id
        WHERE c.id = ?`,
      [conteudo_id]
    );

    if (!conteudo) return error(res, "Conteúdo não encontrado");

    // 🔹 Chamar IA apenas uma vez pedindo 10
    let iaText = await gerarQuestoesComContexto({
      materia: conteudo.materia,
      topico: conteudo.topico,
      subtopico: conteudo.subtopico,
      conteudo,
    });

    if (!iaText) return error(res, "IA não retornou questões");

    // 🔹 Limpar blocos de markdown
    iaText = iaText.trim().replace(/```json/g, "").replace(/```/g, "");

    // 🔹 Extrair o array JSON
    const match = iaText.match(/\[[\s\S]*\]/);
    if (!match) return error(res, "Resposta IA inesperada");

    let questoesJson;
    try {
      questoesJson = JSON.parse(match[0]);
    } catch (err) {
      console.error("❌ Erro parseando JSON IA:", err.message, iaText);
      return error(res, "Erro parseando JSON da IA");
    }

    // 🔹 Salvar todas as questões
    const questoes = [];
    for (const q of questoesJson) {
      const salva = await salvarQuestao(conteudo, q);
      if (salva) questoes.push(salva);
    }

    if (questoes.length < 10) {
      return error(
        res,
        `Não foi possível gerar 10 questões (foram salvas apenas ${questoes.length}).`
      );
    }

    return ok(res, { questoes }, 201);
  } catch (err) {
    console.error("❌ Erro em questoesController.generate:", err);
    return error(res, "Erro ao gerar questões");
  }
}

module.exports = { generate };
