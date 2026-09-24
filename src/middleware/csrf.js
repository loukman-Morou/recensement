const crypto = require('crypto');

// Protection CSRF simple et explicite (pas de dépendance tierce dépréciée) :
// 1. un jeton aléatoire est généré une fois par session et exposé aux vues ;
// 2. chaque formulaire le renvoie dans un champ caché "_csrf" ;
// 3. toute requête qui modifie l'état (POST/PUT/PATCH/DELETE) doit renvoyer
//    exactement ce jeton, sinon elle est rejetée.
// Un attaquant externe qui forge un formulaire sur un autre site ne peut pas
// connaître ce jeton : sans lui, la requête est refusée.
function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(req.method)) {
    const submitted = req.body ? req.body._csrf : undefined;
    const expected = req.session.csrfToken;
    const isValid =
      typeof submitted === 'string' &&
      typeof expected === 'string' &&
      submitted.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected));

    if (!isValid) {
      return res.status(403).render('erreur', {
        titre: 'Requête refusée',
        message:
          'Jeton de sécurité invalide ou expiré. Rechargez la page et réessayez.',
      });
    }
  }

  next();
}

module.exports = csrfProtection;
