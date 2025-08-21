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

    if (!conteudo) throw new Error("Conteúdo não encontrado");

    // IA retorna questão em JSON
    const iaText = await gerarQuestoesComContexto({
      materia: conteudo.materia,
      topico: conteudo.topico,
      subtopico: conteudo.subtopico,
      conteudo,
      quantidade: 1,
      dificuldade,
    });

    let questoesJson;
    try {
      questoesJson = JSON.parse(iaText);
    } catch (err) {
      console.error("❌ Erro ao fazer parse do JSON da IA:", iaText);
      throw new Error("IA não retornou JSON válido");
    }

    const q = Array.isArray(questoesJson) ? questoesJson[0] : questoesJson;

    if (!q?.pergunta || !q?.alternativas || !q?.resposta_correta) {
      throw new Error("Questão gerada está incompleta");
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

    // Salvar alternativas (já vêm no JSON da IA)
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
    console.error("❌ Erro em questoesController.generateOne:", err);
    throw err;
  }
}

/**
 * Rota HTTP → gerar várias questões de uma vez
 */
async function generate(req, res) {
  try {
    const { conteudo_id, quantidade = 5, dificuldade = "medio" } = req.body;
    const questoes = [];

    for (let i = 0; i < quantidade; i++) {
      const q = await generateOne({ conteudo_id, dificuldade });
      questoes.push(q);
    }

    return ok(res, { questoes }, 201);
  } catch (err) {
    console.error("❌ Erro em questoesController.generate:", err);
    return error(res, "Erro ao gerar questões");
  }
}

module.exports = { generate, generateOne };
