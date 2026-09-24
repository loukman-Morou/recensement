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
    path: process.env.DATABASE_PATH || './data/recensement.db',
  },
};

module.exports = config;
