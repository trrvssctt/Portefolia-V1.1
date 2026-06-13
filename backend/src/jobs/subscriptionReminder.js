/**
 * subscriptionReminder.js
 *
 * Trois crons quotidiens :
 *   00h05  → Expiration automatique des abonnements échus
 *   08h00  → Rappels J-5 / J-1 / J=0 aux utilisateurs
 *   09h00  → Alerte admin si des paiements PENDING_PAYMENT > 24h sans validation
 *
 * Fuseau : Africa/Dakar (UTC+0)
 */

'use strict';

const cron = require('node-cron');
const { pool } = require('../db');
const sendEmail = require('../utils/sendEmail');
const {
  emailRappelEcheance,
  emailCompteExpire,
} = require('../utils/emailTemplates');
const abonnementModel = require('../models/abonnementModel');

// ─── Configuration ────────────────────────────────────────────────────────────

const FRONTEND          = process.env.FRONTEND_BASE       || 'https://portefolia.tech';
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL   || 'admin@portefolia.tech';
const RENEWAL_URL       = `${FRONTEND}/renouveler`;
const TZ                = 'Africa/Dakar';

// ─── Logger ───────────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[CRON ${new Date().toISOString()}] ${msg}\n`);
}

// ─── Helpers DB ───────────────────────────────────────────────────────────────

/** Abonnements ACTIVE dont la date_echeance tombe exactement dans N jours. */
async function getExpiringOnDay(daysAhead) {
  const [rows] = await pool.query(
    `SELECT a.id, a.utilisateur_id, a.date_echeance, a.duree_mois,
            u.nom, u.prenom, u.email,
            p.name  AS plan_name,
            p.price_cents
     FROM abonnements a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     LEFT JOIN plans p   ON p.id = a.plan_id
     WHERE a.statut_v2 = 'ACTIVE'
       AND DATE(a.date_echeance) = DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
    [daysAhead]
  );
  return rows;
}

/** Abonnements ACTIVE dont la date_echeance est déjà passée. */
async function getExpiredActive() {
  const [rows] = await pool.query(
    `SELECT a.id, a.utilisateur_id, a.date_echeance,
            u.nom, u.prenom, u.email
     FROM abonnements a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     WHERE a.statut_v2 = 'ACTIVE'
       AND a.date_echeance < NOW()`
  );
  return rows;
}

/** Paiements PENDING_PAYMENT soumis il y a plus de 24h. */
async function getPendingOver24h() {
  const [rows] = await pool.query(
    `SELECT a.id, a.created_at, a.montant_paye, a.duree_mois, a.reference_wave,
            TIMESTAMPDIFF(HOUR, a.created_at, NOW()) AS heures_attente,
            u.nom, u.prenom, u.email
     FROM abonnements a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     WHERE a.statut_v2 = 'PENDING_PAYMENT'
       AND a.created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
     ORDER BY a.created_at ASC`
  );
  return rows;
}

/** Vérifie si un rappel de ce type a déjà été envoyé pour cet abonnement. */
async function alreadySent(abonnement_id, type) {
  const [rows] = await pool.query(
    `SELECT id FROM subscription_reminders
     WHERE abonnement_id = ? AND type = ? LIMIT 1`,
    [abonnement_id, type]
  );
  return rows.length > 0;
}

/** Enregistre un rappel envoyé. */
async function logReminder(abonnement_id, utilisateur_id, type, email_to) {
  await pool.query(
    `INSERT INTO subscription_reminders (abonnement_id, utilisateur_id, type, email_to)
     VALUES (?, ?, ?, ?)`,
    [abonnement_id, utilisateur_id, type, email_to]
  );
}

// ─── Tâche 1 : Rappels d'échéance (08h00) ────────────────────────────────────

async function runReminderTask() {
  log('── Rappels échéance — démarrage ──');
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  const slots = [
    { daysAhead: 5, type: 'J_MINUS_5' },
    { daysAhead: 1, type: 'J_MINUS_1' },
    { daysAhead: 0, type: 'J_ECHEANCE' },
  ];

  for (const { daysAhead, type } of slots) {
    let rows;
    try {
      rows = await getExpiringOnDay(daysAhead);
    } catch (err) {
      log(`ERREUR lecture J-${daysAhead}: ${err.message}`);
      continue;
    }

    for (const row of rows) {
      try {
        if (await alreadySent(row.id, type)) {
          log(`Rappel ${type} déjà envoyé — abonnement #${row.id} (${row.email}) — ignoré`);
          skipped++;
          continue;
        }

        const { subject, html } = emailRappelEcheance({
          prenom:             row.prenom || row.nom || 'Utilisateur',
          jours_restants:     daysAhead,
          date_echeance:      row.date_echeance,
          renouvellement_url: RENEWAL_URL,
          montant_mensuel_fcfa: row.price_cents ? row.price_cents / 100 : null,
        });

        await sendEmail({ to: row.email, subject, html });
        await logReminder(row.id, row.utilisateur_id, type, row.email);
        log(`Rappel ${type} → ${row.email} (abonnement #${row.id}, plan: ${row.plan_name || '?'})`);
        sent++;
      } catch (err) {
        log(`ERREUR rappel ${type} → ${row.email}: ${err.message}`);
        errors++;
      }
    }
  }

  log(`── Rappels terminés — envoyés: ${sent}, ignorés: ${skipped}, erreurs: ${errors} ──`);
}

// ─── Tâche 2 : Expiration automatique (00h05) ────────────────────────────────

async function runExpirationTask() {
  log('── Expiration automatique — démarrage ──');
  let expired = 0;
  let errors = 0;

  let rows;
  try {
    rows = await getExpiredActive();
  } catch (err) {
    log(`ERREUR lecture abonnements échus: ${err.message}`);
    return;
  }

  for (const row of rows) {
    try {
      await abonnementModel.expireSubscription(row.id);
      log(`Abonnement #${row.id} expiré — user: ${row.email}`);

      const { subject, html } = emailCompteExpire({
        prenom:             row.prenom || row.nom || 'Utilisateur',
        renouvellement_url: RENEWAL_URL,
      });
      await sendEmail({ to: row.email, subject, html });

      // Évite d'envoyer un email POST_ECHEANCE supplémentaire si déjà tracé
      const deja = await alreadySent(row.id, 'POST_ECHEANCE').catch(() => false);
      if (!deja) {
        await logReminder(row.id, row.utilisateur_id, 'POST_ECHEANCE', row.email);
      }

      expired++;
    } catch (err) {
      log(`ERREUR expiration abonnement #${row.id} (${row.email}): ${err.message}`);
      errors++;
    }
  }

  log(`── Expiration terminée — expirés: ${expired}, erreurs: ${errors} ──`);
}

// ─── Tâche 3 : Alerte admin — paiements en attente (09h00) ───────────────────

async function runAdminAlertTask() {
  log('── Alerte admin — paiements en attente ──');

  let rows;
  try {
    rows = await getPendingOver24h();
  } catch (err) {
    log(`ERREUR lecture paiements en attente: ${err.message}`);
    return;
  }

  if (rows.length === 0) {
    log('Aucun paiement en attente > 24h — pas d\'alerte envoyée');
    return;
  }

  const tableRows = rows.map(r => {
    const montant = r.montant_paye
      ? `${Math.round(r.montant_paye).toLocaleString('fr-FR')} FCFA`
      : '—';
    const nom     = [r.prenom, r.nom].filter(Boolean).join(' ') || r.email;
    const duree   = r.duree_mois === 1 ? '1 mois' : r.duree_mois === 12 ? '1 an' : `${r.duree_mois} mois`;
    const attente = `${r.heures_attente}h`;
    const ref     = r.reference_wave || '—';

    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${nom}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;">${r.email}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#2E7D32;">${montant}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${duree}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1d4ed8;font-family:monospace;">${ref}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#dc2626;font-weight:700;">${attente}</td>
      </tr>`;
  }).join('');

  const adminUrl = `${FRONTEND}/admin/abonnements`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

    <tr>
      <td style="background:#1e293b;padding:24px 32px;">
        <p style="margin:0;font-size:18px;font-weight:800;color:#fff;">Portefolia — Alerte Admin</p>
        <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">
          ${rows.length} paiement${rows.length > 1 ? 's' : ''} en attente depuis plus de 24h — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:28px 32px;">
        <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
          Les paiements suivants sont en statut <strong>PENDING_PAYMENT</strong> depuis plus de 24 heures
          et nécessitent une validation manuelle.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Client</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Email</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Montant</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Durée</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Réf. Wave</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Attente</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>

        <p style="text-align:center;margin:24px 0 0;">
          <a href="${adminUrl}"
             style="display:inline-block;background:#2E7D32;color:#fff;font-size:14px;font-weight:700;
                    padding:12px 32px;border-radius:8px;text-decoration:none;">
            Valider dans le dashboard admin
          </a>
        </p>
      </td>
    </tr>

    <tr>
      <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">
          © ${new Date().getFullYear()} Portefolia — Alerte automatique (cron 09h00, Africa/Dakar)
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`;

  try {
    await sendEmail({
      to:      ADMIN_ALERT_EMAIL,
      subject: `⚠️ [Portefolia Admin] ${rows.length} paiement${rows.length > 1 ? 's' : ''} en attente de validation`,
      html,
    });
    log(`Alerte admin envoyée à ${ADMIN_ALERT_EMAIL} — ${rows.length} paiement(s) en attente`);
  } catch (err) {
    log(`ERREUR envoi alerte admin: ${err.message}`);
  }
}

// ─── Démarrage des crons ──────────────────────────────────────────────────────

function startCronJobs() {
  // Tâche 2 : Expiration automatique — 00h05 chaque nuit
  cron.schedule('5 0 * * *', async () => {
    try {
      await runExpirationTask();
    } catch (err) {
      log(`ERREUR fatale expiration: ${err.message}`);
    }
  }, { timezone: TZ });

  // Tâche 1 : Rappels d'échéance — 08h00
  cron.schedule('0 8 * * *', async () => {
    try {
      await runReminderTask();
    } catch (err) {
      log(`ERREUR fatale rappels: ${err.message}`);
    }
  }, { timezone: TZ });

  // Tâche 3 : Alerte admin — 09h00
  cron.schedule('0 9 * * *', async () => {
    try {
      await runAdminAlertTask();
    } catch (err) {
      log(`ERREUR fatale alerte admin: ${err.message}`);
    }
  }, { timezone: TZ });

  log(`Crons planifiés (${TZ}) — expiration: 00h05, rappels: 08h00, alerte admin: 09h00`);
}

module.exports = { startCronJobs, runReminderTask, runExpirationTask, runAdminAlertTask };
