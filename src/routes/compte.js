const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  passwordChangeValidationRules,
  handleValidationErrors,
} = require('../middleware/validators');
const userService = require('../services/userService');

const router = express.Router();

router.use(requireAuth);

const COMPTE_LOCALS = {
  titrePage: 'Mon compte',
  pageActive: 'compte',
};

router.get('/mon-compte', (req, res) => {
  res.render('mon-compte', { ...COMPTE_LOCALS, erreurs: [] });
});

router.post(
  '/mon-compte/mot-de-passe',
  passwordChangeValidationRules,
  handleValidationErrors,
  async (req, res, next) => {
    if (req.validationErrors) {
      return res.status(400).render('mon-compte', {
        ...COMPTE_LOCALS,
        erreurs: req.validationErrors,
      });
    }

    try {
      const { motDePasseActuel, nouveauMotDePasse } = req.body;
      const result = await userService.changePassword(
        req.session.userId,
        motDePasseActuel,
        nouveauMotDePasse
      );

      if (!result.success) {
        return res.status(400).render('mon-compte', {
          ...COMPTE_LOCALS,
          erreurs: ['Le mot de passe actuel est incorrect.'],
        });
      }

      res.setFlash('succes', 'Votre mot de passe a été mis à jour.');
      res.redirect('/mon-compte');
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
