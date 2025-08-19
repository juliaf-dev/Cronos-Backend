function ok(res, data = {}, status = 200) {
  return res.status(status).json({ ok: true, data });
}
function fail(res, message = 'Erro', status = 400, extra) {
  return res.status(status).json({ ok: false, message, ...(extra ? { extra } : {}) });
}
module.exports = { ok, fail };
