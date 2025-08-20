// src/controllers/assistenteController.js
const { ok } = require('../utils/http');
const IA = require('../services/ia/geminiService');
const Conteudos = require('../models/conteudos'); // ✅ importa o model Sequelize

async function chat(req, res) {
  try {
    const { contexto = null, mensagem } = req.body;
    let contextoFinal = contexto;

    // 🔹 Se vier um ID de conteúdo/subtópico, buscamos no banco para injetar o texto real
    if (contexto && (contexto.conteudo_id || contexto.subtopico_id)) {
      const conteudoBD = await Conteudos.findOne({
        where: {
          ...(contexto.conteudo_id
            ? { id: contexto.conteudo_id }
            : { subtopico_id: contexto.subtopico_id }),
        },
      });

      if (conteudoBD) {
        contextoFinal = {
          ...contexto,
          conteudo: conteudoBD.body,      // 🔹 pega o HTML real salvo no banco
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
