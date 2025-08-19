function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ ok: false, message: err.message || 'Erro interno' });
}
module.exports = { errorHandler };
