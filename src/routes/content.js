import express from 'express';
import { gerarConteudoMateria } from '../services/geminiService.js';
import pool from '../config/db.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  const { materia, topico } = req.body;

  console.log('[POST /generate] Recebido:', { materia, topico });

  if (!materia || !topico) {
    console.log('[POST /generate] Dados obrigatórios faltando');
    return res.status(400).json({ error: 'Faltam dados obrigatórios' });
  }

  try {
    console.log(`[POST /generate] Verificando se conteúdo já existe para: ${materia} - ${topico}`);
    const [rows] = await pool.execute(
      'SELECT id, body FROM contents WHERE title = ?',
      [`${materia} - ${topico}`]
    );

    if (rows.length > 0) {
      console.log(`[POST /generate] Conteúdo encontrado no banco, id: ${rows[0].id}`);
      return res.status(200).json({
        id: rows[0].id,
        title: `${materia} - ${topico}`,
        body: rows[0].body,
        fromCache: true,
      });
    }

    console.log(`[POST /generate] Conteúdo não encontrado, gerando...`);
    const conteudoGerado = await gerarConteudoMateria(materia, topico);
    console.log('[POST /generate] Conteúdo gerado com sucesso');

    const [result] = await pool.execute(
      'INSERT INTO contents (title, body) VALUES (?, ?)',
      [`${materia} - ${topico}`, conteudoGerado]
    );
    console.log(`[POST /generate] Conteúdo salvo no banco, novo id: ${result.insertId}`);

    res.status(201).json({
      id: result.insertId,
      title: `${materia} - ${topico}`,
      body: conteudoGerado,
      fromCache: false,
    });
  } catch (error) {
    console.error('[POST /generate] Erro ao gerar ou salvar o conteúdo:', error);
    res.status(500).json({ error: 'Erro ao gerar o conteúdo' });
  }
});

export default router;
