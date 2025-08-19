// src/routes/questoes.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/questoesController');

// Gerar questões com IA
router.post('/generate', c.generate);

// (depois você pode adicionar create/list/update se quiser salvar no banco)
module.exports = router;
