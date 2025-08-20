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
