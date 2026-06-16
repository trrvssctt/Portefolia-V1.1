const { pool } = require('../db');
const planModel = require('../models/planModel');
const abonnementModel = require('../models/abonnementModel');
const sendEmail = require('../utils/sendEmail');

// Durées autorisées et leurs remises associées
const PRICING = {
  1:  { label: '1 mois', remise: 0    },
  3:  { label: '3 mois', remise: 0.15 },
  12: { label: '1 an',   remise: 0.20 },
};

function calcMontant(priceCents, duree) {
  // price_cents stocke directement des F CFA (devise zero-decimal) — pas de division par 100
  const remise = PRICING[duree]?.remise ?? 0;
  return Math.round(priceCents * duree * (1 - remise));
}

// ---------------------------------------------------------------------------
// POST /api/payment/wave/initiate
// ---------------------------------------------------------------------------
async function initiate(req, res) {
  try {
    const userId = req.userId;
    const { planId, duree_mois, reference_wave, preuve_paiement_url } = req.body || {};

    if (!planId || !duree_mois || !reference_wave) {
      return res.status(400).json({ error: 'planId, duree_mois et reference_wave sont requis' });
    }
    const duree = parseInt(duree_mois, 10);
    if (!PRICING[duree]) {
      return res.status(400).json({ error: 'duree_mois doit être 1, 3 ou 12' });
    }

    // Bloquer si un abonnement actif ou en attente existe déjà
    const [existing] = await pool.query(
      `SELECT id, statut_v2 FROM abonnements
       WHERE utilisateur_id = ? AND statut_v2 IN ('ACTIVE', 'PENDING_PAYMENT')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (existing.length > 0) {
      const statut = existing[0].statut_v2;
      return res.status(409).json({
        error: statut === 'ACTIVE'
          ? 'Vous avez déjà un abonnement actif.'
          : 'Un paiement est déjà en attente de validation.',
        statut,
      });
    }

    // Récupérer le plan
    const plan = await planModel.getPlanById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan introuvable' });

    const remise = PRICING[duree].remise;
    const montant = calcMontant(plan.price_cents, duree);
    const montant_base = Math.round(plan.price_cents * duree);

    // Créer l'abonnement en statut PENDING_PAYMENT
    const { id: abonnement_id } = await abonnementModel.createPendingSubscription(
      userId,
      planId,
      montant,
      duree,
      Math.round(remise * 100), // stocké en pourcentage entier
      reference_wave
    );

    // Enregistrer la preuve de paiement si fournie
    if (preuve_paiement_url) {
      await pool.query(
        'UPDATE abonnements SET preuve_paiement = ? WHERE id = ?',
        [preuve_paiement_url, abonnement_id]
      );
    }

    // Mettre à jour le statut de l'utilisateur — seulement si pas déjà abonné (cas upgrade)
    const [activeAboWave] = await pool.query(
      "SELECT id FROM abonnements WHERE utilisateur_id = ? AND statut_v2 = 'ACTIVE' LIMIT 1",
      [userId]
    );
    if (!activeAboWave || !activeAboWave.length) {
      await pool.query(
        "UPDATE utilisateurs SET subscription_status = 'PENDING_PAYMENT' WHERE id = ?",
        [userId]
      );
    }

    // Récupérer l'email de l'utilisateur pour l'email de confirmation
    const [[user]] = await pool.query(
      'SELECT nom, prenom, email FROM utilisateurs WHERE id = ? LIMIT 1',
      [userId]
    );

    // Email de confirmation (non bloquant — une erreur d'envoi ne fait pas échouer la requête)
    if (user?.email) {
      sendEmail({
        to: user.email,
        subject: 'Paiement reçu — En attente de validation',
        html: buildConfirmationEmail({
          prenom: user.prenom || user.nom || 'Utilisateur',
          plan,
          montant,
          montant_base,
          duree,
          remise,
          reference_wave,
        }),
      }).catch(err => console.error('wavePayment.initiate — sendEmail error:', err?.message));
    }

    return res.status(201).json({
      success: true,
      abonnement_id,
      message: 'Paiement soumis avec succès. Validation sous 24h.',
    });
  } catch (err) {
    console.error('wavePayment.initiate error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/subscription-status
// ---------------------------------------------------------------------------
async function subscriptionStatus(req, res) {
  try {
    const userId = req.userId;

    const [[user]] = await pool.query(
      `SELECT u.subscription_status,
              u.next_billing_date,
              u.last_payment_at,
              (SELECT a.date_echeance
               FROM abonnements a
               WHERE a.utilisateur_id = u.id
                 AND a.statut_v2 IN ('ACTIVE','PENDING_PAYMENT','GRACE_PERIOD')
               ORDER BY a.created_at DESC LIMIT 1) AS date_echeance,
              (SELECT p.name
               FROM abonnements a
               JOIN plans p ON p.id = a.plan_id
               WHERE a.utilisateur_id = u.id
                 AND a.statut_v2 IN ('ACTIVE','PENDING_PAYMENT','GRACE_PERIOD')
               ORDER BY a.created_at DESC LIMIT 1) AS plan_name
       FROM utilisateurs u
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const status = user.subscription_status || 'NONE';
    const echeance = user.date_echeance || user.next_billing_date;
    const days_remaining = echeance
      ? Math.max(0, Math.ceil((new Date(echeance) - new Date()) / 86_400_000))
      : null;

    return res.json({
      status,
      plan_name:         user.plan_name       || null,
      next_billing_date: user.next_billing_date || null,
      days_remaining,
      message:           statusMessage(status),
    });
  } catch (err) {
    console.error('wavePayment.subscriptionStatus error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/payment/wave/options/:planId
// ---------------------------------------------------------------------------
async function pricingOptions(req, res) {
  try {
    const plan = await planModel.getPlanById(req.params.planId);
    if (!plan) return res.status(404).json({ error: 'Plan introuvable' });

    const monthlyFCFA = plan.price_cents; // déjà en F CFA, pas de division
    const options = Object.entries(PRICING).map(([dureeStr, { label, remise }]) => {
      const duree        = Number(dureeStr);
      const montant_base  = Math.round(monthlyFCFA * duree);
      const montant_final = Math.round(montant_base * (1 - remise));
      return { duree, label, montant_base, remise, montant_final, currency: 'F CFA' };
    });

    return res.json({
      plan: { id: plan.id, name: plan.name, currency: 'F CFA' },
      options,
    });
  } catch (err) {
    console.error('wavePayment.pricingOptions error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusMessage(status) {
  const messages = {
    ACTIVE:          'Abonnement actif',
    PENDING_PAYMENT: 'Paiement en cours de validation',
    EXPIRED:         'Abonnement expiré',
    SUSPENDED:       'Compte suspendu',
    GRACE_PERIOD:    'Période de grâce en cours',
    NONE:            'Aucun abonnement',
  };
  return messages[status] ?? 'Statut inconnu';
}

function buildConfirmationEmail({ prenom, plan, montant, montant_base, duree, remise, reference_wave }) {
  const dureeLabel = PRICING[duree]?.label ?? `${duree} mois`;
  const remisePct  = Math.round(remise * 100);
  const economie   = montant_base - montant;

  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">

    <div style="background:#28A745;padding:30px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Paiement reçu ✓</h1>
      <p style="color:rgba(255,255,255,.82);margin:6px 0 0;font-size:13px;">Portefolia · paiement en attente de validation</p>
    </div>

    <div style="padding:32px;">
      <p style="margin:0 0 16px;">Bonjour <strong>${prenom}</strong>,</p>
      <p style="margin:0 0 20px;color:#374151;line-height:1.6;">
        Nous avons bien enregistré votre référence de paiement Wave.
        Notre équipe va la vérifier et activer votre compte dans les
        <strong>24 heures</strong> (lundi–samedi, 8h–20h, Dakar).
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:24px;">
        <h3 style="margin:0 0 14px;color:#15803d;font-size:15px;font-weight:700;">Récapitulatif</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
          <tr>
            <td style="padding:5px 0;color:#6b7280;">Plan</td>
            <td style="text-align:right;font-weight:600;">${plan.name}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6b7280;">Durée</td>
            <td style="text-align:right;font-weight:600;">${dureeLabel}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6b7280;">Référence Wave</td>
            <td style="text-align:right;font-family:monospace;font-weight:700;color:#1d4ed8;letter-spacing:.04em;">${reference_wave}</td>
          </tr>
          ${remisePct > 0 ? `
          <tr>
            <td style="padding:5px 0;color:#6b7280;">Remise</td>
            <td style="text-align:right;color:#28A745;font-weight:600;">−${remisePct}% (économie de ${economie.toLocaleString('fr-FR')} F CFA)</td>
          </tr>` : ''}
          <tr style="border-top:1px solid #d1fae5;">
            <td style="padding:10px 0 4px;font-weight:700;font-size:15px;">Total</td>
            <td style="text-align:right;font-weight:800;font-size:17px;color:#28A745;">${montant.toLocaleString('fr-FR')} F CFA</td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
        Vous recevrez un second email dès l'activation de votre compte.
        Conservez cette référence Wave en cas de question.
      </p>

      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
        Un problème ?
        <a href="mailto:support@portefolia.tech" style="color:#28A745;text-decoration:none;font-weight:600;">support@portefolia.tech</a>
      </p>
    </div>

    <div style="background:#f9fafb;padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;">
      © ${new Date().getFullYear()} Portefolia · Paiement sécurisé via Wave
    </div>
  </div>
</body>
</html>`;
}

module.exports = { initiate, subscriptionStatus, pricingOptions };
