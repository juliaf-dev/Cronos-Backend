const jwt = require("jsonwebtoken");
const { COOKIE, JWT_SECRET } = require("../config/env");

// ✅ exige login com accessToken no header
function requireAuth(req, res, next) {
  let token = null;

  // pega do header Authorization: Bearer xxx
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ ok: false, message: "Token de acesso não enviado" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    return next();
  } catch {
    return res
      .status(401)
      .json({ ok: false, message: "Token inválido ou expirado" });
  }
}

// ✅ exige admin
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res
      .status(403)
      .json({ ok: false, message: "Apenas administradores podem acessar" });
  }
  return next();
}

// ✅ pega refresh token do cookie
function refreshFromCookie(req, res, next) {
  const token = req.cookies?.[COOKIE?.name];
  if (!token) {
    return res
      .status(401)
      .json({ ok: false, message: "Nenhum refresh token encontrado" });
  }
  req.refreshToken = token;
  return next();
}

module.exports = { requireAuth, requireAdmin, refreshFromCookie };
