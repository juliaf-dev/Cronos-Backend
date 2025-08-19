// src/routes/quiz.js
const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizController");

// Cria sessão de quiz (10 questões, gera se faltar)
router.post("/sessoes", quizController.criarSessao);

// Responder questão
router.post("/responder", quizController.responder);

// Finalizar quiz
router.post("/finalizar", quizController.finalizar);

// Resumo de um quiz
router.get("/:quiz_id/resumo", quizController.resumo);

// Histórico de quizzes do usuário
router.get("/historico/:usuario_id", quizController.historico);

module.exports = router;
