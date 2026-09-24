const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const userService = require('../services/userService');

const router = express.Router();

// Très strict : quelques essais par tranche de 15 minutes suffisent pour
// un usage légitime (une seule fois, par la personne qui déploie).
const bootstrapRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

function bootstrapEnabled() {
  return (
    typeof config.adminBootstrapSecret === 'string' &&
    config.adminBootstrapSecret.length >= 16
  );
}

function tokenIsValid(candidate) {
  if (!bootstrapEnabled() || typeof candidate !== 'string') return false;
  const expected = config.adminBootstrapSecret;
  // Comparaison à taille égale requise par timingSafeEqual : si les
  // longueurs diffèrent, le jeton est de toute façon invalide.
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

function pageIntrouvable(res) {
  return res.status(404).render('erreur', {
    titre: 'Page introuvable',
    message: "Cette page n'existe pas.",
  });
}

function amorcageIndisponible(res) {
  return res.status(403).render('erreur', {
    titre: 'Amorçage indisponible',
    message:
      "Un compte administrateur existe déjà, ou l'amorçage n'est pas activé. " +
      'Utilisez la page de connexion habituelle.',
  });
}

// Vérifie, dans l'ordre : la fonctionnalité est activée, aucun admin
// n'existe encore, puis le jeton fourni est correct. Chaque étape échoue
// de la même façon (403/404) pour ne pas révéler laquelle a échoué.
async function verifierAcces(req, res) {
  if (!bootstrapEnabled()) {
    pageIntrouvable(res);
    return false;
  }
  if (await userService.hasAnyUser()) {
    amorcageIndisponible(res);
    return false;
  }
  const jeton = typeof req.query.jeton === 'string' ? req.query.jeton : req.body.jeton;
  if (!tokenIsValid(jeton)) {
    amorcageIndisponible(res);
    return false;
  }
  return true;
}

router.get('/amorcage-admin', bootstrapRateLimiter, async (req, res, next) => {
  try {
    if (!(await verifierAcces(req, res))) return;
    res.render('amorcage-admin', { erreurs: [], jeton: req.query.jeton });
  } catch (err) {
    next(err);
  }
});

router.post('/amorcage-admin', bootstrapRateLimiter, async (req, res, next) => {
  try {
    if (!(await verifierAcces(req, res))) return;

    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const confirmation = typeof req.body.confirmation === 'string' ? req.body.confirmation : '';

    const erreurs = [];
    if (username.length < 3 || username.length > 100) {
      erreurs.push("L'identifiant doit contenir entre 3 et 100 caractères.");
    }
    if (password.length < 10 || password.length > 200) {
      erreurs.push('Le mot de passe doit contenir au moins 10 caractères.');
    }
    if (password !== confirmation) {
      erreurs.push('Les deux mots de passe ne correspondent pas.');
    }

    if (erreurs.length > 0) {
      return res.status(400).render('amorcage-admin', {
        erreurs,
        jeton: req.body.jeton,
      });
    }

    await userService.createOrUpdateUser(username, password);
    res.render('amorcage-admin-succes', { username });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
