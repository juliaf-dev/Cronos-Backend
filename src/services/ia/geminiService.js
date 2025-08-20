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
// ---------- Conteúdo didático ----------
async function gerarConteudoHTML({ materia, topico, subtopico }) {
  const model = 'gemini-1.5-flash';
  const prompt = `
Você é um professor especialista no ENEM. 
Gere um conteúdo didático completo, claro e bonito, alinhado à BNCC e à Matriz do ENEM, incorporando princípios da TRI.
Use apenas HTML válido interno (sem <html>, <head> ou <body>).
⚠️ Não use <h1> nem coloque títulos extras automáticos.

📌 Diretrizes de estilo:
- Comece com uma introdução em <p>.
- Use subtítulos em <h2> e <h3> para dividir seções (teoria, exemplos, aplicações, dicas).
- Inclua listas (<ul>, <ol>) para exemplos, passos ou conceitos centrais.
- Use <blockquote> para curiosidades, citações ou conexões históricas.
- Termine com uma conclusão motivadora, conectando o aprendizado ao ENEM.

📌 BLOCO 1 — Teoria de Resposta ao Item (TRI)
- A TRI é usada no ENEM para calcular a proficiência.
- Parâmetros: D (dificuldade), A (discriminação), C (acerto casual).
- Erros em questões fáceis pesam muito; acertos só em difíceis não garantem alta nota.
- Classificação didática: Fácil (alta recorrência), Médio (interpretação), Difícil (abstração e interdisciplinaridade).
➡️ Explique o conteúdo de forma que dialogue com esse modelo, mostrando ao aluno a importância de dominar conceitos básicos antes de avançar.

📌 BLOCO 2 — Matriz de Referência ENEM (Ciências Humanas)
Competências e habilidades (H1–H28) devem orientar o conteúdo. 
Associe teoria e exemplos práticos a essas competências, reforçando como o subtopico (${subtopico}) aparece em provas.

📌 BLOCO 3 — Histórico de Questões (ENEM)
Use como inspiração de estilo e contextualização:
- História: Era Vargas (2022, médio), Revolução Francesa (2019, difícil).
- Geografia: Guerra Fria (2023, médio), Desmatamento Amazônico (2021, fácil).
- Filosofia: Contratualismo de Hobbes (2017, médio).
- Sociologia: Trabalho e Capitalismo em Marx (2016, médio).
➡️ Relacione o subtopico atual a esse tipo de abordagem contextualizada, sem inventar dados falsos.

📌 Contexto do aluno:
Matéria: ${materia}
Tópico: ${topico}
Subtópico: ${subtopico}

⚠️ IMPORTANTE:
- Responda em HTML organizado e limpo.
- Não adicione títulos principais (<h1>).
- Seja didático, claro e motivador.
- Não invente dados ou fatos fora do contexto fornecido.
- Não fale diretamente com o leitor, mantenha o tom impessoal.
`.trim();

  return geminiGenerate(model, [{ role: 'user', parts: [{ text: prompt }] }]);
}


// ---------- Questões estilo ENEM ----------
// ---------- Questões estilo ENEM adaptadas para flashcards ----------
async function gerarQuestoesComContexto({
  materia,
  topico,
  subtopico,
  conteudo,
  quantidade = 5,
  dificuldade = "medio",
}) {
  const model = "gemini-1.5-flash";

  const tituloBase =
    typeof conteudo === "object" && conteudo?.titulo ? conteudo.titulo : subtopico;
  const textoBase =
    typeof conteudo === "object"
      ? conteudo.texto || conteudo.texto_html || ""
      : String(conteudo || "");

  const prompt = `
Você é um elaborador de questões no estilo ENEM.
Crie exatamente ${quantidade} questões de múltipla escolha (A-E) com apenas UMA correta.
Nível médio de profissionalismo e fidelidade às diretrizes do ENEM.

📌 Diretrizes pedagógicas:
- Leve em conta a Teoria de Resposta ao Item (TRI):
  - Fáceis = alta recorrência, diretos.
  - Médios = interpretação e análise.
  - Difíceis = interdisciplinaridade/abstração.
- Use como referência a Matriz de Ciências Humanas (Competências 1–7, H1–H28).
- Inspire-se em questões históricas do ENEM (Vargas 2022, Revolução Francesa 2019, Guerra Fria 2023, etc.), mas não invente enunciados falsos.
- O foco deve ser ${materia} > ${topico} > ${subtopico}.
- Estilo claro, objetivo, contextualizado (como no ENEM).

📌 Contexto base:
Título: ${tituloBase}
Texto de apoio:
${textoBase}

📌 FORMATO EXATO DE SAÍDA (para flashcards):
Cada questão deve seguir rigorosamente o seguinte modelo:

Q) [Enunciado da questão contextualizado]
A) [alternativa A]
B) [alternativa B]
C) [alternativa C]
D) [alternativa D]
E) [alternativa E]
RESPOSTA CORRETA: [letra de A a E]
EXPLICAÇÃO: [justificativa pedagógica e breve, clara e didática]

⚠️ IMPORTANTE:
- Não use numeração nas questões (apenas "Q)").
- Não repita o enunciado na resposta.
- A explicação deve ajudar o aluno a entender por que a correta é certa e as outras não, como em um flashcard.
`.trim();

  return geminiGenerate(model, [{ role: "user", parts: [{ text: prompt }] }]);
}


const gerarQuestoes = gerarQuestoesComContexto;

// ---------- Assistente/chat ----------
// ---------- Assistente/chat ----------
async function chatAssistente({ contexto, mensagem }) {
  const model = "gemini-1.5-flash";

  // 🔹 Função para limpar HTML e deixar só o texto base
  const stripHTML = (html) => {
    if (!html || typeof html !== "string") return "";
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  };

  let prompt = `
Você é um Assistente Educacional moderno, especializado em ajudar estudantes do Ensino Médio a se prepararem para o ENEM.  
Sua resposta deve ser **clara, bem estruturada, fundamentada e motivadora**.  
Escreva em HTML indentado e organizado, mas sem <html>, <head> ou <body>.  

📌 Diretrizes de estilo:
- Use <p> para explicações e introduções.
- Use <ul> e <ol> para organizar pontos importantes.
- Use <blockquote> para insights, citações ou conexões históricas.
- Use <strong> ou <em> para destacar termos relevantes.
- Seja amigável, mas sempre com rigor acadêmico.
- Traga exemplos práticos sempre que possível.

📌 Estilo da resposta:
- Use apenas <p>, <strong>, <em>, <ul>, <ol>, <blockquote> e <br>.
- ❌ Nunca use <h1>, <h2> ou títulos grandes.
- Se precisar destacar seções, use <strong> dentro de <p>.
- Estruture em parágrafos curtos e organizados.
- Use listas para organizar informações complexas.
- Sempre conecte a resposta ao ENEM, mostrando como o tema pode aparecer na prova.
- Use exemplos reais de questões do ENEM para ilustrar conceitos.
- Nunca deixe a resposta em formato cru; use HTML indentado e bonito.

📌 Fundamentos pedagógicos:
- Considere a TRI (Teoria de Resposta ao Item): mostre a importância de dominar conteúdos fáceis antes de avançar.
- Relacione com a Matriz ENEM (competências e habilidades H1–H28).
- Inspire-se em exemplos de questões reais do ENEM (História – Era Vargas, Revolução Francesa; Geografia – Guerra Fria, Desmatamento; Filosofia – Hobbes; Sociologia – Marx).
- Sempre conecte a explicação ao ENEM, mostrando como o tema pode aparecer na prova.
`.trim();

  if (contexto && (contexto.conteudo || contexto.conteudo_id)) {
    const conteudoLimpo = stripHTML(contexto.conteudo);
    prompt += `
📖 Contexto atual do estudante:
O aluno está estudando: <em>${conteudoLimpo || "não especificado"}</em>.  
Use esse conteúdo como referência principal, adaptando sua resposta ao tema.  
`.trim();
  } else {
    prompt += `
📖 Contexto atual do estudante:
Não há conteúdo específico informado.  
Responda de forma geral, mas útil e direcionada para os estudos do ENEM.  
`.trim();
  }

  prompt += `
❓ Pergunta do estudante:
"${mensagem}"

📌 Instrução final:
- Responda de maneira **profunda, mas acessível**.
- Estruture a resposta em blocos bem organizados (introdução, explicação, exemplos, conclusão).
- Traga **dicas práticas de estudo** relacionadas ao ENEM.
- Nunca deixe a resposta em formato cru; use HTML indentado e bonito.
`.trim();

  const resposta = await geminiGenerate(model, [
    { role: "user", parts: [{ text: prompt }] }
  ]);

  return resposta || "Não consegui elaborar uma explicação no momento.";
}

module.exports = { chatAssistente };




module.exports = {
  geminiGenerate,
  gerarConteudoHTML,
  gerarQuestoesComContexto,
  gerarQuestoes,
  chatAssistente,
};
