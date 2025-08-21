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
const basePedagogica = `
📘 Fundamentos pedagógicos fixos (não inventar fora disso)

📌 BLOCO 1 — Teoria de Resposta ao Item (TRI)
A TRI (Teoria de Resposta ao Item) é o modelo estatístico usado pelo ENEM para calcular a proficiência do estudante.

Como funciona:
- Cada questão é calibrada com 3 parâmetros:
  • D (Dificuldade) → o quão difícil o item é.
  • A (Discriminação) → o quanto o item diferencia alunos de baixa e alta proficiência.
  • C (Acerto casual) → probabilidade de acerto por chute.
- O aluno não ganha a mesma pontuação em todas as questões.
- Acertos em questões fáceis têm muito peso na nota → se o aluno acerta difíceis mas erra fáceis, o modelo considera inconsistência.
- Erros em fáceis reduzem muito a nota, mesmo com acertos em difíceis.

Classificação de dificuldade (estimativa didática):
- Fácil → conteúdos de alta recorrência, diretos, contextualizados.
- Médio → exigem análise, interpretação de gráficos ou documentos.
- Difícil → interdisciplinaridade, abstração, contexto histórico mais complexo.

---

📌 BLOCO 2 — Matriz de Referência ENEM (Ciências Humanas)
Competência 1 – Compreender os elementos culturais que constituem as identidades.
  H1: Interpretar historicamente e/ou geograficamente fontes documentais.
  H2: Analisar a produção da memória pelas sociedades humanas.
  H3: Associar manifestações culturais ao seu contexto histórico e geográfico.
  H4: Comparar pontos de vista sobre identidades sociais e culturais.

Competência 2 – Compreender as transformações dos espaços geográficos.
  H5: Analisar interações homem-natureza.
  H6: Interpretar diferentes representações espaciais.
  H7: Identificar os processos de ocupação dos espaços.
  H8: Relacionar usos de tecnologias ao espaço geográfico.

Competência 3 – Entender a produção das relações sociais e culturais.
  H9: Compreender a cidadania como construção histórica.
  H10: Identificar formas de organização social.
  H11: Analisar conflitos sociais em diferentes épocas.
  H12: Relacionar organização política ao espaço.

Competência 4 – Compreender os processos históricos.
  H13: Identificar registros históricos em diferentes fontes.
  H14: Reconhecer diferentes formas de poder e dominação.
  H15: Relacionar acontecimentos históricos e suas consequências.
  H16: Avaliar o papel das revoluções, guerras e transformações sociais.

Competência 5 – Utilizar conceitos das ciências humanas para compreender a realidade.
  H17: Analisar representações gráficas e cartográficas.
  H18: Interpretar índices estatísticos.
  H19: Relacionar conceitos de política, economia, cultura e sociedade.
  H20: Avaliar propostas de intervenção na realidade.

Competência 6 – Compreender a relação entre produção e espaço.
  H21: Identificar formas de organização do trabalho.
  H22: Analisar transformações nos sistemas produtivos.
  H23: Relacionar processos sociais e econômicos às tecnologias.
  H24: Compreender impactos socioambientais da produção.

Competência 7 – Entender a cidadania e os direitos humanos.
  H25: Identificar manifestações de cidadania.
  H26: Analisar conquistas e lutas sociais.
  H27: Reconhecer desigualdades sociais.
  H28: Avaliar ações de participação social.

---

📌 BLOCO 3 — Histórico de Questões (amostra organizada)

📖 História
- 2022 | Azul | Q45 | Tema: Brasil República → Era Vargas
  Competência: 4 (Relacionar acontecimentos históricos e suas consequências)
  Nível TRI: Médio
  Texto-base: Excerto de discurso de Vargas sobre a CLT.

- 2019 | Amarela | Q38 | Tema: Idade Moderna → Revolução Francesa
  Competência: 4 (Avaliar papel das revoluções)
  Nível TRI: Difícil
  Texto-base: Trecho da Declaração dos Direitos do Homem e do Cidadão.

🌍 Geografia
- 2023 | Azul | Q28 | Tema: Geopolítica → Guerra Fria
  Competência: 2 (Analisar transformações no espaço geográfico)
  Nível TRI: Médio
  Texto-base: Mapa da divisão do mundo em blocos.

- 2021 | Azul | Q32 | Tema: Meio Ambiente → Desmatamento Amazônico
  Competência: 6 (Compreender impactos socioambientais)
  Nível TRI: Fácil
  Texto-base: Gráfico de taxa de desmatamento.

📖 Filosofia
- 2017 | Amarela | Q42 | Tema: Filosofia Moderna → Contratualismo (Hobbes)
  Competência: 5 (Relacionar conceitos de política e sociedade)
  Nível TRI: Médio
  Texto-base: Trecho do Leviatã.

👥 Sociologia
- 2016 | Amarela | Q40 | Tema: Trabalho e Capitalismo (Marx)
  Competência: 3 (Analisar conflitos sociais)
  Nível TRI: Médio
  Texto-base: Excerto sobre alienação do trabalho.

---

📌 BLOCO 4 — BNCC (Ciências Humanas e Gerais)

Competências Gerais da Educação Básica:
- Pensamento crítico e científico.
- Argumentação com base em fatos.
- Consciência histórica e cultural.
- Empatia e respeito à diversidade.
- Responsabilidade socioambiental.
- Exercício pleno da cidadania.

Competências Específicas de Ciências Humanas (Ensino Médio):
1. Analisar processos históricos e geográficos para compreender transformações sociais, políticas e culturais.
2. Valorizar a diversidade cultural, os direitos humanos e a democracia.
3. Debater problemas contemporâneos de forma fundamentada e crítica.
4. Interpretar e produzir discursos a partir de diferentes fontes (mapas, textos, gráficos, obras de arte).
5. Propor soluções e ações coletivas diante de questões sociais, ambientais e éticas.
6. Reconhecer identidades, culturas e diferentes visões de mundo, respeitando a diversidade.

---
`;


// ---------- Conteúdo didático ----------
async function gerarConteudoHTML({ materia, topico, subtopico }) {
  const model = 'gemini-1.5-flash';
  const prompt = `Gere um resumo didático em HTML estruturado (com <h2>, <p>, <ul>, <li>) 
para auxiliar no estudo de ENEM, vestibulares e concursos.

Tema:
- Matéria: ${materia}
- Tópico: ${topico}
- Subtópico: ${subtopico}

Use a base pedagógica abaixo apenas como referência conceitual (NÃO inclua diretamente no texto final do aluno):
${basePedagogica}`;

  const resposta = await geminiGenerate(model, [
    { role: 'user', parts: [{ text: prompt }] }
  ]);

  return typeof resposta === "string" ? resposta : String(resposta);
}

// ---------- Questões estilo ENEM (formato flashcard) ----------
async function gerarQuestoesComContexto({ materia, topico, subtopico, conteudo, quantidade = 5 }) {
  const model = "gemini-1.5-flash";

  const stripHTML = (html) =>
    (!html || typeof html !== "string")
      ? ""
      : html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const conteudoBase = stripHTML(conteudo);

  const prompt = `Crie ${quantidade} questões de múltipla escolha no estilo ENEM,
no formato JSON de flashcards.  

⚠️ Regras obrigatórias:
- Alternativas devem sempre estar em ordem alfabética (A até E).
- A alternativa com a resposta correta deve variar entre as questões .
- O JSON deve ser válido e utilizável diretamente.

Formato esperado:
[
  {
    "pergunta": "Enunciado da questão",
    "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
    "resposta_correta": "A",
    "explicacao": "Explicação curta e didática"
  }
]

📖 Texto de referência:
"${conteudoBase}"

Use a base pedagógica abaixo apenas como referência conceitual (NÃO inclua diretamente no texto final do aluno):
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

  let prompt = `O estudante fez a seguinte pergunta: "${mensagem}"

Use a base pedagógica abaixo apenas como referência conceitual (NÃO inclua diretamente no texto final do aluno):
${basePedagogica}
`;

  if (contexto && (contexto.conteudo || contexto.conteudo_id)) {
    const conteudoTexto = stripHTML(contexto.conteudo);
    console.log("📖 Conteúdo enviado ao Gemini (subtópico:", contexto.subtopico, "):");
    console.log(conteudoTexto.slice(0, 500) + (conteudoTexto.length > 500 ? "..." : ""));
    prompt += `📖 O estudante está estudando o subtópico "${contexto.subtopico}".
Use também este conteúdo como referência:
"${conteudoTexto}"\n\n`;
  } else {
    console.log("ℹ️ Nenhum conteúdo enviado ao Gemini (resposta geral).");
  }

  prompt += `Responda de forma didática, estruturada em HTML (<p>, <ul>, <blockquote>), conectando o tema ao ENEM.`;

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
