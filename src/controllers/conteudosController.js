const pool = require('../config/db');
const { ok } = require('../utils/http');
const { gerarConteudoHTML } = require('../services/ia/geminiService');

// Criar conteúdo manualmente (apenas admin)
async function create(req, res) {
  try {
    const { materia_id, topico_id, subtopico_id } = req.body;

    if (!materia_id || !topico_id || !subtopico_id) {
      return res.status(400).json({ ok: false, message: 'materia_id, topico_id e subtopico_id são obrigatórios' });
    }

    // Buscar nomes
    const [[materia]]   = await pool.execute('SELECT id, nome FROM materias WHERE id = ?', [materia_id]);
    const [[topico]]    = await pool.execute('SELECT id, nome FROM topicos WHERE id = ?', [topico_id]);
    const [[subtopico]] = await pool.execute('SELECT id, nome FROM subtopicos WHERE id = ?', [subtopico_id]);

    if (!materia || !topico || !subtopico) {
      return res.status(404).json({ ok: false, message: 'Matéria, tópico ou subtopico não encontrados' });
    }

    const texto = await gerarConteudoHTML({
      materia: materia.nome,
      topico: topico.nome,
      subtopico: subtopico.nome
    });

    const [r] = await pool.execute(
      `INSERT INTO conteudos 
        (materia_id, topico_id, subtopico_id, titulo, texto, texto_html, gerado_via_ia, fonte, versao, ordem, criado_em, atualizado_em) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        materia.id,
        topico.id,
        subtopico.id,
        subtopico.nome,
        texto,
        texto,
        1,
        'Gemini API',
        1,
        1
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

// Buscar ou gerar automaticamente
async function getOrGenerate(req, res) {
  try {
    const { subtopicoId } = req.params;

    if (!subtopicoId) {
      return res.status(400).json({ ok: false, message: "subtopicoId obrigatório" });
    }

    // Verifica se já existe
    const [rows] = await pool.execute(
      `SELECT c.id, c.titulo, c.texto_html AS body, 
              m.id AS materia_id, t.id AS topico_id, s.id AS subtopico_id,
              m.nome AS materia_nome, t.nome AS topico_nome, s.nome AS subtopico_nome
         FROM conteudos c
         JOIN materias m ON m.id = c.materia_id
         JOIN topicos t ON t.id = c.topico_id
         JOIN subtopicos s ON s.id = c.subtopico_id
        WHERE c.subtopico_id = ?
     ORDER BY c.criado_em DESC
     LIMIT 1`,
      [subtopicoId]
    );

    if (rows.length > 0) {
      return ok(res, rows[0]);
    }

    // Se não existe → buscar dados corretos do subtópico
    const [[info]] = await pool.execute(
      `SELECT s.id AS subtopico_id, s.nome AS subtopico_nome,
              t.id AS topico_id, t.nome AS topico_nome,
              m.id AS materia_id, m.nome AS materia_nome
         FROM subtopicos s
         JOIN topicos t ON s.topico_id = t.id
         JOIN materias m ON t.materia_id = m.id
        WHERE s.id = ?`,
      [subtopicoId]
    );

    if (!info) {
      return res.status(404).json({ ok: false, message: "Matéria, tópico ou subtópico não encontrados" });
    }

    // Gerar via IA
    const texto = await gerarConteudoHTML({
      materia: info.materia_nome,
      topico: info.topico_nome,
      subtopico: info.subtopico_nome
    });

    // Salvar
    const [r] = await pool.execute(
      `INSERT INTO conteudos 
        (materia_id, topico_id, subtopico_id, titulo, texto, texto_html, gerado_via_ia, fonte, versao, ordem, criado_em, atualizado_em) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        info.materia_id,
        info.topico_id,
        info.subtopico_id,
        info.subtopico_nome,
        texto,
        texto,
        1,
        "Gemini API",
        1,
        1
      ]
    );

    return ok(res, {
      id: r.insertId,
      titulo: info.subtopico_nome,
      body: texto,
      materia_id: info.materia_id,
      topico_id: info.topico_id,
      subtopico_id: info.subtopico_id,
      materia_nome: info.materia_nome,
      topico_nome: info.topico_nome,
      subtopico_nome: info.subtopico_nome
    });
  } catch (err) {
    console.error("Erro em getOrGenerate:", err);
    return res.status(500).json({ ok: false, message: "Erro ao gerar conteúdo", error: err.message });
  }
}

// Atualizar (apenas admin)
async function update(req, res) {
  const { id } = req.params;
  const { texto } = req.body;
  await pool.execute(
    'UPDATE conteudos SET texto = ?, texto_html = ?, atualizado_em = NOW() WHERE id = ?',
    [texto, texto, id]
  );
  return ok(res, { id: Number(id) });
}

// Remover (apenas admin)
async function remove(req, res) {
  const { id } = req.params;
  await pool.execute('DELETE FROM conteudos WHERE id = ?', [id]);
  return ok(res, { id: Number(id) });
}

module.exports = { create, getOrGenerate, update, remove };
