import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Cronos',
      version: '1.0.0',
      description: 'Documentação da API do Projeto Cronos',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://cronos-final.vercel.app',
        description: 'Servidor de Produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // Caminho para os arquivos que contêm as rotas
};

export const specs = swaggerJsdoc(options); 