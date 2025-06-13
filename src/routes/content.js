import express from 'express';
import { gerarConteudoMateria } from '../services/geminiService.js';
import pool from '../config/db.js';

const router = express.Router();

// POST /api/contents/generate
router.post('/generate', async (req, res) => {
  const { materia, topico, usuarioId } = req.body;

  if (!materia || !topico || !usuarioId) {
    return res.status(400).json({ error: 'Faltam dados obrigatórios' });
  }

  
  try {
    const conteudoGerado = await gerarConteudoMateria(materia, topico);

    const [result] = await pool.execute(
      'INSERT INTO contents (title, body, created_by) VALUES (?, ?, ?)',
      [`${materia} - ${topico}`, conteudoGerado, usuarioId]
    );

    res.status(201).json({
      id: result.insertId,
      title: `${materia} - ${topico}`,
      body: conteudoGerado
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar o conteúdo' });
  }
});

export default router;
