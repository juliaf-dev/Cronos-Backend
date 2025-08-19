const { ok } = require('../utils/http');
const IA = require('../services/ia/geminiService');

async function chat(req, res) {
  const { contexto = null, mensagem } = req.body;
  const texto = await IA.chatAssistente({ contexto, mensagem });
  return ok(res, { resposta: texto });
}

module.exports = { chat };
