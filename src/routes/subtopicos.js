// src/routes/subtopicos.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/subtopicosController');
const { requireAdmin } = require('../middlewares/auth');

router.get('/topico/:topicoId', c.listByTopico);

// ❌ NÃO tem mais o getMateriaFromSubtopico aqui
// pq agora ele está público em subtopicosPublic.js

router.post('/', requireAdmin, c.create);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
