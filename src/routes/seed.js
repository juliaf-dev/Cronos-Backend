const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const router = express.Router();

// Rota aberta, não precisa de token
router.post("/seed-admin", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ ok: false, message: "Nome, email e senha são obrigatórios" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    await pool.execute(
      "INSERT INTO usuarios (nome, email, senha_hash, role, token_version, created_at) VALUES (?, ?, ?, 'admin', 0, NOW())",
      [nome, email, senhaHash]
    );

    res.json({ ok: true, message: "Admin criado com sucesso!" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
