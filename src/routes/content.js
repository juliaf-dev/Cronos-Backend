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

export default router;
