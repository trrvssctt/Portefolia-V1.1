const userModel = require('../models/userModel');
const portfolioModel = require('../models/portfolioModel');
const visiteModel = require('../models/visiteModel');
const commandeModelLocal = require('../models/commandeModel');
const carteModel = require('../models/carteModel');
const paiementModel = require('../models/paiementModel');
const notificationModel = require('../models/notificationModel');
const { pool } = require('../db');
const invoiceModel = require('../models/invoiceModel');
const planModel = require('../models/planModel');
const abonnementModel = require('../models/abonnementModel');
const sendEmail = require('../utils/sendEmail');
const { emailPaiementCommandeValide, emailCommandeLivree } = require('../utils/emailTemplates');
const checkoutModel = require('../models/checkoutModel');

async function listUsers(req, res) {
  try {
    // simple pagination
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    // Build filters
    const where = ['u.deleted_at IS NULL'];
    const params = [];
    if (req.query.email) {
      where.push('u.email LIKE ?');
      params.push('%' + req.query.email + '%');
    }
    if (req.query.status) {
      // status: active|inactive
      if (req.query.status === 'active') where.push('u.is_active = 1');
      if (req.query.status === 'inactive') where.push('u.is_active = 0');
    }
    if (req.query.date_from) { where.push('u.date_inscription >= ?'); params.push(req.query.date_from); }
    if (req.query.date_to) { where.push('u.date_inscription <= ?'); params.push(req.query.date_to); }
    if (req.query.plan_id) { where.push('p.id = ?'); params.push(Number(req.query.plan_id)); }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    // fetch users with portfolio counts and latest plan
    const sql = `SELECT u.id,
                    u.nom AS last_name,
                    u.prenom AS first_name,
                    u.email,
                    u.role,
                    u.verified,
                    u.is_active,
                    u.date_inscription AS created_at,
                    (SELECT COUNT(*) FROM portfolios p2 WHERE p2.utilisateur_id = u.id) AS portfolio_count,
                    p.id AS plan_id,
                    p.name AS plan_name,
                    p.slug AS plan_slug,
                    p.price_cents AS plan_price_cents
             FROM utilisateurs u
             LEFT JOIN user_plans latest_up ON latest_up.utilisateur_id = u.id
               AND latest_up.id = (
                 SELECT MAX(up2.id) FROM user_plans up2 WHERE up2.utilisateur_id = u.id
               )
             LEFT JOIN plans p ON p.id = latest_up.plan_id
             ${whereSql}
             ORDER BY u.date_inscription DESC
             LIMIT ? OFFSET ?`;

    params.push(limit, offset);
    const [rows] = await pool.query(sql, params);
    console.debug('admin.listUsers executed', { sql, params, rows_count: (rows || []).length });
    return res.json({ users: rows, page, limit });
  } catch (err) {
    console.error('admin.listUsers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Debug endpoint: returns total users count and last 10 users (non-deleted)
async function usersDebug(req, res) {
  try {
    const [[countRow]] = await pool.query('SELECT COUNT(*) AS cnt FROM utilisateurs WHERE deleted_at IS NULL');
    const count = countRow ? Number(countRow.cnt) : 0;

    const [rows] = await pool.query(
      `SELECT u.id,
              u.nom AS last_name,
              u.prenom AS first_name,
              u.email,
              u.role,
              u.verified,
              u.is_active,
              u.date_inscription AS created_at
       FROM utilisateurs u
       WHERE u.deleted_at IS NULL
       ORDER BY u.date_inscription DESC
       LIMIT 10`
    );

    console.debug('admin.usersDebug', { count, returned: (rows || []).length });
    return res.json({ count, last_users: rows });
  } catch (err) {
    console.error('admin.usersDebug error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// --- Upgrade requests admin ---
async function listUpgrades(req, res) {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const upgradeModel = require('../models/upgradeModel');
    const data = await upgradeModel.list({ page, limit });

    // Normaliser le statut depuis l'enum upgrades + paiement_statut
    const upgrades = (data.upgrades || []).map(u => ({
      ...u,
      status: u.statut === 'VALIDATED' ? 'approved'
            : u.statut === 'REJECTED'  ? 'rejected'
            : normalizePaiementStatus(u.paiement_statut || 'pending'),
    }));

    return res.json({ checkouts: upgrades, upgrades, page: data.page, limit: data.limit, total: data.total });
  } catch (err) {
    console.error('admin.listUpgrades error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function normalizePaiementStatus(statut) {
  const s = (statut || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (['reussi', 'confirmed', 'paid'].includes(s)) return 'approved';
  if (['refunded', 'rembourse'].includes(s)) return 'refunded';
  if (['failed', 'echoue'].includes(s)) return 'rejected';
  if (['pending_admin', 'pending_validation', 'en_attente', 'pending'].includes(s)) return 'pending';
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

async function getUpgrade(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const checkout = await checkoutModel.findById(id);
    if (!checkout) return res.status(404).json({ error: 'Not found' });
    // fetch related paiement and commande and plan
    const paiement = await paiementModel.findById(checkout.paiement_id);
    const commande = await commandeModelLocal.findById(checkout.commande_id);
    const plan = await planModel.getPlanById(checkout.plan_id);
    return res.json({ checkout, paiement, commande, plan });
  } catch (err) {
    console.error('admin.getUpgrade error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function approveUpgrade(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const adminId = req.userId || null;
    const { reference = null, payment_method = null, image_paiement = null } = req.body;

    // Charger l'enregistrement upgrades (source de vérité)
    const upgradeModel = require('../models/upgradeModel');
    const upgrade = await upgradeModel.findById(id);
    if (!upgrade) return res.status(404).json({ error: 'Not found' });
    if (upgrade.statut === 'VALIDATED') return res.status(409).json({ error: 'Upgrade déjà validé' });

    // Checkout pour les métadonnées (facultatif, fallback vers upgrade columns)
    const checkout = upgrade.checkout_id ? await checkoutModel.findById(upgrade.checkout_id) : null;

    const durationMonths  = Number(upgrade.duree_mois) || 1;
    const discountPercent = Number(upgrade.remise_appliquee) || 0;
    const dureeLabel = durationMonths === 12 ? '1 an' : `${durationMonths} mois`;

    // Alias pour lisibilité
    const utilisateurId = upgrade.utilisateur_id;
    const paiementId    = upgrade.paiement_id;
    const abonnementId  = upgrade.abonnement_id;
    const planId        = upgrade.plan_cible_id;

    // 1. Mettre à jour le paiement (référence, moyen, statut Réussi)
    try {
      const updates = ['statut = ?'];
      const params = ['Réussi'];
      if (reference) { updates.push('reference_transaction = ?'); params.push(reference); }
      if (payment_method) { updates.push('moyen_paiement = ?'); params.push(payment_method); }
      if (image_paiement) { updates.push('image_paiement = ?'); params.push(image_paiement); }
      params.push(paiementId);
      await pool.query(`UPDATE paiements SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    } catch (e) {
      console.warn('approveUpgrade: could not update paiement:', e.message || e);
    }

    // 2. Marquer le checkout comme approuvé (si lié)
    if (checkout) await checkoutModel.updateStatus(checkout.id, 'approved').catch(() => {});

    // 3. Activer l'abonnement via validateSubscription
    if (abonnementId) {
      try {
        const [[abo]] = await pool.query('SELECT statut_v2 FROM abonnements WHERE id = ? LIMIT 1', [abonnementId]);
        if (abo && abo.statut_v2 === 'PENDING_PAYMENT') {
          await abonnementModel.validateSubscription(
            abonnementId, adminId,
            `Validation upgrade depuis panel admin (upgrade #${id})`
          );
        }
      } catch (e) {
        console.warn('approveUpgrade: validateSubscription error:', e.message || e);
      }
    }

    // 3b. Forcer type_flux = 'UPGRADE' sur le paiement
    if (paiementId) {
      try {
        await pool.query(`UPDATE paiements SET type_flux = 'UPGRADE' WHERE id = ?`, [paiementId]);
      } catch (e) {
        console.warn('approveUpgrade: could not set type_flux to UPGRADE:', e.message || e);
      }
    }

    // 3c. Expirer les anciens abonnements actifs pour éviter double-comptage MRR
    if (abonnementId) {
      try {
        await pool.query(
          `UPDATE abonnements
           SET statut = 'expired',
               statut_v2 = 'EXPIRED',
               updated_at = CURRENT_TIMESTAMP
           WHERE utilisateur_id = ?
             AND id != ?
             AND statut_v2 = 'ACTIVE'`,
          [utilisateurId, abonnementId]
        );
      } catch (e) {
        console.warn('approveUpgrade: could not expire old abonnements:', e.message || e);
      }
    }

    // 4. Synchroniser user_plans pour le dashboard
    const newPlan = await planModel.getPlanById(planId);
    const [[freshAbo]] = await pool.query(
      'SELECT date_debut, date_echeance, end_date FROM abonnements WHERE id = ? LIMIT 1',
      [abonnementId || 0]
    ).catch(() => [[null]]);
    try {
      await pool.query('DELETE FROM user_plans WHERE utilisateur_id = ?', [utilisateurId]);
      await planModel.subscribeUser({
        utilisateur_id:    utilisateurId,
        plan_id:           planId,
        start_date:        freshAbo?.date_debut || null,
        end_date:          freshAbo?.date_echeance || freshAbo?.end_date || null,
        status:            'active',
        payment_reference: reference || null,
      });
    } catch (e) {
      console.warn('approveUpgrade: subscribeUser error:', e.message || e);
    }

    // 5. Activer l'utilisateur
    try { await userModel.setActive(utilisateurId, true); } catch (e) { /* ignore */ }
    try {
      await pool.query(
        "UPDATE utilisateurs SET subscription_status = 'ACTIVE', last_payment_at = NOW() WHERE id = ?",
        [utilisateurId]
      );
    } catch (e) { console.warn('approveUpgrade: subscription_status error:', e.message || e); }

    // 6. Marquer upgrade comme VALIDATED
    await upgradeModel.updateStatus(id, 'VALIDATED', { valide_par: adminId }).catch(() => {});

    // 7. Commande (nullable)
    if (checkout?.commande_id) {
      try { await commandeModelLocal.updateStatus(checkout.commande_id, 'En_traitement'); } catch (e) { /* ignore */ }
    }

    // 8. Email de confirmation avec reçu + lien de connexion
    try {
      const user = await userModel.findById(utilisateurId);
      const paiement = paiementId ? await paiementModel.findById(paiementId) : null;
      let abonnement = null;
      try { if (abonnementId) abonnement = await abonnementModel.findById(abonnementId); } catch (e) { /* ignore */ }

      if (!user?.email) throw new Error('no user email');

      const ASSET_BASE = process.env.EMAIL_ASSET_BASE || 'https://portefolia.tech';
      const FRONTEND   = process.env.FRONTEND_BASE || 'http://localhost:8080';
      const prenom     = user?.prenom || user?.nom || 'Cher client';
      const montantPaye = Number(paiement?.montant || 0);
      const refPaiement = paiement?.reference_transaction || reference || '—';
      const echeance = abonnement?.date_echeance || abonnement?.end_date
        ? new Date(abonnement.date_echeance || abonnement.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—';
      const loginUrl = `${FRONTEND}/auth`;

      const body = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
body{margin:0;padding:0;background:#F7F8F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hdr{background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:40px 40px 32px;text-align:center}
.hdr img{height:48px;margin-bottom:16px}
.hdr h1{margin:0;color:#fff;font-size:22px;font-weight:700}
.hdr p{margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px}
.body{padding:36px 40px}
.badge{display:inline-block;background:#DCFCE7;color:#166534;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;margin-bottom:20px}
.body h2{margin:0 0 8px;font-size:18px;color:#18181B}
.body .sub{color:#71717A;font-size:14px;margin:0 0 28px;line-height:1.6}
table.recap{width:100%;border-collapse:collapse;margin-bottom:28px}
table.recap td{padding:13px 0;font-size:14px;border-bottom:1px solid #F4F4F5;color:#18181B}
table.recap td:first-child{color:#71717A;font-weight:500;width:45%}
table.recap td:last-child{font-weight:600;text-align:right}
.hl{color:#1B5E20;font-weight:700}
.btn{display:block;margin:0 auto 8px;width:fit-content;padding:14px 36px;background:#1B5E20;color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700}
.ftr{background:#F7F8F8;padding:24px 40px;text-align:center;font-size:12px;color:#71717A}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <img src="${ASSET_BASE}/logo.png" alt="Portefolia">
    <h1>Formule activée ✓</h1>
    <p>Votre nouveau plan est maintenant actif</p>
  </div>
  <div class="body">
    <div class="badge">✅ Paiement validé</div>
    <h2>Félicitations ${prenom} !</h2>
    <p class="sub">Votre paiement a été validé par notre équipe. Votre nouveau plan est maintenant actif. Connectez-vous pour en profiter dès maintenant.</p>
    <table class="recap">
      <tr><td>Formule activée</td><td class="hl">${newPlan?.name || '—'}</td></tr>
      <tr><td>Durée</td><td>${dureeLabel}${discountPercent > 0 ? ` <span style="color:#1B5E20">(−${discountPercent}%)</span>` : ''}</td></tr>
      <tr><td>Montant payé</td><td class="hl">${montantPaye.toLocaleString('fr-FR')} F CFA</td></tr>
      <tr><td>Référence</td><td><code style="font-size:13px">${refPaiement}</code></td></tr>
      <tr><td>Accès valide jusqu'au</td><td class="hl">${echeance}</td></tr>
      <tr><td>Date d'activation</td><td>${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
    </table>
    <a href="${loginUrl}" class="btn">Accéder à mon espace →</a>
    <p style="text-align:center;font-size:12px;color:#71717A;margin:12px 0 28px">Cliquez sur le bouton ci-dessus pour vous connecter</p>
    <p style="font-size:13px;color:#71717A;text-align:center">Une question ? <a href="mailto:contact@portefolia.tech" style="color:#1B5E20">contact@portefolia.tech</a></p>
  </div>
  <div class="ftr">© ${new Date().getFullYear()} Portefolia · <a href="${FRONTEND}" style="color:#1B5E20">portefolia.tech</a></div>
</div>
</body></html>`;
      await sendEmail(user.email, 'Formule activée — Portefolia', body);
    } catch (e) {
      console.warn('approveUpgrade: failed to send email', e.message || e);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('admin.approveUpgrade error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function rejectUpgrade(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const adminId = req.userId || null;
    const { reason = 'Raison non spécifiée' } = req.body;

    const upgradeModel = require('../models/upgradeModel');
    const upgrade = await upgradeModel.findById(id);
    if (!upgrade) return res.status(404).json({ error: 'Not found' });
    if (upgrade.statut === 'VALIDATED') return res.status(409).json({ error: 'Upgrade déjà validé, impossible de rejeter' });

    // Marquer comme rejeté
    await upgradeModel.updateStatus(id, 'REJECTED', { valide_par: adminId, motif_refus: reason });

    // Marquer le checkout comme rejeté si présent
    if (upgrade.checkout_id) {
      await checkoutModel.updateStatus(upgrade.checkout_id, 'rejected').catch(() => {});
    }

    // Remettre le paiement en échec
    if (upgrade.paiement_id) {
      await pool.query(
        `UPDATE paiements SET statut = 'Échoué', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [upgrade.paiement_id]
      ).catch(() => {});
    }

    // Email de refus à l'utilisateur
    try {
      const user = await userModel.findById(upgrade.utilisateur_id);
      if (user?.email) {
        const sendEmail = require('../utils/sendEmail');
        const ASSET_BASE = process.env.EMAIL_ASSET_BASE || 'https://portefolia.tech';
        const FRONTEND   = process.env.FRONTEND_BASE || 'http://localhost:8080';
        const prenom = user.prenom || user.nom || 'Cher client';
        const [[plan]] = await pool.query('SELECT name FROM plans WHERE id = ? LIMIT 1', [upgrade.plan_cible_id]);

        const body = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
body{margin:0;padding:0;background:#F7F8F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hdr{background:linear-gradient(135deg,#B71C1C,#C62828);padding:36px 40px 28px;text-align:center}
.hdr img{height:44px;margin-bottom:14px}
.hdr h1{margin:0;color:#fff;font-size:20px;font-weight:700}
.body{padding:32px 40px}
.badge{display:inline-block;background:#FEECEC;color:#C62828;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;margin-bottom:18px}
.reason{background:#FEF3E2;border-left:3px solid #F59E0B;border-radius:8px;padding:14px 16px;font-size:13px;color:#92400E;margin:0 0 24px}
.btn{display:block;margin:0 auto 8px;width:fit-content;padding:13px 32px;background:#1B5E20;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700}
.ftr{background:#F7F8F8;padding:20px 40px;text-align:center;font-size:12px;color:#71717A}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <img src="${ASSET_BASE}/logo.png" alt="Portefolia">
    <h1>Demande non validée</h1>
  </div>
  <div class="body">
    <div class="badge">❌ Paiement non validé</div>
    <p style="font-size:15px;font-weight:600;color:#18181B;margin:0 0 8px">Bonjour ${prenom},</p>
    <p style="font-size:14px;color:#71717A;margin:0 0 20px;line-height:1.6">
      Votre demande de mise à niveau vers le plan <strong>${plan?.name || '—'}</strong> n'a pas pu être validée.
    </p>
    <div class="reason"><strong>Motif :</strong> ${reason}</div>
    <p style="font-size:13px;color:#71717A;margin:0 0 24px;line-height:1.6">
      Votre plan actuel reste inchangé. Si vous pensez qu'il s'agit d'une erreur, contactez notre support.
    </p>
    <a href="${FRONTEND}/plans" class="btn">Voir les plans disponibles →</a>
    <p style="text-align:center;font-size:12px;color:#71717A;margin:16px 0 0">
      Une question ? <a href="mailto:contact@portefolia.tech" style="color:#1B5E20">contact@portefolia.tech</a>
    </p>
  </div>
  <div class="ftr">© ${new Date().getFullYear()} Portefolia · <a href="${FRONTEND}" style="color:#1B5E20">portefolia.tech</a></div>
</div>
</body></html>`;
        await sendEmail(user.email, 'Demande de mise à niveau — Non validée', body);
      }
    } catch (e) { console.warn('rejectUpgrade: email error:', e.message || e); }

    return res.json({ ok: true });
  } catch (err) {
    console.error('admin.rejectUpgrade error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function listPendingUsers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id,
                u.nom AS last_name,
                u.prenom AS first_name,
                u.email,
                u.role,
                u.date_inscription AS created_at,
                u.verified,
                u.is_active,
                p.id AS plan_id,
                p.name AS plan_name,
                p.slug AS plan_slug,
                p.price_cents AS plan_price_cents
       FROM utilisateurs u
       LEFT JOIN (
         SELECT up.utilisateur_id, up.plan_id FROM user_plans up
         WHERE up.id IN (
           SELECT MAX(id) FROM user_plans up2 WHERE up2.utilisateur_id = up.utilisateur_id
         )
       ) latest_up ON latest_up.utilisateur_id = u.id
       LEFT JOIN plans p ON p.id = latest_up.plan_id
         WHERE (u.verified = FALSE OR u.verified = 0) OR (u.is_active = FALSE OR u.is_active = 0)
       ORDER BY u.date_inscription DESC`
    );
    return res.json({ users: rows });
  } catch (err) {
    console.error('admin.listPendingUsers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function listCommandes(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const [rows] = await pool.query('SELECT * FROM commandes ORDER BY date_commande DESC LIMIT ? OFFSET ?', [limit, offset]);
    return res.json({ commandes: rows, page, limit });
  } catch (err) {
    console.error('admin.listCommandes error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// --- Revenue / Finance ---
async function revenueSummary(req, res) {
  try {
    const paidFilter = `LOWER(CONVERT(statut USING utf8mb4)) IN ('réussi', 'reussi', 'confirmed', 'paid')`;

    // total revenue (confirmed or paid)
    const [tot] = await pool.query(`SELECT COALESCE(SUM(montant),0) AS total_revenue FROM paiements WHERE ${paidFilter}`);
    const totalRevenue = tot && tot[0] ? Number(tot[0].total_revenue) : 0;

    // today's revenue
    const [todayRow] = await pool.query(`SELECT COALESCE(SUM(montant),0) AS today_revenue FROM paiements WHERE ${paidFilter} AND DATE(created_at) = CURRENT_DATE()`);
    const todayRevenue = todayRow && todayRow[0] ? Number(todayRow[0].today_revenue) : 0;

    // this month
    const [monthRow] = await pool.query(`SELECT COALESCE(SUM(montant),0) AS month_revenue FROM paiements WHERE ${paidFilter} AND DATE_FORMAT(created_at,'%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')`);
    const monthRevenue = monthRow && monthRow[0] ? Number(monthRow[0].month_revenue) : 0;

    // this year
    const [yearRow] = await pool.query(`SELECT COALESCE(SUM(montant),0) AS year_revenue FROM paiements WHERE ${paidFilter} AND YEAR(created_at) = YEAR(CURRENT_DATE())`);
    const yearRevenue = yearRow && yearRow[0] ? Number(yearRow[0].year_revenue) : 0;

    // monthly breakdown (last 12 months)
    const [monthly] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COALESCE(SUM(montant),0) AS revenue
      FROM paiements
      WHERE ${paidFilter} AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

    return res.json({ totalRevenue, todayRevenue, monthRevenue, yearRevenue, monthly: monthly || [] });
  } catch (err) {
    console.error('admin.revenueSummary error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function revenueByUser(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(`
      SELECT u.id AS user_id, u.nom AS last_name, u.prenom AS first_name, u.email,
             COUNT(p.id) AS payments_count,
             COALESCE(SUM(p.montant),0) AS total_amount,
             MAX(p.created_at) AS last_payment_at
      FROM paiements p
      LEFT JOIN commandes c ON c.id = p.commande_id
      LEFT JOIN utilisateurs u ON u.id = c.utilisateur_id
      WHERE LOWER(CONVERT(p.statut USING utf8mb4)) IN ('réussi', 'reussi', 'confirmed', 'paid')
      GROUP BY u.id
      ORDER BY total_amount DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    return res.json({ users: rows || [], page, limit });
  } catch (err) {
    console.error('admin.revenueByUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Simple Server-Sent Events (SSE) endpoint to push revenue summary periodically
async function revenueStream(req, res) {
  try {
    // set headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    let stopped = false;

    req.on('close', () => { stopped = true; });

    const sendSummary = async () => {
      try {
        const [tot] = await pool.query(`SELECT COALESCE(SUM(montant),0) AS total_revenue FROM paiements WHERE statut IN ('confirmed','paid')`);
        const totalRevenue = tot && tot[0] ? Number(tot[0].total_revenue) : 0;
        const payload = { totalRevenue, timestamp: Date.now() };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (e) {
        console.warn('revenueStream send error', e.message || e);
      }
    };

    // send initial
    await sendSummary();

    // periodic updates every 10 seconds
    const iv = setInterval(async () => {
      if (stopped) {
        clearInterval(iv);
        return;
      }
      await sendSummary();
    }, 10000);

  } catch (err) {
    console.error('admin.revenueStream error:', err);
    // cannot send JSON error because headers set; just end
    try { res.end(); } catch (e) { }
  }
}

async function getUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    // include portfolio_count
    const [rows] = await pool.query('SELECT COUNT(*) AS portfolio_count FROM portfolios WHERE utilisateur_id = ?', [id]);
    user.portfolio_count = rows && rows[0] ? rows[0].portfolio_count : 0;
    // include latest plan
    try {
      const ups = await planModel.listUserPlans(id);
      user.current_plan = ups && ups.length ? ups[0] : null;
      user.plan_history = ups || [];
    } catch (e) {
      user.current_plan = null;
      user.plan_history = [];
    }
    return res.json({ user });
  } catch (err) {
    console.error('admin.getUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function activateUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    await userModel.setActive(id, true);
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin.activateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deactivateUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    await userModel.setActive(id, false);
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin.deactivateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    // Soft delete
    await userModel.deleteUser(id);
    return res.json({ ok: true, soft_deleted: true });
  } catch (err) {
    console.error('admin.deleteUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Permanently delete - restricted to system admins (require RBAC 'system:admin' or super_admin)
async function permanentDeleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    // ensure caller is super_admin or has system:admin permission - RBAC middleware should enforce this
    await userModel.hardDeleteUser(id);
    return res.json({ ok: true, deleted: true });
  } catch (err) {
    console.error('admin.permanentDeleteUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    const patch = {};
    const allowed = ['nom', 'prenom', 'email', 'photo_profil', 'biographie', 'role'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No valid fields provided' });
    const keys = Object.keys(patch);
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const vals = keys.map(k => patch[k]);
    vals.push(id);
    await pool.query(`UPDATE utilisateurs SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, vals);
    const updated = await userModel.findById(id);
    return res.json({ user: updated });
  } catch (err) {
    console.error('admin.updateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getUserPlans(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    const ups = await planModel.listUserPlans(id);
    return res.json({ plans: ups || [] });
  } catch (err) {
    console.error('admin.getUserPlans error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function changeUserPlan(req, res) {
  try {
    const id = Number(req.params.id);
    const { plan_id = null, start_date = null, end_date = null, status = 'active', payment_reference = null } = req.body;
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    // Close previous active plan(s)
    try {
      await pool.query('UPDATE user_plans SET end_date = CURRENT_TIMESTAMP, status = ? WHERE utilisateur_id = ? AND (status = ? OR status = ?)', ['cancelled', id, 'active', 'pending']);
    } catch (e) { console.warn('changeUserPlan: could not close previous plans', e.message || e); }

    const newSub = await planModel.subscribeUser({ utilisateur_id: id, plan_id, start_date, end_date, status, payment_reference });
    // ensure user active if activating plan
    if (status === 'active') { try { await userModel.setActive(id, true); } catch (e) { } }
    return res.json({ ok: true, subscription: newSub });
  } catch (err) {
    console.error('admin.changeUserPlan error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getUserCartes(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    // join commandes -> cartes_nfc
    const [rows] = await pool.query(`SELECT c.*, cmd.id AS commande_id, cmd.utilisateur_id
      FROM cartes_nfc c
      JOIN commandes cmd ON cmd.id = c.commande_id
      WHERE cmd.utilisateur_id = ?`, [id]);
    // map to desired shape
    const cartes = (rows || []).map(r => ({ id: r.id, uid_nfc: r.uid_nfc, lien_portfolio: r.lien_portfolio, design: r.design, statut: r.statut, commande_id: r.commande_id }));
    return res.json({ cartes });
  } catch (err) {
    console.error('admin.getUserCartes error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function verifyUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    await userModel.verifyUser(id);
    // Optionally send a notification/email to the user - kept minimal here
    return res.json({ ok: true, message: 'Utilisateur validé' });
  } catch (err) {
    console.error('admin.verifyUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin confirms payment and validates a user: generate invoice, create subscription (optional), verify user and send invoice email
async function confirmPaymentAndValidate(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    let { plan_id = null, amount = 0, currency = 'XOF', reference = null, payment_method = null, image_paiement = null } = req.body;

    // generate a reference if none provided
    if (!reference) {
      reference = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // normalize amount: if plan specified and amount is falsy, derive from plan price
    if (plan_id && (!amount || Number(amount) === 0)) {
      try {
        const plan = await planModel.getPlanById(plan_id);
        if (plan) {
          amount = Number(plan.price_cents || 0);
        }
      } catch (e) {
        // ignore
      }
    }

    // fetch user's previous plan (if any) for email details
    let previousPlan = null;
    try {
      const ups = await planModel.listUserPlans(id);
      if (Array.isArray(ups) && ups.length > 0) {
        previousPlan = ups[0];
      }
    } catch (e) {
      // ignore
    }

    // mark user as verified
    await userModel.verifyUser(id);
    // mark user as active (payment validated)
    try {
      await userModel.setActive(id, true);
    } catch (e) {
      console.warn('confirmPaymentAndValidate: could not set user active', e.message || e);
    }

    // create invoice record
    const invoice = await invoiceModel.createInvoice({ utilisateur_id: id, plan_id, amount, currency, reference, status: 'paid' });

    // create subscription if plan provided
    let subscription = null;
    if (plan_id) {
      subscription = await planModel.subscribeUser({ utilisateur_id: id, plan_id, start_date: null, end_date: null, status: 'active', payment_reference: reference, metadata: { invoice_id: invoice.id } });
    }

    // Create a commande record for bookkeeping and attach a paiement record
    let commande = null;
    let paiement = null;
    try {
      const numeroCommande = `CMD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      commande = await commandeModelLocal.createCommande({ utilisateur_id: id, numero_commande: numeroCommande, montant_total: amount, statut: 'En_traitement' });
      try {
        const moyen = payment_method || 'manual';
        paiement = await paiementModel.createPaiement({ commande_id: commande.id, montant: amount, moyen_paiement: moyen, statut: 'paid', reference_transaction: reference, image_paiement });
      } catch (e) {
        console.warn('Could not create paiement record:', e.message || e);
      }
    } catch (e) {
      console.warn('Could not create commande/paiement:', e.message || e);
    }

    // send invoice email to user
    const user = await userModel.findById(id);
    const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth`;
    // build rich email body with all references
    const prevPlanHtml = previousPlan ? `
      <li>Plan précédent: ${previousPlan.name || previousPlan.nom || '—'}</li>
      <li>Prix précédent: ${Number(previousPlan.price_cents || 0).toLocaleString('fr-FR')} F CFA</li>
      <li>Début: ${previousPlan.start_date || ''}</li>
      <li>Statut précédent: ${previousPlan.status || previousPlan.state || '—'}</li>
    ` : `<li>Plan précédent: Aucun</li>`;

    const planHtml = plan_id ? (async () => {
      try {
        const p = await planModel.getPlanById(plan_id);
        return `
          <li>Plan demandé: ${p?.name || p?.nom || '—'}</li>
          <li>Prix demandé: ${Number(p?.price_cents || 0).toLocaleString('fr-FR')} F CFA</li>
        `;
      } catch (e) {
        return `<li>Plan demandé: ${plan_id}</li>`;
      }
    })() : `<li>Plan demandé: Aucun</li>`;

    // resolve planHtml promise if necessary
    let planHtmlResolved = '';
    if (plan_id) {
      try { planHtmlResolved = await planHtml; } catch (e) { planHtmlResolved = `<li>Plan demandé: ${plan_id}</li>`; }
    }

    const commandeHtml = commande ? `
      <li>Commande: #${commande.numero_commande || commande.id}</li>
      <li>Commande ID: ${commande.id}</li>
    ` : '<li>Commande: —</li>';

    const paiementHtml = paiement ? `
      <li>Paiement ID: ${paiement.id}</li>
      <li>Montant payé: ${paiement.montant || amount} ${currency}</li>
      <li>Méthode: ${paiement.moyen_paiement || payment_method || 'manual'}</li>
      <li>Référence transaction: ${paiement.reference_transaction || reference || '—'}</li>
      <li>Reçu: ${paiement.image_paiement ? `<a href="${paiement.image_paiement}">Voir le reçu</a>` : '—'}</li>
    ` : '<li>Paiement: —</li>';

    const subscriptionHtml = subscription ? `
      <li>Subscription ID: ${subscription.id}</li>
      <li>Statut subscription: ${subscription.status || subscription.state || 'active'}</li>
    ` : '<li>Subscription: créee si applicable</li>';

    const emailBody = `
      <p>Bonjour ${user.prenom || user.nom || ''},</p>
      <p>Nous confirmons la réception de votre demande de mise à niveau et du paiement associé. L'administration a validé votre demande.</p>
      <h3>Détails utilisateur</h3>
      <ul>
        <li>Utilisateur: ${user.prenom || ''} ${user.nom || ''} (${user.email})</li>
        <li>Utilisateur ID: ${user.id}</li>
      </ul>

      <h3>Plans</h3>
      <ul>
        ${prevPlanHtml}
        ${planHtmlResolved}
      </ul>

      <h3>Facture & Paiement</h3>
      <ul>
        <li>Facture ID: ${invoice.id}</li>
        <li>Montant facturé: ${amount} ${currency}</li>
        <li>Référence facture/paiement: ${reference}</li>
        ${commandeHtml}
        ${paiementHtml}
      </ul>

      <h3>Abonnement</h3>
      <ul>
        ${subscriptionHtml}
      </ul>

      <p>Vous pouvez vous connecter ici: <a href="${loginUrl}">${loginUrl}</a></p>
      <p>Si vous avez des questions, contactez le support.</p>
      <p>Cordialement,<br/>L'équipe Portefolia</p>
    `;

    try {
      // send via configured provider (use MAILTRAP SMTP by setting EMAIL_PROVIDER=smtp and SMTP_* env vars)
      await sendEmail(user.email, 'Confirmation de paiement et facture', emailBody, { text: `Facture ${invoice.id} - ${amount} ${currency}` });
    } catch (err) {
      console.error('Failed to send invoice email:', err);
    }

    return res.json({ ok: true, invoice: invoice, subscription, commande, paiement });
  } catch (err) {
    console.error('admin.confirmPaymentAndValidate error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// --- Portfolios admin ---
async function listPortfolios(req, res) {
  try {
    const userIdFilter = req.query.user_id ? String(req.query.user_id) : null;
    if (userIdFilter) {
      // Return portfolios for a specific utilisateur_id (no pagination)
      const rows = await portfolioModel.findByUser(userIdFilter);
      return res.json({ portfolios: rows });
    }

    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const include = (req.query.include || '').toString();
    const sort = (req.query.sort || '').toString();

    let orderClause = 'p.date_creation DESC';
    if (sort === 'user') orderClause = 'u.prenom ASC, u.nom ASC';
    else if (sort === 'views') orderClause = '(SELECT COUNT(*) FROM visites v WHERE v.portfolio_id = p.id) DESC';

    // fetch portfolios with visit counts and owner info
    const [rows] = await pool.query(
      `SELECT p.*, u.email AS owner_email, u.nom AS owner_nom, u.prenom AS owner_prenom,
              (SELECT COUNT(*) FROM visites v WHERE v.portfolio_id = p.id) AS views_count,
              (SELECT COUNT(*) FROM visites v WHERE v.portfolio_id = p.id AND v.date_visite >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS visit_count_30d
       FROM portfolios p
       LEFT JOIN utilisateurs u ON u.id = p.utilisateur_id
       ORDER BY ${orderClause}
       LIMIT ? OFFSET ?`, [limit, offset]
    );

    // attach owner object and (optionally) owner plan info
    const ownerIds = Array.from(new Set(rows.map(r => r.utilisateur_id).filter(Boolean)));
    const plansByOwner = {};
    for (const oid of ownerIds) {
      try {
        const userPlans = await planModel.listUserPlans(oid);
        const latest = userPlans && userPlans.length ? userPlans[0] : null;
        plansByOwner[oid] = latest || null;
      } catch (e) {
        plansByOwner[oid] = null;
      }
    }

    for (const r of rows) {
      r.owner = {
        id: r.utilisateur_id,
        first_name: r.owner_prenom || null,
        last_name: r.owner_nom || null,
        email: r.owner_email || null,
      };
      const plan = plansByOwner[r.utilisateur_id] || null;
      r.owner_plan = plan ? { id: plan.id, slug: plan.slug || null, name: plan.name || null } : null;
      r.plan_name = plan ? (plan.name || plan.slug) : null;
      if (r.owner && r.owner_plan) r.owner.plan_name = r.plan_name;
      // Add aliases for frontend compatibility
      r.slug = r.url_slug || null;
      r.title = r.titre || null;
      r.bio = r.description || null;
      r.theme_color = r.theme || null;
      r.is_public = r.est_public !== undefined ? r.est_public : r.is_public;
    }

    // If include=stats, compute aggregated stats and distributions
    if (include.includes('stats')) {
      const total = rows.length;
      const deletedCount = rows.filter(r => r.deleted_at).length || 0;
      const isPublic = (p) => (p?.is_public === true || p?.is_public === 1 || p?.est_public === 1);
      const publicCount = rows.filter((p) => isPublic(p) && !p.deleted_at).length || 0;
      const privateCount = rows.filter((p) => !isPublic(p) && !p.deleted_at).length || 0;
      const totalViews = rows.reduce((acc, r) => acc + (Number(r.views_count || 0) || 0), 0);
      const activeCount = total - deletedCount;
      const avgViews = activeCount > 0 ? Math.round(totalViews / activeCount) : 0;

      const byPlan = rows.reduce((acc, r) => {
        const slug = (r.owner_plan && (r.owner_plan.slug || r.owner_plan.name)) ? (r.owner_plan.slug || r.owner_plan.name) : 'Gratuit';
        acc[slug] = (acc[slug] || 0) + 1;
        return acc;
      }, {});

      const byDomain = rows.reduce((acc, r) => {
        const domain = r.custom_domain || r.domain_name || 'default';
        acc[domain] = (acc[domain] || 0) + 1;
        return acc;
      }, {});

      const byUser = rows.reduce((acc, r) => {
        const uid = r.utilisateur_id || 'unknown';
        const name = `${r.owner?.first_name || ''} ${r.owner?.last_name || ''}`.trim() || r.owner?.email || uid;
        if (!acc[uid]) acc[uid] = { count: 0, name };
        acc[uid].count += 1;
        return acc;
      }, {});

      const topPerforming = [...rows].sort((a, b) => (Number(b.views_count || 0) - Number(a.views_count || 0))).slice(0, 10);

      return res.json({
        portfolios: rows, page, limit, stats: {
          total,
          public: publicCount,
          private: privateCount,
          deleted: deletedCount,
          totalViews,
          avgViews,
          byPlan,
          byDomain,
          byUser,
          growth30d: 0,
          topPerforming,
        }
      });
    }

    return res.json({ portfolios: rows, page, limit });
  } catch (err) {
    console.error('admin.listPortfolios error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getPortfolio(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const p = await portfolioModel.findByIdWithRelations(id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    // gather visits last 30 days count
    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM visites WHERE portfolio_id = ? AND date_visite >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)', [id]);
    p.visit_count_30d = rows && rows[0] ? rows[0].cnt : 0;
    return res.json({ portfolio: p });
  } catch (err) {
    console.error('admin.getPortfolio error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updatePortfolioAdmin(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const updated = await portfolioModel.updatePortfolio(id, req.body);
    return res.json({ portfolio: updated });
  } catch (err) {
    console.error('admin.updatePortfolio error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deletePortfolio(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM portfolios WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin.deletePortfolio error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function featurePortfolio(req, res) {
  try {
    const id = Number(req.params.id);
    const featured = req.body.featured === true;
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    // We'll use a simple boolean column featured (create if not exists)
    try {
      await pool.query("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE");
    } catch (err) {
      // ignore
    }
    await pool.query('UPDATE portfolios SET featured = ? WHERE id = ?', [featured ? 1 : 0, id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin.featurePortfolio error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// --- Commandes admin ---
async function adminListCommandes(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (req.query.status) { where.push('c.statut = ?'); params.push(req.query.status); }
    if (req.query.user_id) { where.push('c.utilisateur_id = ?'); params.push(Number(req.query.user_id)); }
    if (req.query.date_from) { where.push('c.date_commande >= ?'); params.push(req.query.date_from); }
    if (req.query.date_to) { where.push('c.date_commande <= ?'); params.push(req.query.date_to); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    const [rows] = await pool.query(`
      SELECT
        c.*,
        c.date_commande AS ordered_at,
        u.email AS utilisateur_email,
        u.prenom AS utilisateur_prenom,
        u.nom AS utilisateur_nom,
        u.photo_profil AS utilisateur_avatar
      FROM commandes c
      LEFT JOIN utilisateurs u ON u.id = c.utilisateur_id
      ${whereSql}
      ORDER BY c.date_commande DESC LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    const commandes = rows.map(r => ({
      ...r,
      utilisateur: {
        first_name: r.utilisateur_prenom || '',
        last_name: r.utilisateur_nom || '',
        profile_image_url: r.utilisateur_avatar || null,
      },
    }));
    return res.json({ commandes, page, limit });
  } catch (err) {
    console.error('admin.adminListCommandes error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function adminGetCommande(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const commande = await commandeModelLocal.findById(id);
    if (!commande) return res.status(404).json({ error: 'Not found' });
    const cards = await pool.query('SELECT * FROM cartes_nfc WHERE commande_id = ?', [commande.id]);
    return res.json({ commande, cards: cards && cards[0] ? cards[0] : [] });
  } catch (err) {
    console.error('admin.adminGetCommande error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function adminUpdateCommandeStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { statut } = req.body;
    if (!id || !statut) return res.status(400).json({ error: 'Invalid payload' });
    const commande = await commandeModelLocal.findById(id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable' });
    if (commande.paiement_statut !== 'payé') {
      return res.status(400).json({ error: 'Paiement non encore validé. Validez le paiement avant de traiter la commande.' });
    }
    const updated = await commandeModelLocal.updateStatus(id, statut);
    // Email de livraison
    if (statut === 'Livrée') {
      try {
        const user = await userModel.findById(commande.utilisateur_id);
        if (user && user.email) {
          const tpl = emailCommandeLivree({
            prenom: user.prenom || user.nom || 'Client',
            numero_commande: commande.numero_commande,
            montant: commande.montant_total,
          });
          await sendEmail(user.email, tpl.subject, tpl.html);
        }
      } catch (mailErr) {
        console.warn('adminUpdateCommandeStatus: email livraison non envoyé', mailErr.message);
      }
    }
    return res.json({ commande: updated });
  } catch (err) {
    console.error('admin.adminUpdateCommandeStatus error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function adminValiderPaiement(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const commande = await commandeModelLocal.findById(id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable' });
    if (commande.paiement_statut === 'payé') return res.status(400).json({ error: 'Paiement déjà validé' });
    const { note } = req.body;
    const updated = await commandeModelLocal.updatePaiement(id, {
      paiement_statut: 'payé',
      paiement_note: note || null,
    });
    // Mettre à jour l'entrée paiements (confirmé)
    try {
      await pool.query(
        "UPDATE paiements SET statut = 'confirmed', updated_at = NOW() WHERE commande_id = ?",
        [id]
      );
    } catch (pErr) {
      console.warn('adminValiderPaiement: paiements update failed', pErr.message);
    }

    // Email de confirmation au client
    try {
      const user = await userModel.findById(commande.utilisateur_id);
      if (user && user.email) {
        const tpl = emailPaiementCommandeValide({
          prenom: user.prenom || user.nom || 'Client',
          numero_commande: commande.numero_commande,
          montant: commande.montant_total,
          paiement_mode: commande.paiement_mode,
        });
        await sendEmail(user.email, tpl.subject, tpl.html);
      }
    } catch (mailErr) {
      console.warn('adminValiderPaiement: email non envoyé', mailErr.message);
    }
    return res.json({ commande: updated });
  } catch (err) {
    console.error('admin.adminValiderPaiement error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function adminRefuserPaiement(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const commande = await commandeModelLocal.findById(id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable' });
    const { note } = req.body;
    const updated = await commandeModelLocal.updatePaiement(id, {
      paiement_statut: 'refusé',
      paiement_note: note || null,
    });
    // Mettre à jour l'entrée paiements (échec)
    try {
      await pool.query(
        "UPDATE paiements SET statut = 'failed', updated_at = NOW() WHERE commande_id = ?",
        [id]
      );
    } catch (pErr) {
      console.warn('adminRefuserPaiement: paiements update failed', pErr.message);
    }
    return res.json({ commande: updated });
  } catch (err) {
    console.error('admin.adminRefuserPaiement error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Generate a simple invoice HTML for a commande (fallback, no PDF rendering)
async function getCommandeInvoicePdf(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid commande id' });
    const commande = await commandeModelLocal.findById(id);
    if (!commande) return res.status(404).json({ error: 'Not found' });
    const [cardsRows] = await pool.query('SELECT * FROM cartes_nfc WHERE commande_id = ?', [commande.id]);
    const user = await userModel.findById(commande.utilisateur_id);

    const logoUrl = (process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : '') + '/lovable-uploads/logo_portefolia_remove_bg.png';

    const itemsHtml = (cardsRows && cardsRows[0] ? cardsRows[0] : []).map((c) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${c.id}</td>
        <td style="padding:8px;border:1px solid #ddd">${c.design || '—'}</td>
        <td style="padding:8px;border:1px solid #ddd">${c.uid_nfc || '—'}</td>
      </tr>
    `).join('');

    const html = `
      <!doctype html>
      <html>
      <head><meta charset="utf-8"><title>Facture ${commande.numero_commande || commande.id}</title></head>
      <body style="font-family:Arial,Helvetica,sans-serif;color:#222">
        <div style="max-width:800px;margin:0 auto">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div><img src="${logoUrl}" alt="logo" style="height:60px;object-fit:contain"/></div>
            <div style="text-align:right"><h2>Facture</h2><div>Commande: ${commande.numero_commande || commande.id}</div><div>Date: ${commande.date_commande || ''}</div></div>
          </div>
          <hr/>
          <h3>Client</h3>
          <div>${user ? `${user.prenom || ''} ${user.nom || ''} &lt;${user.email || ''}&gt;` : '—'}</div>
          <h3>Détails</h3>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #ddd">ID</th>
                <th style="padding:8px;border:1px solid #ddd">Design</th>
                <th style="padding:8px;border:1px solid #ddd">UID NFC</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || '<tr><td colspan="3" style="padding:8px;border:1px solid #ddd">Aucun item</td></tr>'}
            </tbody>
          </table>
          <h3>Total: ${commande.montant_total || '0'}</h3>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('admin.getCommandeInvoicePdf error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// --- Cartes admin ---
async function listCartes(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (req.query.statut) { where.push('cn.statut = ?'); params.push(req.query.statut); }
    if (req.query.commande_id) { where.push('cn.commande_id = ?'); params.push(Number(req.query.commande_id)); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    const [rows] = await pool.query(`
      SELECT
        cn.*,
        COALESCE(cn.created_at, c.date_commande) AS created_at,
        c.date_commande,
        c.statut AS commande_statut,
        c.paiement_statut,
        u.email AS client_email,
        TRIM(CONCAT(COALESCE(u.prenom, ''), ' ', COALESCE(u.nom, ''))) AS client_name,
        u.photo_profil AS client_avatar,
        p.titre AS portfolio_title
      FROM cartes_nfc cn
      LEFT JOIN commandes c ON c.id = cn.commande_id
      LEFT JOIN utilisateurs u ON u.id = c.utilisateur_id
      LEFT JOIN portfolios p ON p.url_slug = cn.lien_portfolio
      ${whereSql}
      ORDER BY cn.id DESC LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    return res.json({ cartes: rows, page, limit });
  } catch (err) {
    console.error('admin.listCartes error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getCarte(req, res) {
  try {
    const id = Number(req.params.id);
    const c = await carteModel.findById(id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    return res.json({ carte: c });
  } catch (err) {
    console.error('admin.getCarte error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function assignUidCarte(req, res) {
  try {
    const id = Number(req.params.id);
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const updated = await carteModel.assignUid(id, uid);
    return res.json({ carte: updated });
  } catch (err) {
    console.error('admin.assignUidCarte error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function setCarteStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { statut } = req.body;
    if (!statut) return res.status(400).json({ error: 'statut required' });
    const updated = await carteModel.setStatus(id, statut);
    return res.json({ carte: updated });
  } catch (err) {
    console.error('admin.setCarteStatus error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateCarte(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const allowed = ['statut', 'notes', 'design', 'lien_portfolio', 'uid_nfc'];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No valid fields' });
    const updated = await carteModel.updateCarte(id, patch);
    return res.json({ carte: updated });
  } catch (err) {
    console.error('admin.updateCarte error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteCarte(req, res) {
  try {
    const id = Number(req.params.id);
    await carteModel.deleteCarte(id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin.deleteCarte error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// --- Paiements admin ---
async function listPaiements(req, res) {
  try {
    const status = req.query.status || null;
    const user_id = req.query.user_id || null;
    const q = await paiementModel.list({ page: req.query.page, limit: req.query.limit, status, user_id });
    return res.json(q);
  } catch (err) {
    console.error('admin.listPaiements error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin: upcoming abonnements (next N days)
async function listAbonnementsUpcoming(req, res) {
  try {
    const days = Math.max(Number(req.query.days) || 30, 1);
    const [rows] = await pool.query(`
      SELECT a.*, u.id AS user_id, u.prenom, u.nom, u.email, p.name AS plan_name
      FROM abonnements a
      LEFT JOIN utilisateurs u ON u.id = a.utilisateur_id
      LEFT JOIN plans p ON p.id = a.plan_id
      WHERE a.statut IN ('active','pending')
        AND a.end_date IS NOT NULL
        AND a.end_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)
      ORDER BY a.end_date ASC
    `, [days]);
    return res.json({ abonnements: rows || [] });
  } catch (err) {
    console.error('admin.listAbonnementsUpcoming error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getPaiement(req, res) {
  try {
    const id = Number(req.params.id);
    const p = await paiementModel.findById(id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    return res.json({ paiement: p });
  } catch (err) {
    console.error('admin.getPaiement error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updatePaiementStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    const updated = await paiementModel.updateStatus(id, status);
    return res.json({ paiement: updated });
  } catch (err) {
    console.error('admin.updatePaiementStatus error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// --- Notifications admin ---
async function listNotifications(req, res) {
  try {
    const q = await notificationModel.list({ page: req.query.page, limit: req.query.limit });
    return res.json(q);
  } catch (err) {
    console.error('admin.listNotifications error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createNotification(req, res) {
  try {
    const { user_id = null, titre, message, meta = null, send = false } = req.body;
    if (!titre || !message) return res.status(400).json({ error: 'titre and message required' });
    const n = await notificationModel.createNotification({ user_id, titre, message, meta });
    if (send) {
      // mock sending: mark sent and log
      await notificationModel.markSent(n.id);
      console.log('Mock send notification', n.id, 'to', user_id);
    }
    return res.status(201).json({ notification: n });
  } catch (err) {
    console.error('admin.createNotification error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// --- Invoices admin ---
async function listInvoices(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const offset = (page - 1) * limit;

    // filters: q (reference, email, id), reference, user_email, date_from, date_to
    const where = [];
    const params = [];
    if (req.query.reference) { where.push('i.reference = ?'); params.push(req.query.reference); }
    if (req.query.user_email) { where.push('u.email LIKE ?'); params.push('%' + req.query.user_email + '%'); }
    if (req.query.date_from) { where.push('i.created_at >= ?'); params.push(req.query.date_from); }
    if (req.query.date_to) { where.push('i.created_at <= ?'); params.push(req.query.date_to); }
    if (req.query.q) {
      where.push('(i.reference LIKE ? OR u.email LIKE ? OR i.id = ?)');
      params.push('%' + req.query.q + '%', '%' + req.query.q + '%', Number(req.query.q) || 0);
    }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    // total count for pagination
    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS cnt FROM invoices i LEFT JOIN utilisateurs u ON u.id = i.utilisateur_id ${whereSql}`, params);
    const total = countRow ? Number(countRow.cnt || 0) : 0;

    const sql = `SELECT i.*, u.email AS user_email, u.prenom AS user_first, u.nom AS user_last, p.name AS plan_name
       FROM invoices i
       LEFT JOIN utilisateurs u ON u.id = i.utilisateur_id
       LEFT JOIN plans p ON p.id = i.plan_id
       ${whereSql}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`;

    const [rows] = await pool.query(sql, params.concat([limit, offset]));
    return res.json({ invoices: rows || [], page, limit, total });
  } catch (err) {
    console.error('admin.listInvoices error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getInvoiceById(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const inv = await invoiceModel.findById(id);
    if (!inv) return res.status(404).json({ error: 'Not found' });
    const [rows] = await pool.query('SELECT id, email, nom, prenom FROM utilisateurs WHERE id = ? LIMIT 1', [inv.utilisateur_id]);
    inv.user = rows && rows[0] ? rows[0] : null;
    if (inv.plan_id) {
      try { const p = await planModel.getPlanById(inv.plan_id); inv.plan = p; } catch (e) { inv.plan = null; }
    }
    return res.json({ invoice: inv });
  } catch (err) {
    console.error('admin.getInvoiceById error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getInvoiceByReference(req, res) {
  try {
    const ref = req.query.reference;
    if (!ref) return res.status(400).json({ error: 'reference required' });
    const [rows] = await pool.query('SELECT * FROM invoices WHERE reference = ? LIMIT 1', [ref]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const inv = rows[0];
    return res.json({ invoice: inv });
  } catch (err) {
    console.error('admin.getInvoiceByReference error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Return a simple HTML representation of the invoice (front-end can open and print to PDF)
async function getInvoiceHtml(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).send('Invalid id');
    const inv = await invoiceModel.findById(id);
    if (!inv) return res.status(404).send('Not found');
    const [rows] = await pool.query('SELECT id, email, nom, prenom FROM utilisateurs WHERE id = ? LIMIT 1', [inv.utilisateur_id]);
    const user = rows && rows[0] ? rows[0] : { email: '—', nom: '', prenom: '' };
    const invoiceNumber = `INV-${new Date(inv.created_at || inv.createdAt || Date.now()).toISOString().slice(0, 7).replace('-', '')}-${inv.id}`;
    const amount = (Number(inv.amount || inv.montant || 0));
    const currency = inv.currency || 'XOF';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Facture ${invoiceNumber}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}h1{color:#111}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd}</style></head><body><h1>Facture ${invoiceNumber}</h1><p>Date: ${new Date(inv.created_at || inv.createdAt || Date.now()).toLocaleString('fr-FR')}</p><h2>Client</h2><p>${user.prenom || ''} ${user.nom || ''}<br/>${user.email || ''}</p><h2>Détails</h2><table><tr><th>Description</th><th>Montant</th></tr><tr><td>Facture #${inv.id}${inv.plan_id ? ' — plan ' + (inv.plan_id) : ''}</td><td style="text-align:right">${amount.toLocaleString('fr-FR')} ${currency}</td></tr><tr><td style="text-align:right;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${amount.toLocaleString('fr-FR')} ${currency}</td></tr></table><p>Référence: ${inv.reference || '—'}</p><p>Merci pour votre paiement.</p></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('admin.getInvoiceHtml error:', err);
    return res.status(500).send('Server error');
  }
}

// Generate PDF for invoice (uses puppeteer if available). Returns PDF binary.
async function getInvoicePdf(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).send('Invalid id');
    // reuse HTML generation
    const inv = await invoiceModel.findById(id);
    if (!inv) return res.status(404).send('Not found');

    // build same HTML as getInvoiceHtml
    const [rows] = await pool.query('SELECT id, email, nom, prenom FROM utilisateurs WHERE id = ? LIMIT 1', [inv.utilisateur_id]);
    const user = rows && rows[0] ? rows[0] : { email: '—', nom: '', prenom: '' };
    const invoiceNumber = `INV-${new Date(inv.created_at || inv.createdAt || Date.now()).toISOString().slice(0, 7).replace('-', '')}-${inv.id}`;
    const amount = (Number(inv.amount || inv.montant || 0));
    const currency = inv.currency || 'XOF';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Facture ${invoiceNumber}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}h1{color:#111}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd}</style></head><body><h1>Facture ${invoiceNumber}</h1><p>Date: ${new Date(inv.created_at || inv.createdAt || Date.now()).toLocaleString('fr-FR')}</p><h2>Client</h2><p>${user.prenom || ''} ${user.nom || ''}<br/>${user.email || ''}</p><h2>Détails</h2><table><tr><th>Description</th><th>Montant</th></tr><tr><td>Facture #${inv.id}${inv.plan_id ? ' — plan ' + (inv.plan_id) : ''}</td><td style="text-align:right">${amount.toLocaleString('fr-FR')} ${currency}</td></tr><tr><td style="text-align:right;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${amount.toLocaleString('fr-FR')} ${currency}</td></tr></table><p>Référence: ${inv.reference || '—'}</p><p>Merci pour votre paiement.</p></body></html>`;

    // Try to use puppeteer if installed
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${inv.id}.pdf"`);
      return res.send(pdfBuffer);
    } catch (e) {
      console.warn('puppeteer not available or failed, falling back to HTML:', e.message || e);
      // fallback: return HTML as text with content-type that browser can render
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
  } catch (err) {
    console.error('admin.getInvoicePdf error:', err);
    return res.status(500).send('Server error');
  }
}

// Generate PDF for a commande (order) with company logo embedded
async function getCommandeInvoicePdf(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).send('Invalid id');

    const [rows] = await pool.query('SELECT c.*, u.email, u.nom, u.prenom FROM commandes c LEFT JOIN utilisateurs u ON u.id = c.utilisateur_id WHERE c.id = ? LIMIT 1', [id]);
    const cmd = rows && rows[0] ? rows[0] : null;
    if (!cmd) return res.status(404).send('Not found');

    // fetch related cartes for details (if any)
    const [cartes] = await pool.query('SELECT id, uid_nfc, lien_portfolio, statut FROM cartes_nfc WHERE commande_id = ?', [id]);

    const orderNumber = `CMD-${new Date(cmd.date_commande || Date.now()).toISOString().slice(0, 10).replace(/-/g, '')}-${cmd.id}`;
    const amount = Number(cmd.montant_total || 0);
    const currency = 'F CFA';
    const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    // prefer public upload path if available
    const logoUrl = `${baseUrl}/lovable-uploads/logo_portefolia_remove_bg.png`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Facture ${orderNumber}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}h1{color:#111}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd}header{display:flex;align-items:center;gap:16px;margin-bottom:20px}header img{height:60px}</style></head><body><header><img src="${logoUrl}" alt="Logo"/><div><h1>Facture ${orderNumber}</h1><div>Date: ${new Date(cmd.date_commande || Date.now()).toLocaleString('fr-FR')}</div></div></header><h2>Client</h2><p>${cmd.prenom || ''} ${cmd.nom || ''}<br/>${cmd.email || ''}</p><h2>Détails</h2><table><tr><th>Description</th><th>Montant</th></tr><tr><td>Commande #${cmd.id}</td><td style="text-align:right">${amount.toLocaleString('fr-FR')} ${currency}</td></tr><tr><td style="text-align:right;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${amount.toLocaleString('fr-FR')} ${currency}</td></tr></table>`
      + (cartes && cartes.length ? `<h3 class="mt-4">Cartes associées (${cartes.length})</h3><ul>${cartes.map(cc => `<li>UID: ${cc.uid_nfc || '—'} — statut: ${cc.statut || '—'}</li>`).join('')}</ul>` : '')
      + `<p>Référence commande: ${cmd.numero_commande || '—'}</p><p>Merci pour votre confiance.</p></body></html>`;

    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="commande-${cmd.id}.pdf"`);
      return res.send(pdfBuffer);
    } catch (e) {
      console.warn('puppeteer not available or failed for commande PDF, returning HTML fallback', e.message || e);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
  } catch (err) {
    console.error('admin.getCommandeInvoicePdf error:', err);
    return res.status(500).send('Server error');
  }
}

// --- Admin users (super-admin management) ---
const bcrypt = require('bcrypt');
const adminUserModel = require('../models/adminUserModel');

async function listAdminUsers(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT a.id, a.email, a.full_name, a.role_id, r.name AS role_name, a.is_active, a.created_at
       FROM admin_users a
       LEFT JOIN roles r ON r.id = a.role_id
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`, [limit, offset]
    );
    return res.json({ admins: rows || [], page, limit });
  } catch (err) {
    console.error('admin.listAdminUsers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createAdminUser(req, res) {
  try {
    const { full_name, email, password, role_id = null, is_active = true } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'Champs requis manquants' });

    // Resolve caller role for extra guard
    const callerRoleName = await adminUserModel.getRoleNameByAdminId(req.userId);
    const callerIsSuperAdmin = callerRoleName === 'super_admin';

    // Only super_admin can assign the super_admin role to someone else
    if (role_id) {
      const [[roleRow]] = await pool.query('SELECT name FROM roles WHERE id = ? LIMIT 1', [role_id]);
      if (roleRow && roleRow.name === 'super_admin' && !callerIsSuperAdmin) {
        return res.status(403).json({ error: 'Seul un super administrateur peut attribuer le rôle super_admin.' });
      }
    }

    const existing = await adminUserModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.', field: 'email' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO admin_users (email, password_hash, full_name, role_id, is_active) VALUES (?, ?, ?, ?, ?)',
      [email, hash, full_name, role_id, is_active ? 1 : 0]
    );
    const created = await adminUserModel.findById(result.insertId);
    if (created) delete created.password_hash;
    return res.status(201).json({ admin: created });
  } catch (err) {
    console.error('admin.createAdminUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateAdminUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { full_name, email, password, role_id, is_active } = req.body;

    // Only super_admin can assign or change to the super_admin role
    if (role_id !== undefined) {
      const callerRoleName = await adminUserModel.getRoleNameByAdminId(req.userId);
      if (callerRoleName !== 'super_admin') {
        const [[roleRow]] = await pool.query('SELECT name FROM roles WHERE id = ? LIMIT 1', [role_id]);
        if (roleRow && roleRow.name === 'super_admin') {
          return res.status(403).json({ error: 'Seul un super administrateur peut attribuer le rôle super_admin.' });
        }
      }
    }
    const patch = [];
    const params = [];
    if (full_name !== undefined) { patch.push('full_name = ?'); params.push(full_name); }
    if (email !== undefined) { patch.push('email = ?'); params.push(email); }
    if (role_id !== undefined) { patch.push('role_id = ?'); params.push(role_id); }
    if (is_active !== undefined) { patch.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      patch.push('password_hash = ?'); params.push(hash);
    }
    if (patch.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    const sql = `UPDATE admin_users SET ${patch.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await pool.query(sql, params);
    const updated = await adminUserModel.findById(id);
    if (updated) delete updated.password_hash;
    return res.json({ admin: updated });
  } catch (err) {
    console.error('admin.updateAdminUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteAdminUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    // Prevent deleting your own account
    if (id === Number(req.userId)) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    // Prevent deleting the last super_admin account
    const [[{ superAdminCount }]] = await pool.query(
      `SELECT COUNT(*) AS superAdminCount FROM admin_users a
       JOIN roles r ON r.id = a.role_id
       WHERE r.name = 'super_admin'`
    );
    const targetRole = await adminUserModel.getRoleNameByAdminId(id);
    if (targetRole === 'super_admin' && Number(superAdminCount) <= 1) {
      return res.status(400).json({ error: 'Impossible de supprimer le dernier super administrateur.' });
    }

    await pool.query('DELETE FROM admin_users WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin.deleteAdminUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Public roles listing (used by frontend to populate role select)
async function listRoles(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, name, description FROM roles ORDER BY id ASC');
    return res.json({ roles: rows || [] });
  } catch (err) {
    console.error('admin.listRoles error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  listUsers, listCommandes, getUser, activateUser, deactivateUser, deleteUser, permanentDeleteUser,
  updateUser, getUserPlans, changeUserPlan, getUserCartes,
  listPortfolios, getPortfolio, updatePortfolioAdmin, deletePortfolio, featurePortfolio,
  adminListCommandes, adminGetCommande, adminUpdateCommandeStatus, adminValiderPaiement, adminRefuserPaiement,
  listCartes, getCarte, assignUidCarte, setCarteStatus, updateCarte, deleteCarte,
  listPaiements, getPaiement, updatePaiementStatus,
  listNotifications, createNotification
};
// export getUserSessions
module.exports.getUserSessions = getUserSessions;
// attach invoice endpoints
module.exports.listInvoices = listInvoices;
module.exports.getInvoiceById = getInvoiceById;
module.exports.getInvoiceByReference = getInvoiceByReference;
module.exports.getInvoiceHtml = getInvoiceHtml;
module.exports.getInvoicePdf = getInvoicePdf;
module.exports.getCommandeInvoicePdf = getCommandeInvoicePdf;

// Export verifyUser so admin route can access it
module.exports.verifyUser = verifyUser;

// Export pending user list and confirm-payment handler
module.exports.listPendingUsers = listPendingUsers;
module.exports.confirmPaymentAndValidate = confirmPaymentAndValidate;

// Expose upgrade management endpoints
module.exports.listUpgrades = listUpgrades;
module.exports.getUpgrade = getUpgrade;
module.exports.approveUpgrade = approveUpgrade;
module.exports.rejectUpgrade = rejectUpgrade;

// --- Analytics / Reports ---
async function totals(req, res) {
  try {
    const [[u]] = await pool.query('SELECT COUNT(*) AS total_users FROM utilisateurs');
    const [[p]] = await pool.query('SELECT COUNT(*) AS total_portfolios FROM portfolios');
    const [[c]] = await pool.query('SELECT COUNT(*) AS total_commandes FROM commandes');
    const [[cards]] = await pool.query('SELECT COUNT(*) AS total_cartes FROM cartes_nfc');
    return res.json({ total_users: u.total_users, total_portfolios: p.total_portfolios, total_commandes: c.total_commandes, total_cartes: cards.total_cartes });
  } catch (err) {
    console.error('admin.totals error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function monthlyVisits(req, res) {
  try {
    // visits per month for last 12 months
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(date_visite, '%Y-%m') AS month, COUNT(*) AS visits
      FROM visites
      WHERE date_visite >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);
    return res.json({ visits: rows });
  } catch (err) {
    console.error('admin.monthlyVisits error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function monthlyRevenue(req, res) {
  try {
    // Aggregate revenue from both commandes and invoices to include admin-generated invoices
    const [rows] = await pool.query(`
      SELECT month, SUM(amount) AS revenue FROM (
        SELECT DATE_FORMAT(date_commande, '%Y-%m') AS month, montant_total AS amount
        FROM commandes
        WHERE date_commande >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
        UNION ALL
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, amount AS amount
        FROM invoices
        WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
      ) t
      GROUP BY month
      ORDER BY month ASC
    `);
    return res.json({ revenue: rows });
  } catch (err) {
    console.error('admin.monthlyRevenue error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Return sessions for a given user (from `sessions` table) — admin only
async function getUserSessions(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const limit = Math.min(Number(req.query.limit) || 200, 2000);
    // sessions table may vary in column names; return rows as-is for admin UI
    const [rows] = await pool.query('SELECT * FROM sessions WHERE utilisateur_id = ? ORDER BY created_at DESC LIMIT ?', [id, limit]);
    return res.json({ sessions: rows || [] });
  } catch (err) {
    console.error('admin.getUserSessions error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function exportCommandesCsv(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM commandes ORDER BY date_commande DESC');
    // simple CSV
    const keys = Object.keys(rows[0] || {});
    const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="commandes.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('admin.exportCommandesCsv error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function exportInvoicesCsv(req, res) {
  try {
    const [rows] = await pool.query('SELECT i.*, u.email AS user_email, u.prenom AS user_first, u.nom AS user_last FROM invoices i LEFT JOIN utilisateurs u ON u.id = i.utilisateur_id ORDER BY i.created_at DESC');
    const keys = Object.keys(rows[0] || {});
    const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('admin.exportInvoicesCsv error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// --- Webhooks ---
async function paymentWebhook(req, res) {
  try {
    // Basic mock webhook receiver. In production verify signatures.
    const payload = req.body;
    console.log('Received payment webhook:', payload);
    // Example: update paiement status by reference
    if (payload && payload.reference && payload.status) {
      await pool.query('UPDATE paiements SET statut = ? WHERE reference_transaction = ?', [payload.status, payload.reference]);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('paymentWebhook error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Append to exports
module.exports.totals = totals;
module.exports.monthlyVisits = monthlyVisits;
module.exports.monthlyRevenue = monthlyRevenue;
module.exports.exportCommandesCsv = exportCommandesCsv;
module.exports.paymentWebhook = paymentWebhook;

// export revenue endpoints
module.exports.revenueSummary = revenueSummary;
module.exports.revenueByUser = revenueByUser;
module.exports.statsPlatform = statsPlatform;
module.exports.statsPlansDistribution = statsPlansDistribution;
module.exports.statsUsers = statsUsers;
module.exports.statsPortfolios = statsPortfolios;
module.exports.statsCommandes = statsCommandes;
module.exports.dashboardStats = dashboardStats;

// --- Additional stats endpoints used by frontend /api/admin/stats/* ---
async function statsPlatform(req, res) {
  try {
    // Count visits by user_agent heuristic (mobile vs desktop)
    const [totRows] = await pool.query(`SELECT COUNT(*) AS cnt FROM visites`);
    const total = totRows && totRows[0] ? Number(totRows[0].cnt) : 0;
    const [mobRows] = await pool.query(`SELECT COUNT(*) AS cnt FROM visites WHERE user_agent LIKE '%Mobile%' OR user_agent LIKE '%Android%' OR user_agent LIKE '%iPhone%'`);
    const mobile = mobRows && mobRows[0] ? Number(mobRows[0].cnt) : 0;
    const desktop = Math.max(0, total - mobile);
    return res.json({ stats: { web: desktop, mobile, desktop }, total });
  } catch (err) {
    console.error('admin.statsPlatform error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function statsPlansDistribution(req, res) {
  try {
    // Count active user_plans per plan
    const [rows] = await pool.query(`
      SELECT p.id, p.name, p.slug, COALESCE(COUNT(up.id),0) AS users_count
      FROM plans p
      LEFT JOIN user_plans up ON up.plan_id = p.id
      GROUP BY p.id
      ORDER BY users_count DESC
    `);
    return res.json({ distribution: rows || [] });
  } catch (err) {
    console.error('admin.statsPlansDistribution error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function statsUsers(req, res) {
  try {
    const [[totalRow]] = await pool.query('SELECT COUNT(*) AS total FROM utilisateurs WHERE deleted_at IS NULL');
    const [[activeRow]] = await pool.query('SELECT COUNT(*) AS active FROM utilisateurs WHERE is_active = 1 AND deleted_at IS NULL');
    const [[pendingRow]] = await pool.query("SELECT COUNT(*) AS pending FROM utilisateurs WHERE is_active = 0 AND deleted_at IS NULL");
    return res.json({ total: Number(totalRow.total || 0), active: Number(activeRow.active || 0), pending: Number(pendingRow.pending || 0) });
  } catch (err) {
    console.error('admin.statsUsers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function statsPortfolios(req, res) {
  try {
    const [[totalRow]] = await pool.query('SELECT COUNT(*) AS total FROM portfolios WHERE deleted_at IS NULL');
    const [[publicRow]] = await pool.query('SELECT COUNT(*) AS pub FROM portfolios WHERE (est_public = 1 OR est_public = TRUE) AND deleted_at IS NULL');
    const [[viewsRow]] = await pool.query('SELECT COALESCE(COUNT(*),0) AS total_views FROM visites');
    return res.json({ total: Number(totalRow.total || 0), public: Number(publicRow.pub || 0), totalViews: Number(viewsRow.total_views || 0) });
  } catch (err) {
    console.error('admin.statsPortfolios error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function statsCommandes(req, res) {
  try {
    const [[totalRow]] = await pool.query('SELECT COUNT(*) AS total FROM commandes');
    const [byStatus] = await pool.query('SELECT statut, COUNT(*) AS cnt FROM commandes GROUP BY statut');
    return res.json({ total: Number(totalRow.total || 0), byStatus: byStatus || [] });
  } catch (err) {
    console.error('admin.statsCommandes error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Aggregated dashboard stats endpoint — supports live mode (range) and historical mode (mode=history&date=...&granularity=...)
async function dashboardStats(req, res) {
  try {
    const mode = req.query.mode || 'live';
    const range = req.query.range || 'month';
    const histDate = req.query.date || null;
    const granularity = req.query.granularity || 'month';
    const paid = `statut IN ('confirmed','paid','Réussi')`;
    const isHistorical = mode === 'history' && histDate;

    let startDateSql, endDateSql, prevStartDateSql, prevEndDateSql, chartFormat;

    if (isHistorical) {
      // ── Historical mode: compute exact date bounds from histDate + granularity ──
      switch (granularity) {
        case 'day': {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(histDate))
            return res.status(400).json({ error: 'Invalid date. Expected YYYY-MM-DD' });
          startDateSql = `'${histDate} 00:00:00'`;
          endDateSql   = `'${histDate} 23:59:59'`;
          const d = new Date(histDate + 'T12:00:00Z');
          d.setUTCDate(d.getUTCDate() - 1);
          const prev = d.toISOString().split('T')[0];
          prevStartDateSql = `'${prev} 00:00:00'`;
          prevEndDateSql   = `'${prev} 23:59:59'`;
          chartFormat = '%H:00';
          break;
        }
        case 'month': {
          if (!/^\d{4}-\d{2}$/.test(histDate))
            return res.status(400).json({ error: 'Invalid date. Expected YYYY-MM' });
          const [yr, mo] = histDate.split('-').map(Number);
          const lastDay = new Date(yr, mo, 0).getDate();
          startDateSql = `'${histDate}-01 00:00:00'`;
          endDateSql   = `'${histDate}-${String(lastDay).padStart(2,'0')} 23:59:59'`;
          let pm = mo - 1, py = yr;
          if (pm === 0) { pm = 12; py--; }
          const prevLast = new Date(py, pm, 0).getDate();
          const pms = String(pm).padStart(2,'0');
          prevStartDateSql = `'${py}-${pms}-01 00:00:00'`;
          prevEndDateSql   = `'${py}-${pms}-${String(prevLast).padStart(2,'0')} 23:59:59'`;
          chartFormat = '%d %b';
          break;
        }
        case 'quarter': {
          if (!/^\d{4}-Q[1-4]$/.test(histDate))
            return res.status(400).json({ error: 'Invalid date. Expected YYYY-Q[1-4]' });
          const [yrStr, qStr] = histDate.split('-Q');
          const yr = parseInt(yrStr), q = parseInt(qStr);
          const sm = (q - 1) * 3 + 1, em = q * 3;
          const lastDay = new Date(yr, em, 0).getDate();
          startDateSql = `'${yr}-${String(sm).padStart(2,'0')}-01 00:00:00'`;
          endDateSql   = `'${yr}-${String(em).padStart(2,'0')}-${String(lastDay).padStart(2,'0')} 23:59:59'`;
          let pq = q - 1, py = yr;
          if (pq === 0) { pq = 4; py--; }
          const psm = (pq - 1) * 3 + 1, pem = pq * 3;
          const prevLast = new Date(py, pem, 0).getDate();
          prevStartDateSql = `'${py}-${String(psm).padStart(2,'0')}-01 00:00:00'`;
          prevEndDateSql   = `'${py}-${String(pem).padStart(2,'0')}-${String(prevLast).padStart(2,'0')} 23:59:59'`;
          chartFormat = '%Y-%m';
          break;
        }
        case 'year': {
          if (!/^\d{4}$/.test(histDate))
            return res.status(400).json({ error: 'Invalid date. Expected YYYY' });
          const yr = parseInt(histDate);
          if (yr < 2000 || yr > new Date().getFullYear())
            return res.status(400).json({ error: 'Year out of range' });
          startDateSql = `'${yr}-01-01 00:00:00'`;
          endDateSql   = `'${yr}-12-31 23:59:59'`;
          prevStartDateSql = `'${yr - 1}-01-01 00:00:00'`;
          prevEndDateSql   = `'${yr - 1}-12-31 23:59:59'`;
          chartFormat = '%Y-%m';
          break;
        }
        default:
          return res.status(400).json({ error: 'Invalid granularity. Expected day, month, quarter, or year' });
      }
    } else {
      // ── Live mode: rolling window relative to today ──
      chartFormat = '%Y-%m';
      switch (range) {
        case 'today':
          startDateSql     = 'CURRENT_DATE()';
          endDateSql       = 'NOW()';
          prevStartDateSql = 'DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)';
          prevEndDateSql   = 'DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)';
          chartFormat = '%H:00';
          break;
        case 'week':
          startDateSql     = 'DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)';
          endDateSql       = 'NOW()';
          prevStartDateSql = 'DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)';
          prevEndDateSql   = 'DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)';
          chartFormat = '%d %b';
          break;
        case 'year':
          startDateSql     = 'DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)';
          endDateSql       = 'NOW()';
          prevStartDateSql = 'DATE_SUB(CURRENT_DATE(), INTERVAL 2 YEAR)';
          prevEndDateSql   = 'DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)';
          break;
        case 'month':
        default:
          startDateSql     = 'DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)';
          endDateSql       = 'NOW()';
          prevStartDateSql = 'DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH)';
          prevEndDateSql   = 'DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)';
          chartFormat = '%d %b';
          break;
      }
    }

    // Reusable SQL condition fragments
    const periodCond     = isHistorical
      ? `created_at >= ${startDateSql} AND created_at <= ${endDateSql}`
      : `created_at >= ${startDateSql}`;
    const prevCond       = isHistorical
      ? `created_at >= ${prevStartDateSql} AND created_at <= ${prevEndDateSql}`
      : `created_at >= ${prevStartDateSql} AND created_at < ${startDateSql}`;
    const userPeriodCond = isHistorical
      ? `date_inscription >= ${startDateSql} AND date_inscription <= ${endDateSql}`
      : `date_inscription >= ${startDateSql}`;
    const userPrevCond   = isHistorical
      ? `date_inscription >= ${prevStartDateSql} AND date_inscription <= ${prevEndDateSql}`
      : `date_inscription >= ${prevStartDateSql} AND date_inscription < ${startDateSql}`;
    const asOf      = isHistorical ? `AND created_at <= ${endDateSql}` : '';
    const userAsOf  = isHistorical ? `AND date_inscription <= ${endDateSql}` : '';
    const portoAsOf = isHistorical ? `AND date_creation <= ${endDateSql}` : '';

    const [
      [revTotal],
      [revPeriod],
      [revPrevPeriod],
      [revMonthly],
      [[usersTotal]],
      [[usersPeriod]],
      [[usersPrevPeriod]],
      [[portTotal]],
      [[commandesTotal]],
      [[commandesPeriod]],
      [[commandesPrevPeriod]],
      [[commandesPending]],
      [[cartesTotal]],
      [[cartesActive]],
      [[upgradesPending]],
      [[paiementsFailed]],
    ] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(montant),0) AS v FROM paiements WHERE ${paid} ${asOf}`),
      pool.query(`SELECT COALESCE(SUM(montant),0) AS v FROM paiements WHERE ${paid} AND ${periodCond}`),
      pool.query(`SELECT COALESCE(SUM(montant),0) AS v FROM paiements WHERE ${paid} AND ${prevCond}`),
      pool.query(`SELECT DATE_FORMAT(created_at, '${chartFormat}') AS month, COALESCE(SUM(montant),0) AS revenue FROM paiements WHERE ${paid} AND ${periodCond} GROUP BY month ORDER BY MIN(created_at) ASC`),
      pool.query(`SELECT COUNT(*) AS v FROM utilisateurs WHERE deleted_at IS NULL ${userAsOf}`),
      pool.query(`SELECT COUNT(*) AS v FROM utilisateurs WHERE deleted_at IS NULL AND ${userPeriodCond}`),
      pool.query(`SELECT COUNT(*) AS v FROM utilisateurs WHERE deleted_at IS NULL AND ${userPrevCond}`),
      pool.query(`SELECT COUNT(*) AS v FROM portfolios WHERE deleted_at IS NULL ${portoAsOf}`),
      pool.query(`SELECT COUNT(*) AS v FROM commandes WHERE deleted_at IS NULL ${asOf}`),
      pool.query(`SELECT COUNT(*) AS v FROM commandes WHERE deleted_at IS NULL AND ${periodCond}`),
      pool.query(`SELECT COUNT(*) AS v FROM commandes WHERE deleted_at IS NULL AND ${prevCond}`),
      pool.query(`SELECT COUNT(*) AS v FROM commandes WHERE statut IN ('pending','en_attente') AND deleted_at IS NULL ${asOf}`),
      pool.query(`SELECT COUNT(*) AS v FROM cartes_visite ${isHistorical ? `WHERE created_at <= ${endDateSql}` : ''}`).catch(() => [[{ v: 0 }]]),
      pool.query(`SELECT COUNT(*) AS v FROM cartes_visite WHERE statut='active' ${isHistorical ? `AND created_at <= ${endDateSql}` : ''}`).catch(() => [[{ v: 0 }]]),
      pool.query(`SELECT COUNT(*) AS v FROM checkouts WHERE statut='pending' ${isHistorical ? `AND created_at <= ${endDateSql}` : ''}`).catch(() => [[{ v: 0 }]]),
      pool.query(`SELECT COUNT(*) AS v FROM paiements WHERE statut IN ('failed','echoue','annule') AND ${periodCond}`).catch(() => [[{ v: 0 }]]),
    ]);

    const n = (row) => Number((row && row.v) || 0);
    const growth = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    return res.json({
      mode,
      range: isHistorical ? granularity : range,
      histDate: histDate || null,
      granularity: isHistorical ? granularity : null,
      // Revenue
      total_revenue: n(revTotal[0]),
      month_revenue: n(revPeriod[0]),
      last_month_revenue: n(revPrevPeriod[0]),
      revenue_growth: growth(n(revPeriod[0]), n(revPrevPeriod[0])),
      monthly_revenue: revMonthly || [],
      // Users
      total_users: n(usersTotal),
      users_this_month: n(usersPeriod),
      users_last_month: n(usersPrevPeriod),
      user_growth: growth(n(usersPeriod), n(usersPrevPeriod)),
      // Portfolios
      total_portfolios: n(portTotal),
      // Commandes
      total_commandes: n(commandesTotal),
      commandes_this_month: n(commandesPeriod),
      commandes_last_month: n(commandesPrevPeriod),
      order_growth: growth(n(commandesPeriod), n(commandesPrevPeriod)),
      commandes_pending: n(commandesPending),
      // Cartes NFC
      total_cartes: n(cartesTotal),
      cartes_active: n(cartesActive),
      // Alerts
      pending_upgrades: n(upgradesPending),
      failed_payments_month: n(paiementsFailed),
    });
  } catch (err) {
    console.error('admin.dashboardStats error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
module.exports.revenueStream = revenueStream;
module.exports.exportInvoicesCsv = exportInvoicesCsv;

// Debug endpoint export
module.exports.usersDebug = usersDebug;
// Upcoming abonnements
module.exports.listAbonnementsUpcoming = listAbonnementsUpcoming;

// Admin users & roles exports
module.exports.listAdminUsers = listAdminUsers;
module.exports.createAdminUser = createAdminUser;
module.exports.updateAdminUser = updateAdminUser;
module.exports.deleteAdminUser = deleteAdminUser;
module.exports.listRoles = listRoles;

// --- Detailed Plan Analytics ---
async function plansDetailedStats(req, res) {
  console.log('[adminController.plansDetailedStats] called with period:', req.query.period);
  try {
    const period = req.query.period || 'month';
    let intervalDay = 30;

    switch (period) {
      case 'day': intervalDay = 1; break;
      case 'week': intervalDay = 7; break;
      case 'month': intervalDay = 30; break;
      case 'quarter': intervalDay = 90; break;
      case 'semester': intervalDay = 180; break;
      case 'year': intervalDay = 365; break;
      default: intervalDay = 30;
    }

    // 1. Fetch all plans
    const [plans] = await pool.query('SELECT id, name, slug, price_cents, currency FROM plans');

    // 2. Active subscribers count per plan
    const [activeRows] = await pool.query(`
      SELECT plan_id, COUNT(*) as count
      FROM user_plans
      WHERE status = 'active'
      GROUP BY plan_id
    `);

    // 3. New subscribers in the period
    const [newRows] = await pool.query(`
      SELECT plan_id, COUNT(*) as count
      FROM user_plans
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY plan_id
    `, [intervalDay]);

    // 4. Revenue in the period (linked to plan_id)
    // We check invoices as they are the source of truth for plan-related revenue
    const [revenueRows] = await pool.query(`
      SELECT plan_id, SUM(amount) as total
      FROM invoices
      WHERE status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY plan_id
    `, [intervalDay]);

    // 5. Aggregate metrics
    const stats = plans.map(p => {
      const active = activeRows.find(r => Number(r.plan_id) === Number(p.id))?.count || 0;
      const news = newRows.find(r => Number(r.plan_id) === Number(p.id))?.count || 0;
      const revenue = Number(revenueRows.find(r => Number(r.plan_id) === Number(p.id))?.total || 0);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price_cents: p.price_cents,
        currency: p.currency,
        active_subscribers: active,
        new_subscribers: news,
        revenue: revenue
      };
    });

    return res.json({ period, stats });
  } catch (err) {
    console.error('admin.plansDetailedStats error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports.plansDetailedStats = plansDetailedStats;

// ─── GET /api/admin/badges ────────────────────────────────────────────────────
async function getBadges(req, res) {
  try {
    const [[waveRow], [upgradeRow], [expiredRow], [expiringSoonRow]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS v FROM abonnements WHERE statut_v2 = 'PENDING_PAYMENT'`
      ),
      pool.query(
        `SELECT COUNT(*) AS v FROM checkouts WHERE status = 'pending'`
      ),
      pool.query(
        `SELECT COUNT(*) AS v FROM user_plans
         WHERE status = 'active'
           AND end_date IS NOT NULL
           AND end_date < NOW()
           AND end_date > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      ),
      pool.query(
        `SELECT COUNT(*) AS v FROM user_plans
         WHERE status = 'active'
           AND end_date IS NOT NULL
           AND end_date > NOW()
           AND end_date < DATE_ADD(NOW(), INTERVAL 5 DAY)`
      ),
    ]);
    return res.json({
      pending_wave_payments: Number((waveRow[0] && waveRow[0].v) || 0),
      pending_upgrades:      Number((upgradeRow[0] && upgradeRow[0].v) || 0),
      expired_accounts:      Number((expiredRow[0] && expiredRow[0].v) || 0),
      expiring_soon:         Number((expiringSoonRow[0] && expiringSoonRow[0].v) || 0),
    });
  } catch (err) {
    console.error('admin.getBadges error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
module.exports.getBadges = getBadges;
