// src/routes/resumos.js
const express = require('express');
const router = express.Router();
const resumosController = require('../controllers/resumosController'); // nome mais claro
const { requireAuth } = require('../middlewares/auth');

// 📌 Todas as rotas de resumos exigem login
router.use(requireAuth);

// 📌 Criar um resumo
router.post('/', resumosController.create);

// 📌 Obter resumo por ID
router.get('/:id', resumosController.getById);

// 📌 Listar todos os resumos de um usuário
router.get('/usuario/:usuarioId', resumosController.listByUsuario);

// 📌 Listar resumos de um usuário filtrados por matéria
router.get('/usuario/:usuarioId/materia/:materiaId', resumosController.listByMateria);

// 📌 Listar resumos de um conteúdo específico
router.get('/conteudo/:conteudoId', resumosController.listByConteudo);

// 📌 Atualizar um resumo
router.put('/:id', resumosController.update);

// 📌 Remover um resumo
router.delete('/:id', resumosController.remove);

module.exports = router;

