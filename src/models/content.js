import pool from '../db.js'; // seu arquivo de conexão

class Content {
  static async create({ title, body, created_by }) {
    const [result] = await pool.execute(
      'INSERT INTO contents (title, body, created_by) VALUES (?, ?, ?)',
      [title, body, created_by]
    );
    return result.insertId;
  }

  static async findByTitle(title) {
    const [rows] = await pool.execute(
      'SELECT * FROM contents WHERE title = ? ORDER BY updated_at DESC LIMIT 1',
      [title]
    );
    return rows[0];
  }

  static async update(id, { body }) {
    const [result] = await pool.execute(
      'UPDATE contents SET body = ? WHERE id = ?',
      [body, id]
    );
    return result.affectedRows;
  }
}

export default Content;
