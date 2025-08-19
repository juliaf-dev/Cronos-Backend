const express = require('express');
const router = express.Router();
const c = require('../controllers/topicosController');
const { requireAdmin } = require('../middlewares/auth');

router.get('/', c.list);
router.get('/materia/:materiaId', c.listByMateria);
router.post('/', requireAdmin, c.create);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
