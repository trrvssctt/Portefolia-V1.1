'use strict';

const jwt         = require('jsonwebtoken');
const { pool }    = require('../db');
const abonnementModel = require('../models/abonnementModel');
const sendEmail   = require('../utils/sendEmail');
const { emailAccesValide, emailPaiementRefuse } = require('../utils/emailTemplates');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const FRONTEND   = process.env.FRONTEND_BASE || 'https://portefolia.tech';

// ─── Helper : log dans admin_action_logs ────────────────────────────────────

async function logAction(req, action, details = {}) {
  const adminId = req.user?.id ?? null;
  await pool.query(
    `INSERT INTO admin_action_logs (admin_id, action, resource, details, ip_address, user_agent)
     VALUES (?, ?, 'payments', ?, ?, ?)`,
    [
      adminId,
      action,
      JSON.stringify(details),
      req.ip || req.headers['x-forwarded-for'] || null,
      req.headers['user-agent'] || null,
    ]
  ).catch(err => console.error('adminWave.logAction error:', err.message));
}

// ─── Helper : récupère abonnement + user + plan en une requête ───────────────

async function fetchAboWithContext(abonnementId) {
  const [[row]] = await pool.query(
    `SELECT a.id, a.utilisateur_id, a.plan_id,
            a.statut_v2, a.montant_paye, a.duree_mois,
            a.reference_wave, a.preuve_paiement, a.created_at,
            a.date_debut, a.date_echeance,
            u.nom, u.prenom, u.email,
            p.name AS plan_name, p.price_cents
     FROM abonnements a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     LEFT JOIN plans p   ON p.id = a.plan_id
     WHERE a.id = ?
     LIMIT 1`,
    [abonnementId]
  );
  return row ?? null;
}

// ─── ENDPOINT 1 : GET /api/admin/wave/pending ────────────────────────────────

async function listPending(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.utilisateur_id, a.plan_id, a.created_at,
              a.montant_paye, a.duree_mois, a.reference_wave, a.preuve_paiement,
              TIMESTAMPDIFF(HOUR, a.created_at, NOW()) AS heures_attente,
              u.nom, u.prenom, u.email,
              p.name AS plan_name, p.price_cents
       FROM abonnements a
       JOIN utilisateurs u ON u.id = a.utilisateur_id
       LEFT JOIN plans p   ON p.id = a.plan_id
       WHERE a.statut_v2 = 'PENDING_PAYMENT'
       ORDER BY a.created_at ASC`
    );

    const pending = rows.map(r => ({
      ...r,
      urgent: Number(r.heures_attente) > 24,
    }));

    return res.json({ pending, total: pending.length });
  } catch (err) {
    console.error('adminWave.listPending error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── ENDPOINT 2 : POST /api/admin/wave/validate/:abonnementId ────────────────

async function validatePayment(req, res) {
  try {
    const abonnementId = parseInt(req.params.abonnementId, 10);
    if (!abonnementId) return res.status(400).json({ error: 'abonnementId invalide' });

    const adminId      = req.user?.id;
    const { commentaire } = req.body || {};

    // Pré-charger le contexte pour validation et email
    const ctx = await fetchAboWithContext(abonnementId);
    if (!ctx) return res.status(404).json({ error: 'Abonnement introuvable' });
    if (ctx.statut_v2 !== 'PENDING_PAYMENT') {
      return res.status(409).json({
        error: `Impossible de valider un abonnement en statut "${ctx.statut_v2}"`,
        statut: ctx.statut_v2,
      });
    }

    // Mettre à jour l'abonnement (statut ACTIVE, dates, subscription_history)
    await abonnementModel.validateSubscription(abonnementId, adminId, commentaire ?? null);

    // Générer un token d'accès one-shot (72h) pour le lien de connexion
    const loginToken = jwt.sign(
      { sub: ctx.utilisateur_id, role: 'USER', email: ctx.email, token_type: 'access_link' },
      JWT_SECRET,
      { expiresIn: '72h' }
    );
    const login_url = `${FRONTEND}/auth/token/${loginToken}`;

    // Récupérer la date d'échéance fraîchement calculée
    const [[fresh]] = await pool.query(
      'SELECT date_echeance FROM abonnements WHERE id = ? LIMIT 1',
      [abonnementId]
    );

    // Envoyer l'email d'activation (non-bloquant)
    const { subject, html } = emailAccesValide({
      prenom:        ctx.prenom || ctx.nom || 'Utilisateur',
      plan_name:     ctx.plan_name || 'Votre abonnement',
      date_echeance: fresh?.date_echeance ?? null,
      login_url,
    });
    sendEmail({ to: ctx.email, subject, html })
      .catch(err => console.error('adminWave.validate — sendEmail error:', err.message));

    // Logger l'action admin
    await logAction(req, 'validate_wave_payment', {
      abonnement_id:     abonnementId,
      utilisateur_email: ctx.email,
      commentaire:       commentaire ?? null,
    });

    return res.json({ success: true, utilisateur_email: ctx.email });
  } catch (err) {
    console.error('adminWave.validatePayment error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── ENDPOINT 3 : POST /api/admin/wave/reject/:abonnementId ─────────────────

async function rejectPayment(req, res) {
  try {
    const abonnementId = parseInt(req.params.abonnementId, 10);
    if (!abonnementId) return res.status(400).json({ error: 'abonnementId invalide' });

    const adminId  = req.user?.id;
    const { motif } = req.body || {};

    if (!motif || !motif.trim()) {
      return res.status(400).json({ error: 'Le motif de refus est obligatoire' });
    }

    // Pré-charger le contexte pour l'email
    const ctx = await fetchAboWithContext(abonnementId);
    if (!ctx) return res.status(404).json({ error: 'Abonnement introuvable' });

    // Mettre à jour l'abonnement (statut SUSPENDED + motif_refus)
    await abonnementModel.rejectSubscription(abonnementId, adminId, motif.trim());

    // Envoyer l'email de refus (non-bloquant)
    const { subject, html } = emailPaiementRefuse({
      prenom: ctx.prenom || ctx.nom || 'Utilisateur',
      motif:  motif.trim(),
    });
    sendEmail({ to: ctx.email, subject, html })
      .catch(err => console.error('adminWave.reject — sendEmail error:', err.message));

    // Logger l'action admin
    await logAction(req, 'reject_wave_payment', {
      abonnement_id:     abonnementId,
      utilisateur_email: ctx.email,
      motif:             motif.trim(),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('adminWave.rejectPayment error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── ENDPOINT 4 : GET /api/admin/wave/history ────────────────────────────────

async function listHistory(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { statut, date_debut, date_fin, search } = req.query;

    // Construction dynamique du WHERE — sans concaténation de valeurs
    const conditions = [];
    const params     = [];

    if (statut) {
      conditions.push('a.statut_v2 = ?');
      params.push(statut);
    }
    if (date_debut) {
      conditions.push('DATE(a.created_at) >= ?');
      params.push(date_debut);
    }
    if (date_fin) {
      conditions.push('DATE(a.created_at) <= ?');
      params.push(date_fin);
    }
    if (search && search.trim()) {
      conditions.push('(u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ?)');
      const like = `%${search.trim()}%`;
      params.push(like, like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total (pour pagination)
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM abonnements a
       JOIN utilisateurs u ON u.id = a.utilisateur_id
       ${where}`,
      params
    );

    // Données paginées
    const [rows] = await pool.query(
      `SELECT a.id, a.utilisateur_id,
              a.statut_v2 AS statut,
              a.montant_paye, a.duree_mois,
              a.reference_wave, a.preuve_paiement,
              a.date_debut, a.date_echeance, a.date_validation,
              a.motif_refus, a.created_at,
              TIMESTAMPDIFF(HOUR, a.created_at, NOW()) AS heures_attente,
              u.nom, u.prenom, u.email,
              p.name AS plan_name
       FROM abonnements a
       JOIN utilisateurs u ON u.id = a.utilisateur_id
       LEFT JOIN plans p   ON p.id = a.plan_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      history: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        pages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (err) {
    console.error('adminWave.listHistory error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { listPending, validatePayment, rejectPayment, listHistory };
