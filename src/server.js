// src/server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const { PORT, CORS_ORIGIN } = require("./config/env");
const { errorHandler } = require("./middlewares/errorHandler");
const { requireAuth, requireAdmin, refreshFromCookie } = require("./middlewares/auth");

// Rotas
const authRoutes = require("./routes/auth");
const materiasRoutes = require("./routes/materias");
const subtopicosPublicRoutes = require("./routes/subtopicosPublic");
const quizRoutes = require("./routes/quiz");
const evolucaoRoutes = require("./routes/evolucao");
const resumosRoutes = require("./routes/resumos");
const flashcardsRoutes = require("./routes/flashcards");
const protectedRoutes = require("./routes/index");
const assistenteRoutes = require("./routes/assistente");

const app = express();

// 🔹 Middlewares globais
app.disable("x-powered-by");
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// 🔹 Configuração de CORS (aceita múltiplas origins da env)
const allowedOrigins = (CORS_ORIGIN || "").split(",").map(o => o.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 🔹 Healthcheck (sempre aberto)
app.get("/api/health", (req, res) =>
  res.json({ ok: true, service: "cronos-backend" })
);

// 🔹 Auth
app.post("/api/auth/refresh-cookie", refreshFromCookie); // refresh SEM rate-limit
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api/auth", authLimiter, authRoutes);

// 🔹 Rotas públicas
app.use("/api/materias", materiasRoutes);
app.use("/api/subtopicos", subtopicosPublicRoutes);
app.use("/api/assistente", assistenteRoutes);

// 🔹 Rotas protegidas
app.use("/api/quiz", requireAuth, quizRoutes);
app.use("/api/evolucao", requireAuth, evolucaoRoutes); // ✅ agora protegido
app.use("/api/resumos", requireAuth, resumosRoutes);
app.use("/api/flashcards", requireAuth, flashcardsRoutes);
app.use("/api", requireAuth, protectedRoutes);

// 🔹 Rota admin
app.get("/api/admin/ping", requireAuth, requireAdmin, (req, res) =>
  res.json({ ok: true, role: "admin" })
);

// 🔹 404 handler (deixa por último)
app.use((req, res) =>
  res.status(404).json({ ok: false, message: "Rota não encontrada" })
);

// 🔹 Error handler global
app.use(errorHandler);

// 🔹 Inicialização
app.listen(PORT, () => {
  console.log(`🚀 Cronos API rodando em http://localhost:${PORT}`);
});
