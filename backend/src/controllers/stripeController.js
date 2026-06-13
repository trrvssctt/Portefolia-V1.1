const checkoutModel = require('../models/checkoutModel');
const paiementModel = require('../models/paiementModel');
const abonnementModel = require('../models/abonnementModel');
const planModel = require('../models/planModel');
const userModel = require('../models/userModel');
const businessAccountModel = require('../models/businessAccountModel');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return require('stripe')(key);
}

/**
 * POST /api/checkout/:token/stripe-intent
 * Creates a Stripe PaymentIntent and returns the client_secret.
 */
async function createPaymentIntent(req, res) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe non configuré. Ajoutez STRIPE_SECRET_KEY dans .env.' });
  }

  const { token } = req.params;
  try {
    const checkout = await checkoutModel.findByToken(token);
    if (!checkout) return res.status(404).json({ error: 'Checkout introuvable' });

    const paiement = await paiementModel.findById(checkout.paiement_id);
    const montant = Math.round(Number(paiement?.montant || 0));

    // XOF is a zero-decimal currency on Stripe (minimum 50 XOF)
    if (montant < 50) {
      return res.status(400).json({ error: 'Montant insuffisant pour Stripe (min. 50 XOF)' });
    }

    // Check if we already have an uncompleted intent for this checkout
    const existingIntentId = checkout.metadata?.stripe_intent_id;
    if (existingIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(existingIntentId);
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existing.status)) {
          return res.json({
            client_secret: existing.client_secret,
            publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || '',
            amount: montant,
          });
        }
      } catch (e) { /* intent may be expired, create a new one */ }
    }

    const intent = await stripe.paymentIntents.create({
      amount: montant, // XOF is zero-decimal
      currency: 'xof',
      metadata: {
        checkout_token: token,
        checkout_id: String(checkout.id),
        utilisateur_id: String(checkout.utilisateur_id),
        abonnement_id: String(checkout.abonnement_id || ''),
        paiement_id: String(checkout.paiement_id || ''),
      },
    });

    // Store intent id in checkout metadata for reuse
    try {
      const db = require('../db');
      const meta = { ...(checkout.metadata || {}), stripe_intent_id: intent.id };
      await db.query('UPDATE checkouts SET metadata = ? WHERE id = ?', [JSON.stringify(meta), checkout.id]);
    } catch (e) { /* non-critical */ }

    return res.json({
      client_secret: intent.client_secret,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || '',
      amount: montant,
    });
  } catch (err) {
    console.error('createPaymentIntent error:', err);
    return res.status(500).json({ error: err.message || 'Erreur Stripe' });
  }
}

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhooks. Requires raw body (mounted before express.json).
 */
async function handleWebhook(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe non configuré' });

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // No signature verification (dev mode)
      const body = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error('Stripe webhook parse error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const checkoutToken = intent.metadata?.checkout_token;
    if (checkoutToken) {
      try {
        const checkout = await checkoutModel.findByToken(checkoutToken);
        if (checkout) {
          // Mark paiement & checkout confirmed
          await paiementModel.updateStatus(checkout.paiement_id, 'confirmed');
          await checkoutModel.updateStatus(checkout.id, 'confirmed');
          // Record Stripe reference on paiement
          const db = require('../db');
          await db.query(
            'UPDATE paiements SET moyen_paiement = ?, reference_transaction = ? WHERE id = ?',
            ['stripe', intent.id, checkout.paiement_id]
          );

          // ── Subscribe user to plan & activate account ────────────────────
          const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

          // Detect Business plan — must NOT be auto-activated (admin validates manually)
          let plan = null;
          if (checkout.plan_id) {
            try { plan = await planModel.getPlanById(checkout.plan_id); } catch (e) {}
          }
          const isBusinessPlan = plan && (
            (plan.slug || '').toLowerCase().includes('business') ||
            (plan.metadata && plan.metadata.plan_type === 'business')
          );

          if (checkout.plan_id) {
            try {
              await planModel.subscribeUser({
                utilisateur_id: checkout.utilisateur_id,
                plan_id: checkout.plan_id,
                // Business plans stay pending until admin validates
                status: isBusinessPlan ? 'pending_admin' : 'active',
                payment_reference: intent.id,
                end_date: oneYear,
              });
            } catch (e) { console.warn('Stripe webhook subscribeUser error:', e && e.message); }
          }
          if (checkout.abonnement_id) {
            try {
              await abonnementModel.updatePaymentDetails(checkout.abonnement_id, {
                payment_reference: intent.id,
                end_date: oneYear,
                // Business: mark payment received but keep account in pending_admin
                statut: isBusinessPlan ? 'pending_admin' : 'active',
              });
            } catch (e) { console.warn('Stripe webhook abonnement update error:', e && e.message); }
          }

          // Activate immediately only for non-Business plans
          if (!isBusinessPlan) {
            try { await userModel.setActive(checkout.utilisateur_id, true); } catch (e) { console.warn('Stripe webhook setActive error:', e && e.message); }
          } else {
            // Set role to BUSINESS_ADMIN so JWT reflects correct type on next login
            try { await userModel.setRole(checkout.utilisateur_id, 'BUSINESS_ADMIN'); } catch (e) { console.warn('Stripe webhook setRole error:', e && e.message); }
            // Create the business_accounts record if it doesn't exist yet
            try {
              const existing = await businessAccountModel.findAccountByAdminId(checkout.utilisateur_id);
              if (!existing) {
                const user = await userModel.findById(checkout.utilisateur_id);
                const companyName = (user?.prenom || user?.email || 'Mon Entreprise');
                await businessAccountModel.createAccount({
                  admin_user_id: checkout.utilisateur_id,
                  company_name: companyName,
                  plan_id: checkout.plan_id,
                });
              }
            } catch (e) { console.warn('Stripe webhook createAccount error:', e && e.message); }
          }

          // Notify admin
          try {
            const sendEmail = require('../utils/sendEmail');
            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail) {
              const user = await userModel.findById(checkout.utilisateur_id);
              const subject = isBusinessPlan
                ? `[Business] Paiement reçu — validation requise — ${intent.amount} XOF`
                : `Paiement Stripe confirmé — ${intent.amount} XOF`;
              const body = isBusinessPlan
                ? `<p>Un paiement Business a été reçu et <strong>requiert votre validation</strong> pour activer le compte.</p>
                   <p><strong>Utilisateur :</strong> ${user?.email}</p>
                   <p><strong>Montant :</strong> ${intent.amount} XOF</p>
                   <p><strong>Plan :</strong> ${plan?.name}</p>
                   <p><strong>PaymentIntent :</strong> ${intent.id}</p>
                   <p>Rendez-vous dans l'administration → Utilisateurs pour valider ce compte Business.</p>`
                : `<p>Paiement Stripe confirmé pour <strong>${user?.email}</strong>.</p>
                   <p>Montant : ${intent.amount} XOF — PaymentIntent : ${intent.id}</p>`;
              await sendEmail({ to: adminEmail, subject, html: body });
            }
          } catch (e) { /* ignore email errors */ }
        }
      } catch (e) {
        console.error('Stripe webhook processing error:', e);
      }
    }
  }

  return res.json({ received: true });
}

module.exports = { createPaymentIntent, handleWebhook };
