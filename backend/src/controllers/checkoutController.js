const planModel = require('../models/planModel');
const commandeModel = require('../models/commandeModel');
const paiementModel = require('../models/paiementModel');
const checkoutModel = require('../models/checkoutModel');
const abonnementModel = require('../models/abonnementModel');
const businessAccountModel = require('../models/businessAccountModel');
const userModel = require('../models/userModel');

function genOrderNumber() {
  return 'CHK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Remises selon la durée choisie
const DURATION_DISCOUNTS = { 1: 0, 3: 15, 12: 20 };

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function createCheckout(req, res) {
  try {
    const userId = req.userId;
    const { plan_id, duration_months: rawDuration } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!plan_id) return res.status(400).json({ error: 'plan_id required' });

    const duration_months = DURATION_DISCOUNTS.hasOwnProperty(Number(rawDuration)) ? Number(rawDuration) : 1;
    const discountPercent = DURATION_DISCOUNTS[duration_months];

    const plan = await planModel.getPlanById(plan_id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const isYearlyPlan = (plan.billing_interval || '').toLowerCase() === 'yearly';
    const unitMonthly = isYearlyPlan
      ? Number(plan.price_cents || 0) / 12
      : Number(plan.price_cents || 0);
    const baseAmount = unitMonthly * duration_months;
    const montant = Math.round(baseAmount * (1 - discountPercent / 100));

    // Calcul de la prochaine date de facturation selon le end_date actuel de l'utilisateur
    const { pool } = require('../db');
    const [activePlans] = await pool.query(
      'SELECT plan_id, end_date FROM user_plans WHERE utilisateur_id = ? AND status = ? ORDER BY end_date DESC LIMIT 1',
      [userId, 'active']
    );
    const currentEndDate = activePlans[0]?.end_date;
    const currentPlanId  = activePlans[0]?.plan_id ?? null;
    const baseDate = (currentEndDate && new Date(currentEndDate) > new Date())
      ? new Date(currentEndDate) : new Date();
    const newEndDate = addMonths(baseDate, duration_months);

    const checkoutMeta = {
      plan,
      duration_months,
      discount_percent: discountPercent,
      base_amount: baseAmount,
      current_end_date: currentEndDate || null,
      new_end_date: newEndDate,
    };

    const abonnement = await abonnementModel.createAbonnement({
      utilisateur_id: userId, plan_id, montant, currency: plan.currency || 'XOF',
      statut: 'pending', metadata: checkoutMeta, duree_mois: duration_months,
    });

    const paiement = await paiementModel.createPaiement({
      abonnement_id: abonnement.id, montant, statut: 'pending',
      metadata: { plan_id, purpose: 'reabonnement', duration_months, discount_percent: discountPercent },
    });

    const checkout = await checkoutModel.createCheckout({
      utilisateur_id: userId, plan_id, abonnement_id: abonnement.id,
      paiement_id: paiement.id, metadata: checkoutMeta, checkout_type: 'reabonnement',
    });

    // Enregistrer dans la table upgrades pour traçabilité et KPI financiers
    try {
      const upgradeModel = require('../models/upgradeModel');
      await upgradeModel.createUpgrade({
        utilisateur_id:   userId,
        plan_source_id:   currentPlanId,
        plan_cible_id:    plan_id,
        paiement_id:      paiement.id,
        checkout_id:      checkout.id,
        abonnement_id:    abonnement.id,
        montant_delta:    montant,
        duree_mois:       duration_months,
        remise_appliquee: discountPercent,
      });
    } catch (e) { console.warn('createCheckout: could not create upgrade record:', e?.message); }

    return res.status(201).json({
      checkout: { id: checkout.id, token: checkout.token },
      checkout_url: `${process.env.FRONTEND_BASE || 'https://portefolia.tech'}/checkout?token=${checkout.token}`,
      duration_months,
      discount_percent: discountPercent,
      montant,
      new_end_date: newEndDate,
    });
  } catch (err) {
    console.error('createCheckout error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getCheckout(req, res) {
  try {
    const token = req.params.token;
    if (!token) return res.status(400).json({ error: 'token required' });
    const checkout = await checkoutModel.findByToken(token);
    if (!checkout) return res.status(404).json({ error: 'Not found' });

    const plan = await planModel.getPlanById(checkout.plan_id);
    const paiement = await paiementModel.findById(checkout.paiement_id);

    // Toujours retourner metadata comme objet
    const meta = typeof checkout.metadata === 'string'
      ? JSON.parse(checkout.metadata || '{}')
      : (checkout.metadata || {});

    return res.json({ checkout: { ...checkout, metadata: meta }, plan, paiement });
  } catch (err) {
    console.error('getCheckout error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Lightweight status endpoint for frontend polling — returns only what's needed
async function getCheckoutStatus(req, res) {
  try {
    const token = req.params.token;
    if (!token) return res.status(400).json({ error: 'token required' });
    const checkout = await checkoutModel.findByToken(token);
    if (!checkout) return res.status(404).json({ error: 'Not found' });
    const plan = await planModel.getPlanById(checkout.plan_id);
    return res.json({
      status: checkout.status,
      plan_name: plan ? plan.name : null,
      plan_id: checkout.plan_id,
    });
  } catch (err) {
    console.error('getCheckoutStatus error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Submit Wave payment reference — marks checkout as pending_admin review (does NOT activate account)
async function confirmCheckout(req, res) {
  try {
    const token = req.params.token;
    const { reference_transaction, payment_method } = req.body;
    const checkout = await checkoutModel.findByToken(token);
    if (!checkout) return res.status(404).json({ error: 'Not found' });

    // Only the same user can submit their reference
    if (req.userId && Number(req.userId) !== Number(checkout.utilisateur_id)) return res.status(403).json({ error: 'Forbidden' });

    if (!reference_transaction || !reference_transaction.trim()) {
      return res.status(400).json({ error: 'La référence de transaction Wave est requise.' });
    }

    // Mark paiement and checkout as pending_admin (NOT confirmed — admin must validate)
    await paiementModel.updateStatus(checkout.paiement_id, 'pending_admin');
    await checkoutModel.updateStatus(checkout.id, 'pending_admin');

    // Désactiver le compte si l'utilisateur n'a pas encore de plan payant actif
    // (nouveau souscripteur ou passage free → payant). Les renouvellements ne bloquent pas.
    try {
      const { pool: dbPool } = require('../db');
      const [activePaid] = await dbPool.query(
        `SELECT up.id FROM user_plans up
         JOIN plans pl ON pl.id = up.plan_id
         WHERE up.utilisateur_id = ? AND up.status = 'active' AND pl.price_cents > 0 LIMIT 1`,
        [checkout.utilisateur_id]
      );
      if (!activePaid || !activePaid.length) {
        await dbPool.query('UPDATE utilisateurs SET is_active = 0 WHERE id = ?', [checkout.utilisateur_id]);
      }
    } catch (e) { console.warn('confirmCheckout: could not deactivate user:', e?.message); }

    // Save the Wave reference and payment method on the paiement row
    try {
      const { pool: dbPool } = require('../db');
      await dbPool.query(
        'UPDATE paiements SET moyen_paiement = ?, reference_transaction = ? WHERE id = ?',
        ['wave', reference_transaction.trim(), checkout.paiement_id]
      );
      // Propager la référence vers abonnements.reference_wave pour le panel admin Wave
      if (checkout.abonnement_id) {
        await dbPool.query(
          "UPDATE abonnements SET reference_wave = ?, statut_v2 = 'PENDING_PAYMENT' WHERE id = ?",
          [reference_transaction.trim(), checkout.abonnement_id]
        );
        // Ne bloquer subscription_status que si l'utilisateur n'a pas de plan payant actif
        // (cas upgrade : l'utilisateur garde ses accès jusqu'à validation admin)
        const [activePaidPlan] = await dbPool.query(
          `SELECT up.id FROM user_plans up
           JOIN plans pl ON pl.id = up.plan_id
           WHERE up.utilisateur_id = ? AND up.status = 'active' AND pl.price_cents > 0 LIMIT 1`,
          [checkout.utilisateur_id]
        );
        if (!activePaidPlan || !activePaidPlan.length) {
          await dbPool.query(
            "UPDATE utilisateurs SET subscription_status = 'PENDING_PAYMENT' WHERE id = ?",
            [checkout.utilisateur_id]
          );
        }
      }
    } catch (e) { console.warn('Could not save Wave reference:', e && e.message); }

    // Emails : admin + utilisateur
    try {
      const sendEmail = require('../utils/sendEmail');
      const ASSET_BASE = process.env.EMAIL_ASSET_BASE || 'https://portefolia.tech';
      const FRONTEND  = process.env.FRONTEND_BASE || 'https://portefolia.tech';
      const user = await userModel.findById(checkout.utilisateur_id);
      const cMeta = typeof checkout.metadata === 'string' ? JSON.parse(checkout.metadata || '{}') : (checkout.metadata || {});
      const cDuration = Number(cMeta.duration_months) || 1;
      const cDiscount = Number(cMeta.discount_percent) || 0;
      const cPlan = cMeta.plan || {};
      const cMontant = Math.round(Number(cMeta.base_amount || 0) * (1 - cDiscount / 100));
      const dureeLabel = cDuration === 12 ? '1 an' : `${cDuration} mois`;
      const prenom = user?.prenom || user?.nom || 'Cher client';

      // Email admin
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `[Portefolia] Référence Wave à valider — ${user?.email}`,
          html: `<p>Un utilisateur vient de soumettre une référence Wave en attente de validation.</p>
                 <p><strong>Utilisateur :</strong> ${user?.email}</p>
                 <p><strong>Plan :</strong> ${cPlan.name || checkout.plan_id}</p>
                 <p><strong>Durée :</strong> ${dureeLabel}${cDiscount > 0 ? ` (−${cDiscount}%)` : ''}</p>
                 <p><strong>Montant :</strong> ${cMontant.toLocaleString('fr-FR')} F CFA</p>
                 <p><strong>Référence Wave :</strong> <strong>${reference_transaction}</strong></p>
                 <p>Connectez-vous à <a href="${FRONTEND}/admin">l'administration</a> pour valider ce paiement.</p>`,
        });
      }

      // Email utilisateur : confirmation de réception, en attente de validation
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: 'Votre demande est en cours de traitement — Portefolia',
          html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
body{margin:0;padding:0;background:#F7F8F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
.wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hdr{background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:40px 40px 32px;text-align:center}
.hdr img{height:48px;margin-bottom:16px}
.hdr h1{margin:0;color:#fff;font-size:22px;font-weight:700}
.hdr p{margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px}
.body{padding:36px 40px}
.badge{display:inline-block;background:#FEF3E2;color:#B45309;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;margin-bottom:20px}
.body h2{margin:0 0 8px;font-size:18px;color:#18181B}
.body .sub{color:#71717A;font-size:14px;margin:0 0 28px}
table.recap{width:100%;border-collapse:collapse;margin-bottom:24px}
table.recap td{padding:12px 0;font-size:14px;border-bottom:1px solid #F4F4F5;color:#18181B}
table.recap td:first-child{color:#71717A;font-weight:500;width:45%}
table.recap td:last-child{font-weight:600;text-align:right}
.highlight{color:#1B5E20;font-weight:700}
.info-box{background:#F0FDF4;border-left:4px solid #2E7D32;border-radius:8px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#1B5E20}
.ftr{background:#F7F8F8;padding:24px 40px;text-align:center;font-size:12px;color:#71717A}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <img src="${ASSET_BASE}/logo.png" alt="Portefolia">
    <h1>Demande reçue ✓</h1>
    <p>Votre paiement est en attente de validation</p>
  </div>
  <div class="body">
    <div class="badge">⏳ En attente de validation</div>
    <h2>Bonjour ${prenom},</h2>
    <p class="sub">Nous avons bien reçu votre demande de changement de formule. Notre équipe va vérifier votre paiement et activer votre nouveau plan dans les <strong>24 heures</strong>.</p>
    <table class="recap">
      <tr><td>Formule demandée</td><td class="highlight">${cPlan.name || 'N/A'}</td></tr>
      <tr><td>Durée</td><td>${dureeLabel}${cDiscount > 0 ? ` <span style="color:#1B5E20">(−${cDiscount}%)</span>` : ''}</td></tr>
      <tr><td>Montant</td><td class="highlight">${cMontant.toLocaleString('fr-FR')} F CFA</td></tr>
      <tr><td>Référence Wave</td><td><code style="font-size:13px">${reference_transaction}</code></td></tr>
    </table>
    <div class="info-box">
      🔒 <strong>Vos accès actuels sont maintenus</strong> pendant la validation. Vous continuerez à bénéficier de votre formule en cours jusqu'à l'activation de la nouvelle.
    </div>
    <p style="font-size:13px;color:#71717A;text-align:center">Une question ? <a href="mailto:contact@portefolia.tech" style="color:#1B5E20">contact@portefolia.tech</a></p>
  </div>
  <div class="ftr">© ${new Date().getFullYear()} Portefolia · <a href="${FRONTEND}" style="color:#1B5E20">portefolia.tech</a></div>
</div>
</body></html>`,
        });
      }
    } catch (e) { console.warn('confirmCheckout: email error:', e?.message); }

    return res.json({
      ok: true,
      pending: true,
      message: 'Référence enregistrée. Votre compte sera activé après validation par notre équipe sous 24h.',
    });
  } catch (err) {
    console.error('confirmCheckout error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin: approve a Wave payment — activates the user account
async function approveWavePayment(req, res) {
  try {
    const { id } = req.params; // checkout id
    const { pool } = require('../db');
    const [rows] = await pool.query('SELECT * FROM checkouts WHERE id = ?', [id]);
    const checkout = rows[0];
    if (!checkout) return res.status(404).json({ error: 'Checkout non trouvé' });

    if (checkout.status === 'confirmed') {
      return res.status(400).json({ error: 'Ce paiement est déjà confirmé.' });
    }

    // Mark confirmed
    await paiementModel.updateStatus(checkout.paiement_id, 'confirmed');
    await checkoutModel.updateStatus(checkout.id, 'confirmed');

    // Lire la durée depuis le metadata du checkout
    const meta = typeof checkout.metadata === 'string'
      ? JSON.parse(checkout.metadata || '{}')
      : (checkout.metadata || {});
    const durationMonths = Number(meta.duration_months) || 1;

    // Trouver le end_date actif de l'utilisateur pour l'étendre
    const [activePlans] = await pool.query(
      'SELECT end_date FROM user_plans WHERE utilisateur_id = ? AND status = ? ORDER BY end_date DESC LIMIT 1',
      [checkout.utilisateur_id, 'active']
    );
    const currentEndDate = activePlans[0]?.end_date;
    const baseDate = (currentEndDate && new Date(currentEndDate) > new Date())
      ? new Date(currentEndDate) : new Date();
    const newEndDate = addMonths(baseDate, durationMonths);

    // Annuler / libérer l'ancien abonnement (actif ou suspendu) avant d'en créer un nouveau
    try {
      await pool.query(
        "UPDATE user_plans SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE utilisateur_id = ? AND status IN ('active','suspended')",
        [checkout.utilisateur_id]
      );
    } catch (e) { console.warn('cancel old sub error:', e && e.message); }

    if (checkout.plan_id) {
      try {
        await planModel.subscribeUser({
          utilisateur_id: checkout.utilisateur_id,
          plan_id: checkout.plan_id,
          status: 'active',
          payment_reference: `WAVE-ADMIN-APPROVED-${checkout.id}`,
          start_date: new Date(),
          end_date: newEndDate,
        });
      } catch (e) { console.warn('subscribeUser error in approveWavePayment:', e && e.message); }
    }
    if (checkout.abonnement_id) {
      try {
        await abonnementModel.updatePaymentDetails(checkout.abonnement_id, {
          payment_reference: `WAVE-ADMIN-APPROVED-${checkout.id}`,
          end_date: newEndDate,
          statut: 'active',
        });
      } catch (e) { console.warn('abonnement update error in approveWavePayment:', e && e.message); }
    }

    // Activate the user account and set correct role
    try { await userModel.setActive(checkout.utilisateur_id, true); } catch (e) { console.warn('setActive error:', e && e.message); }
    // Set BUSINESS_ADMIN role, create business account, and réactiver les membres suspendus
    if (checkout.plan_id) {
      try {
        const plan = await planModel.getPlanById(checkout.plan_id);
        const isBusinessPlan = plan && (
          (plan.slug || '').toLowerCase().includes('business') ||
          (plan.metadata && plan.metadata.plan_type === 'business')
        );
        if (isBusinessPlan) {
          await userModel.setRole(checkout.utilisateur_id, 'BUSINESS_ADMIN');
          const existing = await businessAccountModel.findAccountByAdminId(checkout.utilisateur_id);
          if (!existing) {
            const u = await userModel.findById(checkout.utilisateur_id);
            await businessAccountModel.createAccount({
              admin_user_id: checkout.utilisateur_id,
              company_name: u?.prenom || u?.email || 'Mon Entreprise',
              plan_id: checkout.plan_id,
            });
          } else {
            // Réactiver les membres Business qui avaient été suspendus
            try {
              const [suspendedMembers] = await pool.query(`
                SELECT bm.id, bm.user_id FROM business_members bm
                WHERE bm.business_account_id = ? AND bm.status = 'suspended' AND bm.user_id IS NOT NULL
              `, [existing.id]);
              for (const m of suspendedMembers) {
                await pool.query('UPDATE utilisateurs SET is_active = 1 WHERE id = ?', [m.user_id]);
                await pool.query("UPDATE business_members SET status = 'active' WHERE id = ?", [m.id]);
              }
              if (suspendedMembers.length) {
                console.log(`approveWavePayment: réactivé ${suspendedMembers.length} membre(s) Business`);
              }
            } catch (e) { console.warn('Reactivate members error:', e && e.message); }
          }
        }
      } catch (e) { console.warn('Business setup error in approveWavePayment:', e && e.message); }
    }

    // Email d'activation uniquement pour les inscriptions (les upgrades sont gérés par approveUpgrade)
    if (checkout.checkout_type === 'reabonnement') {
      return res.json({ ok: true, message: 'Paiement Wave validé. Compte utilisateur activé.' });
    }

    try {
      const sendEmail = require('../utils/sendEmail');
      const user = await userModel.findById(checkout.utilisateur_id);
      const paiement = await paiementModel.findById(checkout.paiement_id);
      const planForEmail = meta.plan || await planModel.getPlanById(checkout.plan_id) || {};
      if (user?.email) {
        const loginUrl = `${process.env.FRONTEND_BASE || 'https://portefolia.tech'}/auth`;
        const prenom = user.prenom || user.nom || 'Client';
        const dureeLabel = durationMonths === 12 ? '1 an' : `${durationMonths} mois`;
        const montantPaye = Number(paiement?.montant || meta.montant || 0);
        const dateEcheance = newEndDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const discountLine = meta.discount_percent > 0
          ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Remise appliquée</td><td style="padding:6px 0;font-size:13px;font-weight:700;color:#15803d;text-align:right;">−${meta.discount_percent}%</td></tr>`
          : '';
        await sendEmail({
          from: 'Comptabilité Portefolia <comptabilite@portefolia.tech>',
          to: user.email,
          subject: '✅ Paiement validé – Votre compte Portefolia est actif',
          html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <tr><td style="background:linear-gradient(135deg,#059669,#0d9488);padding:32px 40px;text-align:center;">
          <p style="color:#fff;font-size:28px;font-weight:900;margin:0;letter-spacing:-0.5px;">Portefolia</p>
          <p style="color:rgba(255,255,255,.8);font-size:13px;margin:6px 0 0;">comptabilite@portefolia.tech</p>
        </td></tr>

        <tr><td style="padding:40px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
            <p style="font-size:15px;font-weight:700;color:#15803d;margin:0 0 4px;">✅ Paiement confirmé</p>
            <p style="font-size:13px;color:#16a34a;margin:0;">Votre abonnement est maintenant actif.</p>
          </div>

          <p style="font-size:16px;color:#111827;margin:0 0 12px;">Bonjour <strong>${prenom}</strong>,</p>
          <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
            Notre équipe a validé votre paiement Wave. Votre compte Portefolia est désormais <strong>actif</strong>.
          </p>

          <!-- Récapitulatif abonnement -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
            <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.08em;">Récapitulatif</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Formule</td><td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${planForEmail.name || '—'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Durée</td><td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${dureeLabel}</td></tr>
              ${discountLine}
              <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Montant payé</td><td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${montantPaye.toLocaleString('fr-FR')} F CFA</td></tr>
              <tr style="border-top:1px solid #e2e8f0;"><td style="padding:10px 0 0;color:#64748b;font-size:13px;font-weight:600;">Accès valide jusqu'au</td><td style="padding:10px 0 0;font-size:14px;font-weight:800;color:#059669;text-align:right;">${dateEcheance}</td></tr>
            </table>
          </div>

          <p style="text-align:center;margin:0 0 12px;">
            <a href="${loginUrl}" style="display:inline-block;background:#059669;color:#fff;font-size:16px;font-weight:700;padding:16px 48px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
              Se connecter à mon compte
            </a>
          </p>
          <p style="text-align:center;font-size:12px;color:#94a3b8;margin:0 0 32px;">
            ${loginUrl}
          </p>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
          <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0;">
            Si vous n'avez pas fait cette demande, contactez-nous en répondant à cet email.<br>
            Compte : ${user.email}
          </p>
        </td></tr>

        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
          <p style="font-size:12px;color:#94a3b8;margin:0;">© ${new Date().getFullYear()} Portefolia · comptabilite@portefolia.tech</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
      }
    } catch (e) { /* ignore email errors */ }

    return res.json({ ok: true, message: 'Paiement Wave validé. Compte utilisateur activé.' });
  } catch (err) {
    console.error('approveWavePayment error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin: list Wave payments pending admin review
async function getWavePendingPayments(req, res) {
  try {
    const { pool } = require('../db');
    const [rows] = await pool.query(`
      SELECT
        c.id AS checkout_id,
        c.token,
        c.utilisateur_id,
        c.plan_id,
        c.statut AS checkout_statut,
        c.created_at,
        p.id AS paiement_id,
        p.montant,
        p.reference_transaction,
        p.moyen_paiement,
        p.statut AS paiement_statut,
        u.email,
        u.nom,
        u.prenom,
        u.is_active,
        pl.name AS plan_name
      FROM checkouts c
      LEFT JOIN paiements p ON p.id = c.paiement_id
      LEFT JOIN utilisateurs u ON u.id = c.utilisateur_id
      LEFT JOIN plans pl ON pl.id = c.plan_id
      WHERE (c.status = 'pending_admin' OR p.statut = 'pending_admin')
        AND p.moyen_paiement = 'wave'
        AND (c.checkout_type IS NULL OR c.checkout_type NOT IN ('reabonnement'))
      ORDER BY c.created_at DESC
    `);
    return res.json({ payments: rows });
  } catch (err) {
    console.error('getWavePendingPayments error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createCheckout, getCheckout, getCheckoutStatus, confirmCheckout, approveWavePayment, getWavePendingPayments };
