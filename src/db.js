// Connexion à la base de données PostgreSQL.
//
// Toutes les requêtes de ce projet utilisent des requêtes préparées avec
// paramètres liés positionnels ("$1", "$2"...), ce qui élimine par
// construction les injections SQL.

const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Erreur sur une connexion inactive du pool (ex. coupure réseau) :
  // on la journalise sans arrêter le serveur, le pool en récupère une
  // nouvelle à la prochaine requête.
  console.error('Erreur inattendue du pool PostgreSQL :', err);
});

/**
 * Crée les tables si elles n'existent pas encore. Idempotent : peut être
 * appelé à chaque démarrage sans risque.
 */
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id                   SERIAL PRIMARY KEY,
      nom                  TEXT NOT NULL,
      prenom               TEXT NOT NULL,
      telephone            TEXT NOT NULL,
      email                TEXT,
      adresse              TEXT,
      date_enregistrement  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_clients_nom_prenom ON clients (nom, prenom);
  `);
}

module.exports = { pool, initSchema };
