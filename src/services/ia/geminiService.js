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

// ---------- Bloco pedagógico fixo ----------
const basePedagogica = `
📘 Fundamentos pedagógicos fixos (não inventar fora disso):

TRI (Teoria de Resposta ao Item):
- Mede proficiência do aluno, não apenas acertos brutos.
- Parâmetros: Dificuldade (D), Discriminação (A), Acerto Casual (C).
- Errar questão fácil pesa mais do que acertar apenas questões difíceis.
- Estratégia: dominar questões fáceis e médias antes das difíceis.

Matriz ENEM (Ciências Humanas):
- H1 a H28: interpretação de textos, análise histórica, crítica social.
- Cobrança interdisciplinar (História + Geografia + Filosofia + Sociologia).
- Questões trazem textos, gráficos e imagens como suporte.

BNCC:
- Desenvolver competências gerais: pensamento crítico, argumentação, consciência histórica e cidadania.
- Conectar conteúdos a contextos atuais e à vida prática do estudante.

Exemplos de questões do ENEM:
- História: Era Vargas (2022, interpretação de fontes).
- História: Revolução Francesa (2019, contextualização histórica).
- Geografia: Guerra Fria (2023, blocos geopolíticos).
- Geografia: Desmatamento Amazônico (2021, impactos ambientais).
- Filosofia: Hobbes e Contratualismo (2017).
- Sociologia: Marx e Capitalismo (2016).
`;

// ---------- Conteúdo didático ----------
async function gerarConteudoHTML({ materia, topico, subtopico }) {
  const model = 'gemini-1.5-flash';
  const prompt = `
${basePedagogica}

Você é um professor especialista no ENEM. 
Gere um conteúdo didático completo, claro e bonito, alinhado à BNCC e à Matriz do ENEM.
Use apenas HTML válido interno (sem <html>, <head> ou <body>).
⚠️ Não use <h1> nem coloque títulos extras automáticos.

📌 Diretrizes de estilo:
- Comece com uma introdução em <p>.
- Use subtítulos em <h2> e <h3> para dividir seções (teoria, exemplos, aplicações, dicas).
- Inclua listas (<ul>, <ol>) para exemplos, passos ou conceitos centrais.
- Use <blockquote> para curiosidades, citações ou conexões históricas.
- Termine com uma conclusão motivadora, conectando o aprendizado ao ENEM.

📌 Contexto do aluno:
Matéria: ${materia}
Tópico: ${topico}
Subtópico: ${subtopico}

⚠️ IMPORTANTE:
- Responda em HTML organizado e limpo.
- Não invente dados ou fatos fora do contexto fornecido.
- Não fale diretamente com o leitor, mantenha o tom impessoal.
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
Crie exatamente ${quantidade} questões de múltipla escolha (A-E) com apenas UMA correta.

📌 Diretrizes pedagógicas:
- Use TRI (fácil, médio, difícil).
- Conecte-se às competências e habilidades da Matriz ENEM (H1–H28).
- Contextualize como no ENEM: textos, gráficos, documentos, análises.

📌 Contexto base:
Matéria: ${materia}
Tópico: ${topico}
Subtópico: ${subtopico}
Título: ${tituloBase}
Texto de apoio:
${textoBase}

📌 FORMATO EXATO DE SAÍDA (para flashcards):
Q) [Enunciado]
A) [alternativa A]
B) [alternativa B]
C) [alternativa C]
D) [alternativa D]
E) [alternativa E]
RESPOSTA CORRETA: [letra de A a E]
EXPLICAÇÃO: [justificativa pedagógica]

⚠️ IMPORTANTE:
- Não use numeração nas questões (apenas "Q)").
- Explicações devem ser curtas, didáticas e ajudar na fixação.
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

Você é um Assistente Educacional moderno, especializado em ajudar estudantes do Ensino Médio a se prepararem para o ENEM.  
Sua resposta deve ser **clara, bem estruturada, fundamentada e motivadora**.  
Escreva em HTML indentado e organizado, mas sem <html>, <head> ou <body>.  
`.trim();

  if (contexto && (contexto.conteudo || contexto.conteudo_id)) {
    const conteudoTexto = stripHTML(contexto.conteudo);

    prompt += `
📖 Contexto atual do estudante:
O aluno está estudando o subtópico: <em>${contexto.subtopico || "não especificado"}</em>.  

📌 Texto base para a resposta (conteúdo que o aluno está lendo):
"${conteudoTexto}"

➡️ Sua explicação deve **começar já introduzindo o tema do subtópico** e depois responder à pergunta.  
`.trim();
  } else {
    prompt += `
📖 Contexto atual do estudante:
Não há conteúdo específico informado.  
Responda de forma geral, mas útil e conectada ao ENEM.  
`.trim();
  }

  prompt += `
❓ Pergunta do estudante:
"${mensagem}"

📌 Instruções finais:
- Estruture em introdução (sobre o subtópico), explicação, exemplos e conclusão.  
- Use <p>, <ul>, <ol>, <blockquote>, <strong>, <em>.  
- ❌ Nunca use <h1>, <h2>.  
- Sempre conecte ao ENEM mostrando como esse conteúdo pode aparecer em prova.  
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
