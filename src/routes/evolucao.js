// src/routes/evolucao.js
const express = require("express");
const router = express.Router();
const evolucaoController = require("../controllers/evolucaoController");

// Painel de evolução do usuário
router.get("/painel/:usuarioId", evolucaoController.painel);

module.exports = router;
