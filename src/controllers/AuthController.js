const pool = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccess, signRefresh, verifyToken } = require('../utils/jwt');
const { COOKIE } = require('../config/env');
const { ok, fail } = require('../utils/http');

async function register(req, res) {
  const { nome, email, senha } = req.body;
  const senha_hash = await hashPassword(senha);
  try {
    const [r] = await pool.execute(
      'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)',
      [nome, email, senha_hash, 'cliente']
    );
    return ok(res, { id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return fail(res, 'Email já cadastrado', 409);
    throw e;
  }
}

async function login(req, res) {
  const { email, senha } = req.body;
  const [rows] = await pool.execute(
    'SELECT id, nome, email, role, senha_hash, token_version, foto_url, last_login_at FROM usuarios WHERE email = ? LIMIT 1',
    [email]
  );
  const user = rows[0];
  if (!user || !(await comparePassword(senha, user.senha_hash || '')))
    return fail(res, 'Credenciais inválidas', 401);

  await pool.execute('UPDATE usuarios SET last_login_at = NOW() WHERE id = ?', [user.id]);

  const accessToken = signAccess({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefresh({ sub: user.id, email: user.email, role: user.role, tv: user.token_version });

  res.cookie(COOKIE.name, refreshToken, {
    maxAge: COOKIE.maxAgeMs,
    httpOnly: COOKIE.httpOnly,
    secure: COOKIE.secure,
    sameSite: COOKIE.sameSite,
    path: COOKIE.path
  });

  return ok(res, {
    accessToken,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      foto_url: user.foto_url,
      last_login_at: user.last_login_at
    }
  });
}

async function refresh(req, res) {
  const token = req.cookies[COOKIE.name];
  if (!token) return fail(res, 'Sem refresh token', 401);

  try {
    const payload = verifyToken(token);

    const [rows] = await pool.execute(
      'SELECT id, nome, email, role, token_version, foto_url, last_login_at FROM usuarios WHERE id = ? LIMIT 1',
      [payload.sub]
    );
    const user = rows[0];
    if (!user || user.token_version !== payload.tv) {
      return fail(res, 'Refresh inválido', 401);
    }

    const accessToken = signAccess({ sub: user.id, email: user.email, role: user.role });

    return ok(res, {
      accessToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        foto_url: user.foto_url,
        last_login_at: user.last_login_at
      }
    });
  } catch {
    return fail(res, 'Refresh inválido', 401);
  }
}

async function logout(req, res) {
  res.clearCookie(COOKIE.name, { path: COOKIE.path });
  return ok(res, { message: 'Logout ok' });
}

// Placeholder Google OAuth
async function googleAuth(req, res) {
  return fail(res, 'Google OAuth ainda não configurado no servidor (CLIENT_ID/SECRET).', 501);
}

async function me(req, res) {
  const [rows] = await pool.execute(
    'SELECT id, nome, email, role, foto_url, last_login_at FROM usuarios WHERE id = ?',
    [req.user.id]
  );
  return ok(res, rows[0] || null);
}

module.exports = { register, login, refresh, logout, googleAuth, me };
