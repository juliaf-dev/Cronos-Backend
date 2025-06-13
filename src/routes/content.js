import express from 'express';
import { gerarConteudoMateria } from '../services/geminiService.js';
import pool from '../config/db.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  const { materia, topico, usuarioId } = req.body;

  if (!materia || !topico || !usuarioId) {
    return res.status(400).json({ error: 'Faltam dados obrigatórios' });
  }

  try {
    // 1. Verificar se já existe conteúdo para esse usuário, matéria e tópico
    const [rows] = await pool.execute(
      'SELECT id, body FROM contents WHERE title = ? AND created_by = ?',
      [`${materia} - ${topico}`, usuarioId]
    );

    if (rows.length > 0) {
      // Conteúdo já existe, retorna ele
      return res.status(200).json({
        id: rows[0].id,
        title: `${materia} - ${topico}`,
        body: rows[0].body,
        fromCache: true, // só para indicar que veio do banco
      });
    }

    // 2. Se não existir, gerar novo conteúdo
    const conteudoGerado = await gerarConteudoMateria(materia, topico);

    // 3. Salvar no banco
    const [result] = await pool.execute(
      'INSERT INTO contents (title, body, created_by) VALUES (?, ?, ?)',
      [`${materia} - ${topico}`, conteudoGerado, usuarioId]
    );

    // 4. Retornar novo conteúdo criado
    res.status(201).json({
      id: result.insertId,
      title: `${materia} - ${topico}`,
      body: conteudoGerado,
      fromCache: false,
    });
  } catch (error) {
    console.error('Erro ao gerar conteúdo:', error);
    res.status(500).json({ error: 'Erro ao gerar o conteúdo' });
  }
});

export default router;
