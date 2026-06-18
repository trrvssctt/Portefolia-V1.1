const { pool } = require('../db');

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cartes_nfc (
      id INT AUTO_INCREMENT PRIMARY KEY,
      commande_id INT NOT NULL,
      uid_nfc VARCHAR(150) UNIQUE NOT NULL,
      lien_portfolio TEXT,
      design TEXT,
      statut VARCHAR(50) DEFAULT 'En_attente',
      is_active TINYINT(1) NOT NULL DEFAULT 0,
      activated_at TIMESTAMP NULL DEFAULT NULL,
      date_activation TIMESTAMP NULL DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_carte_commande FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // Migrations pour tables existantes
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cartes_nfc'`
  ).catch(() => [[]]);
  const existing = (cols || []).map(c => c.COLUMN_NAME);

  if (!existing.includes('is_active')) {
    await pool.query(`ALTER TABLE cartes_nfc ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {});
  }
  if (!existing.includes('activated_at')) {
    await pool.query(`ALTER TABLE cartes_nfc ADD COLUMN activated_at TIMESTAMP NULL DEFAULT NULL`).catch(() => {});
  }
  if (!existing.includes('notes')) {
    await pool.query(`ALTER TABLE cartes_nfc ADD COLUMN notes TEXT DEFAULT NULL`).catch(() => {});
  }
  if (!existing.includes('created_at')) {
    await pool.query(`ALTER TABLE cartes_nfc ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).catch(() => {});
  }
  if (!existing.includes('updated_at')) {
    await pool.query(`ALTER TABLE cartes_nfc ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP`).catch(() => {});
  }
  // Migrer ENUM → VARCHAR pour accepter tous les statuts
  await pool.query(
    `ALTER TABLE cartes_nfc MODIFY COLUMN statut VARCHAR(50) DEFAULT 'En_attente'`
  ).catch(() => {});
}

async function createCarte(data) {
  const payload = {
    commande_id: data.commande_id,
    uid_nfc: data.uid_nfc,
    lien_portfolio: data.lien_portfolio || null,
    design: data.design || null,
    statut: data.statut || 'En_attente',
  };
  const keys = Object.keys(payload).join(', ');
  const placeholders = Object.keys(payload).map(() => '?').join(', ');
  const values = Object.values(payload);
  const [result] = await pool.query(`INSERT INTO cartes_nfc (${keys}) VALUES (${placeholders})`, values);
  return { id: result.insertId, ...payload };
}

async function findByCommande(commandeId) {
  const [rows] = await pool.query('SELECT * FROM cartes_nfc WHERE commande_id = ?', [commandeId]);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM cartes_nfc WHERE id = ? LIMIT 1', [id]);
  return rows && rows.length ? rows[0] : null;
}

async function findAll({ page = 1, limit = 100, statut, commande_id } = {}) {
  const l = Math.min(Number(limit) || 100, 1000);
  const p = Math.max(Number(page) || 1, 1);
  const offset = (p - 1) * l;
  const where = [];
  const params = [];
  if (statut) { where.push('statut = ?'); params.push(statut); }
  if (commande_id) { where.push('commande_id = ?'); params.push(Number(commande_id)); }
  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  const [rows] = await pool.query(`SELECT * FROM cartes_nfc ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, l, offset]);
  return { cartes: rows, page: p, limit: l };
}

async function updateCarte(id, patch) {
  const keys = Object.keys(patch);
  if (keys.length === 0) return await findById(id);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => patch[k]);
  values.push(id);
  await pool.query(`UPDATE cartes_nfc SET ${sets} WHERE id = ?`, values);
  return await findById(id);
}

async function setStatus(id, statut) {
  await pool.query('UPDATE cartes_nfc SET statut = ? WHERE id = ?', [statut, id]);
  return await findById(id);
}

async function assignUid(id, uid) {
  await pool.query('UPDATE cartes_nfc SET uid_nfc = ? WHERE id = ?', [uid, id]);
  return await findById(id);
}

async function activate(id) {
  await pool.query('UPDATE cartes_nfc SET is_active = 1, activated_at = NOW() WHERE id = ?', [id]);
  return await findById(id);
}

async function deactivate(id) {
  await pool.query('UPDATE cartes_nfc SET is_active = 0 WHERE id = ?', [id]);
  return await findById(id);
}

async function deleteCarte(id) {
  await pool.query('DELETE FROM cartes_nfc WHERE id = ?', [id]);
}

module.exports = { init, createCarte, findByCommande, findById, findAll, updateCarte, setStatus, assignUid, activate, deactivate, deleteCarte };
