// src/services/ia/geminiService.js
const { GEMINI_API_KEY } = require('../../config/env');

// Fallback para fetch em ambientes Node que não tenham fetch global
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = (...args) =>
    import('node-fetch').then(({ default: f }) => f(...args));
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ---------- Função base ----------
async function geminiGenerate(model, contents) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY ausente no .env');
  }

  const url = `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;

  let resp;
  try {
    resp = await globalThis.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });
  } catch (err) {
    console.error('Erro de conexão com Gemini API:', err);
    throw new Error('Falha de conexão com Gemini API');
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    console.error(`Gemini erro ${resp.status}: ${txt}`);
    throw new Error(`Gemini erro ${resp.status}`);
  }

  let json;
  try {
    json = await resp.json();
  } catch (err) {
    console.error('Erro ao parsear JSON da Gemini API:', err);
    throw new Error('Resposta inválida da Gemini API');
  }

  // 🔹 Log da resposta bruta para debug
  console.log("Gemini JSON bruto:", JSON.stringify(json, null, 2));

  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join(' ')
      .trim() || '';

  if (!text) {
    console.warn('⚠️ Gemini retornou vazio', JSON.stringify(json, null, 2));
  }

  return text;
}

// ---------- Conteúdo didático ----------
async function gerarConteudoHTML({ materia, topico, subtopico }) {
  const model = 'gemini-1.5-flash';
  const prompt = `
Você é um professor. Gere um conteúdo didático alinhado à BNCC e à Matriz do ENEM, com dicas de TRI.
Estruture em HTML válido, mas sem tags <html>, apenas blocos internos.
Use a seguinte hierarquia:
<h1>${subtopico}</h1>
<p>Introdução</p>
<h2>Teoria</h2>
<h2>Exemplos</h2>
<h2>Dicas da TRI</h2>
Referencie: ${materia} > ${topico} > ${subtopico}.
`.trim();

  return geminiGenerate(model, [{ role: 'user', parts: [{ text: prompt }] }]);
}

// ---------- Questões estilo ENEM ----------
async function gerarQuestoesComContexto({
  materia,
  topico,
  subtopico,
  conteudo,
  quantidade = 5,
  dificuldade = 'medio',
}) {
  const model = 'gemini-1.5-flash';

  const tituloBase =
    typeof conteudo === 'object' && conteudo?.titulo ? conteudo.titulo : subtopico;
  const textoBase =
    typeof conteudo === 'object'
      ? (conteudo.texto || conteudo.texto_html || '')
      : String(conteudo || '');

  const prompt = `
Você é um elaborador de questões no estilo ENEM.
Crie exatamente ${quantidade} questões de múltipla escolha (A-E) com apenas UMA correta, dificuldade ${dificuldade}.
As questões DEVEM ser fiéis ao conteúdo fornecido (não invente fatos fora do texto base).

=== CONTEXTO PEDAGÓGICO ===
Matéria: ${materia}
Tópico: ${topico}
Subtópico: ${subtopico}

=== CONTEÚDO BASE ===
Título: ${tituloBase}
Texto:
${textoBase}

=== FORMATO EXATO DE SAÍDA ===
Cada questão deve seguir obrigatoriamente o padrão abaixo:

Q)
ENUNCIADO: [texto da questão]
A) [alternativa A]
B) [alternativa B]
C) [alternativa C]
D) [alternativa D]
E) [alternativa E]
GABARITO: [uma letra de A a E]
EXPLICAÇÃO: [justificativa da resposta correta]

⚠️ Não use numeração, não adicione comentários extras, não repita o enunciado no gabarito.
⚠️ Todas as questões devem começar com "Q)" em uma linha nova.
`.trim();

  return geminiGenerate(model, [{ role: 'user', parts: [{ text: prompt }] }]);
}

const gerarQuestoes = gerarQuestoesComContexto;

// ---------- Assistente/chat ----------
async function chatAssistente({ contexto, mensagem }) {
  const model = "gemini-1.5-flash";

  let prompt = `
Você é um assistente educacional especializado em ajudar estudantes do Ensino Médio para o ENEM. 
Seja próximo do usuário, humano, amigável e motivador. 
Responda sempre de forma clara, concisa e didática, usando exemplos quando possível.
`.trim();

  if (contexto && (contexto.conteudo || contexto.conteudo_id)) {
    prompt += `
O estudante está atualmente estudando o seguinte conteúdo: 
"${contexto.conteudo || "não especificado"}".
Use esse conteúdo como referência principal em sua resposta.
`.trim();
  } else {
    prompt += `
Não há um conteúdo específico fornecido. 
Responda de forma geral, mas sempre útil para os estudos do ENEM.
`.trim();
  }

  prompt += `
Pergunta do estudante: "${mensagem}"

Se a pergunta estiver relacionada ao conteúdo, adapte a resposta para reforçar o aprendizado. 
Se não houver relação direta, responda de forma geral, mas sempre com foco no estudo para o ENEM.
`.trim();

  const resposta = await geminiGenerate(model, [
    { role: "user", parts: [{ text: prompt }] }
  ]);

  return resposta || "Não consegui elaborar uma explicação no momento.";
}


module.exports = {
  geminiGenerate,
  gerarConteudoHTML,
  gerarQuestoesComContexto,
  gerarQuestoes,
  chatAssistente,
};
