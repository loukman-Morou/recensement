const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// Coût bcrypt : 12 est un bon compromis sécurité/performance en 2026
// (recommandation OWASP courante : >= 10-12).
const BCRYPT_COST = 12;

// Hash factice, valide et généré une seule fois au démarrage, utilisé
// uniquement pour que la vérification d'un identifiant inexistant prenne
// un temps comparable à celle d'un identifiant existant (défense contre
// les attaques par mesure de latence, dites "timing attacks").
const DUMMY_HASH = bcrypt.hashSync('valeur-de-remplissage-sans-signification', BCRYPT_COST);

/**
 * Vérifie un couple identifiant/mot de passe.
 * Retourne l'utilisateur (sans le hash) si valide, sinon null.
 */
async function verifyCredentials(username, password) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  const user = rows[0];

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;

  return { id: user.id, username: user.username };
}

/**
 * Crée un administrateur, ou met à jour son mot de passe s'il existe déjà.
 * Utilisé par le script CLI (scripts/createAdmin.js) et par la page
 * d'amorçage (src/routes/amorcage.js).
 */
async function createOrUpdateUser(username, plainPassword) {
  const hash = await bcrypt.hash(plainPassword, BCRYPT_COST);
  const { rows } = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );

  if (rows[0]) {
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [hash, username]
    );
    return { updated: true };
  }

  await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
    [username, hash]
  );
  return { updated: false };
}

async function hasAnyUser() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM users');
  return rows[0].total > 0;
}

/**
 * Change le mot de passe d'un utilisateur déjà connecté, après avoir
 * vérifié son mot de passe actuel. Ne fait jamais confiance à un simple
 * identifiant de session pour changer un mot de passe sans revérifier le
 * mot de passe actuel : cela évite qu'une session laissée ouverte sur un
 * poste partagé permette à quelqu'un d'autre de reprendre le compte.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) {
    return { success: false, reason: 'UTILISATEUR_INTROUVABLE' };
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return { success: false, reason: 'MOT_DE_PASSE_ACTUEL_INCORRECT' };
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  return { success: true };
}

module.exports = {
  verifyCredentials,
  createOrUpdateUser,
  changePassword,
  hasAnyUser,
};
