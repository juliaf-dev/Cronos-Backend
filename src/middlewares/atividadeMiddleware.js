const pool = require("../config/db");

async function registrarAtividade(req, res, next) {
  try {
    const usuario_id = req.user?.id || req.body.usuario_id || req.params.usuarioId;
    if (!usuario_id) return next();

    const hoje = new Date().toISOString().slice(0, 10);

    // Busca registro de hoje
    const [[registro]] = await pool.execute(
      `SELECT * FROM evolucao WHERE usuario_id = ? AND data = ?`,
      [usuario_id, hoje]
    );

    // calcula streak
    let dias_seguidos = 1;
    if (!registro) {
      const [[ontemRegistro]] = await pool.execute(
        `SELECT data, dias_seguidos FROM evolucao
         WHERE usuario_id = ? ORDER BY data DESC LIMIT 1`,
        [usuario_id]
      );

      if (ontemRegistro) {
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        const ontemStr = ontem.toISOString().slice(0, 10);

        if (ontemRegistro.data.toISOString().slice(0, 10) === ontemStr) {
          dias_seguidos = ontemRegistro.dias_seguidos + 1;
        }
      }
    }

    if (registro) {
      await pool.execute(
        `UPDATE evolucao 
           SET acessos = acessos + 1
         WHERE id = ?`,
        [registro.id]
      );
    } else {
      await pool.execute(
        `INSERT INTO evolucao (usuario_id, data, minutos_estudados, acessos, dias_seguidos)
             VALUES (?, ?, 0, 1, ?)`,
        [usuario_id, hoje, dias_seguidos]
      );
    }

    next();
  } catch (err) {
    console.error("⚠️ Erro no middleware registrarAtividade:", err);
    next();
  }
}

module.exports = registrarAtividade;
