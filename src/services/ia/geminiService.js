// src/services/ia/geminiService.js
const env = require('../../config/env');

// Fallback para fetch em ambientes Node
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = (...args) =>
    import('node-fetch').then(({ default: f }) => f(...args));
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Junta todas as chaves que existem no env
const GEMINI_KEYS = [
  env.REACT_APP_GEMINI_API_KEY1,
  env.REACT_APP_GEMINI_API_KEY2,
  env.REACT_APP_GEMINI_API_KEY3,
  env.REACT_APP_GEMINI_API_KEY4,
].filter(Boolean);

if (GEMINI_KEYS.length === 0) {
  throw new Error('❌ Nenhuma chave Gemini encontrada no .env');
}

// Contadores locais
let requestCount = 0;
let currentKeyIndex = 0;

// ---------- Função base ----------
async function geminiGenerate(model, contents) {
  requestCount++;
  console.log(`📡 [Gemini] Chamada nº ${requestCount} (tentando chave #${currentKeyIndex + 1})`);

  // tenta todas as chaves em fallback
  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const keyIndex = (currentKeyIndex + i) % GEMINI_KEYS.length;
    const key = GEMINI_KEYS[keyIndex];

    const url = `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    try {
      console.log(`🚀 Enviando requisição com chave #${keyIndex + 1}...`);
      const resp = await globalThis.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        console.error(`❌ Gemini erro ${resp.status} com chave #${keyIndex + 1}: ${txt}`);

        // se foi 429 (limite), tenta próxima chave
        if (resp.status === 429) {
          console.warn(`⚠️ Chave #${keyIndex + 1} atingiu limite → tentando próxima...`);
          continue;
        }

        return `⚠️ Erro na Gemini API (status ${resp.status}).`;
      }

      const json = await resp.json();
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

      // se funcionou → atualiza currentKeyIndex para próxima chamada
      currentKeyIndex = keyIndex;
      return text;

    } catch (err) {
      console.error(`❌ Erro de conexão com chave #${keyIndex + 1}:`, err);
      continue; // tenta próxima chave
    }
  }

  return "⚠️ Todas as chaves da Gemini API falharam (limite ou erro de conexão).";
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
(Competência 1 a 7 + H1 a H28 — já detalhadas)

---

📌 BLOCO 3 — Histórico de Questões (amostra organizada)

📖 História
- 2015 | Amarela | Q36 | Brasil Colônia → Escravidão
  Competência: 4 (Identificar registros históricos) | Dificuldade: Fácil
- 2016 | Amarela | Q42 | Idade Média → Feudalismo
  Competência: 4 (Relacionar acontecimentos históricos) | Dificuldade: Médio
- 2017 | Amarela | Q40 | Idade Moderna → Reforma Protestante
  Competência: 4 (Avaliar transformações sociais) | Dificuldade: Médio
- 2018 | Azul | Q43 | Brasil → Independência (1822)
  Competência: 3 (Cidadania como construção histórica) | Dificuldade: Médio
- 2019 | Amarela | Q38 | Idade Moderna → Revolução Francesa
  Competência: 4 (Avaliar papel das revoluções) | Dificuldade: Difícil
- 2020 | Azul | Q41 | Brasil República → Ditadura Militar
  Competência: 7 (Cidadania) | Dificuldade: Difícil
- 2022 | Azul | Q45 | Brasil República → Era Vargas
  Competência: 4 (Relacionar acontecimentos históricos) | Dificuldade: Médio

🌍 Geografia
- 2015 | Amarela | Q31 | Clima do Brasil
  Competência: 2 (Interações homem-natureza) | Dificuldade: Fácil
- 2016 | Azul | Q29 | Urbanização → Metrópoles
  Competência: 2 (Representações espaciais) | Dificuldade: Médio
- 2017 | Azul | Q34 | Geopolítica → Guerra Fria
  Competência: 2 (Tecnologia e espaço) | Dificuldade: Médio
- 2018 | Amarela | Q28 | Meio Ambiente → Recursos Hídricos
  Competência: 6 (Impactos socioambientais) | Dificuldade: Fácil
- 2019 | Azul | Q30 | Globalização → Blocos Econômicos
  Competência: 5 (Política e economia) | Dificuldade: Médio
- 2021 | Azul | Q32 | Meio Ambiente → Desmatamento Amazônico
  Competência: 6 (Impactos socioambientais) | Dificuldade: Fácil
- 2023 | Azul | Q28 | Geopolítica → Oriente Médio
  Competência: 2 (Transformações no espaço) | Dificuldade: Difícil

📖 Filosofia
- 2015 | Amarela | Q47 | Aristóteles (Ética)
  Competência: 5 (Política e sociedade) | Dificuldade: Médio
- 2016 | Amarela | Q44 | Descartes (Racionalismo)
  Competência: 5 (Epistemologia) | Dificuldade: Médio
- 2017 | Amarela | Q42 | Hobbes (Contratualismo)
  Competência: 5 (Política e sociedade) | Dificuldade: Médio
- 2019 | Azul | Q46 | Kant (Iluminismo)
  Competência: 5 (Propostas de intervenção) | Dificuldade: Difícil
- 2020 | Azul | Q47 | Nietzsche (Contemporânea)
  Competência: 5 (Cultura e sociedade) | Dificuldade: Difícil

👥 Sociologia
- 2015 | Amarela | Q50 | Trabalho e Industrialização
  Competência: 3 (Conflitos sociais) | Dificuldade: Médio
- 2016 | Amarela | Q40 | Marx → Capitalismo
  Competência: 3 (Cidadania como construção histórica) | Dificuldade: Médio
- 2017 | Azul | Q49 | Movimentos Sociais → Feminismo
  Competência: 7 (Conquistas e lutas sociais) | Dificuldade: Fácil
- 2018 | Azul | Q50 | Desigualdade Social → Renda e Pobreza
  Competência: 7 (Reconhecer desigualdades) | Dificuldade: Médio
- 2019 | Azul | Q48 | Globalização → Sociedade de Consumo
  Competência: 7 (Participação social) | Dificuldade: Médio
- 2020 | Amarela | Q49 | Cidadania → Direitos Humanos
  Competência: 7 (Manifestações de cidadania) | Dificuldade: Fácil
- 2022 | Azul | Q47 | Movimentos Sociais → Questão Indígena
  Competência: 7 (Conquistas e lutas sociais) | Dificuldade: Difícil

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
1. Analisar processos históricos e geográficos.
2. Valorizar diversidade cultural, direitos humanos e democracia.
3. Debater problemas contemporâneos de forma crítica.
4. Interpretar e produzir discursos a partir de diferentes fontes.
5. Propor soluções coletivas para questões sociais, ambientais e éticas.
6. Reconhecer identidades, culturas e diferentes visões de mundo.
`;



// ---------- Conteúdo didático ----------
async function gerarConteudoHTML({ materia, topico, subtopico }) {
  const model = "gemini-1.5-flash";

  const prompt = `Gere um resumo didático NUNCA usando titulo inicial, em HTML estruturado (com <h2>, <p>, <ul>, <li>) 
para auxiliar no estudo de ENEM, vestibulares e concursos.

Tema:
- Matéria: ${materia}
- Tópico: ${topico}
- Subtópico: ${subtopico}

Use a base pedagógica abaixo apenas como referência conceitual (NÃO inclua diretamente no texto final do aluno):
${basePedagogica}.
Seja detalhista no conteudo, minimo de 1000 palavras no total.

⚠️ Regras obrigatórias:
- O conteúdo deve ser didático, claro e conciso.
- Estruture o texto com subtítulos (<h2>, <h3> se necessário), parágrafos e listas.
- ❌ Nunca coloque título geral no texto (nem <h1>, nem o subtópico como título inicial).
- ✅ O texto deve começar direto com <h2> ou <p>, mas sem título geral.
- Faça o texto didático direto, sem introdução ou título geral.
`;

  const resposta = await geminiGenerate(model, [
    { role: "user", parts: [{ text: prompt }] }
  ]);

  let conteudo = typeof resposta === "string" ? resposta : String(resposta);

  // 🔹 Sanitização: remove blocos markdown, títulos indesejados e espaços extras
  conteudo = conteudo
    .replace(/```html|```/gi, "")           // remove delimitadores markdown
    .replace(/<h1[^>]*>.*?<\/h1>/gi, "")   // remove qualquer <h1>
    .replace(/^\s*<h2[^>]*>.*?<\/h2>/i, "") // remove <h2> inicial, se for o primeiro elemento
    .trim();

  return conteudo;
}



const gerarQuestoes = gerarQuestoesComContexto;

// ---------- Questões estilo ENEM (formato flashcard) ----------
async function gerarQuestoesComContexto({ materia, topico, subtopico, conteudo }) {
  const model = "gemini-1.5-flash";

  const stripHTML = (html) =>
    (!html || typeof html !== "string")
      ? ""
      : html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const conteudoBase = stripHTML(conteudo);

  const prompt = `Crie exatamente 10 questões no estilo ENEM para uso em FLASHCARDS.  
Cada questão deve ser independente (o enunciado deve se sustentar sozinho, sem depender das alternativas).  

⚠️ Regras obrigatórias:
- As alternativas devem SEMPRE estar em ordem alfabética: A), B), C), D), E).
- A alternativa correta deve variar entre as questões de forma aleatória (distribuir entre A–E).
- Evite ao máximo repetir a mesma letra como correta em sequência.
- O JSON deve ser válido, parseável e utilizável diretamente no backend.
- Nunca inclua a resposta dentro do enunciado.
- O enunciado deve ser curto, objetivo e em formato de flashcard, ideal para pergunta/resposta rápida.
- A explicação deve ser clara, curta e didática.

Formato esperado:
[
  {
    "pergunta": "Enunciado da questão (flashcard)",
    "alternativas": [
      "A) ...",
      "B) ...",
      "C) ...",
      "D) ...",
      "E) ..."
    ],
    "resposta_correta": "C",
    "explicacao": "Explicação curta e didática"
  }
]

📖 Texto de referência (conteúdo-base do flashcard):
"${conteudoBase}"

Base pedagógica (NÃO incluir literalmente no texto, apenas como guia):
${basePedagogica}`;

  const resposta = await geminiGenerate(model, [
    { role: "user", parts: [{ text: prompt }] }
  ]);

  return typeof resposta === "string" ? resposta : String(resposta);
}


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



