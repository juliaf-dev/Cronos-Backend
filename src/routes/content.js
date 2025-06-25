import express from 'express';
import { gerarConteudoMateria, gerarQuestoesQuiz } from '../services/geminiService.js';
import pool from '../config/db.js';
import { isAdmin, authenticateToken } from '../midewares/authMiddleware.js';

const router = express.Router();

// Rota para gerar conteúdo
router.post('/generate', async (req, res) => {
  const { materia, topico } = req.body;

  console.log('[POST /generate] Recebido:', { materia, topico });

  if (!materia || !topico) {
    console.log('[POST /generate] Dados obrigatórios faltando');
    return res.status(400).json({ error: 'Faltam dados obrigatórios' });
  }

  try {
    // Primeiro, verifica se o conteúdo já existe no banco
    console.log(`[POST /generate] Verificando se conteúdo já existe para: ${materia} - ${topico}`);
    const [rows] = await pool.execute(
      'SELECT id, body FROM contents WHERE title = ?',
      [`${materia} - ${topico}`]
    );

    // Se o conteúdo já existe, retorna ele
    if (rows.length > 0) {
      console.log(`[POST /generate] Conteúdo encontrado no cache, id: ${rows[0].id}`);
      return res.status(200).json({
        id: rows[0].id,
        title: `${materia} - ${topico}`,
        body: rows[0].body,
        fromCache: true,
      });
    }

    // Se não existe, gera o conteúdo
    console.log(`[POST /generate] Conteúdo não encontrado no cache, gerando novo conteúdo...`);
    const conteudoGerado = await gerarConteudoMateria(materia, topico);
    
    if (!conteudoGerado) {
      console.error('[POST /generate] Erro: Conteúdo não foi gerado');
      return res.status(500).json({ error: 'Erro ao gerar o conteúdo' });
    }

    // Salva o conteúdo no banco para cache
    console.log('[POST /generate] Salvando conteúdo no cache...');
    const [result] = await pool.execute(
      'INSERT INTO contents (title, body) VALUES (?, ?)',
      [`${materia} - ${topico}`, conteudoGerado]
    );

    console.log(`[POST /generate] Conteúdo salvo no cache, id: ${result.insertId}`);

    // Retorna o conteúdo gerado
    res.status(201).json({
      id: result.insertId,
      title: `${materia} - ${topico}`,
      body: conteudoGerado,
      fromCache: false,
    });
  } catch (error) {
    console.error('[POST /generate] Erro detalhado:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar o conteúdo',
      details: error.message 
    });
  }
});

// Rota para gerar questões de quiz
router.post('/quiz/generate', async (req, res) => {
  const { materia, topico } = req.body;

  if (!materia || !topico) {
    return res.status(400).json({ error: 'Faltam dados obrigatórios' });
  }

  try {
    const questoes = await gerarQuestoesQuiz(materia, topico);
    res.json({ questoes });
  } catch (error) {
    console.error('[POST /quiz/generate] Erro:', error);
    res.status(500).json({ error: 'Erro ao gerar questões' });
  }
});

// Rotas para Resumos
router.get('/resumos', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM resumos WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('[GET /resumos] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar resumos' });
  }
});

router.post('/resumos', authenticateToken, async (req, res) => {
  const { titulo, conteudo, materia, periodo } = req.body;

  if (!titulo || !conteudo) {
    return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO resumos (user_id, titulo, conteudo, materia, periodo) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, titulo, conteudo, materia || null, periodo || null]
    );

    res.status(201).json({
      id: result.insertId,
      titulo,
      conteudo,
      materia,
      periodo,
      message: 'Resumo criado com sucesso'
    });
  } catch (error) {
    console.error('[POST /resumos] Erro:', error);
    res.status(500).json({ error: 'Erro ao criar resumo' });
  }
});

router.put('/resumos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { titulo, conteudo, materia, periodo } = req.body;

  if (!titulo || !conteudo) {
    return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE resumos SET titulo = ?, conteudo = ?, materia = ?, periodo = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [titulo, conteudo, materia || null, periodo || null, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Resumo não encontrado' });
    }

    res.json({ message: 'Resumo atualizado com sucesso' });
  } catch (error) {
    console.error('[PUT /resumos/:id] Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar resumo' });
  }
});

router.delete('/resumos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute(
      'DELETE FROM resumos WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Resumo não encontrado' });
    }

    res.json({ message: 'Resumo excluído com sucesso' });
  } catch (error) {
    console.error('[DELETE /resumos/:id] Erro:', error);
    res.status(500).json({ error: 'Erro ao excluir resumo' });
  }
});

// Rotas para Flashcards
router.get('/flashcards', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM flashcards WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('[GET /flashcards] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar flashcards' });
  }
});

router.post('/flashcards', authenticateToken, async (req, res) => {
  const { pergunta, resposta, materia, periodo } = req.body;

  if (!pergunta || !resposta) {
    return res.status(400).json({ error: 'Pergunta e resposta são obrigatórias' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO flashcards (user_id, pergunta, resposta, materia, periodo) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, pergunta, resposta, materia || null, periodo || null]
    );

    res.status(201).json({
      id: result.insertId,
      pergunta,
      resposta,
      materia,
      periodo,
      message: 'Flashcard criado com sucesso'
    });
  } catch (error) {
    console.error('[POST /flashcards] Erro:', error);
    res.status(500).json({ error: 'Erro ao criar flashcard' });
  }
});

router.put('/flashcards/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { pergunta, resposta, materia, periodo } = req.body;

  if (!pergunta || !resposta) {
    return res.status(400).json({ error: 'Pergunta e resposta são obrigatórias' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE flashcards SET pergunta = ?, resposta = ?, materia = ?, periodo = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [pergunta, resposta, materia || null, periodo || null, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Flashcard não encontrado' });
    }

    res.json({ message: 'Flashcard atualizado com sucesso' });
  } catch (error) {
    console.error('[PUT /flashcards/:id] Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar flashcard' });
  }
});

router.delete('/flashcards/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute(
      'DELETE FROM flashcards WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Flashcard não encontrado' });
    }

    res.json({ message: 'Flashcard excluído com sucesso' });
  } catch (error) {
    console.error('[DELETE /flashcards/:id] Erro:', error);
    res.status(500).json({ error: 'Erro ao excluir flashcard' });
  }
});

// Rota para marcar flashcard como revisado
router.post('/flashcards/:id/review', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute(
      'UPDATE flashcards SET reviewed = 1, reviewed_at = NOW() WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Flashcard não encontrado' });
    }

    res.json({ message: 'Flashcard marcado como revisado' });
  } catch (error) {
    console.error('[POST /flashcards/:id/review] Erro:', error);
    res.status(500).json({ error: 'Erro ao marcar flashcard como revisado' });
  }
});

// Rota para editar conteúdo (apenas admin)
router.put('/edit/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;

  if (!body) {
    return res.status(400).json({ error: 'O conteúdo é obrigatório' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE contents SET body = ?, updated_at = NOW() WHERE id = ?',
      [body, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }

    res.json({ message: 'Conteúdo atualizado com sucesso' });
  } catch (error) {
    console.error('[PUT /edit/:id] Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar o conteúdo' });
  }
});

export default router;
