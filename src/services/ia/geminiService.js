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
    return "⚠️ Falha de conexão com Gemini API.";
  }

  // Tratamento explícito para erros da API
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    console.error(`❌ Gemini erro ${resp.status}: ${txt}`);

    if (resp.status === 429) {
      return "⚠️ Limite diário de requisições à Gemini API foi atingido. Tente novamente amanhã ou configure uma chave paga.";
    }

    return `⚠️ Erro na Gemini API (status ${resp.status}).`;
  }

  let json;
  try {
    json = await resp.json();
  } catch (err) {
    console.error('❌ Erro ao parsear JSON da Gemini API:', err);
    return "⚠️ Resposta inválida da Gemini API.";
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
    return "⚠️ Gemini não retornou conteúdo.";
  }

  return text;
}

// ---------- Bloco pedagógico fixo ----------
const basePedagogica = `... (mantém igual ao seu)`;

// ---------- Conteúdo didático ----------
async function gerarConteudoHTML({ materia, topico, subtopico }) {
  const model = 'gemini-1.5-flash';
  const prompt = `Gere um resumo didático em HTML estruturado (com <h2>, <p>, <ul>, <li>) 
para auxiliar no estudo de ENEM, vestibulares e concursos.
Tema:
- Matéria: ${materia}
- Tópico: ${topico}
- Subtópico: ${subtopico}

${basePedagogica}`;

  const resposta = await geminiGenerate(model, [
    { role: 'user', parts: [{ text: prompt }] }
  ]);

  return typeof resposta === "string" ? resposta : String(resposta);
}

// ---------- Questões estilo ENEM ----------
async function gerarQuestoesComContexto({ materia, topico, subtopico, conteudo, quantidade = 5 }) {
  const model = "gemini-1.5-flash";
  const prompt = `Crie ${quantidade} questões de múltipla escolha no estilo ENEM
sobre:
- Matéria: ${materia}
- Tópico: ${topico}
- Subtópico: ${subtopico}

Baseando-se no seguinte conteúdo:
${conteudo}

${basePedagogica}`;

  const resposta = await geminiGenerate(model, [
    { role: "user", parts: [{ text: prompt }] }
  ]);

  return typeof resposta === "string" ? resposta : String(resposta);
}
const gerarQuestoes = gerarQuestoesComContexto;

// ---------- Assistente/chat ----------
async function chatAssistente({ contexto, mensagem }) {
  const model = "gemini-1.5-flash";
  const stripHTML = (html) =>
    (!html || typeof html !== "string")
      ? ""
      : html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  let prompt = `${basePedagogica}\n\nUsuário perguntou: ${mensagem}\n\n`;

  if (contexto && (contexto.conteudo || contexto.conteudo_id)) {
    const conteudoTexto = stripHTML(contexto.conteudo);
    console.log("📖 Conteúdo enviado ao Gemini (subtópico:", contexto.subtopico, "):");
    console.log(conteudoTexto.slice(0, 500) + (conteudoTexto.length > 500 ? "..." : ""));
    prompt += `Use também este conteúdo como referência:\n${conteudoTexto}\n\n`;
  } else {
    console.log("ℹ️ Nenhum conteúdo enviado ao Gemini (resposta geral).");
  }

  prompt += `Responda de forma didática e clara, como um tutor humano ajudando o aluno.`;

  console.log("📝 Prompt final enviado ao Gemini:", prompt.slice(0, 1000) + (prompt.length > 1000 ? "...": ""));

  const resposta = await geminiGenerate(model, [
    { role: "user", parts: [{ text: prompt }] }
  ]);

  return typeof resposta === "string"
    ? resposta
    : "⚠️ Não consegui elaborar uma explicação no momento.";
}

module.exports = {
  geminiGenerate,
  gerarConteudoHTML,
  gerarQuestoesComContexto,
  gerarQuestoes,
  chatAssistente,
};
