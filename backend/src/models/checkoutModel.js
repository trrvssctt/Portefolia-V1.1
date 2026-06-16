const { pool } = require('../db');
const crypto = require('crypto');

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS checkouts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(128) NOT NULL UNIQUE,
      utilisateur_id INT NOT NULL,
      plan_id INT NOT NULL,
      commande_id INT DEFAULT NULL,
      abonnement_id INT DEFAULT NULL,
      paiement_id INT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      expires_at TIMESTAMP NULL,
      metadata JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
      FOREIGN KEY (paiement_id) REFERENCES paiements(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  // Ajouter abonnement_id si la table existait avant que cette colonne soit introduite
  try {
    await pool.query(`ALTER TABLE checkouts ADD COLUMN abonnement_id INT DEFAULT NULL AFTER commande_id`);
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  // commande_id doit être nullable (abonnements sans commande)
  try {
    await pool.query(`ALTER TABLE checkouts MODIFY commande_id INT DEFAULT NULL`);
  } catch (e) { /* ignore */ }
  // Type de checkout pour distinguer signup / reabonnement / renewal
  try {
    await pool.query(`ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS checkout_type VARCHAR(50) DEFAULT 'signup'`);
  } catch (e) { /* ignore if not supported */ }
}

function genToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function createCheckout({ utilisateur_id, plan_id, commande_id = null, abonnement_id = null, paiement_id, expires_at = null, metadata = null, checkout_type = 'signup' }) {
  const token = genToken();
  const [result] = await pool.query(
    `INSERT INTO checkouts (token, utilisateur_id, plan_id, commande_id, abonnement_id, paiement_id, expires_at, metadata, checkout_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [token, utilisateur_id, plan_id, commande_id, abonnement_id, paiement_id, expires_at, metadata ? JSON.stringify(metadata) : null, checkout_type]
  );
  return { id: result.insertId, token, utilisateur_id, plan_id, commande_id, abonnement_id, paiement_id, expires_at, checkout_type };
}

async function findByToken(token) {
  const [rows] = await pool.query(`SELECT * FROM checkouts WHERE token = ? LIMIT 1`, [token]);
  return rows && rows.length ? rows[0] : null;
}

async function updateStatus(id, status) {
  await pool.query('UPDATE checkouts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
  const [rows] = await pool.query('SELECT * FROM checkouts WHERE id = ? LIMIT 1', [id]);
  return rows && rows.length ? rows[0] : null;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM checkouts WHERE id = ? LIMIT 1', [id]);
  return rows && rows.length ? rows[0] : null;
}

async function list({ page = 1, limit = 50, checkout_type = null } = {}) {
  const l = Math.min(Number(limit) || 50, 200);
  const p = Math.max(Number(page) || 1, 1);
  const offset = (p - 1) * l;
  // Filtre par checkout_type + rétrocompatibilité via metadata.purpose pour les anciens enregistrements
  const typeFilter = checkout_type
    ? `AND (c.checkout_type = ? OR JSON_UNQUOTE(JSON_EXTRACT(c.metadata, '$.purpose')) = ?)`
    : '';
  const params = checkout_type ? [checkout_type, checkout_type, l, offset] : [l, offset];
  const [rows] = await pool.query(
    `SELECT c.*,
       u.email AS user_email, u.nom AS user_nom, u.prenom AS user_prenom,
       p.name AS plan_name, p.price_cents AS plan_price_cents,
       pai.statut AS paiement_statut, pai.montant AS paiement_montant,
       pai.reference_transaction, pai.moyen_paiement, pai.image_paiement
     FROM checkouts c
     LEFT JOIN utilisateurs u ON u.id = c.utilisateur_id
     LEFT JOIN plans p ON p.id = c.plan_id
     LEFT JOIN paiements pai ON pai.id = c.paiement_id
     WHERE 1=1 ${typeFilter}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return { checkouts: rows, page: p, limit: l };
}

module.exports = { init, createCheckout, findByToken, updateStatus, findById, list };
