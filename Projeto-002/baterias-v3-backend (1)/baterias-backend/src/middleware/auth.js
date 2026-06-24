// Middleware de autenticação
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.admin) return next();
  return res.status(403).json({ erro: 'Acesso negado.' });
}

module.exports = { requireAuth, requireAdmin };
