// src/services/ia/geminiService.js
const { GEMINI_API_KEY } = require('../../config/env');

// Fallback para fetch em ambientes Node
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = (...args) =>
    import('node-fetch').then(({ default: f }) => f(...args));
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Contador local de requisições (zera quando o server reinicia)
let requestCount = 0;

// ---------- Função base ----------
async function geminiGenerate(model, contents) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY ausente no .env');
  }

  requestCount++;
  console.log(`📡 [Gemini] Chamada nº ${requestCount}`);

  const url = `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;

  let resp;
  try {
    console.log("🚀 Enviando requisição para Gemini API...");
    resp = await globalThis.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });
  } catch (err) {
    console.error('❌ Erro de conexão com Gemini API:', err);
    return { error: 'connection_error', message: 'Falha de conexão com Gemini API' };
  }

  // Tratamento explícito para erros da API
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    console.error(`❌ Gemini erro ${resp.status}: ${txt}`);

    if (resp.status === 429) {
      return {
        error: 'quota_exceeded',
        message: 'Limite diário de requisições à Gemini API foi atingido. Tente novamente amanhã ou configure uma chave paga.'
      };
    }

    return { error: 'gemini_error', message: `Gemini erro ${resp.status}` };
  }

  let json;
  try {
    json = await resp.json();
  } catch (err) {
    console.error('❌ Erro ao parsear JSON da Gemini API:', err);
    return { error: 'invalid_response', message: 'Resposta inválida da Gemini API' };
  }

  // 🔹 Log da resposta bruta para debug
  console.log("📩 Gemini JSON bruto:", JSON.stringify(json, null, 2));

  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join(' ')
      .trim() || '';

  if (!text) {
    console.warn('⚠️ Gemini retornou vazio', JSON.stringify(json, null, 2));
    return { error: 'empty_response', message: 'Gemini não retornou conteúdo' };
  }

  return text;
}

// ---------- Bloco pedagógico fixo ----------
const basePedagogica = `... (mantém igual ao seu)`;

// ---------- Conteúdo didático ----------
async function gerarConteudoHTML({ materia, topico, subtopico }) {
  const model = 'gemini-1.5-flash';
  const prompt = `... (mantém igual ao seu)`;
  return geminiGenerate(model, [{ role: 'user', parts: [{ text: prompt }] }]);
}

// ---------- Questões estilo ENEM ----------
async function gerarQuestoesComContexto({ materia, topico, subtopico, conteudo, quantidade = 5 }) {
  const model = "gemini-1.5-flash";
  const prompt = `... (mantém igual ao seu)`;
  return geminiGenerate(model, [{ role: "user", parts: [{ text: prompt }] }]);
}
const gerarQuestoes = gerarQuestoesComContexto;

// ---------- Assistente/chat ----------
async function chatAssistente({ contexto, mensagem }) {
  const model = "gemini-1.5-flash";
  const stripHTML = (html) => (!html || typeof html !== "string") ? "" : html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  let prompt = `... (mantém igual ao seu)`; // basePedagogica + instruções

  if (contexto && (contexto.conteudo || contexto.conteudo_id)) {
    const conteudoTexto = stripHTML(contexto.conteudo);
    console.log("📖 Conteúdo enviado ao Gemini (subtópico:", contexto.subtopico, "):");
    console.log(conteudoTexto.slice(0, 500) + (conteudoTexto.length > 500 ? "..." : ""));
    prompt += `...`; // trecho com contexto
  } else {
    console.log("ℹ️ Nenhum conteúdo enviado ao Gemini (resposta geral).");
    prompt += `...`; // resposta geral
  }

  prompt += `...`; // instruções finais
  console.log("📝 Prompt final enviado ao Gemini:", prompt.slice(0, 1000) + (prompt.length > 1000 ? "...": ""));

  const resposta = await geminiGenerate(model, [
    { role: "user", parts: [{ text: prompt }] }
  ]);

  if (typeof resposta === 'object' && resposta.error) {
    return `<p><strong>⚠️ ${resposta.message}</strong></p>`;
  }

  return resposta || "Não consegui elaborar uma explicação no momento.";
}

module.exports = {
  geminiGenerate,
  gerarConteudoHTML,
  gerarQuestoesComContexto,
  gerarQuestoes,
  chatAssistente,
};
