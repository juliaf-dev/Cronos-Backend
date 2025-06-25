import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import mailjet from 'node-mailjet';

dotenv.config();

const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_API_SECRET
);

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
      
      // Gerar token de confirmação
      const confirmToken = jwt.sign(
        { id: userId, email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Enviar e-mail de confirmação
      try {
        await mailjetClient.post('send', { version: 'v3.1' }).request({
          Messages: [
            {
              From: {
                Email: 'no-reply@cronos.com',
                Name: 'Cronos'
              },
              To: [
                {
                  Email: email,
                  Name: username
                }
              ],
              Subject: 'Confirme seu cadastro no Cronos',
              TextPart: 'Clique no link para confirmar seu cadastro.',
              HTMLPart:
                `<h3>Bem-vindo ao Cronos!</h3><p>Para ativar sua conta, clique no link abaixo:</p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirmar?token=${confirmToken}">Confirmar cadastro</a>`
            }
          ]
        });
      } catch (emailErr) {
        console.error('Erro ao enviar e-mail de confirmação:', emailErr);
      }

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
      
      // Bloquear login se não confirmou o e-mail
      if (!user.is_confirmed) {
        return res.status(401).json({ error: 'Confirme seu e-mail antes de fazer login.' });
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

  static async confirmEmail(req, res) {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ error: 'Token não fornecido.' });
      }
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ error: 'Token inválido ou expirado.' });
      }
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      if (user.is_confirmed) {
        return res.status(200).json({ message: 'E-mail já confirmado.' });
      }
      await User.confirmUserById(user.id);
      res.status(200).json({ message: 'E-mail confirmado com sucesso!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao confirmar e-mail.' });
    }
  }
}

export default AuthController;