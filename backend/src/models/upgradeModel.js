const { pool } = require('../db');

async function init() {
  const alterations = [
    `ALTER TABLE upgrades MODIFY plan_source_id INT NULL`,
    `ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS checkout_id INT NULL`,
    `ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS abonnement_id INT NULL`,
    `ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS duree_mois INT NOT NULL DEFAULT 1`,
    `ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS remise_appliquee DECIMAL(5,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS notes TEXT NULL`,
    `ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS motif_refus TEXT NULL`,
    `ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP`,
  ];
  for (const sql of alterations) {
    try { await pool.query(sql); } catch (e) { /* colonne déjà existante ou table absente */ }
  }
}

async function createUpgrade({ utilisateur_id, plan_source_id, plan_cible_id, paiement_id, checkout_id, abonnement_id, montant_delta, duree_mois = 1, remise_appliquee = 0 }) {
  const [result] = await pool.query(
    `INSERT INTO upgrades
       (utilisateur_id, plan_source_id, plan_cible_id, paiement_id, checkout_id, abonnement_id, montant_delta, duree_mois, remise_appliquee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [utilisateur_id, plan_source_id ?? null, plan_cible_id, paiement_id, checkout_id, abonnement_id, montant_delta, duree_mois, remise_appliquee]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await pool.query(`SELECT * FROM upgrades WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

async function updateStatus(id, statut, { valide_par = null, motif_refus = null, notes = null } = {}) {
  const sets = ['statut = ?'];
  const params = [statut];
  if (statut === 'VALIDATED') sets.push('validated_at = NOW()');
  if (valide_par  !== null) { sets.push('valide_par = ?');  params.push(valide_par); }
  if (motif_refus !== null) { sets.push('motif_refus = ?'); params.push(motif_refus); }
  if (notes       !== null) { sets.push('notes = ?');       params.push(notes); }
  params.push(id);
  await pool.query(`UPDATE upgrades SET ${sets.join(', ')} WHERE id = ?`, params);
}

async function list({ page = 1, limit = 50 } = {}) {
  const l = Math.min(Number(limit) || 50, 200);
  const p = Math.max(Number(page) || 1, 1);
  const offset = (p - 1) * l;

  const [rows] = await pool.query(`
    SELECT
      up.id, up.utilisateur_id,
      up.plan_source_id, up.plan_cible_id,
      up.paiement_id, up.checkout_id, up.abonnement_id,
      up.montant_delta, up.duree_mois, up.remise_appliquee,
      up.statut, up.notes, up.motif_refus,
      up.created_at, up.validated_at,
      u.email   AS user_email,
      u.nom     AS user_nom,
      u.prenom  AS user_prenom,
      p_src.name  AS plan_source_name,
      p_cible.name        AS plan_name,
      p_cible.price_cents AS plan_price_cents,
      pai.statut             AS paiement_statut,
      pai.montant            AS paiement_montant,
      pai.reference_transaction,
      pai.moyen_paiement     AS payment_method,
      pai.image_paiement
    FROM upgrades up
    LEFT JOIN utilisateurs u   ON u.id   = up.utilisateur_id
    LEFT JOIN plans p_src      ON p_src.id   = up.plan_source_id
    LEFT JOIN plans p_cible    ON p_cible.id = up.plan_cible_id
    LEFT JOIN paiements pai    ON pai.id = up.paiement_id
    ORDER BY up.created_at DESC
    LIMIT ? OFFSET ?
  `, [l, offset]);

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM upgrades`);

  return { upgrades: rows, page: p, limit: l, total: Number(total) };
}

module.exports = { init, createUpgrade, findById, updateStatus, list };
