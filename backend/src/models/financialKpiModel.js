const { pool } = require('../db');

// ═══════════════════════════════════════════════════════
// GROUPE A — REVENUS RÉELS
// ═══════════════════════════════════════════════════════

async function getRevenusReels({ date_debut, date_fin }) {
  const [rows] = await pool.query(
    `SELECT
       type_flux,
       COUNT(*)       AS nb_transactions,
       SUM(montant)   AS total,
       AVG(montant)   AS moyenne
     FROM paiements
     WHERE LOWER(CONVERT(statut USING utf8mb4)) IN ('réussi', 'reussi', 'confirmed', 'paid')
       AND created_at BETWEEN ? AND ?
     GROUP BY type_flux WITH ROLLUP`,
    [date_debut, date_fin]
  );

  const result = {
    total_global: 0,
    par_flux: { abonnement: 0, reabonnement: 0, upgrade: 0, nfc: 0 },
    nb_transactions: 0,
    montant_moyen: 0,
  };

  for (const row of rows) {
    if (row.type_flux === null) {
      // ligne ROLLUP = totaux globaux
      result.total_global    = Number(row.total)           || 0;
      result.nb_transactions = Number(row.nb_transactions) || 0;
      result.montant_moyen   = Number(row.moyenne)         || 0;
    } else {
      const key = row.type_flux.toLowerCase();
      if (key in result.par_flux) result.par_flux[key] = Number(row.total) || 0;
    }
  }

  return result;
}

async function getMRR() {
  const [[row]] = await pool.query(
    `SELECT
       SUM(COALESCE(montant_mensuel_equivalent, montant / NULLIF(duree_mois, 0), montant)) AS mrr,
       COUNT(*)                                                                              AS abonnes_actifs,
       AVG(COALESCE(montant_mensuel_equivalent, montant / NULLIF(duree_mois, 0), montant)) AS arpu
     FROM abonnements
     WHERE statut_v2 = 'ACTIVE'`
  );

  return {
    mrr:             Number(row.mrr)             || 0,
    arr:             (Number(row.mrr)            || 0) * 12,
    abonnes_actifs:  Number(row.abonnes_actifs)  || 0,
    arpu:            Number(row.arpu)            || 0,
  };
}

async function getEvolutionMensuelle({ nb_mois = 12 } = {}) {
  const [rows] = await pool.query(
    `SELECT
       DATE_FORMAT(created_at, '%Y-%m') AS mois,
       type_flux,
       SUM(montant) AS total
     FROM paiements
     WHERE LOWER(CONVERT(statut USING utf8mb4)) IN ('réussi', 'reussi', 'confirmed', 'paid')
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
     GROUP BY mois, type_flux
     ORDER BY mois ASC`,
    [nb_mois]
  );

  // Regrouper par mois pour Recharts
  const map = {};
  for (const row of rows) {
    if (!map[row.mois]) {
      map[row.mois] = { mois: row.mois, abonnement: 0, reabonnement: 0, upgrade: 0, nfc: 0 };
    }
    const key = (row.type_flux || '').toLowerCase();
    if (key in map[row.mois]) map[row.mois][key] = Number(row.total) || 0;
  }

  return Object.values(map);
}

// ═══════════════════════════════════════════════════════
// GROUPE B — REVENUS ATTENDUS
// ═══════════════════════════════════════════════════════

async function getPipelineEnAttente() {
  // Utilise abonnements.statut_v2 = 'PENDING_PAYMENT' comme source de vérité
  // (les paiements peuvent avoir 'pending', 'En_attente' ou 'EN_ATTENTE' selon le code path)
  const [parFlux] = await pool.query(
    `SELECT
       COALESCE(p.type_flux, 'ABONNEMENT') AS type_flux,
       COUNT(*)                             AS nb_en_attente,
       SUM(COALESCE(p.montant, a.montant))  AS total_attendu
     FROM abonnements a
     LEFT JOIN paiements p ON p.abonnement_id = a.id
     WHERE a.statut_v2 = 'PENDING_PAYMENT'
     GROUP BY type_flux`
  );

  const [plusAnciens] = await pool.query(
    `SELECT
       a.id,
       COALESCE(p.montant, a.montant)          AS montant,
       COALESCE(p.type_flux, 'ABONNEMENT')     AS type_flux,
       a.created_at,
       TIMESTAMPDIFF(HOUR, a.created_at, NOW()) AS heures_attente,
       u.nom,
       u.prenom
     FROM abonnements a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     LEFT JOIN paiements p ON p.abonnement_id = a.id
     WHERE a.statut_v2 = 'PENDING_PAYMENT'
     ORDER BY a.created_at ASC
     LIMIT 10`
  );

  const nb_en_attente_total = parFlux.reduce((s, r) => s + Number(r.nb_en_attente), 0);
  const total_attendu_global = parFlux.reduce((s, r) => s + Number(r.total_attendu), 0);

  return {
    nb_en_attente_total,
    total_attendu_global,
    par_flux: parFlux,
    plus_anciens: plusAnciens,
  };
}

async function getRevenusPrevisionnels({ horizon_mois = 3 } = {}) {
  const [rows] = await pool.query(
    `SELECT
       DATE_FORMAT(COALESCE(a.date_echeance, a.end_date), '%Y-%m')                                     AS mois_echeance,
       COUNT(*)                                                                                          AS nb_renouvellements_attendus,
       SUM(COALESCE(a.montant_mensuel_equivalent, a.montant / NULLIF(a.duree_mois, 0), a.montant))     AS revenu_previsionnel
     FROM abonnements a
     JOIN utilisateurs u ON a.utilisateur_id = u.id
     WHERE a.statut_v2 = 'ACTIVE'
       AND COALESCE(a.date_echeance, a.end_date) BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? MONTH)
     GROUP BY mois_echeance
     ORDER BY mois_echeance ASC`,
    [horizon_mois]
  );

  return rows.map(r => ({
    mois_echeance:              r.mois_echeance,
    nb_renouvellements_attendus: Number(r.nb_renouvellements_attendus) || 0,
    revenu_previsionnel:         Number(r.revenu_previsionnel)         || 0,
  }));
}

// ═══════════════════════════════════════════════════════
// GROUPE C — CHURN & RÉTENTION
// ═══════════════════════════════════════════════════════

async function getChurnStats({ mois } = {}) {
  // mois au format 'YYYY-MM', défaut = mois en cours
  const moisRef = mois || new Date().toISOString().slice(0, 7);
  const debutMois = `${moisRef}-01`;

  const [[{ actifs_debut_mois }]] = await pool.query(
    `SELECT COUNT(*) AS actifs_debut_mois
     FROM abonnements
     WHERE statut_v2 = 'ACTIVE'
       AND COALESCE(date_debut, start_date) <= ?`,
    [debutMois]
  );

  const [[{ expires_ce_mois, revenu_perdu }]] = await pool.query(
    `SELECT
       COUNT(*)                                                                                        AS expires_ce_mois,
       SUM(COALESCE(montant_mensuel_equivalent, montant / NULLIF(duree_mois, 0), montant))            AS revenu_perdu
     FROM abonnements
     WHERE statut_v2 = 'EXPIRED'
       AND DATE_FORMAT(updated_at, '%Y-%m') = ?`,
    [moisRef]
  );

  const actifs = Number(actifs_debut_mois) || 0;
  const expires = Number(expires_ce_mois) || 0;

  return {
    actifs_debut_mois: actifs,
    expires_ce_mois:   expires,
    churn_rate:        actifs > 0 ? Number(((expires / actifs) * 100).toFixed(2)) : 0,
    revenu_perdu:      Number(revenu_perdu) || 0,
  };
}

// ═══════════════════════════════════════════════════════
// GROUPE D — KPI PAR FLUX SPÉCIFIQUE
// ═══════════════════════════════════════════════════════

async function getKpiNFC() {
  const [[row]] = await pool.query(
    `SELECT
       COUNT(*)                                                        AS total_commandes,
       COUNT(CASE WHEN statut_paiement = 'PAID'    THEN 1 END)        AS commandes_payees,
       COUNT(CASE WHEN statut_paiement = 'PENDING' THEN 1 END)        AS commandes_en_attente,
       SUM(CASE WHEN statut_paiement = 'PAID'    THEN montant ELSE 0 END) AS ca_nfc_valide,
       SUM(CASE WHEN statut_paiement = 'PENDING' THEN montant ELSE 0 END) AS ca_nfc_attendu,
       AVG(CASE WHEN statut_paiement = 'PAID'    THEN montant END)    AS panier_moyen_nfc
     FROM commandes
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );

  return {
    total_commandes:       Number(row.total_commandes)       || 0,
    commandes_payees:      Number(row.commandes_payees)      || 0,
    commandes_en_attente:  Number(row.commandes_en_attente)  || 0,
    ca_nfc_valide:         Number(row.ca_nfc_valide)         || 0,
    ca_nfc_attendu:        Number(row.ca_nfc_attendu)        || 0,
    panier_moyen_nfc:      Number(row.panier_moyen_nfc)      || 0,
  };
}

async function getKpiUpgrades() {
  // Agrégats globaux (toujours une ligne même si la table est vide)
  const [[agg]] = await pool.query(
    `SELECT
       COUNT(*)                                                               AS total_upgrades,
       COUNT(CASE WHEN statut = 'VALIDATED' THEN 1 END)                      AS upgrades_valides,
       COUNT(CASE WHEN statut = 'PENDING'   THEN 1 END)                      AS upgrades_en_attente,
       COALESCE(SUM(CASE WHEN statut = 'VALIDATED' THEN montant_delta ELSE 0 END), 0) AS ca_upgrades
     FROM upgrades`
  );

  // Chemin le plus fréquent (peut être vide)
  const [paths] = await pool.query(
    `SELECT p_src.name AS plan_source_populaire, p_cible.name AS plan_cible_populaire
     FROM upgrades u
     LEFT JOIN plans p_src   ON u.plan_source_id = p_src.id
     LEFT JOIN plans p_cible ON u.plan_cible_id  = p_cible.id
     GROUP BY u.plan_source_id, u.plan_cible_id
     ORDER BY COUNT(*) DESC
     LIMIT 1`
  );
  const top = paths[0] ?? {};

  return {
    total_upgrades:        Number(agg.total_upgrades)      || 0,
    upgrades_valides:      Number(agg.upgrades_valides)    || 0,
    upgrades_en_attente:   Number(agg.upgrades_en_attente) || 0,
    ca_upgrades:           Number(agg.ca_upgrades)         || 0,
    plan_source_populaire: top.plan_source_populaire       || null,
    plan_cible_populaire:  top.plan_cible_populaire        || null,
  };
}

module.exports = {
  getRevenusReels,
  getMRR,
  getEvolutionMensuelle,
  getPipelineEnAttente,
  getRevenusPrevisionnels,
  getChurnStats,
  getKpiNFC,
  getKpiUpgrades,
};
