const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Politique de sécurité de contenu (CSP) stricte : tout le CSS/JS est
// servi depuis notre propre domaine, aucune ressource externe (CDN,
// polices Google, etc.) n'est chargée. Cela réduit fortement la surface
// d'attaque XSS et évite toute fuite de données vers des tiers.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'same-origin' },
});

// Limite les tentatives de connexion pour freiner les attaques par force
// brute : 8 essais par tranche de 15 minutes, par adresse IP.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message:
    'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
});

module.exports = { helmetMiddleware, loginRateLimiter };
