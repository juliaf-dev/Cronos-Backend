const express = require('express');
const router = express.Router();
const c = require('../controllers/motivacoesController');
const { requireAdmin } = require('../middlewares/auth');

router.get('/random', c.random);
router.get('/', requireAdmin, c.list);
router.post('/', requireAdmin, c.create);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
