import express from 'express';
import AuthController from '../controllers/AuthController.js';
import { ensureAuthenticated } from '../midewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra um novo usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome do usuário
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email já cadastrado
 */
router.post('/register', AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Realiza o login do usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT de autenticação
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', AuthController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Realiza o logout do usuário
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *       401:
 *         description: Não autorizado
 */
router.get('/logout', AuthController.logout);

/**
 * @swagger
 * /api/auth/check:
 *   get:
 *     summary: Verifica se o usuário está autenticado
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Usuário autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                   description: Status da autenticação
 *       401:
 *         description: Não autorizado
 */
router.get('/check', ensureAuthenticated, AuthController.checkAuth);

/**
 * @swagger
 * /api/auth/confirm:
 *   get:
 *     summary: Confirma o e-mail do usuário
 *     tags: [Autenticação]
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token de confirmação enviado por e-mail
 *     responses:
 *       200:
 *         description: E-mail confirmado com sucesso
 *       400:
 *         description: Token inválido ou expirado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/confirm', AuthController.confirmEmail);

export default router;
