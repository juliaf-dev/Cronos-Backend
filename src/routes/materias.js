const express = require('express');
const router = express.Router();
const c = require('../controllers/materiasController');
const { requireAdmin } = require('../middlewares/auth');

// 📌 Listar todas as matérias (livre - não exige login)
router.get('/', c.list);

// 📌 Buscar matérias por nome (livre - não exige login)
router.get('/:id', c.getById);

// 📌 Criar matéria (somente admin)
router.post('/', requireAdmin, c.create);

// 📌 Atualizar matéria (somente admin)
router.put('/:id', requireAdmin, c.update);

// 📌 Remover matéria (somente admin)
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
