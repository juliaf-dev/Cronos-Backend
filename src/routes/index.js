// src/routes/index.js
const express = require("express");
const router = express.Router();

// 📌 Todas as rotas daqui já passam por `requireAuth` no server.js
// Então não precisa repetir requireAuth aqui

// Rotas protegidas
router.use("/assistente", require("./assistente"));
router.use("/topicos", require("./topicos"));
router.use("/subtopicos", require("./subtopicos")); // 🔹 versão protegida (diferente da pública em server.js)
router.use("/conteudos", require("./conteudos"));
router.use("/resumos", require("./resumos"));
router.use("/flashcards", require("./flashcards"));
router.use("/quiz", require("./quiz"));
router.use("/motivacoes", require("./motivacoes"));
router.use("/evolucao", require("./evolucao"));
router.use("/questoes", require("./questoes"));
router.use("/alternativas", require("./alternativas"));

// ⚠️ Não repetir materias aqui (já existe em rotas públicas)

// Healthcheck protegido
router.get("/", (req, res) =>
  res.json({ ok: true, message: "API Cronos protegida funcionando!" })
);

module.exports = router;
