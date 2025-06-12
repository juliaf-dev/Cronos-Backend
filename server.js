import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { specs } from './src/config/swagger.js';
import authRoutes from './src/routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do CORS atualizada
const allowedOrigins = [
  'http://localhost:3000',
  'https://cronos-frontend-wine.vercel.app',
  'https://cronos-frontend.vercel.app',
  'https://cronos-frontend-jgrz.vercel.app' // Novo domínio adicionado
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origem (como mobile apps ou curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'] // Permite que o frontend acesse headers específicos
}));

app.set('trust proxy', 1); // Necessário para o Render

// Configuração de sessão atualizada
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret123',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS apenas em produção
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', authRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    cors: allowedOrigins,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Error Handling melhorado
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'Acesso não permitido',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed CORS origins:`, allowedOrigins);
  console.log(`API docs: http://localhost:${PORT}/api-docs`);
});