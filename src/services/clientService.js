const { pool } = require('../db');

const PAGE_SIZE = 20;

/**
 * Enregistre un nouveau client.
 * Les champs sont déjà validés en amont (voir middleware/validators.js) ;
 * ils sont insérés ici via des paramètres liés positionnels, jamais
 * concaténés dans la requête SQL : aucune injection SQL possible par ce
 * chemin.
 */
async function createClient({ nom, prenom, telephone, email, adresse }) {
  const { rows } = await pool.query(
    `INSERT INTO clients (nom, prenom, telephone, email, adresse)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [nom, prenom, telephone, email || null, adresse || null]
  );
  return rows[0].id;
}

/**
 * Retourne un client par son identifiant, ou undefined s'il n'existe pas.
 */
async function getClientById(id) {
  const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
  return rows[0];
}

/**
 * Met à jour un client existant. Retourne true si un client a bien été
 * modifié, false si l'identifiant ne correspond à aucun client.
 */
async function updateClient(id, { nom, prenom, telephone, email, adresse }) {
  const result = await pool.query(
    `UPDATE clients
     SET nom = $1, prenom = $2, telephone = $3, email = $4, adresse = $5
     WHERE id = $6`,
    [nom, prenom, telephone, email || null, adresse || null, id]
  );
  return result.rowCount > 0;
}

/**
 * Supprime un client. Retourne true si un client a bien été supprimé.
 */
async function deleteClient(id) {
  const result = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  return result.rowCount > 0;
}

/**
 * Retourne une page de clients, avec un filtre de recherche optionnel
 * sur le nom, le prénom ou le téléphone (insensible à la casse : ILIKE).
 */
async function listClients({ search = '', page = 1 } = {}) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * PAGE_SIZE;
  const term = search && search.trim() !== '' ? `%${search.trim()}%` : null;

  const where = term
    ? 'WHERE nom ILIKE $1 OR prenom ILIKE $1 OR telephone ILIKE $1'
    : '';
  const whereParams = term ? [term] : [];

  const limitPlaceholder = `$${whereParams.length + 1}`;
  const offsetPlaceholder = `$${whereParams.length + 2}`;

  const rowsResult = await pool.query(
    `SELECT * FROM clients ${where}
     ORDER BY id DESC
     LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    [...whereParams, PAGE_SIZE, offset]
  );

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM clients ${where}`,
    whereParams
  );
  const total = countResult.rows[0].total;

  return {
    rows: rowsResult.rows,
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
async function listAllClients({ search = '' } = {}) {
  const term = search && search.trim() !== '' ? `%${search.trim()}%` : null;
  const where = term
    ? 'WHERE nom ILIKE $1 OR prenom ILIKE $1 OR telephone ILIKE $1'
    : '';
  const whereParams = term ? [term] : [];

  const { rows } = await pool.query(
    `SELECT * FROM clients ${where} ORDER BY id ASC`,
    whereParams
  );
  return rows;
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
