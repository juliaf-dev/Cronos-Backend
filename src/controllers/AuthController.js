import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

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

      // Validação de existência do e-mail usando mailboxlayer (exemplo)
      // Substitua 'YOUR_API_KEY' pela sua chave real do serviço
      const apiKey = process.env.MAILBOXLAYER_API_KEY;
      if (apiKey) {
        const verifyUrl = `http://apilayer.net/api/check?access_key=${apiKey}&email=${encodeURIComponent(email)}&smtp=1&format=1`;
        const verifyRes = await fetch(verifyUrl);
        const verifyData = await verifyRes.json();
        if (!verifyData.smtp_check) {
          return res.status(400).json({ error: 'E-mail não existe ou não pode ser verificado.' });
        }
      }

      // Verificar se o email já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }

      // Criar usuário
      const userId = await User.create({ username, email, password });
      
      // Gerar token JWT
      const token = jwt.sign(
        { id: userId, email, isAdmin: false },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.status(201).json({ 
        message: 'Registro bem-sucedido',
        token,
        user: { id: userId, username, email, isAdmin: false }
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
      
      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ 
        message: 'Login bem-sucedido',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.is_admin
        }
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
      res.clearCookie('connect.sid'); // O nome do cookie pode variar
      res.json({ message: 'Logout bem-sucedido' });
    });
  }

  static async checkAuth(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.json({ isAuthenticated: false });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.json({ isAuthenticated: false });
      }

      res.json({ 
        isAuthenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.is_admin
        }
      });
    } catch (error) {
      res.json({ isAuthenticated: false });
    }
  }
}

export default AuthController;