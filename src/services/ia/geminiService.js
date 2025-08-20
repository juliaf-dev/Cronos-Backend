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

// ---------- Bloco pedagógico fixo (só como guia de estilo) ----------
const basePedagogica = `
📘 Diretrizes pedagógicas de bastidor (não repetir literalmente na resposta):
- Respeitar a lógica da TRI (fácil → médio → difícil).
- Seguir a Matriz do ENEM (H1–H28, interdisciplinaridade).
- Respeitar a BNCC (pensamento crítico, argumentação, cidadania).
- Usar estilo contextualizado como no ENEM (textos, gráficos, análise).
`;

// ---------- Conteúdo didático ----------
async function gerarConteudoHTML({ materia, topico, subtopico }) {
  const model = 'gemini-1.5-flash';
  const prompt = `
${basePedagogica}

Você é um professor especialista no ENEM.  
Explique de forma clara e organizada o subtópico **${subtopico}**, dentro da matéria ${materia} (${topico}).  

📌 Regras de estilo:
- Introduza o assunto diretamente em <p>.
- Use <h3> e <strong> em <p> para marcar seções (teoria, exemplos, aplicações).
- Use <ul>/<ol> para listas de conceitos.
- Use <blockquote> para curiosidades ou citações.
- Termine com uma conclusão motivadora, conectando o aprendizado ao ENEM.
- ❌ Não use <h1> nem <h2>.
- ❌ Não invente fatos que não estejam ligados ao tema.

Responda apenas com HTML interno.
`.trim();

  return geminiGenerate(model, [{ role: 'user', parts: [{ text: prompt }] }]);
}

// ---------- Questões estilo ENEM adaptadas para flashcards ----------
async function gerarQuestoesComContexto({
  materia,
  topico,
  subtopico,
  conteudo,
  quantidade = 5,
}) {
  const model = "gemini-1.5-flash";

  const tituloBase =
    typeof conteudo === "object" && conteudo?.titulo ? conteudo.titulo : subtopico;
  const textoBase =
    typeof conteudo === "object"
      ? conteudo.texto || conteudo.texto_html || ""
      : String(conteudo || "");

  const prompt = `
${basePedagogica}

Você é um elaborador de questões no estilo ENEM.  
Crie exatamente ${quantidade} questões de múltipla escolha (A–E) com apenas UMA correta.  

📌 Contexto:
- Matéria: ${materia}
- Tópico: ${topico}
- Subtópico: ${subtopico}
- Texto base: ${textoBase}

📌 FORMATO EXATO DE SAÍDA (para flashcards):
Q) [Enunciado]
A) [alternativa A]
B) [alternativa B]
C) [alternativa C]
D) [alternativa D]
E) [alternativa E]
RESPOSTA CORRETA: [letra]
EXPLICAÇÃO: [curta, didática]

⚠️ Importante:
- Não numere as questões, apenas "Q)".
- As alternativas devem ser plausíveis, mas apenas UMA correta.
- Explicação curta, para revisão em flashcards.
`.trim();

  return geminiGenerate(model, [{ role: "user", parts: [{ text: prompt }] }]);
}

const gerarQuestoes = gerarQuestoesComContexto;

// ---------- Assistente/chat ----------
async function chatAssistente({ contexto, mensagem }) {
  const model = "gemini-1.5-flash";

  // 🔹 Função para limpar HTML e manter apenas texto simples
  const stripHTML = (html) => {
    if (!html || typeof html !== "string") return "";
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  };

  let prompt = `
${basePedagogica}

Você é um Assistente Educacional que ajuda alunos do Ensino Médio a estudarem para o ENEM.  
Responda de forma clara, estruturada e motivadora.  
Escreva em HTML interno (<p>, <ul>, <ol>, <blockquote>, <strong>, <em>) sem <h1>/<h2>.
`.trim();

  if (contexto && (contexto.conteudo || contexto.conteudo_id)) {
    const conteudoTexto = stripHTML(contexto.conteudo);

    prompt += `

📖 O aluno está estudando o subtópico: "${contexto.subtopico || "não especificado"}".  

📌 Texto base:
"${conteudoTexto}"

➡️ Sua explicação deve começar introduzindo o tema do subtópico e depois responder à dúvida.
`.trim();
  } else {
    prompt += `

📖 Não há conteúdo específico informado.  
Responda de forma geral, mas sempre útil para o ENEM.
`.trim();
  }

  prompt += `

❓ Pergunta do estudante:
"${mensagem}"

📌 Estrutura da resposta:
- Introdução sobre o subtópico.
- Explicação clara e organizada.
- Exemplos práticos relacionados ao ENEM.
- Conclusão motivadora.  

⚠️ Lembre-se:
- ❌ Nunca use <h1> ou <h2>.
- ✅ Use <strong> dentro de <p> para marcar subtítulos curtos.
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
