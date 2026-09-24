// Connexion à la base de données SQLite.
//
// On utilise le module `node:sqlite`, intégré à Node.js depuis la version
// 22 : aucun paquet natif à compiler (contrairement à better-sqlite3, qui
// nécessite des outils de compilation C++ souvent absents sur les postes
// Windows). Toutes les requêtes de ce projet utilisent des requêtes
// préparées avec paramètres liés positionnels ("?"), ce qui élimine par
// construction les injections SQL.
//
// Ce module est marqué "expérimental" par Node.js, mais il n'a plus besoin
// d'option de lancement particulière depuis Node 22.13 / 23.4. Node 22.13+
// est requis pour faire fonctionner cette application (voir package.json).

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

const dbPath = path.resolve(process.cwd(), config.database.path);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

// Active la vérification des clés étrangères (désactivée par défaut dans SQLite).
db.exec('PRAGMA foreign_keys = ON;');
// WAL améliore la fiabilité/concurrence pour un usage multi-requêtes léger.
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    nom                  TEXT NOT NULL,
    prenom               TEXT NOT NULL,
    telephone            TEXT NOT NULL,
    email                TEXT,
    adresse              TEXT,
    date_enregistrement  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_clients_nom_prenom ON clients (nom, prenom);
`);

module.exports = db;
