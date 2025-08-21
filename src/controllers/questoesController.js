// src/controllers/questoesController.js
const pool = require("../config/db");
const { gerarQuestoesComContexto } = require("../services/ia/geminiService");
const { ok, error } = require("../utils/http");

/**
 * Função auxiliar: gera e salva uma questão no banco
 */
async function generateOne({ conteudo_id, dificuldade = "medio" }) {
  try {
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

    if (!conteudo) {
      console.error("❌ Conteúdo não encontrado:", conteudo_id);
      return null;
    }

    // IA retorna questão em JSON (pode vir com ```json ... ``` delimiters)
    let iaText;
    try {
      iaText = await gerarQuestoesComContexto({
        materia: conteudo.materia,
        topico: conteudo.topico,
        subtopico: conteudo.subtopico,
        conteudo,
        quantidade: 1,
        dificuldade,
      });
    } catch (err) {
      console.error("⚠️ Falha na chamada da IA:", err.message);
      return null;
    }

    if (!iaText) {
      console.error("⚠️ IA não retornou resposta");
      return null;
    }

    // Limpar blocos de markdown
    iaText = iaText.trim().replace(/```json/g, "").replace(/```/g, "").trim();

    // Pegar apenas o primeiro array JSON válido
    const match = iaText.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error("❌ Resposta IA inesperada:", iaText);
      return null;
    }

    let questoesJson;
    try {
      questoesJson = JSON.parse(match[0]);
    } catch (err) {
      console.error("❌ Erro ao fazer parse do JSON da IA:", iaText);
      return null;
    }

    const q = Array.isArray(questoesJson) ? questoesJson[0] : questoesJson;

    if (!q?.pergunta || !q?.alternativas || !q?.resposta_correta) {
      console.error("❌ Questão gerada está incompleta:", q);
      return null;
    }

    // Salvar questão no banco
    const [r] = await pool.execute(
      `INSERT INTO questoes 
         (materia_id, topico_id, subtopico_id, conteudo_id, enunciado, alternativa_correta, explicacao) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        conteudo.materia_id,
        conteudo.topico_id,
        conteudo.subtopico_id,
        conteudo.id,
        q.pergunta,
        q.resposta_correta,
        q.explicacao || "",
      ]
    );
    const questaoId = r.insertId;

    // Salvar alternativas
    for (const alt of q.alternativas) {
      if (!alt) continue;
      const letra = alt.trim().charAt(0).toUpperCase(); // "A", "B", ...
      const texto = alt.replace(/^[A-E]\)\s*/, "").trim(); // remove "A) "
      await pool.execute(
        "INSERT INTO alternativas (questao_id, letra, texto) VALUES (?, ?, ?)",
        [questaoId, letra, texto]
      );
    }

    return {
      id: questaoId,
      enunciado: q.pergunta,
      alternativas: q.alternativas,
      gabarito: q.resposta_correta,
      explicacao: q.explicacao,
    };
  } catch (err) {
    console.error("❌ Erro inesperado em questoesController.generateOne:", err);
    return null; // garante fallback em qualquer erro
  }
}

/**
 * Rota HTTP → gerar exatamente 10 questões
 */
async function generate(req, res) {
  try {
    const { conteudo_id, dificuldade = "medio" } = req.body;
    const questoes = [];

    // Sempre tentar gerar 10
    for (let i = 0; i < 10; i++) {
      const q = await generateOne({ conteudo_id, dificuldade });
      if (!q) break;
      questoes.push(q);
    }

    if (questoes.length < 10) {
      return error(
        res,
        `Não foi possível gerar 10 questões (geradas apenas ${questoes.length}).`
      );
    }

    return ok(res, { questoes }, 201);
  } catch (err) {
    console.error("❌ Erro em questoesController.generate:", err);
    return error(res, "Erro ao gerar questões");
  }
}

module.exports = { generate, generateOne };

