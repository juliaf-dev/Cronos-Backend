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
const quizRoutes = require("./routes/quiz");        // 🔹 novo
const evolucaoRoutes = require("./routes/evolucao"); // 🔹 novo
const protectedRoutes = require("./routes/index");
const resumosRoutes = require("./routes/resumos");
const app = express();

app.disable("x-powered-by");
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: CORS_ORIGIN,
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

// 🔹 Rotas protegidas (só logado)
app.use("/api/quiz", requireAuth, quizRoutes);         // 🔹 Quiz
app.use("/api/evolucao", requireAuth, evolucaoRoutes); // 🔹 Evolução
app.use("/api/resumos", requireAuth, resumosRoutes);

app.use("/api", requireAuth, protectedRoutes);

// 🔹 Rota admin (só logado + admin)
app.get("/api/admin/ping", requireAuth, requireAdmin, (req, res) =>
  res.json({ ok: true, role: "admin" })
);

// 🔹 404
app.use((req, res) =>
  res.status(404).json({ ok: false, message: "Rota não encontrada" })
);

// 🔹 Erros globais
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Cronos API rodando em http://localhost:${PORT}`);
});
