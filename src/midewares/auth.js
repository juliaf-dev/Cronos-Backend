export const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    // Se o usuário estiver autenticado na sessão, continua para a próxima função de middleware
    return next();
  }
  // Se não estiver autenticado, retorna um erro 401
  res.status(401).json({ error: 'Não autenticado. Por favor, faça login.' });
};
