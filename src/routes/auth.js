const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validate');
const { z } = require('zod');
const { requireAuth } = require('../middlewares/auth');
const AuthController = require('../controllers/AuthController');

// Schemas de validação
const registerSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6)
});

const changePasswordSchema = z.object({
  senhaAtual: z.string().min(6, "A senha atual deve ter pelo menos 6 caracteres"),
  novaSenha: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres")
});

// Rotas públicas
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/google', AuthController.googleAuth);

// Rotas protegidas
router.get('/me', requireAuth, AuthController.me);
router.put('/me', requireAuth, AuthController.updateProfile);
router.put('/me/password', requireAuth, validate(changePasswordSchema), AuthController.changePassword);

module.exports = router;
