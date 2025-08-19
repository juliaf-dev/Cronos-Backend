// src/routes/evolucao.js
const express = require("express");
const router = express.Router();
const evolucaoController = require("../controllers/evolucaoController");
const { requireAuth } = require("../middlewares/auth");
const pool = require("../config/db"); // ✅ usa pool direto, não getPool

// 📊 Painel de evolução
router.get("/painel/:usuarioId", requireAuth, (req, res, next) => {
  if (typeof evolucaoController.painel !== "function") {
    console.error("❌ Erro: evolucaoController.painel não definido");
    return res.status(500).json({ ok: false, msg: "Controller painel ausente" });
  }
  return evolucaoController.painel(req, res, next);
});

// 📝 Registrar evolução manual (se precisar)
router.post("/registrar", requireAuth, (req, res, next) => {
  if (typeof evolucaoController.registrar !== "function") {
    console.error("❌ Erro: evolucaoController.registrar não definido");
    return res.status(500).json({ ok: false, msg: "Controller registrar ausente" });
  }
  return evolucaoController.registrar(req, res, next);
});

// 🔹 Rota de ping automático → incrementa minutos + acessos + streak
router.post("/ping", requireAuth, async (req, res) => {
  try {
    const usuario_id = req.user?.id;

    console.log("📌 [PING] Usuário autenticado:", usuario_id);

    if (!usuario_id) {
      return res.status(401).json({ ok: false, msg: "Usuário não autenticado" });
    }

    const hoje = new Date();
    const hojeStr = hoje.toISOString().slice(0, 10);

    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const ontemStr = ontem.toISOString().slice(0, 10);

    let minutos = 0,
      acessos = 0,
      streak = 1;

    // 🔎 Verifica se já existe registro hoje
    const [rowsHoje] = await pool.execute(
      `SELECT id, minutos_estudados, acessos, dias_seguidos 
       FROM evolucao 
       WHERE usuario_id = ? AND data = ?`,
      [usuario_id, hojeStr]
    );

    console.log("📊 Registro hoje:", rowsHoje);

    if (rowsHoje.length === 0) {
      // 🔎 Checa streak → precisa olhar ontem
      const [rowsOntem] = await pool.execute(
        `SELECT dias_seguidos FROM evolucao WHERE usuario_id = ? AND data = ?`,
        [usuario_id, ontemStr]
      );

      console.log("📊 Registro ontem:", rowsOntem);

      if (rowsOntem.length > 0) {
        streak = rowsOntem[0].dias_seguidos + 1;
      }

      // Primeiro ping do dia → cria registro
      await pool.execute(
        `INSERT INTO evolucao (usuario_id, data, minutos_estudados, acessos, dias_seguidos)
         VALUES (?, ?, 1, 1, ?)`,
        [usuario_id, hojeStr, streak]
      );

      minutos = 1;
      acessos = 1;
    } else {
      // Já existe registro hoje → atualiza só os minutos
      await pool.execute(
        `UPDATE evolucao 
         SET minutos_estudados = minutos_estudados + 1
         WHERE usuario_id = ? AND data = ?`,
        [usuario_id, hojeStr]
      );

      minutos = rowsHoje[0].minutos_estudados + 1;
      acessos = rowsHoje[0].acessos; // acessos só conta 1x no dia
      streak = rowsHoje[0].dias_seguidos;
    }

    return res.json({
      ok: true,
      data: { minutos, acessos, streak },
    });
  } catch (err) {
    console.error("❌ Erro ao registrar ping:", err.message, err.stack);
    return res
      .status(500)
      .json({ ok: false, msg: "Erro interno no ping", erro: err.message });
  }
});

module.exports = router;
