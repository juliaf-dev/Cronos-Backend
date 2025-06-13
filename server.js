import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { specs } from './src/config/swagger.js';
import authRoutes from './src/routes/authRoutes.js';
import contentRoutes from './src/routes/content.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS com múltiplas origens
const allowedOrigins = [
  'http://localhost:3000',
  'https://cronos-frontend-jgrz.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Confiança no proxy do Render/Vercel
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/contents', contentRoutes);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
  console.log(`📘 Swagger em: http://localhost:${PORT}/api-docs`);
});
