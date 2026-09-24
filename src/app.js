const path = require('path');
const express = require('express');
const session = require('express-session');

const config = require('./config');
const { helmetMiddleware } = require('./middleware/security');
const csrfProtection = require('./middleware/csrf');
const flashMiddleware = require('./middleware/flash');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const compteRoutes = require('./routes/compte');

const app = express();

// Nécessaire pour que les cookies "secure" fonctionnent correctement
// lorsque l'application est servie derrière un reverse proxy TLS
// (Nginx, Caddy, load balancer...) en production.
if (config.isProduction) {
  app.set('trust proxy', 1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.set('sessionCookieName', config.session.cookieName);

app.use(helmetMiddleware);

// Les fichiers statiques sont servis avant la session : cela évite de
// créer un cookie de session pour de simples requêtes de CSS/JS, et
// réduit le travail effectué pour ces requêtes très fréquentes.
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    // Pas d'index automatique, pas de fuite de la liste des fichiers.
    index: false,
    dotfiles: 'ignore',
  })
);

app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(
  session({
    name: config.session.cookieName,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.session.secureCookie,
      maxAge: config.session.maxAgeMs,
    },
  })
);
app.use(csrfProtection);
app.use(flashMiddleware);

// Rend le nom d'utilisateur connecté disponible dans toutes les vues
// (utile pour l'en-tête / la barre latérale), sans avoir à le repasser
// explicitement à chaque res.render().
app.use((req, res, next) => {
  res.locals.utilisateurConnecte = req.session ? req.session.username : null;
  next();
});

app.get('/', (req, res) => {
  res.redirect(req.session.userId ? '/clients' : '/connexion');
});

app.use(authRoutes);
app.use(clientRoutes);
app.use(compteRoutes);

app.use((req, res) => {
  res.status(404).render('erreur', {
    titre: 'Page introuvable',
    message: "Cette page n'existe pas.",
  });
});

// Gestionnaire d'erreurs centralisé. En production, on n'expose jamais le
// détail technique de l'erreur à l'utilisateur (pas de stack trace, pas de
// message d'exception brut), pour éviter de révéler des informations
// utiles à un attaquant.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('erreur', {
    titre: 'Erreur inattendue',
    message: config.isProduction
      ? "Une erreur est survenue. Réessayez plus tard."
      : err.message,
  });
});

app.listen(config.port, () => {
  console.log(`Serveur démarré sur http://localhost:${config.port}`);
  if (!config.isProduction) {
    console.log('Mode développement — vérifiez votre fichier .env avant la mise en production.');
  }
});

module.exports = app;
