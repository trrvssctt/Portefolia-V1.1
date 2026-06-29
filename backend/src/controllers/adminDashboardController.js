const { pool } = require('../db');
const financialKpiModel = require('../models/financialKpiModel');

// ─── helpers date ────────────────────────────────────────────────────────────

function debutMois(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function debutMoisPrecedent(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}
function finMoisPrecedent(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59);
}
function moisStr(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

// ─── FONCTION 1 : alertes ────────────────────────────────────────────────────

async function getAlertes() {
  const alertes = [];

  // Compte les paiements Wave en attente — tous les statuts "pending" possibles
  const [[pendingWave]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN TIMESTAMPDIFF(HOUR, a.created_at, NOW()) > 24 THEN 1 ELSE 0 END) AS urgents
     FROM abonnements a
     WHERE a.statut_v2 = 'PENDING_PAYMENT'`
  );
  if (Number(pendingWave.total) > 0) {
    alertes.push({
      type: 'WAVE_PENDING',
      niveau: Number(pendingWave.urgents) > 0 ? 'CRITIQUE' : 'ATTENTION',
      message: `${pendingWave.total} paiement(s) Wave en attente`,
      detail: Number(pendingWave.urgents) > 0 ? `dont ${pendingWave.urgents} depuis +24h` : null,
      action_label: 'Valider maintenant',
      action_url: '/admin/wave/validation',
      count: Number(pendingWave.total),
    });
  }

  const [[expirantAujourdhui]] = await pool.query(
    `SELECT COUNT(*) AS total FROM abonnements
     WHERE statut_v2 = 'ACTIVE' AND DATE(COALESCE(date_echeance, end_date)) = CURDATE()`
  );
  if (Number(expirantAujourdhui.total) > 0) {
    alertes.push({
      type: 'EXPIRATION_TODAY',
      niveau: 'ATTENTION',
      message: `${expirantAujourdhui.total} abonnement(s) expirent aujourd'hui`,
      detail: 'Les rappels ont été envoyés automatiquement',
      action_label: 'Voir les comptes',
      action_url: '/admin/users?filter=expiring_today',
      count: Number(expirantAujourdhui.total),
    });
  }

  const [[upgradesPending]] = await pool.query(
    `SELECT COUNT(*) AS total FROM upgrades WHERE statut = 'PENDING'`
  );
  if (Number(upgradesPending.total) > 0) {
    alertes.push({
      type: 'UPGRADES_PENDING',
      niveau: 'INFO',
      message: `${upgradesPending.total} upgrade(s) en attente de validation`,
      detail: null,
      action_label: 'Traiter',
      action_url: '/admin/upgrades',
      count: Number(upgradesPending.total),
    });
  }

  const [[expiresNonRenouveles]] = await pool.query(
    `SELECT COUNT(*) AS total FROM abonnements
     WHERE statut_v2 = 'EXPIRED'
       AND DATEDIFF(NOW(), COALESCE(date_echeance, end_date)) BETWEEN 1 AND 7`
  );
  if (Number(expiresNonRenouveles.total) > 0) {
    alertes.push({
      type: 'CHURN_RISK',
      niveau: 'INFO',
      message: `${expiresNonRenouveles.total} compte(s) expiré(s) sans renouvellement`,
      detail: 'Risque de churn — relance recommandée',
      action_label: 'Voir',
      action_url: '/admin/users?filter=expired_recent',
      count: Number(expiresNonRenouveles.total),
    });
  }

  const ordre = { CRITIQUE: 0, ATTENTION: 1, INFO: 2 };
  return alertes.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
}

// ─── FONCTION 2 : KPI financiers ─────────────────────────────────────────────

async function getKpiFinanciers() {
  const now = new Date();
  const [mrr, revenusMois, revenusMoisPrecedent, pipeline, churn] = await Promise.all([
    financialKpiModel.getMRR(),
    financialKpiModel.getRevenusReels({ date_debut: debutMois(now), date_fin: now }),
    financialKpiModel.getRevenusReels({ date_debut: debutMoisPrecedent(now), date_fin: finMoisPrecedent(now) }),
    financialKpiModel.getPipelineEnAttente(),
    financialKpiModel.getChurnStats({ mois: moisStr(now) }),
  ]);

  const variationMRR =
    revenusMoisPrecedent.total_global > 0
      ? ((revenusMois.total_global - revenusMoisPrecedent.total_global) /
          revenusMoisPrecedent.total_global) *
        100
      : 0;

  return {
    mrr: { valeur: mrr.mrr, abonnes_actifs: mrr.abonnes_actifs, arpu: mrr.arpu },
    revenus_mois: {
      total: revenusMois.total_global,
      variation: Math.round(variationMRR * 10) / 10,
    },
    pipeline: {
      total: pipeline.total_attendu_global,
      nb: pipeline.nb_en_attente_total,
    },
    churn: { taux: churn.churn_rate, comptes_perdus: churn.expires_ce_mois },
  };
}

// ─── FONCTION 3 : KPI plateforme ─────────────────────────────────────────────

async function getKpiPlateforme() {
  const [[row]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM utilisateurs) AS total_users,
       (SELECT COUNT(*) FROM utilisateurs WHERE subscription_status = 'ACTIVE') AS users_actifs,
       (SELECT COUNT(*) FROM portfolios WHERE est_public = TRUE  AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')) AS portfolios_publies,
       (SELECT COUNT(*) FROM portfolios WHERE est_public = FALSE AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')) AS portfolios_brouillon,
       (SELECT COUNT(*) FROM commandes WHERE statut_paiement = 'PENDING') AS nfc_en_cours,
       (SELECT COUNT(*) FROM commandes WHERE statut_paiement = 'PAID'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS nfc_livrees_mois,
       (SELECT COUNT(*) FROM visites
         WHERE date_visite >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS vues_7j,
       (SELECT COUNT(*) FROM visites
         WHERE date_visite >= DATE_SUB(NOW(), INTERVAL 14 DAY)
           AND date_visite < DATE_SUB(NOW(), INTERVAL 7 DAY)) AS vues_7j_precedent`
  );

  const vues7j = Number(row.vues_7j) || 0;
  const vues7jPrec = Number(row.vues_7j_precedent) || 0;
  const variationVues =
    vues7jPrec > 0 ? Math.round(((vues7j - vues7jPrec) / vues7jPrec) * 100 * 10) / 10 : 0;

  return {
    total_users: Number(row.total_users) || 0,
    users_actifs: Number(row.users_actifs) || 0,
    portfolios_publies: Number(row.portfolios_publies) || 0,
    portfolios_brouillon: Number(row.portfolios_brouillon) || 0,
    nfc_en_cours: Number(row.nfc_en_cours) || 0,
    nfc_livrees_mois: Number(row.nfc_livrees_mois) || 0,
    vues_7j: vues7j,
    variation_vues: variationVues,
  };
}

// ─── FONCTION 4 : évolution revenus 6 mois ───────────────────────────────────

async function getEvolutionRevenus6Mois() {
  return financialKpiModel.getEvolutionMensuelle({ nb_mois: 6 });
}

// ─── FONCTION 5 : distribution plans ────────────────────────────────────────

async function getDistributionPlans() {
  const [rows] = await pool.query(
    `SELECT p.name,
       COUNT(a.id) AS nb_abonnes,
       ROUND(COUNT(a.id) * 100.0 / NULLIF(SUM(COUNT(a.id)) OVER(), 0), 1) AS pourcentage
     FROM plans p
     LEFT JOIN abonnements a ON a.plan_id = p.id AND a.statut_v2 = 'ACTIVE'
     GROUP BY p.id, p.name
     ORDER BY nb_abonnes DESC`
  );

  return rows.map(r => ({
    name: r.name,
    nb_abonnes: Number(r.nb_abonnes) || 0,
    pourcentage: Number(r.pourcentage) || 0,
  }));
}

// ─── FONCTION 6 : transactions récentes ─────────────────────────────────────

async function getTransactionsRecentes(limit = 8) {
  // paiements n'a pas de colonne utilisateur_id directe :
  // l'utilisateur est résolu via commandes.utilisateur_id ou abonnements.utilisateur_id
  const [rows] = await pool.query(
    `SELECT p.id, p.montant, p.statut, p.type_flux, p.created_at,
       NULLIF(TRIM(CONCAT(
         COALESCE(uc.prenom, ua.prenom, ''), ' ',
         COALESCE(uc.nom,    ua.nom,    '')
       )), '') AS client_nom,
       COALESCE(uc.email, ua.email) AS client_email,
       pl.name AS plan_nom
     FROM paiements p
     LEFT JOIN commandes c     ON c.id  = p.commande_id
     LEFT JOIN utilisateurs uc ON uc.id = c.utilisateur_id
     LEFT JOIN abonnements a   ON a.id  = p.abonnement_id
     LEFT JOIN utilisateurs ua ON ua.id = a.utilisateur_id
     LEFT JOIN plans pl        ON pl.id = a.plan_id
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

// ─── FONCTION 7 : nouveaux inscrits ─────────────────────────────────────────

async function getNouveauxInscrits(limit = 8) {
  const [rows] = await pool.query(
    `SELECT u.id, CONCAT(u.prenom, ' ', u.nom) AS nom,
       u.email, u.created_at, u.subscription_status,
       u.role AS user_role,
       p.name AS plan_nom,
       ba.id AS business_account_id,
       ba.company_name AS business_company,
       bpl.name AS business_plan_nom,
       CONCAT(admin_u.prenom, ' ', admin_u.nom) AS business_admin_nom,
       admin_u.id AS business_admin_id
     FROM utilisateurs u
     LEFT JOIN abonnements a ON a.utilisateur_id = u.id
       AND a.statut IN ('ACTIVE', 'PENDING_PAYMENT')
     LEFT JOIN plans p ON a.plan_id = p.id
     LEFT JOIN business_accounts ba ON ba.id = u.business_account_id AND ba.deleted_at IS NULL
     LEFT JOIN utilisateurs admin_u ON admin_u.id = ba.admin_user_id
     LEFT JOIN plans bpl ON bpl.id = ba.plan_id
     WHERE u.role IN ('USER', 'BUSINESS_MEMBER')
     ORDER BY u.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

// ─── FONCTION 8 : santé système ─────────────────────────────────────────────

async function getSanteSysteme() {
  const serveur = {
    statut: 'OK',
    uptime: process.uptime(),
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };

  let db;
  const dbStart = Date.now();
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB timeout')), 3000)
      ),
    ]);
    db = { statut: 'OK', latence_ms: Date.now() - dbStart };
  } catch {
    db = { statut: 'ERREUR', latence_ms: Date.now() - dbStart };
  }

  let email;
  try {
    const [[{ echecs }]] = await pool.query(
      `SELECT COUNT(*) AS echecs FROM email_logs
       WHERE statut = 'ERREUR'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    const n = Number(echecs) || 0;
    email = {
      statut: n === 0 ? 'OK' : n < 5 ? 'ATTENTION' : 'ERREUR',
      echecs_24h: n,
    };
  } catch {
    email = { statut: 'NON_SURVEILLÉ', echecs_24h: null };
  }

  let cron;
  try {
    const [[last]] = await pool.query(
      `SELECT MAX(sent_at) AS dernier_run FROM subscription_reminders`
    );
    cron = { statut: 'OK', dernier_run: last.dernier_run || null };
  } catch {
    cron = { statut: 'NON_SURVEILLÉ', dernier_run: null };
  }

  return { serveur, db, email, cron };
}

// ─── HANDLER PRINCIPAL ───────────────────────────────────────────────────────

const getDashboardData = async (req, res) => {
  try {
    const [
      alertes,
      kpiFinanciers,
      kpiPlateforme,
      evolutionRevenus,
      distributionPlans,
      transactionsRecentes,
      nouveauxInscrits,
      santeSysteme,
    ] = await Promise.all([
      getAlertes(),
      getKpiFinanciers(),
      getKpiPlateforme(),
      getEvolutionRevenus6Mois(),
      getDistributionPlans(),
      getTransactionsRecentes(8),
      getNouveauxInscrits(8),
      getSanteSysteme(),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      alertes,
      kpi_financiers: kpiFinanciers,
      kpi_plateforme: kpiPlateforme,
      evolution_revenus: evolutionRevenus,
      distribution_plans: distributionPlans,
      transactions_recentes: transactionsRecentes,
      nouveaux_inscrits: nouveauxInscrits,
      sante_systeme: santeSysteme,
    });
  } catch (err) {
    console.error('[DASHBOARD]', err);
    res.status(500).json({ error: 'Erreur chargement dashboard' });
  }
};

module.exports = { getDashboardData };
