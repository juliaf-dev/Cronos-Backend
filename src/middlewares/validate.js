function validate(schema, where = 'body') {
  return (req, res, next) => {
    const data = req[where];
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: 'Validação falhou', issues: parsed.error.issues });
    }
    req[where] = parsed.data;
    next();
  };
}
module.exports = { validate };
