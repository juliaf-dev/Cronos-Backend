// src/routes/subtopicosPublic.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/subtopicosController');

// ✅ Apenas rota pública para pegar matéria de um subtopico
router.get('/:id/materia', c.getMateriaFromSubtopico);

module.exports = router;
