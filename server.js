import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import MySQLStoreImport from 'express-mysql-session';
import swaggerUi from 'swagger-ui-express';
import { specs } from './src/config/swagger.js';
import authRoutes from './src/routes/authRoutes.js';
import contentRoutes from './src/routes/content.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Conexão com banco
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Configuração do store de sessão
const MySQLStore = MySQLStoreImport(session);
const sessionStore = new MySQLStore({}, pool);

// Configuração da sessão
app.use(session({
  key: 'user_sid',
  secret: process.env.SESSION_SECRET || 'segredo-forte',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dias
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true se estiver em HTTPS
    sameSite: 'lax',
  }
}));

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Confiança no proxy (ex: vercel, render)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/contents', contentRoutes);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Tratamento de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
  console.log(`📘 Swagger em: http://localhost:${PORT}/api-docs`);
});
