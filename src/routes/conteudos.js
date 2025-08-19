const express = require('express');
const router = express.Router();
const c = require('../controllers/conteudosController');
const { requireAdmin } = require('../middlewares/auth');

router.post('/', requireAdmin, c.create);              // gerar + salvar conteudo
router.get('/subtopico/:subtopicoId', c.listBySubtopico); 
router.put('/:id', requireAdmin, c.update);           // atualizar manualmente
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
