const db = require('../db');

const PAGE_SIZE = 20;

const insertClient = db.prepare(`
  INSERT INTO clients (nom, prenom, telephone, email, adresse)
  VALUES (?, ?, ?, ?, ?)
`);

const findClientById = db.prepare('SELECT * FROM clients WHERE id = ?');

const updateClientStmt = db.prepare(`
  UPDATE clients
  SET nom = ?, prenom = ?, telephone = ?, email = ?, adresse = ?
  WHERE id = ?
`);

const deleteClientStmt = db.prepare('DELETE FROM clients WHERE id = ?');

/**
 * Enregistre un nouveau client.
 * Les champs sont déjà validés en amont (voir middleware/validators.js) ;
 * ils sont insérés ici via des paramètres liés positionnels, jamais
 * concaténés dans la requête SQL : aucune injection SQL possible par ce
 * chemin.
 */
function createClient({ nom, prenom, telephone, email, adresse }) {
  const result = insertClient.run(
    nom,
    prenom,
    telephone,
    email || null,
    adresse || null
  );
  return result.lastInsertRowid;
}

/**
 * Retourne un client par son identifiant, ou undefined s'il n'existe pas.
 */
function getClientById(id) {
  return findClientById.get(id);
}

/**
 * Met à jour un client existant. Retourne true si un client a bien été
 * modifié, false si l'identifiant ne correspond à aucun client.
 */
function updateClient(id, { nom, prenom, telephone, email, adresse }) {
  const result = updateClientStmt.run(
    nom,
    prenom,
    telephone,
    email || null,
    adresse || null,
    id
  );
  return result.changes > 0;
}

/**
 * Supprime un client. Retourne true si un client a bien été supprimé.
 */
function deleteClient(id) {
  const result = deleteClientStmt.run(id);
  return result.changes > 0;
}

/**
 * Retourne une page de clients, avec un filtre de recherche optionnel
 * sur le nom, le prénom ou le téléphone.
 */
function listClients({ search = '', page = 1 } = {}) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * PAGE_SIZE;
  const term = search && search.trim() !== '' ? `%${search.trim()}%` : null;

  const where = term ? 'WHERE nom LIKE ? OR prenom LIKE ? OR telephone LIKE ?' : '';
  const whereParams = term ? [term, term, term] : [];

  const rows = db
    .prepare(
      `SELECT * FROM clients ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(...whereParams, PAGE_SIZE, offset);

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM clients ${where}`)
    .get(...whereParams);

  return {
    rows,
    total,
    page: safePage,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/**
 * Retourne tous les clients correspondant à la recherche, sans pagination,
 * pour l'export PDF complet.
 */
function listAllClients({ search = '' } = {}) {
  const term = search && search.trim() !== '' ? `%${search.trim()}%` : null;
  const where = term ? 'WHERE nom LIKE ? OR prenom LIKE ? OR telephone LIKE ?' : '';
  const whereParams = term ? [term, term, term] : [];

  return db
    .prepare(`SELECT * FROM clients ${where} ORDER BY id ASC`)
    .all(...whereParams);
}

module.exports = {
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  listClients,
  listAllClients,
  PAGE_SIZE,
};
