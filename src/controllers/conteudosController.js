// src/controllers/conteudosController.js
const pool = require('../config/db');
const { ok } = require('../utils/http');
const { gerarConteudoHTML } = require('../services/ia/geminiService');

// Criar conteúdo (IA + salvar no banco)
async function create(req, res) {
  try {
    const { materia_id, topico_id, subtopico_id } = req.body;

    if (!materia_id || !topico_id || !subtopico_id) {
      return res.status(400).json({ ok: false, message: 'materia_id, topico_id e subtopico_id são obrigatórios' });
    }

    // Buscar nomes (para montar o prompt da IA)
    const [[materia]]   = await pool.execute('SELECT id, nome FROM materias WHERE id = ?', [materia_id]);
    const [[topico]]    = await pool.execute('SELECT id, nome FROM topicos WHERE id = ?', [topico_id]);
    const [[subtopico]] = await pool.execute('SELECT id, nome FROM subtopicos WHERE id = ?', [subtopico_id]);

    if (!materia || !topico || !subtopico) {
      return res.status(404).json({ ok: false, message: 'Matéria, tópico ou subtopico não encontrados' });
    }

    // Geração com IA Gemini
    const texto = await gerarConteudoHTML({
      materia: materia.nome,
      topico: topico.nome,
      subtopico: subtopico.nome
    });

    // Salvar no banco
    const [r] = await pool.execute(
      `INSERT INTO conteudos 
        (materia_id, topico_id, subtopico_id, titulo, texto, texto_html, gerado_via_ia, fonte, versao, ordem, criado_em, atualizado_em) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        materia.id,
        topico.id,
        subtopico.id,
        subtopico.nome, // título = nome do subtopico
        texto,          // texto
        texto,          // texto_html
        1,              // gerado_via_ia
        'Gemini API',   // fonte
        1,              // versao
        1               // ordem
      ]
    );

    return ok(res, {
      id: r.insertId,
      titulo: subtopico.nome,
      body: texto,
      materia_nome: materia.nome,
      topico_nome: topico.nome,
      subtopico_nome: subtopico.nome
    }, 201);
  } catch (err) {
    console.error('Erro em conteudosController.create:', err);
    return res.status(500).json({ ok: false, message: 'Erro ao gerar conteúdo', error: err.message });
  }
}

// Listar por subtopico
async function listBySubtopico(req, res) {
  const { subtopicoId } = req.params;

  const [conteudos] = await pool.execute(
    `SELECT c.id, c.titulo, c.texto_html AS body, 
            m.nome AS materia_nome, t.nome AS topico_nome, s.nome AS subtopico_nome
       FROM conteudos c
       JOIN materias m ON m.id = c.materia_id
       JOIN topicos t ON t.id = c.topico_id
       JOIN subtopicos s ON s.id = c.subtopico_id
      WHERE c.subtopico_id = ?
   ORDER BY c.criado_em DESC`,
    [subtopicoId]
  );

  return ok(res, conteudos);
}

// Atualizar conteúdo manualmente
async function update(req, res) {
  const { id } = req.params;
  const { texto } = req.body;
  await pool.execute(
    'UPDATE conteudos SET texto = ?, texto_html = ?, atualizado_em = NOW() WHERE id = ?',
    [texto, texto, id]
  );
  return ok(res, { id: Number(id) });
}

// Remover conteúdo
async function remove(req, res) {
  const { id } = req.params;
  await pool.execute('DELETE FROM conteudos WHERE id = ?', [id]);
  return ok(res, { id: Number(id) });
}

module.exports = { create, listBySubtopico, update, remove };
