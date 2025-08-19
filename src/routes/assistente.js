const express = require('express');
const router = express.Router();
const c = require('../controllers/assistenteController');

router.post('/', c.chat);

module.exports = router;
