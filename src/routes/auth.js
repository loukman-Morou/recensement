const express = require('express');
const {
  loginValidationRules,
  handleValidationErrors,
} = require('../middleware/validators');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/security');
const userService = require('../services/userService');

const router = express.Router();

router.get('/connexion', redirectIfAuthenticated, (req, res) => {
  res.render('connexion', { erreurs: [] });
});

router.post(
  '/connexion',
  loginRateLimiter,
  redirectIfAuthenticated,
  loginValidationRules,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      if (req.validationErrors) {
        return res.status(400).render('connexion', {
          erreurs: req.validationErrors,
        });
      }

      const { username, password } = req.body;
      const user = await userService.verifyCredentials(username, password);

      if (!user) {
        return res.status(401).render('connexion', {
          erreurs: ['Identifiant ou mot de passe incorrect.'],
        });
      }

      // Régénère l'identifiant de session à la connexion : empêche la
      // fixation de session (un identifiant de session obtenu avant
      // l'authentification devient inutilisable après coup).
      req.session.regenerate((err) => {
        if (err) return next(err);

        req.session.userId = user.id;
        req.session.username = user.username;

        const redirectTo = req.session.postLoginRedirect || '/clients';
        delete req.session.postLoginRedirect;
        res.redirect(redirectTo);
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/deconnexion', (req, res, next) => {
  const cookieName = req.app.get('sessionCookieName');
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(cookieName);
    res.redirect('/connexion');
  });
});

module.exports = router;
