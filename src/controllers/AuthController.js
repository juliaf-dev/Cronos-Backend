const pool = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccess, signRefresh, verifyToken } = require('../utils/jwt');
const { COOKIE, GOOGLE_CLIENT_ID } = require('../config/env');
const { ok, fail } = require('../utils/http');
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

//
// Cadastro de usuário + evolução inicial
//
async function register(req, res) {
  const { nome, email, senha } = req.body;
  const senha_hash = await hashPassword(senha);

  try {
    const [r] = await pool.execute(
      'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)',
      [nome, email, senha_hash, 'cliente']
    );

    const usuarioId = r.insertId;

    await pool.execute(
      `INSERT INTO evolucao (usuario_id, data, minutos_estudados, acessos, dias_seguidos)
       VALUES (?, CURDATE(), 0, 0, 0)`,
      [usuarioId]
    );

    return ok(res, { id: usuarioId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return fail(res, 'Email já cadastrado', 409);
    throw e;
  }
}

//
// Login
//
async function login(req, res) {
  const { email, senha } = req.body;

  const [rows] = await pool.execute(
    'SELECT id, nome, email, role, senha_hash, token_version, foto_url, last_login_at FROM usuarios WHERE email = ? LIMIT 1',
    [email]
  );
  const user = rows[0];
  if (!user || !(await comparePassword(senha, user.senha_hash || ''))) {
    return fail(res, 'Credenciais inválidas', 401);
  }

  await pool.execute('UPDATE usuarios SET last_login_at = NOW() WHERE id = ?', [user.id]);

  await pool.execute(
    `INSERT INTO evolucao (usuario_id, data, minutos_estudados, acessos, dias_seguidos)
     VALUES (?, CURDATE(), 0, 1, 1)
     ON DUPLICATE KEY UPDATE acessos = acessos + 1`,
    [user.id]
  );

  const accessToken = signAccess({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefresh({ sub: user.id, email: user.email, role: user.role, tv: user.token_version });

  // refreshToken só em cookie
  res.cookie(COOKIE.name, refreshToken, {
    maxAge: COOKIE.maxAgeMs,
    httpOnly: COOKIE.httpOnly,
    secure: COOKIE.secure,
    sameSite: COOKIE.sameSite,
    path: COOKIE.path,
  });

  return ok(res, {
    accessToken,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      foto_url: user.foto_url,
      last_login_at: user.last_login_at,
    },
  });
}

//
// Refresh (via cookie)
//
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
        last_login_at: user.last_login_at,
      },
    });
  } catch {
    return fail(res, 'Refresh inválido', 401);
  }
}

//
// Logout
//
async function logout(req, res) {
  res.clearCookie(COOKIE.name, { path: COOKIE.path });
  return ok(res, { message: 'Logout ok' });
}

//
// Google OAuth (sem alteração grande, só tokens consistentes)
//
async function googleAuth(req, res) {
  try {
    const { credential } = req.body;
    if (!credential) return fail(res, "Credencial do Google não enviada", 400);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let [rows] = await pool.execute(
      "SELECT * FROM usuarios WHERE google_id = ? OR email = ? LIMIT 1",
      [googleId, email]
    );
    let user = rows[0];

    if (!user) {
      const [r] = await pool.execute(
        "INSERT INTO usuarios (nome, email, google_id, role, foto_url, data_criacao, token_version) VALUES (?, ?, ?, ?, ?, NOW(), 0)",
        [name, email, googleId, "cliente", picture]
      );

      user = { id: r.insertId, nome: name, email, role: "cliente", foto_url: picture, google_id: googleId, token_version: 0 };

      await pool.execute(
        `INSERT INTO evolucao (usuario_id, data, minutos_estudados, acessos, dias_seguidos)
         VALUES (?, CURDATE(), 0, 1, 1)`,
        [user.id]
      );
    } else {
      await pool.execute("UPDATE usuarios SET last_login_at = NOW() WHERE id = ?", [user.id]);
    }

    const accessToken = signAccess({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefresh({ sub: user.id, email: user.email, role: user.role, tv: user.token_version });

    res.cookie(COOKIE.name, refreshToken, {
      maxAge: COOKIE.maxAgeMs,
      httpOnly: COOKIE.httpOnly,
      secure: COOKIE.secure,
      sameSite: COOKIE.sameSite,
      path: COOKIE.path,
    });

    return ok(res, {
      accessToken,
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role, foto_url: user.foto_url, last_login_at: user.last_login_at },
    });
  } catch (err) {
    console.error("GoogleAuth Error:", err);
    return fail(res, "Falha no login com Google", 401);
  }
}

//
// Perfil
//
async function me(req, res) {
  const [rows] = await pool.execute(
    'SELECT id, nome, email, role, foto_url, last_login_at FROM usuarios WHERE id = ?',
    [req.user.id]
  );
  return ok(res, rows[0] || null);
}

//
// Atualizar perfil
//
async function updateProfile(req, res) {
  const { nome, email, senha, foto_url } = req.body;
  const userId = req.user.id;

  try {
    let query = 'UPDATE usuarios SET nome = ?, email = ?, foto_url = ?';
    const params = [nome, email, foto_url || null];

    if (senha) {
      const senha_hash = await hashPassword(senha);
      query += ', senha_hash = ?';
      params.push(senha_hash);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    await pool.execute(query, params);

    const [rows] = await pool.execute(
      'SELECT id, nome, email, role, foto_url, last_login_at FROM usuarios WHERE id = ?',
      [userId]
    );

    return ok(res, rows[0]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return fail(res, 'Email já cadastrado', 409);
    throw e;
  }
}

//
// Alterar senha
//
async function changePassword(req, res) {
  const { senhaAtual, novaSenha } = req.body;
  const userId = req.user.id;

  if (!senhaAtual || !novaSenha) {
    return fail(res, 'Informe a senha atual e a nova senha', 400);
  }

  const [rows] = await pool.execute('SELECT senha_hash FROM usuarios WHERE id = ? LIMIT 1', [userId]);
  const user = rows[0];
  if (!user) return fail(res, 'Usuário não encontrado', 404);

  const senhaOk = await comparePassword(senhaAtual, user.senha_hash || '');
  if (!senhaOk) return fail(res, 'Senha atual incorreta', 400);

  const novaSenhaHash = await hashPassword(novaSenha);
  await pool.execute('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [novaSenhaHash, userId]);

  return ok(res, { message: 'Senha alterada com sucesso' });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  googleAuth,
  me,
  updateProfile,
  changePassword
};
