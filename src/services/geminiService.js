import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("A chave da API Gemini não está definida. Verifique o arquivo .env.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const gerarConteudoMateria = async (materia, topico) => {
  try {
    console.log(`[geminiService] Iniciando geração de conteúdo para ${materia} - ${topico}`);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Gere um conteúdo educacional detalhado sobre ${topico} da matéria de ${materia}. 
    O conteúdo deve ser estruturado em tópicos principais, com explicações claras e exemplos quando relevante. De enfaze em como pode cair no enem. 
    estilize o texto em html mas não deixe o leitor perceber sobre a estilização, mantenha a tematica de cores terrosas, não use titulo h1 . 
    Formate o texto com tags <p> para parágrafos e <ul>/<li> para listas. Nao comente sobre o uso do html.
    Nao faça questoes`;

    console.log('[geminiService] Enviando prompt para a API');
    const result = await model.generateContent(prompt);
    
    if (!result || !result.response) {
      console.error('[geminiService] Resposta inválida da API');
      throw new Error('Resposta inválida da API Gemini');
    }

    const response = await result.response;
    const texto = response.text();

    if (!texto || texto.trim().length === 0) {
      console.error('[geminiService] Conteúdo vazio retornado pela API');
      throw new Error('Conteúdo vazio retornado pela API');
    }

    console.log('[geminiService] Conteúdo gerado com sucesso');
    return texto;
  } catch (error) {
    console.error("[geminiService] Erro ao gerar conteúdo:", error);
    throw new Error(`Erro ao gerar conteúdo: ${error.message}`);
  }
};

export const gerarQuestoesQuiz = async (materia, topico) => {
  try {
    console.log(`[geminiService] Iniciando geração de questões para ${materia} - ${topico}`);
    
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

    console.log('[geminiService] Enviando prompt para a API');
    const result = await model.generateContent(prompt);
    
    if (!result || !result.response) {
      console.error('[geminiService] Resposta inválida da API');
      throw new Error('Resposta inválida da API Gemini');
    }

    const response = await result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      console.error('[geminiService] Conteúdo vazio retornado pela API');
      throw new Error('Conteúdo vazio retornado pela API');
    }

    // Extrai o JSON da resposta (o Gemini pode adicionar texto antes/depois)
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      console.error('[geminiService] Formato JSON inválido na resposta');
      throw new Error('Formato JSON inválido na resposta');
    }

    const jsonString = text.slice(jsonStart, jsonEnd);
    const questoes = JSON.parse(jsonString);

    console.log('[geminiService] Questões geradas com sucesso');
    return questoes;
  } catch (error) {
    console.error("[geminiService] Erro ao gerar questões:", error);
    throw new Error(`Erro ao gerar questões: ${error.message}`);
  }
};

export const gerarRespostaIA = async (pergunta, materia = null, topico = null) => {
  try {
    console.log(`[geminiService] Iniciando geração de resposta para pergunta sobre ${materia} - ${topico}`);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = `Você é um assistente educacional especializado em ajudar estudantes. seja proximo do usuario de forma humana, `;
    
    if (materia && topico) {
      prompt += `O usuário está atualmente estudando: sobre ${topico} na matéria de ${materia}. 
      Responda considerando o conteudo que está sendo estudado`;
    }
    
    prompt += `Responda de forma clara, concisa e didática a seguinte pergunta: "${pergunta}".\n\n `;
    prompt += `Se a pergunta for relacionada ao contexto atual, adapte sua resposta para reforçar o conteúdo. `;
   
    console.log('[geminiService] Enviando prompt para a API');
    const result = await model.generateContent(prompt);
    
    if (!result || !result.response) {
      console.error('[geminiService] Resposta inválida da API');
      throw new Error('Resposta inválida da API Gemini');
    }

    const response = await result.response;
    const texto = response.text();

    if (!texto || texto.trim().length === 0) {
      console.error('[geminiService] Resposta vazia retornada pela API');
      throw new Error('Resposta vazia retornada pela API');
    }

    console.log('[geminiService] Resposta gerada com sucesso');
    return texto;
  } catch (error) {
    console.error("[geminiService] Erro ao gerar resposta:", error);
    throw new Error(`Erro ao gerar resposta: ${error.message}`);
  }
};