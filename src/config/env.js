require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  PORT: process.env.PORT || 5000,
  DB: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  GEMINI_API_KEY: process.env.REACT_APP_GEMINI_API_KEY, // conforme seu .env
  COOKIE: {
    name: 'refresh_token',
    maxAgeMs: 1000 * 60 * 60 * 24 * 30, // 30 dias
    httpOnly: true,
    secure: isProd,
    sameSite: 'none',
    path: '/api/auth',
  },
  isProd
};
