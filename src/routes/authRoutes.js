import express from 'express';
import AuthController from '../controllers/AuthController.js';

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);
router.get('/check', AuthController.checkAuth);

export default router;
