const { pool } = require('../db');

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS commandes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      utilisateur_id INT NOT NULL,
        numero_commande VARCHAR(100) UNIQUE NOT NULL,
        type_commande ENUM('commande_carte','abonnement') DEFAULT 'commande_carte',
        statut ENUM('En_attente','En_traitement','Expédiée','Livrée','Annulée') DEFAULT 'En_attente',
      montant_total DECIMAL(10,2) DEFAULT 0,
      adresse_livraison TEXT,
      date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      date_livraison TIMESTAMP NULL,
      CONSTRAINT fk_commande_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
  // Migration : s'assurer que l'ENUM statut inclut toutes les valeurs (Gravée + Annulée)
  await pool.query(`
    ALTER TABLE commandes
    MODIFY COLUMN statut ENUM('En_attente','En_traitement','Gravée','Expédiée','Livrée','Annulée')
    NOT NULL DEFAULT 'En_attente'
  `).catch(() => {});

  // Migration : colonnes paiement
  await pool.query(`ALTER TABLE commandes ADD COLUMN IF NOT EXISTS paiement_statut VARCHAR(50) NOT NULL DEFAULT 'non_payé'`).catch(() => {});
  await pool.query(`ALTER TABLE commandes ADD COLUMN IF NOT EXISTS paiement_mode VARCHAR(50) DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE commandes ADD COLUMN IF NOT EXISTS paiement_reference VARCHAR(255) DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE commandes ADD COLUMN IF NOT EXISTS paiement_date TIMESTAMP NULL DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE commandes ADD COLUMN IF NOT EXISTS paiement_note TEXT DEFAULT NULL`).catch(() => {});
}

async function createCommande(data) {
  const payload = {
    utilisateur_id: data.utilisateur_id,
    numero_commande: data.numero_commande,
    type_commande: data.type_commande || 'commande_carte',
    statut: data.statut || 'En_attente',
    montant_total: data.montant_total || 0,
    adresse_livraison: data.adresse_livraison || null,
  };
  const keys = Object.keys(payload).join(', ');
  const placeholders = Object.keys(payload).map(() => '?').join(', ');
  const values = Object.values(payload);
  const [result] = await pool.query(`INSERT INTO commandes (${keys}) VALUES (${placeholders})`, values);
  return { id: result.insertId, ...payload };
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM commandes WHERE id = ? LIMIT 1', [id]);
  return rows[0];
}

async function findByUser(userId) {
  const [rows] = await pool.query('SELECT * FROM commandes WHERE utilisateur_id = ? ORDER BY date_commande DESC', [userId]);
  return rows;
}

async function updateStatus(id, statut) {
  // When a commande is marked as delivered, set the delivery date.
  if (String(statut) === 'Livrée') {
    await pool.query('UPDATE commandes SET statut = ?, date_livraison = CURRENT_TIMESTAMP WHERE id = ?', [statut, id]);
  } else if (String(statut) === 'Annulée') {
    // If cancelled, clear any delivery date to keep data consistent
    await pool.query('UPDATE commandes SET statut = ?, date_livraison = NULL WHERE id = ?', [statut, id]);
  } else {
    await pool.query('UPDATE commandes SET statut = ? WHERE id = ?', [statut, id]);
  }
  return await findById(id);
}

async function updatePaiement(id, { paiement_statut, paiement_mode, paiement_reference, paiement_note }) {
  const fields = [];
  const vals = [];
  if (paiement_statut !== undefined) { fields.push('paiement_statut = ?'); vals.push(paiement_statut); }
  if (paiement_mode !== undefined)   { fields.push('paiement_mode = ?');   vals.push(paiement_mode); }
  if (paiement_reference !== undefined) { fields.push('paiement_reference = ?'); vals.push(paiement_reference); }
  if (paiement_note !== undefined)   { fields.push('paiement_note = ?');   vals.push(paiement_note); }
  if (paiement_statut === 'payé')    { fields.push('paiement_date = NOW()'); }
  if (fields.length === 0) return await findById(id);
  vals.push(id);
  await pool.query(`UPDATE commandes SET ${fields.join(', ')} WHERE id = ?`, vals);
  return await findById(id);
}

module.exports = { init, createCommande, findById, findByUser, updateStatus, updatePaiement };
