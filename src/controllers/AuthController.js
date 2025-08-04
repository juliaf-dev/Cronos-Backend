import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import mailjet from 'node-mailjet';

dotenv.config();

class AuthController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Validação de formato de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de e-mail inválido.' });
      }

      // Verificar se o email já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }

      // Criar usuário
      const userId = await User.create({ username, email, password });

      const user = {
        id: userId,
        username,
        email,
        is_admin: false
      };

      // Criar sessão
      req.session.user = user;
      req.session.save((err) => {
        if (err) {
          console.error('Erro ao salvar sessão no registro:', err);
        }
      });

      res.status(201).json({
        message: 'Registro bem-sucedido',
        user
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Buscar usuário
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Verificar senha
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Criar sessão persistente
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin
      };
      req.session.save((err) => {
        if (err) {
          console.error('Erro ao salvar sessão no login:', err);
        }
      });

      res.status(200).json({
        message: 'Login bem-sucedido',
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }

  static async logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao fazer logout' });
      }
      res.clearCookie('connect.sid'); // Nome padrão do cookie de sessão
      res.json({ message: 'Logout bem-sucedido' });
    });
  }

  static async checkAuth(req, res) {
    console.log('Verificando autenticação. Session ID:', req.sessionID);
    try {
      if (req.session?.user) {
        res.json({
          isAuthenticated: true,
          user: req.session.user
        });
      } else {
        res.json({ isAuthenticated: false });
      }
    } catch (error) {
      res.json({ isAuthenticated: false });
    }
  }

  // Se não quiser mais confirmação por e-mail, mantenha esse método, mas não use ele no fluxo
  static async confirmEmail(req, res) {
    res.status(200).json({ message: 'Confirmação de e-mail desabilitada.' });
  }
}

export default AuthController;
