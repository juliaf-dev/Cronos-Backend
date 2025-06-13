import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { specs } from './src/config/swagger.js';
import authRoutes from './src/routes/authRoutes.js';
import contentRoutes from './src/routes/content.js'; // rotas da IA

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
app.use(cors({
  origin: 'https://cronos-frontend-jgrz.vercel.app',
  credentials: true
}));

// JSON e URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessões
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 dia
  }
}));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/contents', contentRoutes); // aqui está o POST /generate

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
  console.log(`📘 Swagger em: http://localhost:${PORT}/api-docs`);
});
