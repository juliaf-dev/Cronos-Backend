// src/routes/alternativas.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/alternativasController');
const { requireAdmin } = require('../middlewares/auth');

// Listar alternativas de uma questão
router.get('/questao/:questaoId', c.listByQuestao);

// Criar alternativas para uma questão (admin)
router.post('/', requireAdmin, c.createMany);

// Atualizar uma alternativa específica (admin)
router.put('/:id', requireAdmin, c.update);

// Remover uma alternativa (admin)
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
