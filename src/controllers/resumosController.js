// src/controllers/resumosController.js
const pool = require('../config/db');
const { ok } = require('../utils/http');

// 📌 Criar resumo
async function create(req, res) {
  try {
    const { materia_id, conteudo_id, titulo, corpo } = req.body;

    if (!materia_id || !corpo) {
      return res.status(400).json({
        ok: false,
        message: 'materia_id e corpo são obrigatórios'
      });
    }

    const usuario_id = req.user.id;

    // Buscar título do conteúdo caso não seja enviado
    let finalTitulo = titulo;
    if (!finalTitulo && conteudo_id) {
      const [[conteudo]] = await pool.execute(
        'SELECT titulo FROM conteudos WHERE id = ?',
        [conteudo_id]
      );
      finalTitulo = conteudo?.titulo || 'Resumo';
    } else if (!finalTitulo) {
      finalTitulo = 'Resumo';
    }

    const [r] = await pool.execute(
      `INSERT INTO resumos (usuario_id, materia_id, conteudo_id, titulo, corpo) 
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, materia_id, conteudo_id || null, finalTitulo, corpo]
    );

    return ok(res, { 
      id: r.insertId, 
      usuario_id, 
      materia_id, 
      conteudo_id: conteudo_id || null, 
      titulo: finalTitulo, 
      corpo 
    }, 201);
  } catch (err) {
    console.error('Erro em resumosController.create:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao criar resumo', error: err.message });
  }
}

// 📌 Buscar resumo por ID
async function getById(req, res) {
  const { id } = req.params;

  const [[resumo]] = await pool.execute(
    `SELECT r.*, m.nome AS materia_nome
     FROM resumos r
     JOIN materias m ON r.materia_id = m.id
     WHERE r.id = ?`,
    [id]
  );

  if (!resumo) {
    return res.status(404).json({ ok: false, message: 'Resumo não encontrado' });
  }

  // 🔒 Só o dono ou admin pode acessar
  if (req.user.id !== resumo.usuario_id && req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Acesso negado' });
  }

  return ok(res, resumo);
}

// 📌 Listar resumos por usuário
async function listByUsuario(req, res) {
  const { usuarioId } = req.params;

  if (req.user.id !== Number(usuarioId) && req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Acesso negado' });
  }

  const [rows] = await pool.execute(
    `SELECT r.*, m.nome AS materia_nome
     FROM resumos r
     JOIN materias m ON r.materia_id = m.id
     WHERE r.usuario_id = ?
     ORDER BY r.criado_em DESC`,
    [usuarioId]
  );
  return ok(res, rows);
}

// 📌 Listar resumos por usuário e matéria
async function listByMateria(req, res) {
  const { usuarioId, materiaId } = req.params;

  if (req.user.id !== Number(usuarioId) && req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Acesso negado' });
  }

  const [rows] = await pool.execute(
    `SELECT r.*, m.nome AS materia_nome
     FROM resumos r
     JOIN materias m ON r.materia_id = m.id
     WHERE r.usuario_id = ? AND r.materia_id = ?
     ORDER BY r.criado_em DESC`,
    [usuarioId, materiaId]
  );
  return ok(res, rows);
}

// 📌 Listar resumos por conteúdo (pode trazer de vários usuários)
async function listByConteudo(req, res) {
  const { conteudoId } = req.params;

  const [rows] = await pool.execute(
    `SELECT r.*, m.nome AS materia_nome
     FROM resumos r
     JOIN materias m ON r.materia_id = m.id
     WHERE r.conteudo_id = ?
     ORDER BY r.criado_em DESC`,
    [conteudoId]
  );
  return ok(res, rows);
}

// 📌 Atualizar resumo
async function update(req, res) {
  const { id } = req.params;
  const { titulo, corpo } = req.body;

  const [[existe]] = await pool.execute('SELECT * FROM resumos WHERE id = ?', [id]);
  if (!existe) {
    return res.status(404).json({ ok: false, message: 'Resumo não encontrado' });
  }

  if (req.user.id !== existe.usuario_id && req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Acesso negado' });
  }

  await pool.execute(
    'UPDATE resumos SET titulo = ?, corpo = ?, atualizado_em = NOW() WHERE id = ?',
    [titulo || existe.titulo, corpo || existe.corpo, id]
  );

  const [[resumo]] = await pool.execute(
    `SELECT r.*, m.nome AS materia_nome
     FROM resumos r
     JOIN materias m ON r.materia_id = m.id
     WHERE r.id = ?`,
    [id]
  );

  return ok(res, resumo);
}

// 📌 Remover resumo
async function remove(req, res) {
  const { id } = req.params;

  const [[existe]] = await pool.execute('SELECT * FROM resumos WHERE id = ?', [id]);
  if (!existe) {
    return res.status(404).json({ ok: false, message: 'Resumo não encontrado' });
  }

  if (req.user.id !== existe.usuario_id && req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Acesso negado' });
  }

  await pool.execute('DELETE FROM resumos WHERE id = ?', [id]);
  return ok(res, { id: Number(id) });
}

module.exports = { 
  create, 
  getById, 
  listByUsuario, 
  listByMateria, 
  listByConteudo, 
  update, 
  remove 
};
