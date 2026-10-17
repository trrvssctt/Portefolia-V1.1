// Relances des comptes expirés (J+3, J+10, J+30, J+60) et récapitulatif quotidien pour l'administrateur.
// n8n appelle ces fonctions via /api/internal/platform/* puis envoie les e-mails.
const crypto = require('crypto');
const { pool } = require('../db');
const { frontendUrl } = require('./platformNotifier');

// Chaque relance n'est envoyée que dans sa fenêtre : un compte expiré depuis longtemps n'est pas relancé
// d'un coup à la mise en service, et chaque relance part une seule fois par expiration.
const STEPS = [
  { step: 'J+3', from: 3, to: 10 },
  { step: 'J+10', from: 10, to: 30 },
  { step: 'J+30', from: 30, to: 60 },
  { step: 'J+60', from: 60, to: 180 },   // dernière relance, y compris pour les comptes expirés depuis longtemps
];

function stepFor(days) {
  return STEPS.find((s) => days >= s.from && days < s.to) || null;
}

function apiUrl() {
  return (process.env.API_PUBLIC_URL || `${frontendUrl()}/api`).replace(/\/+$/, '');
}

// Lien de désinscription signé (pas besoin d'être connecté, impossible à forger)
function unsubscribeToken(userId) {
  const secret = process.env.INTERNAL_API_KEY || process.env.JWT_SECRET || 'portefolia';
  return crypto.createHmac('sha256', secret).update(`relances:${userId}`).digest('hex').slice(0, 32);
}

function checkUnsubscribeToken(userId, token) {
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(String(token || ''));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function dateOnly(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

// Comptes dont le dernier abonnement est expiré, sans abonnement actif ou en attente
async function expiredAccounts() {
  const [rows] = await pool.query(
    `SELECT a.id AS abonnement_id, a.utilisateur_id, a.duree_mois,
            DATE(COALESCE(a.date_echeance, a.end_date)) AS expired_on,
            DATEDIFF(CURDATE(), DATE(COALESCE(a.date_echeance, a.end_date))) AS days,
            u.prenom, u.nom, u.email, p.name AS plan_name, p.price_cents AS plan_price
     FROM abonnements a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     LEFT JOIN plans p ON p.id = a.plan_id
     WHERE a.statut_v2 = 'EXPIRED'
       AND COALESCE(a.date_echeance, a.end_date) IS NOT NULL
       AND a.id = (SELECT MAX(a2.id) FROM abonnements a2 WHERE a2.utilisateur_id = a.utilisateur_id)
       AND NOT EXISTS (SELECT 1 FROM abonnements a3 WHERE a3.utilisateur_id = a.utilisateur_id
                       AND a3.statut_v2 IN ('ACTIVE','PENDING_PAYMENT','GRACE_PERIOD'))
       AND u.role NOT IN ('BUSINESS_MEMBER','GUEST')
       AND (u.deleted_at IS NULL OR u.deleted_at = '0000-00-00 00:00:00')
       AND u.email IS NOT NULL AND u.email <> ''
       AND NOT EXISTS (SELECT 1 FROM platform_optouts o WHERE o.utilisateur_id = u.id)
     ORDER BY a.id ASC`
  );
  return rows;
}

// Sélectionne et réserve les relances du jour (une seule fois par compte, expiration et étape)
async function claimExpiredReminders() {
  const accounts = await expiredAccounts();
  const reminders = [];
  for (const a of accounts) {
    const s = stepFor(Number(a.days));
    if (!s) continue;
    const [r] = await pool.query(
      'INSERT IGNORE INTO platform_relances (utilisateur_id, abonnement_id, step, email_to) VALUES (?, ?, ?, ?)',
      [a.utilisateur_id, a.abonnement_id, s.step, a.email]
    );
    if (r.affectedRows !== 1) continue;
    const [[visits]] = await pool.query(
      `SELECT COUNT(*) AS n FROM visites v JOIN portfolios p ON p.id = v.portfolio_id
       WHERE p.utilisateur_id = ? AND v.date_visite >= NOW() - INTERVAL 30 DAY`, [a.utilisateur_id]
    );
    const [[pf]] = await pool.query(
      `SELECT COUNT(*) AS n FROM portfolios WHERE utilisateur_id = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')`,
      [a.utilisateur_id]
    );
    reminders.push({
      relance_id: r.insertId,
      step: s.step,
      is_last: s.step === STEPS[STEPS.length - 1].step,
      user: { id: a.utilisateur_id, first_name: a.prenom || '', name: [a.prenom, a.nom].filter(Boolean).join(' '), email: a.email },
      plan: { name: a.plan_name || null, price: a.plan_price ? Number(a.plan_price) : null, months: a.duree_mois || null },
      expired_on: dateOnly(a.expired_on),
      days_expired: Number(a.days),
      stats: { visits_30d: Number(visits.n), portfolios: Number(pf.n) },
      links: {
        renew_url: `${frontendUrl()}/renouveler`,
        unsubscribe_url: `${apiUrl()}/platform/relances/unsubscribe?u=${a.utilisateur_id}&t=${unsubscribeToken(a.utilisateur_id)}`,
      },
    });
  }
  return { reminders };
}

// Résultat de l'envoi (journalisé par n8n)
async function recordRelanceResult(id, { status, error } = {}) {
  if (!['sent', 'failed'].includes(status)) {
    const e = new Error('Statut invalide.');
    e.status = 422;
    throw e;
  }
  await pool.query('UPDATE platform_relances SET status = ?, error = ? WHERE id = ?',
    [status, error ? String(error).slice(0, 480) : null, Number(id)]);
  return { ok: true };
}

async function unsubscribe(userId, token) {
  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0 || !checkUnsubscribeToken(uid, token)) return false;
  await pool.query('INSERT IGNORE INTO platform_optouts (utilisateur_id) VALUES (?)', [uid]);
  return true;
}

// ── Récapitulatif quotidien (administrateur) ──────────────────────────────────

async function dailyDigest() {
  const one = async (sql, params = []) => { const [[r]] = await pool.query(sql, params); return r; };
  const [newUsers] = await pool.query(
    `SELECT u.id, u.prenom, u.nom, u.email, u.role FROM utilisateurs u
     WHERE DATE(COALESCE(u.date_inscription, NULLIF(u.created_at, '0000-00-00 00:00:00'))) = CURDATE() ORDER BY u.id DESC LIMIT 20`
  );
  const usersToday = await one('SELECT COUNT(*) AS n FROM utilisateurs WHERE DATE(COALESCE(date_inscription, NULLIF(created_at, 0))) = CURDATE()');
  const usersTotal = await one("SELECT COUNT(*) AS n FROM utilisateurs WHERE deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00'");
  const [paidByType] = await pool.query(
    `SELECT COALESCE(type_flux, 'AUTRE') AS type, COUNT(*) AS n, COALESCE(SUM(montant), 0) AS total
     FROM paiements
     WHERE LOWER(CONVERT(statut USING utf8mb4)) IN ('réussi', 'reussi', 'confirmed', 'paid')
       AND DATE(COALESCE(date_paiement, created_at)) = CURDATE()
     GROUP BY COALESCE(type_flux, 'AUTRE')`
  );
  const month = await one(
    `SELECT COALESCE(SUM(montant), 0) AS total FROM paiements
     WHERE LOWER(CONVERT(statut USING utf8mb4)) IN ('réussi', 'reussi', 'confirmed', 'paid')
       AND COALESCE(date_paiement, created_at) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
  );
  const pendingWave = await one("SELECT COUNT(*) AS n FROM abonnements WHERE statut_v2 = 'PENDING_PAYMENT' AND reference_wave IS NOT NULL");
  const active = await one("SELECT COUNT(*) AS n FROM abonnements WHERE statut_v2 = 'ACTIVE'");
  const expiredToday = await one("SELECT COUNT(*) AS n FROM abonnements WHERE statut_v2 = 'EXPIRED' AND DATE(COALESCE(date_echeance, end_date)) = CURDATE()");
  const expiringWeek = await one("SELECT COUNT(*) AS n FROM abonnements WHERE statut_v2 = 'ACTIVE' AND date_echeance BETWEEN NOW() AND NOW() + INTERVAL 7 DAY");
  const relances = await one("SELECT COUNT(*) AS n FROM platform_relances WHERE DATE(created_at) = CURDATE() AND status <> 'failed'");
  const nfc = await one(
    `SELECT SUM(DATE(created_at) = CURDATE()) AS orders_today,
            SUM(status = 'payment_submitted') AS to_validate,
            SUM(status = 'bat_valide') AS ready_to_print
     FROM nfc_preorders`
  ).catch(() => ({}));
  const contacts = await one('SELECT COUNT(*) AS n FROM contact_messages WHERE DATE(created_at) = CURDATE()').catch(() => ({ n: 0 }));

  const revenueToday = paidByType.reduce((s, r) => s + Number(r.total), 0);
  return {
    date: dateOnly(new Date()),
    users: { today: Number(usersToday.n), total: Number(usersTotal.n), latest: newUsers.map((u) => ({ name: [u.prenom, u.nom].filter(Boolean).join(' '), email: u.email, role: u.role })) },
    revenue: { today: revenueToday, month: Number(month.total), by_type: paidByType.map((r) => ({ type: r.type, count: Number(r.n), total: Number(r.total) })) },
    subscriptions: { active: Number(active.n), pending_wave: Number(pendingWave.n), expired_today: Number(expiredToday.n), expiring_7d: Number(expiringWeek.n) },
    relances_sent_today: Number(relances.n),
    nfc: { orders_today: Number(nfc.orders_today || 0), to_validate: Number(nfc.to_validate || 0), ready_to_print: Number(nfc.ready_to_print || 0) },
    contacts_today: Number(contacts.n || 0),
    links: { dashboard_url: `${frontendUrl()}/admin/dashboard`, finance_url: `${frontendUrl()}/admin/finance` },
  };
}

module.exports = {
  STEPS, stepFor, unsubscribeToken, checkUnsubscribeToken,
  expiredAccounts, claimExpiredReminders, recordRelanceResult, unsubscribe, dailyDigest,
};
