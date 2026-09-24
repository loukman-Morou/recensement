// Messages flash minimalistes : un message stocké en session, affiché une
// seule fois puis supprimé. Permet le pattern Post/Redirect/Get, qui évite
// la réémission d'un formulaire si l'utilisateur recharge la page après
// un succès (et donc les doublons d'enregistrement).
function flashMiddleware(req, res, next) {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;

  res.setFlash = (type, message) => {
    req.session.flash = { type, message };
  };

  next();
}

module.exports = flashMiddleware;
