const { pool } = require('../db');
const { randomUUID } = require('crypto');

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS abonnements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      utilisateur_id INT NOT NULL,
      plan_id INT NULL,
      type VARCHAR(50) DEFAULT 'abonnement',
      statut VARCHAR(50) DEFAULT 'pending',
      montant DECIMAL(10,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'XOF',
      start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_date TIMESTAMP NULL,
      payment_reference VARCHAR(255) DEFAULT NULL,
      metadata JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function createAbonnement({ utilisateur_id, plan_id = null, type = 'abonnement', statut = 'pending', montant = 0, currency = 'XOF', start_date = null, end_date = null, payment_reference = null, metadata = null, duree_mois = null }) {
  const sql = `INSERT INTO abonnements (utilisateur_id, plan_id, type, statut, montant, currency, start_date, end_date, payment_reference, metadata, duree_mois) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?)`;
  const params = [utilisateur_id, plan_id, type, statut, montant, currency, start_date, end_date, payment_reference, metadata ? JSON.stringify(metadata) : null, duree_mois];
  const [result] = await pool.query(sql, params);
  return { id: result.insertId, utilisateur_id, plan_id, type, statut, montant, currency, start_date, end_date, payment_reference, metadata, duree_mois };
}

async function findByUser(utilisateur_id) {
  const [rows] = await pool.query('SELECT * FROM abonnements WHERE utilisateur_id = ? ORDER BY created_at DESC', [utilisateur_id]);
  return rows || [];
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM abonnements WHERE id = ? LIMIT 1', [id]);
  return rows && rows[0] ? rows[0] : null;
}

async function findByPaymentToken(token) {
  if (!token) return null;
  try {
    const [rows] = await pool.query(`SELECT * FROM abonnements WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.payment_token')) = ? LIMIT 1`, [token]);
    if (rows && rows[0]) return rows[0];
  } catch (e) {
    // ignore JSON_EXTRACT errors (older MySQL, etc.)
  }
  // fallback: match payment_reference
  try {
    const [rows2] = await pool.query('SELECT * FROM abonnements WHERE payment_reference = ? LIMIT 1', [token]);
    if (rows2 && rows2[0]) return rows2[0];
  } catch (e) { /* ignore */ }
  // fallback: metadata contains token as substring
  try {
    const like = `%${token}%`;
    const [rows3] = await pool.query('SELECT * FROM abonnements WHERE metadata LIKE ? LIMIT 1', [like]);
    if (rows3 && rows3[0]) return rows3[0];
  } catch (e) { /* ignore */ }
  return null;
}

async function updatePaymentDetails(id, { payment_reference = null, end_date = null, statut = 'active' } = {}) {
  await pool.query('UPDATE abonnements SET payment_reference = ?, end_date = ?, statut = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payment_reference, end_date, statut, id]);
  return await findById(id);
}

async function updateStatus(id, statut) {
  await pool.query('UPDATE abonnements SET statut = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [statut, id]);
  return await findById(id);
}

async function cancelAbonnement(id) {
  await pool.query('UPDATE abonnements SET statut = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['cancelled', id]);
  return await findById(id);
}

// ---------------------------------------------------------------------------
// Nouvelle API : système d'abonnements avec lifecycle complet
// Utilise les colonnes ajoutées par 004_subscription_system.sql
// ---------------------------------------------------------------------------

async function createPendingSubscription(userId, planId, montant, duree_mois, remise, reference_wave) {
  const token = randomUUID();
  const [result] = await pool.query(
    `INSERT INTO abonnements
       (utilisateur_id, plan_id, type, statut, statut_v2,
        montant, montant_paye, duree_mois, remise_appliquee,
        reference_wave, token_acces, token_expiration)
     VALUES (?, ?, 'abonnement', 'pending', 'PENDING_PAYMENT',
             ?, 0, ?, ?,
             ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))`,
    [userId, planId, montant, duree_mois, remise ?? 0, reference_wave ?? null, token]
  );
  return { id: result.insertId, token_acces: token };
}

async function validateSubscription(abonnementId, adminId, commentaire) {
  const abo = await findById(abonnementId);
  if (!abo) throw new Error(`Abonnement ${abonnementId} introuvable`);

  const duree   = abo.duree_mois ?? 1;
  const montant = Number(abo.montant_paye ?? abo.montant ?? 0);
  const montant_mensuel_equivalent = duree > 0 ? montant / duree : montant;

  // Détecter INITIAL vs RENOUVELLEMENT
  const [[{ nb_precedents }]] = await pool.query(
    `SELECT COUNT(*) AS nb_precedents
     FROM abonnements
     WHERE utilisateur_id = ?
       AND id != ?
       AND statut_v2 IN ('ACTIVE', 'EXPIRED', 'SUSPENDED')`,
    [abo.utilisateur_id, abonnementId]
  );
  const typeAbo      = nb_precedents > 0 ? 'RENOUVELLEMENT' : 'INITIAL';
  const typeFluxPaie = typeAbo === 'INITIAL' ? 'ABONNEMENT' : 'REABONNEMENT';

  await pool.query(
    `UPDATE abonnements
     SET statut = 'active',
         statut_v2 = 'ACTIVE',
         type = ?,
         montant_mensuel_equivalent = ?,
         date_debut = NOW(),
         date_echeance = DATE_ADD(NOW(), INTERVAL ? MONTH),
         date_validation = NOW(),
         valide_par = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [typeAbo, montant_mensuel_equivalent, duree, adminId, abonnementId]
  );

  const updated = await findById(abonnementId);

  // Réactiver le compte et marquer l'abonnement comme actif
  await pool.query(
    `UPDATE utilisateurs
     SET subscription_status = 'ACTIVE',
         is_active = 1,
         last_payment_at = NOW(),
         next_billing_date = ?
     WHERE id = ?`,
    [updated.date_echeance, abo.utilisateur_id]
  );

  // Mettre à jour type_flux + données KPI sur le paiement lié
  await pool.query(
    `UPDATE paiements
     SET type_flux = ?,
         duree_mois = ?,
         plan_id = ?
     WHERE abonnement_id = ?
       AND LOWER(CONVERT(statut USING utf8mb4)) IN ('réussi', 'reussi', 'confirmed', 'paid', 'active')`,
    [typeFluxPaie, duree, abo.plan_id ?? null, abonnementId]
  );

  await pool.query(
    `INSERT INTO subscription_history
       (abonnement_id, ancien_statut, nouveau_statut, change_par, commentaire)
     VALUES (?, ?, 'ACTIVE', ?, ?)`,
    [abonnementId, abo.statut_v2 ?? abo.statut, adminId, commentaire ?? null]
  );

  const [rows] = await pool.query(
    `SELECT a.*, u.email, u.nom, u.prenom
     FROM abonnements a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     WHERE a.id = ?
     LIMIT 1`,
    [abonnementId]
  );
  return rows[0] ?? null;
}

// Valider un upgrade et marquer le paiement associé
async function validateUpgrade(upgradeId, adminId) {
  const [[upgrade]] = await pool.query(
    `SELECT u.*, p_src.name AS plan_source, p_cible.name AS plan_cible
     FROM upgrades u
     LEFT JOIN plans p_src   ON p_src.id   = u.plan_source_id
     LEFT JOIN plans p_cible ON p_cible.id  = u.plan_cible_id
     WHERE u.id = ?`,
    [upgradeId]
  );
  if (!upgrade) throw new Error(`Upgrade ${upgradeId} introuvable`);
  if (upgrade.statut === 'VALIDATED') throw new Error('Upgrade déjà validé');

  await pool.query(
    `UPDATE upgrades
     SET statut = 'VALIDATED',
         valide_par = ?,
         validated_at = NOW()
     WHERE id = ?`,
    [adminId, upgradeId]
  );

  if (upgrade.paiement_id) {
    await pool.query(
      `UPDATE paiements
       SET type_flux = 'UPGRADE',
           plan_id = ?
       WHERE id = ?`,
      [upgrade.plan_cible_id, upgrade.paiement_id]
    );
  }

  // Basculer l'utilisateur sur le nouveau plan
  await pool.query(
    `UPDATE utilisateurs SET plan_id = ? WHERE id = ?`,
    [upgrade.plan_cible_id, upgrade.utilisateur_id]
  );

  return upgrade;
}

async function rejectSubscription(abonnementId, adminId, motif) {
  const abo = await findById(abonnementId);
  if (!abo) throw new Error(`Abonnement ${abonnementId} introuvable`);

  await pool.query(
    `UPDATE abonnements
     SET statut = 'suspended',
         statut_v2 = 'SUSPENDED',
         motif_refus = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [motif ?? null, abonnementId]
  );

  await pool.query(
    `INSERT INTO subscription_history
       (abonnement_id, ancien_statut, nouveau_statut, change_par, commentaire)
     VALUES (?, ?, 'SUSPENDED', ?, ?)`,
    [abonnementId, abo.statut_v2 ?? abo.statut, adminId, motif ?? null]
  );

  return await findById(abonnementId);
}

async function getPendingSubscriptions() {
  const [rows] = await pool.query(
    `SELECT a.*,
            u.nom, u.prenom, u.email,
            p.name AS plan_name, p.price_cents, p.currency AS plan_currency
     FROM abonnements a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     LEFT JOIN plans p ON p.id = a.plan_id
     WHERE a.statut_v2 = 'PENDING_PAYMENT'
     ORDER BY a.created_at ASC`
  );
  return rows;
}

async function getSubscriptionByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT a.*,
            p.name AS plan_name, p.price_cents, p.billing_interval
     FROM abonnements a
     LEFT JOIN plans p ON p.id = a.plan_id
     WHERE a.utilisateur_id = ?
       AND a.statut_v2 IN ('ACTIVE', 'PENDING_PAYMENT', 'GRACE_PERIOD')
     ORDER BY a.created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

async function getExpiringSubscriptions(daysAhead) {
  const [rows] = await pool.query(
    `SELECT a.*,
            u.nom, u.prenom, u.email
     FROM abonnements a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     WHERE a.statut_v2 = 'ACTIVE'
       AND a.date_echeance BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
     ORDER BY a.date_echeance ASC`,
    [daysAhead]
  );
  return rows;
}

async function expireSubscription(abonnementId) {
  const abo = await findById(abonnementId);
  if (!abo) throw new Error(`Abonnement ${abonnementId} introuvable`);

  await pool.query(
    `UPDATE abonnements
     SET statut = 'expired',
         statut_v2 = 'EXPIRED',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [abonnementId]
  );

  // Désactiver le compte ET marquer l'abonnement comme expiré — bloque la connexion au niveau backend
  await pool.query(
    `UPDATE utilisateurs
     SET subscription_status = 'EXPIRED',
         is_active = 0
     WHERE id = ?`,
    [abo.utilisateur_id]
  );

  await pool.query(
    `INSERT INTO subscription_history
       (abonnement_id, ancien_statut, nouveau_statut, change_par, commentaire)
     VALUES (?, ?, 'EXPIRED', NULL, 'Expiration automatique')`,
    [abonnementId, abo.statut_v2 ?? abo.statut]
  );

  return await findById(abonnementId);
}

module.exports = {
  init,
  createAbonnement,
  findByUser,
  findById,
  findByPaymentToken,
  updatePaymentDetails,
  updateStatus,
  cancelAbonnement,
  // Nouvelle API lifecycle
  createPendingSubscription,
  validateSubscription,
  validateUpgrade,
  rejectSubscription,
  getPendingSubscriptions,
  getSubscriptionByUserId,
  getExpiringSubscriptions,
  expireSubscription,
};
