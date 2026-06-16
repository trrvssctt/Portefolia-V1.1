const planModel = require('../models/planModel');
const userModel = require('../models/userModel');
const abonnementModel = require('../models/abonnementModel');
const { pool } = require('../db');

// Public endpoint: only active/visible plans, with features
async function listPublicPlans(req, res) {
  try {
    const plans = await planModel.listActivePlans();
    for (const plan of plans) {
      const rows = await planModel.listPlanFeatures(plan.id);
      plan.features = rows.map(r => r.feature);
    }
    res.json({ plans });
  } catch (err) {
    console.error('planController.listPublicPlans', err);
    res.status(500).json({ error: 'Failed to list plans' });
  }
}

// Admin endpoint: all non-deleted plans, with features and normalized booleans
async function listPlans(req, res) {
  try {
    const plans = await planModel.listPlans();
    for (const plan of plans) {
      const rows = await planModel.listPlanFeatures(plan.id);
      plan.features = rows.map(r => r.feature);
      plan.is_active = plan.is_active === 1 || plan.is_active === true;
      plan.is_popular = plan.is_popular === 1 || plan.is_popular === true;
    }
    res.json({ plans });
  } catch (err) {
    console.error('planController.listPlans', err);
    res.status(500).json({ error: 'Failed to list plans' });
  }
}

async function getPlan(req, res) {
  try {
    const { idOrSlug } = req.params;
    let plan = null;
    if (/^\d+$/.test(idOrSlug)) {
      plan = await planModel.getPlanById(Number(idOrSlug));
    } else {
      plan = await planModel.getPlanBySlug(idOrSlug);
    }
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const features = await planModel.listPlanFeatures(plan.id);
    res.json({ plan, features });
  } catch (err) {
    console.error('planController.getPlan', err);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
}

async function createPlan(req, res) {
  try {
    const payload = req.body;
    const result = await planModel.createPlan(payload);
    if (payload.features && Array.isArray(payload.features)) {
      await planModel.replacePlanFeatures(result.id, payload.features);
    }
    res.json({ ok: true, id: result.id });
  } catch (err) {
    console.error('planController.createPlan', err);
    res.status(500).json({ error: 'Failed to create plan' });
  }
}

async function updatePlan(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid plan id' });

    const payload = req.body;

    // Check plan exists
    const existing = await planModel.getPlanById(id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    await planModel.updatePlan(id, payload);

    // Replace features if provided
    if (payload.features && Array.isArray(payload.features)) {
      await planModel.replacePlanFeatures(id, payload.features);
    }

    const updated = await planModel.getPlanById(id);
    const features = await planModel.listPlanFeatures(id);
    res.json({ ok: true, plan: { ...updated, features: features.map(f => f.feature) } });
  } catch (err) {
    console.error('planController.updatePlan', err);
    res.status(500).json({ error: 'Failed to update plan' });
  }
}

async function deletePlan(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid plan id' });

    const existing = await planModel.getPlanById(id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    await planModel.deletePlan(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('planController.deletePlan', err);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
}

async function togglePlan(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid plan id' });

    const existing = await planModel.getPlanById(id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    await planModel.togglePlanActive(id);
    const updated = await planModel.getPlanById(id);
    res.json({ ok: true, is_active: updated.is_active === 1 });
  } catch (err) {
    console.error('planController.togglePlan', err);
    res.status(500).json({ error: 'Failed to toggle plan' });
  }
}

async function subscribe(req, res) {
  try {
    const utilisateur_id = req.userId;
    if (!utilisateur_id) return res.status(401).json({ error: 'Unauthorized' });
    const { plan_id, start_date = null, end_date = null, payment_reference = null, metadata = null } = req.body;
    // ensure user exists
    const user = await userModel.findById(utilisateur_id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    // ensure plan exists (if provided)
    if (plan_id) {
      const plan = await planModel.getPlanById(plan_id);
      if (!plan) return res.status(404).json({ error: 'Plan introuvable' });
    }
        // Create the user_plan (legacy) and an abonnement record for auditing/administration
        const sub = await planModel.subscribeUser({ utilisateur_id, plan_id, start_date, end_date, payment_reference, metadata });
        try {
          const montant = metadata && metadata.price_cents ? Number(metadata.price_cents) / 100 : null;
          await abonnementModel.createAbonnement({ utilisateur_id, plan_id, montant: montant || 0, currency: metadata && metadata.currency ? metadata.currency : 'XOF', statut: status, metadata });
        } catch (e) {
          console.warn('subscribe: could not create abonnement record', e && e.message ? e.message : e);
        }
        res.json({ ok: true, subscriptionId: sub.id });
  } catch (err) {
    console.error('planController.subscribe', err);
    res.status(500).json({ error: 'Failed to subscribe user' });
  }
}

async function getUserPlans(req, res) {
  try {
    const utilisateur_id = req.userId;
    if (!utilisateur_id) return res.status(401).json({ error: 'Unauthorized' });

    // Source primaire : abonnements ACTIVE (flow Wave — toujours à jour)
    const [aboRows] = await pool.query(
      `SELECT a.id, a.utilisateur_id, a.plan_id,
              a.statut_v2 AS status,
              a.date_debut AS start_date,
              a.date_echeance AS end_date,
              a.reference_wave AS payment_reference,
              a.created_at, a.updated_at,
              p.name, p.slug, p.price_cents, p.billing_interval, p.currency
       FROM abonnements a
       JOIN plans p ON p.id = a.plan_id
       WHERE a.utilisateur_id = ?
         AND a.statut_v2 = 'ACTIVE'
         AND a.plan_id IS NOT NULL
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [utilisateur_id]
    );

    // Si un abonnement actif existe → le retourner directement
    if (aboRows.length > 0) {
      const abo = aboRows[0];
      const now = new Date();
      const endDate = abo.end_date ? new Date(abo.end_date) : null;
      abo.next_billing_date = endDate && endDate > now ? endDate.toISOString() : null;
      abo.next_payment_date = abo.next_billing_date;
      return res.json({ plans: [abo] });
    }

    // Fallback : user_plans (flow legacy Stripe ou inscription gratuite)
    const rows = await planModel.listUserPlans(utilisateur_id);

    const now = new Date();
    const addMonths = (dt, n) => { const d = new Date(dt); d.setMonth(d.getMonth() + n); return d; };

    const enhanced = (rows || []).map((r) => {
      const item = { ...r };
      try {
        // Priorité 1 : end_date explicitement défini et dans le futur
        const endDate = r.end_date ? new Date(r.end_date) : null;
        if (endDate && endDate > now) {
          item.next_billing_date = endDate.toISOString();
          item.next_payment_date = endDate.toISOString();
        } else {
          // Priorité 2 : calcul dynamique depuis start_date (billing mensuel)
          const billing = (r.billing_interval || '').toLowerCase();
          const start = r.start_date ? new Date(r.start_date) : null;
          const status = r.status || '';
          if (billing === 'monthly' && start && status === 'active') {
            let next = addMonths(start, 1);
            let iter = 0;
            while (next <= now && iter < 120) { iter++; next = addMonths(start, iter + 1); }
            item.next_billing_date = next.toISOString();
            item.next_payment_date = next.toISOString();
          } else if (billing === 'yearly' && start && status === 'active') {
            const addYears = (dt, n) => { const d = new Date(dt); d.setFullYear(d.getFullYear() + n); return d; };
            let next = addYears(start, 1);
            let iter = 0;
            while (next <= now && iter < 20) { iter++; next = addYears(start, iter + 1); }
            item.next_billing_date = next.toISOString();
            item.next_payment_date = next.toISOString();
          } else {
            item.next_billing_date = null;
            item.next_payment_date = null;
          }
        }
      } catch (e) {
        item.next_billing_date = null;
        item.next_payment_date = null;
      }
      return item;
    });

    return res.json({ plans: enhanced });
  } catch (err) {
    console.error('planController.getUserPlans', err);
    return res.status(500).json({ error: 'Failed to fetch user plans' });
  }
}

module.exports = { listPublicPlans, listPlans, getPlan, createPlan, updatePlan, deletePlan, togglePlan, subscribe, getUserPlans };
