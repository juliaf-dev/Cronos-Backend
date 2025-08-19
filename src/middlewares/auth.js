const jwt = require('jsonwebtoken');
const { COOKIE, JWT_SECRET } = require('../config/env');

// ✅ middleware que exige login
function requireAuth(req, res, next) {
  let token = null;

  // 1) tenta pelo header Authorization: Bearer xxx
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2) fallback: tenta pelo cookie (se algum endpoint ainda usar)
  if (!token && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Token não enviado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token inválido ou expirado' });
  }
}

// ✅ middleware que exige admin
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Acesso de admin necessário' });
  }
  next();
}

// ✅ refresh direto do cookie
function refreshFromCookie(req, res) {
  const token = req.cookies[COOKIE.name];
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Sem refresh token' });
  }
  // O refresh já é tratado pelo controller, mas você pode manter isso como atalho
  req.refreshToken = token;
  return res.json({ ok: true, message: 'Token encontrado' });
}

module.exports = { requireAuth, requireAdmin, refreshFromCookie };
