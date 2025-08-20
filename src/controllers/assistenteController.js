// src/controllers/assistenteController.js
const { ok } = require('../utils/http');
const IA = require('../services/ia/geminiService');
const Conteudos = require('./conteudosController'); // ✅ usa o controller já existente

async function chat(req, res) {
  try {
    const { contexto = null, mensagem } = req.body;
    let contextoFinal = contexto;

    // 🔹 Se vier um ID de conteúdo/subtópico, buscamos no banco
    if (contexto && (contexto.conteudo_id || contexto.subtopico_id)) {
      const conteudoBD = await Conteudos.getConteudoByIdOrSubtopico({
        id: contexto.conteudo_id,
        subtopicoId: contexto.subtopico_id,
      });

      if (conteudoBD) {
        contextoFinal = {
          ...contexto,
          conteudo: conteudoBD.texto_html || conteudoBD.texto || conteudoBD.body, // 🔹 pega conteúdo real
          materia: conteudoBD.materia_nome,
          topico: conteudoBD.topico_nome,
          subtopico: conteudoBD.subtopico_nome,
        };

        // 🔹 LOG para debug: mostra o que realmente será enviado para a IA
        console.log("📚 Conteúdo enviado ao Assistente:", {
          materia: contextoFinal.materia,
          topico: contextoFinal.topico,
          subtopico: contextoFinal.subtopico,
          preview: (contextoFinal.conteudo || "").substring(0, 200) + "..." // mostra só os 200 primeiros caracteres
        });
      }
    } else {
      console.log("⚠️ Nenhum conteúdo específico encontrado, resposta será geral.");
    }

    const texto = await IA.chatAssistente({ contexto: contextoFinal, mensagem });
    return ok(res, { resposta: texto });
  } catch (err) {
    console.error("❌ Erro no chatAssistente:", err);
    return res.status(500).json({ message: "Erro interno no assistente" });
  }
}

module.exports = { chat };
