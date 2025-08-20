const express = require('express');
const router = express.Router();
const c = require('../controllers/conteudosController');
const { requireAdmin } = require('../middlewares/auth');

// Público autenticado → auto-get-ou-generate
router.get('/subtopico/:subtopicoId', c.getOrGenerate);

// Apenas admin
router.post('/', requireAdmin, c.create);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
