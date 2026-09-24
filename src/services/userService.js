const bcrypt = require('bcryptjs');
const db = require('../db');

// Coût bcrypt : 12 est un bon compromis sécurité/performance en 2026
// (recommandation OWASP courante : >= 10-12).
const BCRYPT_COST = 12;

const findByUsername = db.prepare(
  'SELECT * FROM users WHERE username = ?'
);

const insertUser = db.prepare(
  'INSERT INTO users (username, password_hash) VALUES (?, ?)'
);

const updatePassword = db.prepare(
  'UPDATE users SET password_hash = ? WHERE username = ?'
);

const findById = db.prepare('SELECT * FROM users WHERE id = ?');

const updatePasswordById = db.prepare(
  'UPDATE users SET password_hash = ? WHERE id = ?'
);

const countUsers = db.prepare('SELECT COUNT(*) AS total FROM users');

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
  const user = findByUsername.get(username);
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;

  return { id: user.id, username: user.username };
}

async function createOrUpdateUser(username, plainPassword) {
  const hash = await bcrypt.hash(plainPassword, BCRYPT_COST);
  const existing = findByUsername.get(username);
  if (existing) {
    updatePassword.run(hash, username);
    return { updated: true };
  }
  insertUser.run(username, hash);
  return { updated: false };
}

function hasAnyUser() {
  return countUsers.get().total > 0;
}

/**
 * Change le mot de passe d'un utilisateur déjà connecté, après avoir
 * vérifié son mot de passe actuel. Ne fait jamais confiance à un simple
 * identifiant de session pour changer un mot de passe sans revérifier le
 * mot de passe actuel : cela évite qu'une session laissée ouverte sur un
 * poste partagé permette à quelqu'un d'autre de reprendre le compte.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = findById.get(userId);
  if (!user) {
    return { success: false, reason: 'UTILISATEUR_INTROUVABLE' };
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return { success: false, reason: 'MOT_DE_PASSE_ACTUEL_INCORRECT' };
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
  updatePasswordById.run(hash, userId);
  return { success: true };
}

module.exports = {
  verifyCredentials,
  createOrUpdateUser,
  changePassword,
  hasAnyUser,
};
