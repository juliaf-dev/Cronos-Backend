const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validate');
const { z } = require('zod');
const { requireAuth } = require('../middlewares/auth');

const { register, login, refresh, logout, googleAuth, me } = require('../controllers/AuthController.js');

const registerSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6)
});
const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6)
});

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/google', googleAuth); // placeholder
router.get('/me', requireAuth, me);

module.exports = router;
