import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

class AuthController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;
      
      // Verificar se o email já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }

      // Criar usuário
      const userId = await User.create({ username, email, password });
      
      // Armazenar dados do usuário na sessão
      req.session.user = {
        id: userId,
        username,
        email
      };
      
      res.json({ message: 'Registro bem-sucedido', user: req.session.user });
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
      
      // Verificar senha (em produção, use bcrypt para comparar hashes)
      if (user.password !== password) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      
      // Armazenar dados do usuário na sessão
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email
      };
      
      res.json({ message: 'Login bem-sucedido', user: req.session.user });
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
    if (req.session.user) {
      return res.json({ isAuthenticated: true, user: req.session.user });
    }
    res.json({ isAuthenticated: false });
  }
}

export default AuthController;