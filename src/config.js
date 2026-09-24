// Point d'entrée unique pour toute la configuration de l'application.
// Centraliser la lecture des variables d'environnement ici évite les
// `process.env.X` disséminés dans tout le code et facilite la maintenance.

require('dotenv').config();

function required(name, fallbackForDev) {
  const value = process.env[name];
  if (value && value.trim() !== '') return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Variable d'environnement obligatoire manquante : ${name}. ` +
      'Vérifiez votre fichier .env (voir .env.example).'
    );
  }

  return fallbackForDev;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 3000,

  session: {
    secret: required(
      'SESSION_SECRET',
      'secret-de-developpement-ne-pas-utiliser-en-production'
    ),
    cookieName: process.env.SESSION_COOKIE_NAME || 'recensement.sid',
    // En production, ce cookie DOIT être envoyé uniquement en HTTPS.
    secureCookie: process.env.COOKIE_SECURE === 'true',
    // Durée de vie de la session : 8h, adaptée à une journée de travail.
    maxAgeMs: 8 * 60 * 60 * 1000,
  },

  database: {
    // Render (et la plupart des hébergeurs) fournissent cette variable
    // automatiquement quand une base PostgreSQL est liée au service.
    url: required(
      'DATABASE_URL',
      'postgresql://postgres:postgres@localhost:5432/recensement'
    ),
    // La plupart des PostgreSQL managés (Render, Heroku, Supabase...)
    // exigent TLS, avec un certificat auto-signé côté serveur : on ne
    // vérifie donc pas la chaîne de certificats. Mettre DATABASE_SSL=false
    // explicitement pour une base locale sans TLS.
    ssl:
      process.env.DATABASE_SSL === 'false'
        ? false
        : process.env.DATABASE_SSL === 'true' ||
          process.env.NODE_ENV === 'production',
  },

  // Permet de créer LE PREMIER compte administrateur via une page web,
  // pour les hébergements où l'on n'a pas d'accès shell (ex. Render sur
  // un plan sans "Shell"). Laisser cette variable absente désactive
  // complètement la fonctionnalité. Voir README.md.
  adminBootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET || null,
};

module.exports = config;
