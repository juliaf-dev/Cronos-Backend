// src/routes/flashcardsRoutes.js
const express = require("express");
const router = express.Router();
const flashcardsController = require("../controllers/flashcardsController");
const { requireAuth } = require("../middlewares/auth");

// Middleware: todas as rotas exigem autenticação
router.use(requireAuth);

// Criar flashcard
router.post("/", flashcardsController.create);

// Listar todos os flashcards do usuário logado
router.get("/", flashcardsController.listByUsuario);

// Alias: listar flashcards do usuário logado (rota /usuario)
router.get("/usuario", flashcardsController.listByUsuario);

// Listar flashcards por matéria do usuário logado
router.get("/materia/:materiaId", flashcardsController.listByMateria);

// Atualizar flashcard (pelo ID)
router.put("/:id", flashcardsController.update);

// Remover flashcard (pelo ID)
router.delete("/:id", flashcardsController.remove);

// Registrar acerto/erro em um flashcard
router.post("/:id/resultado", flashcardsController.registrarResultado);

module.exports = router;
