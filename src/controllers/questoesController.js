// src/controllers/questoesController.js
const pool = require("../config/db"); // ✅ direto, sem getPool
const { gerarQuestoesComContexto } = require("../services/ia/geminiService");
const { ok, error } = require("../utils/http");

// ----------------------
// Função auxiliar (uso interno no backend)
// ----------------------
async function generateOne({ conteudo_id, dificuldade = "medio" }) {
  try {
    // Buscar contexto
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

    // IA gera apenas 1 questão
    const iaText = await gerarQuestoesComContexto({
      materia: conteudo.materia,
      topico: conteudo.topico,
      subtopico: conteudo.subtopico,
      conteudo,
      quantidade: 1,
      dificuldade,
    });

    const questaoRaw = iaText.split(/Q\)/).filter((q) => q.trim())[0];
    if (!questaoRaw) throw new Error("IA não retornou questão válida");

    const enunciado =
      (questaoRaw.match(/ENUNCIADO:\s*(.+?)(?=\n[A-E]\))/s) || [])[1]?.trim() || "";

    const alternativas = ["A", "B", "C", "D", "E"].map((letra) => {
      const regex = new RegExp(
        `${letra}\\)\\s*(.+?)(?=\\n[A-E]\\)|\\nGABARITO:|$)`,
        "s"
      );
      return {
        letra,
        texto: (questaoRaw.match(regex) || [])[1]?.trim() || "",
      };
    });

    const gabarito =
      (questaoRaw.match(/GABARITO:\s*([A-E])/) || [])[1] || "";
    const explicacao =
      (questaoRaw.match(/EXPLICAÇÃO:\s*(.+)/s) || [])[1]?.trim() || "";

    // Salvar no banco
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
        gabarito,
        explicacao,
      ]
    );
    const questaoId = r.insertId;

    for (const alt of alternativas) {
      if (alt.texto) {
        await pool.execute(
          "INSERT INTO alternativas (questao_id, letra, texto) VALUES (?, ?, ?)",
          [questaoId, alt.letra, alt.texto]
        );
      }
    }

    return {
      id: questaoId,
      enunciado,
      alternativas,
      gabarito,
      explicacao,
    };
  } catch (err) {
    console.error("❌ Erro em questoesController.generateOne:", err);
    throw err;
  }
}

// ----------------------
// Rota HTTP → gerar várias de uma vez
// ----------------------
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
