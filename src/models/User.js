import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

class User {
  static async create({ username, email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, is_admin, is_confirmed) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, false, false]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }
  
  static async checkAuth(req, res) {
  if (req.session.user) {
    res.status(200).json({ authenticated: true, user: req.session.user });
  } else {
    res.status(401).json({ authenticated: false });
  }
}


  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, username, email, is_admin, is_confirmed FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async update(id, { username, email, isAdmin }) {
    const [result] = await pool.execute(
      'UPDATE users SET username = ?, email = ?, is_admin = ? WHERE id = ?',
      [username, email, isAdmin, id]
    );
    return result.affectedRows;
  }

  static async confirmUserById(id) {
    const [result] = await pool.execute(
      'UPDATE users SET is_confirmed = ? WHERE id = ?',
      [true, id]
    );
    return result.affectedRows;
  }
}

export default User;