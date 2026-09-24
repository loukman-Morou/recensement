// Exige une session authentifiée pour accéder à une route.
// L'état d'authentification est stocké côté serveur (session), le client
// ne détient qu'un identifiant de session opaque et signé (cookie).
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.postLoginRedirect = req.originalUrl;
  return res.redirect('/connexion');
}

// Évite qu'un utilisateur déjà connecté ne retombe sur la page de connexion.
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/clients');
  }
  return next();
}

module.exports = { requireAuth, redirectIfAuthenticated };
