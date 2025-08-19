// src/routes/flashcards.js
const express = require("express");
const router = express.Router();
const flashcardsController = require("../controllers/flashcardsController");

// Criar flashcard
router.post("/", flashcardsController.create);

// Listar por usuário
router.get("/", flashcardsController.listByUsuario);

// Listar por matéria
router.get("/materia/:materiaId", flashcardsController.listByMateria);

// Atualizar
router.put("/:id", flashcardsController.update);

// Remover
router.delete("/:id", flashcardsController.remove);

// Registrar revisão (spaced repetition)
router.post("/:id/revisao", flashcardsController.registrarRevisao);

// Registrar resultado (revisado / a revisar)
router.post("/:id/resultado", flashcardsController.registrarResultado);

module.exports = router;
