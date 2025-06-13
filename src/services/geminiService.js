import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

if (!API_KEY) {
  throw new Error("A chave da API Gemini não está definida. Verifique o arquivo .env.");
}

export const gerarConteudoMateria = async (materia, topico) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Gere um conteúdo educacional detalhado sobre ${topico} da matéria de ${materia}. 
    O conteúdo deve ser estruturado em tópicos principais, com explicações claras e exemplos quando relevante. De enfaze em como pode cair no enem. 
    estilize o texto em html mas não deixe o leitor perceber sobre a estilização, mantenha a tematica de cores terrosas, não use titulo h1 . 
    Formate o texto com tags <p> para parágrafos e <ul>/<li> para listas. Nao comente sobre o uso do html.
    Nao faça questoes
     `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro ao gerar conteúdo:", error);
    return "Desculpe, houve um erro ao gerar o conteúdo. Por favor, tente novamente mais tarde.";
  }
};

export const gerarQuestoesQuiz = async (materia, topico) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Gere 10 questões de múltipla escolha sobre ${topico} na matéria de ${materia}.
    Cada questão deve ter:
    - Uma pergunta clara e objetiva que possa vir a virar um flashcard
    - 4 alternativas (A, B, C, D)
    - A resposta correta indicada pelo índice (0 a 3)
    - Uma explicação detalhada da resposta
    
    Formate a resposta como um array JSON onde cada objeto tem:
    {
      "pergunta": "texto da pergunta",
      "opcoes": ["opção 1", "opção 2", "opção 3", "opção 4"],
      "respostaCorreta": índice da opção correta (0-3),
      "explicacao": "explicação detalhada"
    }

    Inclua questões que podem cair no ENEM e sejam relevantes para o tema.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extrai o JSON da resposta (o Gemini pode adicionar texto antes/depois)
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']') + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Erro ao gerar questões:", error);
    throw new Error("Não foi possível gerar as questões. Por favor, tente novamente.");
  }
};

export const gerarRespostaIA = async (pergunta, materia = null, topico = null) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = `Você é um assistente educacional especializado em ajudar estudantes. seja proximo do usuario de forma humana, `
    if (materia && topico) {
      prompt += `O usuário está atualmente estudando: sobre ${topico} na matéria de ${materia}. 
      Responda considerando o conteudo que está sendo estudado`;
    }
    prompt += `Responda de forma clara, concisa e didática a seguinte pergunta: "${pergunta}".\n\n `;
    prompt += `Se a pergunta for relacionada ao contexto atual, adapte sua resposta para reforçar o conteúdo. `;
   
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro ao gerar resposta:", error);
    throw error;
  }
};