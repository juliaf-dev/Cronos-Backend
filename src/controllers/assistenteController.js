const { ok } = require('../utils/http');
const IA = require('../services/ia/geminiService');
const pool = require('../config/db'); // 🔹 conexão direta com o banco

// Função utilitária: busca conteúdo pelo id ou subtopico_id
async function getConteudoByIdOrSubtopico({ id, subtopicoId }) {
  let query = "SELECT * FROM conteudos WHERE ";
  let values = [];

  if (id) {
    query += "id = ?";
    values.push(id);
  } else if (subtopicoId) {
    query += "subtopico_id = ?";
    values.push(subtopicoId);
  } else {
    return null;
  }

  const [rows] = await pool.query(query, values);
  return rows.length ? rows[0] : null;
}

async function chat(req, res) {
  try {
    const { contexto = null, mensagem } = req.body;
    let contextoFinal = contexto;

    // 🔹 Se vier um ID de conteúdo/subtópico, buscamos no banco
    if (contexto && (contexto.conteudo_id || contexto.subtopico_id)) {
      const conteudoBD = await getConteudoByIdOrSubtopico({
        id: contexto.conteudo_id,
        subtopicoId: contexto.subtopico_id,
      });

      if (conteudoBD) {
        contextoFinal = {
          ...contexto,
          conteudo: conteudoBD.body,          // 🔹 HTML real
          materia: conteudoBD.materia_nome,
          topico: conteudoBD.topico_nome,
          subtopico: conteudoBD.subtopico_nome,
        };
      }
    }

    const texto = await IA.chatAssistente({ contexto: contextoFinal, mensagem });
    return ok(res, { resposta: texto });
  } catch (err) {
    console.error("❌ Erro no chatAssistente:", err);
    return res.status(500).json({ message: "Erro interno no assistente" });
  }
}

module.exports = { chat };
