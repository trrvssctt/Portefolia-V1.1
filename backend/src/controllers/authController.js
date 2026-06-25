const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const adminUserModel = require('../models/adminUserModel');
const planModel = require('../models/planModel');
const sendEmail = require('../utils/sendEmail');
const { emailBienvenueVerification, emailResetMotDePasse } = require('../utils/emailTemplates');
const commandeModel = require('../models/commandeModel');
const paiementModel = require('../models/paiementModel');
const checkoutModel = require('../models/checkoutModel');
const abonnementModel = require('../models/abonnementModel');
const refreshTokenModel = require('../models/refreshTokenModel');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '8h';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);

// Strict email validation: local@domain.tld, no consecutive dots, no leading/trailing dots
const EMAIL_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9._%+\-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function validateEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, error: 'Adresse email requise' };
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) return { valid: false, error: 'Adresse email trop longue' };
  if (!EMAIL_REGEX.test(trimmed)) return { valid: false, error: 'Format d\'adresse email invalide' };
  // Reject consecutive dots in local part or domain
  const [local, domain] = trimmed.split('@');
  if (local.includes('..') || domain.includes('..')) return { valid: false, error: 'Adresse email invalide (points consécutifs)' };
  return { valid: true, normalized: trimmed };
}

async function checkEmailAvailability(req, res) {
  try {
    const { email } = req.body;
    const validation = validateEmail(email);
    if (!validation.valid) return res.status(400).json({ available: false, error: validation.error });
    const existing = await userModel.findByEmail(validation.normalized);
    return res.json({ available: !existing });
  } catch (err) {
    console.error('checkEmailAvailability error:', err);
    return res.status(500).json({ available: false, error: 'Erreur serveur' });
  }
}

const DURATION_DISCOUNTS = { 1: 0, 3: 15, 12: 20 };

function calcMontantWithDuration(priceCents, rawDuration) {
  const dur = DURATION_DISCOUNTS.hasOwnProperty(Number(rawDuration)) ? Number(rawDuration) : 1;
  const disc = DURATION_DISCOUNTS[dur];
  return { dur, disc, montant: Math.round(Number(priceCents) * dur * (1 - disc / 100)) };
}

function addMonthsAuth(date, months) {
  const d = new Date(date); d.setMonth(d.getMonth() + months); return d;
}

async function register(req, res) {
  const { nom, prenom, email, password, photo_profil, biographie, plan_id, plan_slug, duration_months } = req.body;
  if (!nom || !prenom || !password) return res.status(400).json({ error: 'nom, prenom et password requis' });
  if (password.length < 8) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });

  // Strict email validation + normalization
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return res.status(400).json({ error: emailValidation.error, field: 'email' });
  const normalizedEmail = emailValidation.normalized;

  // Duplicate check (case-insensitive, trimmed)
  const existing = await userModel.findByEmail(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'Cette adresse email est déjà utilisée', field: 'email' });

  const hash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await userModel.createUser({ nom, prenom, email: normalizedEmail, mot_de_passe: hash, photo_profil, biographie });
  } catch (dbErr) {
    // MySQL duplicate key fallback (race condition safety net)
    if (dbErr.code === 'ER_DUP_ENTRY' || (dbErr.message || '').includes('Duplicate entry')) {
      return res.status(409).json({ error: 'Cette adresse email est déjà utilisée', field: 'email' });
    }
    throw dbErr;
  }

  // ── Génération du token de vérification email (commun à tous les plans) ──────
  const verifToken = crypto.randomBytes(32).toString('hex');
  const verifExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  try {
    await userModel.setVerificationToken(user.id, verifToken, verifExpires);
  } catch (e) { console.warn('register: could not set verification token:', e.message); }

  const FRONTEND_BASE = process.env.FRONTEND_BASE || 'https://portefolia.tech';
  const verify_url = `${FRONTEND_BASE}/verify-email?token=${verifToken}`;

  try {
    // If a free plan was provided, attempt to subscribe the user to it (best-effort)
    let plan = null;
    if (plan_id) plan = await planModel.getPlanById(plan_id);
    else if (plan_slug) plan = await planModel.getPlanBySlug(plan_slug);
    else {
      try {
        const allPlans = await planModel.listPlans();
        plan = (allPlans || []).find((p) => Number(p.price_cents || 0) === 0);
      } catch (e) {}
    }

    if (plan && Number(plan.price_cents || 0) === 0) {
      // Plan gratuit : essai 14 jours — connexion via lien de vérification email
      try {
        const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        await planModel.subscribeUser({ utilisateur_id: user.id, plan_id: plan.id, status: 'active', end_date: trialEndDate });
        const { pool } = require('../db');
        await pool.query(
          `INSERT INTO abonnements
             (utilisateur_id, plan_id, type, statut, statut_v2, montant, montant_paye, duree_mois, date_debut, date_echeance)
           VALUES (?, ?, 'ESSAI_GRATUIT', 'active', 'ACTIVE', 0, 0, 0, NOW(), ?)`,
          [user.id, plan.id, trialEndDate]
        );
        await pool.query(
          "UPDATE utilisateurs SET subscription_status = 'ACTIVE', next_billing_date = ? WHERE id = ?",
          [trialEndDate, user.id]
        );
        await userModel.setActive(user.id, true);
      } catch (e) { console.warn('subscribeUser failed at registration:', e.message || e); }

      // Email de bienvenue (non-bloquant) — le lien vérifie ET connecte
      const { subject: freeSubject, html: freeHtml } = emailBienvenueVerification({ prenom: prenom || nom, verify_url, plan_type: 'free' });
      sendEmail({ to: user.email, subject: freeSubject, html: freeHtml })
        .catch(err => console.error('register: welcome email (free) error:', err.message));

      // Pas d'auto-connexion — l'utilisateur doit cliquer le lien de vérification
      return res.status(201).json({
        id: user.id,
        email: user.email,
        message: 'Compte créé. Vérifiez votre email pour accéder à votre dashboard.',
        requiresVerification: true,
      });

    } else if (plan && Number(plan.price_cents || 0) > 0) {
      // Plan payant : créer un checkout + envoyer email de bienvenue (vérification seule)
      try {
        const { dur, disc, montant } = calcMontantWithDuration(plan.price_cents, duration_months);
        const newEndDate = addMonthsAuth(new Date(), dur);
        const { pool: dbPool } = require('../db');

        // Créer abonnement avec statut_v2 = PENDING_PAYMENT (requis pour le panel admin Wave)
        const [abResult] = await dbPool.query(
          `INSERT INTO abonnements
             (utilisateur_id, plan_id, type, statut, statut_v2, montant, montant_paye, duree_mois)
           VALUES (?, ?, 'abonnement', 'pending', 'PENDING_PAYMENT', ?, 0, ?)`,
          [user.id, plan.id, montant, dur]
        );
        const abId = abResult.insertId;

        // Créer paiement lié à l'abonnement
        const paiement = await paiementModel.createPaiement({
          abonnement_id: abId, montant, statut: 'pending',
          metadata: { plan_id: plan.id, purpose: 'signup', duration_months: dur, discount_percent: disc },
        });

        // Créer checkout lié au paiement + abonnement
        const checkout = await checkoutModel.createCheckout({
          utilisateur_id: user.id, plan_id: plan.id,
          abonnement_id: abId, paiement_id: paiement.id,
          metadata: { purpose: 'signup', plan, duration_months: dur, discount_percent: disc, base_amount: Number(plan.price_cents) * dur, new_end_date: newEndDate },
        });

        await dbPool.query(
          "UPDATE utilisateurs SET is_active = 0, subscription_status = 'PENDING_PAYMENT' WHERE id = ?",
          [user.id]
        );

        // Email de bienvenue (non-bloquant) — le lien vérifie uniquement
        const { subject: paidSubject, html: paidHtml } = emailBienvenueVerification({ prenom: prenom || nom, verify_url, plan_type: 'paid' });
        sendEmail({ to: user.email, subject: paidSubject, html: paidHtml })
          .catch(err => console.error('register: welcome email (paid) error:', err.message));

        const checkoutUrl = `${FRONTEND_BASE}/checkout?token=${checkout.token}`;
        return res.status(201).json({
          id: user.id, email: user.email,
          message: 'Compte créé. Vérifiez votre email puis effectuez votre paiement Wave.',
          requiresVerification: true,
          abonnement: { id: abId },
          checkout: { token: checkout.token, checkout_url: checkoutUrl },
        });
      } catch (e) {
        console.error('[register] ERREUR création checkout plan payant:', e.message, e.code || '', e.stack?.split('\n')[1] || '');
        try {
          const { pool: dbPool } = require('../db');
          await dbPool.query("UPDATE utilisateurs SET is_active = 0, subscription_status = 'PENDING_PAYMENT' WHERE id = ?", [user.id]);
        } catch (ee) {}
        const { subject: catchSubject, html: catchHtml } = emailBienvenueVerification({ prenom: prenom || nom, verify_url, plan_type: 'paid' });
        sendEmail({ to: user.email, subject: catchSubject, html: catchHtml }).catch(() => {});
        return res.status(201).json({ id: user.id, email: user.email, requiresVerification: true, message: 'Compte créé. Contactez le support pour finaliser votre abonnement.' });
      }
    }
  } catch (e) {
    console.warn('plan processing error at registration:', e.message || e);
  }

  // Aucun plan fourni — email de bienvenue générique (non-bloquant)
  const { subject: noplanSubject, html: noplanHtml } = emailBienvenueVerification({ prenom: prenom || nom, verify_url, plan_type: 'free' });
  sendEmail({ to: user.email, subject: noplanSubject, html: noplanHtml })
    .catch(err => console.error('register: welcome email (no plan) error:', err.message));

  return res.status(201).json({
    id: user.id,
    email: user.email,
    message: 'Compte créé. Vérifiez votre email pour accéder à votre dashboard.',
    requiresVerification: true,
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  console.log(`[login] attempt for email: ${email}`);
  if (!email || !password) return res.status(400).json({ error: 'email et password requis' });

  const user = await userModel.findByEmail(email);
  console.log(`[login] user found: ${!!user}`, user ? { id: user.id, email: user.email, hasPassword: !!user.mot_de_passe } : null);
  if (!user) {
    // Check if user exists but was soft-deleted (deleted_at IS NOT NULL)
    try {
      const [deleted] = await require('../db').pool.query(
        'SELECT id, email, deleted_at FROM utilisateurs WHERE LOWER(TRIM(email)) = ? LIMIT 1',
        [(email || '').trim().toLowerCase()]
      );
      if (deleted && deleted[0]) {
        console.log(`[login] user exists but soft-deleted at ${deleted[0].deleted_at}, id=${deleted[0].id}`);
      } else {
        console.log(`[login] no account found for email: ${(email || '').trim().toLowerCase()}`);
      }
    } catch (e) { /* ignore diagnostic query errors */ }
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  try {
    const ok = await bcrypt.compare(password, user.mot_de_passe);
    console.log(`[login] password match: ${ok}`);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });
  } catch (bcryptErr) {
    console.error('[login] bcrypt.compare error:', bcryptErr);
    return res.status(500).json({ error: 'Erreur serveur lors de la vérification du mot de passe' });
  }

  // Email non vérifié → bloquer la connexion normale
  if (user.verified === 0 || user.verified === false) {
    return res.status(403).json({
      error: 'Votre adresse email n\'a pas encore été vérifiée. Consultez votre boîte mail et cliquez sur le lien de vérification.',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    });
  }

  // Compte bloqué par un administrateur
  if (user.statut === 'BLOQUÉ') {
    return res.status(403).json({
      error: 'Votre compte a été suspendu. Contactez le support à contact@portefolia.tech pour plus d\'informations.',
      code: 'ACCOUNT_BLOCKED',
    });
  }

  // Si le compte est inactif, détecter la raison précise
  if (typeof user.is_active !== 'undefined' && user.is_active === 0) {
    try {
      const { pool } = require('../db');

      // Cas 0 : abonnement ou essai expiré (subscription_status mis par le cron)
      const subStatus0 = user.subscription_status;
      if (subStatus0 === 'EXPIRED' || subStatus0 === 'SUSPENDED') {
        let checkoutToken = null;
        let checkoutUrl   = null;
        try {
          const [lastAbo0] = await pool.query(
            `SELECT a.id, a.plan_id FROM abonnements a
             WHERE a.utilisateur_id = ? AND a.statut_v2 IN ('EXPIRED', 'SUSPENDED')
             ORDER BY a.date_echeance DESC LIMIT 1`,
            [user.id]
          );
          if (lastAbo0 && lastAbo0.length && lastAbo0[0].plan_id) {
            const plan_id0 = lastAbo0[0].plan_id;
            const pm0  = require('../models/planModel');
            const pam0 = require('../models/paiementModel');
            const cm0  = require('../models/checkoutModel');
            const am0  = require('../models/abonnementModel');
            const plan0   = await pm0.getPlanById(plan_id0);
            const montant0 = Number(plan0?.price_cents || 0);
            if (montant0 > 0) {
              const abo0 = await am0.createAbonnement({
                utilisateur_id: user.id, plan_id: plan_id0, montant: montant0,
                currency: plan0?.currency || 'XOF', statut: 'pending',
                metadata: { plan: plan0, duration_months: 1, purpose: 'renewal_on_login' },
              });
              const pai0 = await pam0.createPaiement({ abonnement_id: abo0.id, montant: montant0, statut: 'pending', metadata: { plan_id: plan_id0, purpose: 'renewal', duration_months: 1 } });
              const co0  = await cm0.createCheckout({ utilisateur_id: user.id, plan_id: plan_id0, abonnement_id: abo0.id, paiement_id: pai0.id, metadata: { plan: plan0, duration_months: 1, discount_percent: 0 }, checkout_type: 'renewal' });
              checkoutToken = co0.token;
              checkoutUrl   = `${process.env.FRONTEND_BASE || 'https://portefolia.tech'}/checkout?token=${co0.token}`;
            }
          }
        } catch (e) { console.warn('login: could not create renewal checkout (inactive+expired)', e?.message); }
        return res.status(403).json({
          error: subStatus0 === 'SUSPENDED'
            ? 'Votre compte est suspendu. Contactez le support Portefolia.'
            : 'Votre essai ou abonnement a expiré. Renouvelez pour accéder à votre compte.',
          code: 'SUBSCRIPTION_EXPIRED',
          checkout_token: checkoutToken,
          checkout_url: checkoutUrl,
        });
      }

      // Cas 1 : abonnement suspendu (plan épuisé)
      const [suspendedRows] = await pool.query(
        "SELECT up.id, up.plan_id FROM user_plans up WHERE up.utilisateur_id = ? AND up.status = 'suspended' ORDER BY up.end_date DESC LIMIT 1",
        [user.id]
      );
      if (suspendedRows && suspendedRows.length) {
        const plan_id = suspendedRows[0].plan_id;
        let checkoutToken = null;
        let checkoutUrl  = null;
        try {
          const planModel       = require('../models/planModel');
          const paiementModel   = require('../models/paiementModel');
          const checkoutModel   = require('../models/checkoutModel');
          const abonnementModel = require('../models/abonnementModel');

          const plan    = await planModel.getPlanById(plan_id);
          const montant = Number(plan?.price_cents || 0);
          const abo     = await abonnementModel.createAbonnement({
            utilisateur_id: user.id, plan_id, montant, currency: plan?.currency || 'XOF',
            statut: 'pending', metadata: { plan, duration_months: 1, discount_percent: 0, purpose: 'renewal_on_login' },
          });
          const paiement = await paiementModel.createPaiement({
            abonnement_id: abo.id, montant, statut: 'pending',
            metadata: { plan_id, purpose: 'renewal', duration_months: 1 },
          });
          const checkout = await checkoutModel.createCheckout({
            utilisateur_id: user.id, plan_id, abonnement_id: abo.id,
            paiement_id: paiement.id, metadata: { plan, duration_months: 1, discount_percent: 0 },
          });
          checkoutToken = checkout.token;
          checkoutUrl   = `${process.env.FRONTEND_BASE || 'https://portefolia.tech'}/checkout?token=${checkout.token}`;
        } catch (e) { console.warn('login: could not create renewal checkout', e?.message); }

        return res.status(403).json({
          error: 'Votre abonnement a expiré. Renouvelez-le pour accéder à votre compte.',
          code: 'SUBSCRIPTION_EXPIRED',
          checkout_token: checkoutToken,
          checkout_url: checkoutUrl,
        });
      }

      // Cas 2 : membre Business dont l'admin a un abonnement suspendu
      const [bizRows] = await pool.query(
        "SELECT bm.id FROM business_members bm WHERE bm.user_id = ? AND bm.status = 'suspended' LIMIT 1",
        [user.id]
      );
      if (bizRows && bizRows.length) {
        return res.status(403).json({
          error: "L'abonnement de votre entreprise a expiré. Contactez votre administrateur pour renouveler.",
          code: 'BUSINESS_SUSPENDED',
        });
      }
      // Cas 3 : paiement en cours (référence soumise ou checkout créé mais pas encore soumis)
      const [pendingCheckouts] = await pool.query(
        "SELECT c.token, c.status FROM checkouts c WHERE c.utilisateur_id = ? AND c.status IN ('pending_admin', 'pending') ORDER BY c.created_at DESC LIMIT 1",
        [user.id]
      );
      if (pendingCheckouts && pendingCheckouts.length) {
        const isPendingAdmin = pendingCheckouts[0].status === 'pending_admin';
        const checkoutToken = pendingCheckouts[0].token;
        const checkoutUrl = `${process.env.FRONTEND_BASE || 'https://portefolia.tech'}/checkout?token=${checkoutToken}`;
        if (isPendingAdmin) {
          return res.status(403).json({
            error: 'Votre paiement est en cours de validation par notre équipe. Vous recevrez un email avec votre lien de connexion dès que le paiement sera confirmé.',
            code: 'PAYMENT_PENDING',
          });
        } else {
          return res.status(403).json({
            error: 'Votre compte est en attente de paiement. Finalisez votre paiement Wave pour activer votre compte.',
            code: 'PAYMENT_REQUIRED',
            checkout_token: checkoutToken,
            checkout_url: checkoutUrl,
          });
        }
      }
    } catch (e) { console.warn('login: inactive reason check failed', e?.message); }

    // Cas par défaut : compte désactivé (raison administrative)
    return res.status(403).json({
      error: 'Votre compte est inactif. Contactez le support Portefolia pour plus d\'informations.',
      code: 'ACCOUNT_INACTIVE',
    });
  }

  // ── Vérification abonnement pour les comptes actifs (is_active = true) ──────
  // Bloque les utilisateurs dont l'abonnement a expiré, est suspendu,
  // ou dont un paiement est encore en attente de validation.
  try {
    const { pool } = require('../db');

    const subStatus = user.subscription_status;

    // Abonnement expiré → bloquer et proposer le renouvellement
    if (subStatus === 'EXPIRED' || subStatus === 'SUSPENDED') {
      let checkoutToken = null;
      let checkoutUrl   = null;
      try {
        const [lastAbo] = await pool.query(
          `SELECT a.id, a.plan_id FROM abonnements a
           WHERE a.utilisateur_id = ? AND a.statut_v2 IN ('EXPIRED', 'SUSPENDED')
           ORDER BY a.date_echeance DESC LIMIT 1`,
          [user.id]
        );
        if (lastAbo && lastAbo.length) {
          const plan_id = lastAbo[0].plan_id;
          const planModel2       = require('../models/planModel');
          const paiementModel2   = require('../models/paiementModel');
          const checkoutModel2   = require('../models/checkoutModel');
          const abonnementModel2 = require('../models/abonnementModel');
          const plan    = await planModel2.getPlanById(plan_id);
          const montant = Number(plan?.price_cents || 0);
          const abo     = await abonnementModel2.createAbonnement({
            utilisateur_id: user.id, plan_id, montant, currency: plan?.currency || 'XOF',
            statut: 'pending', metadata: { plan, duration_months: 1, purpose: 'renewal_on_login' },
          });
          const paiement = await paiementModel2.createPaiement({
            abonnement_id: abo.id, montant, statut: 'pending',
            metadata: { plan_id, purpose: 'renewal', duration_months: 1 },
          });
          const checkout = await checkoutModel2.createCheckout({
            utilisateur_id: user.id, plan_id, abonnement_id: abo.id,
            paiement_id: paiement.id, metadata: { plan, duration_months: 1, discount_percent: 0 },
          });
          checkoutToken = checkout.token;
          checkoutUrl   = `${process.env.FRONTEND_BASE || 'https://portefolia.tech'}/checkout?token=${checkout.token}`;
        }
      } catch (e) { console.warn('login: could not create renewal checkout (active path)', e?.message); }

      return res.status(403).json({
        error: subStatus === 'SUSPENDED'
          ? 'Votre compte est suspendu. Contactez le support Portefolia.'
          : 'Votre essai ou abonnement a expiré. Renouvelez pour accéder à votre compte.',
        code: 'SUBSCRIPTION_EXPIRED',
        checkout_token: checkoutToken,
        checkout_url: checkoutUrl,
      });
    }

    // Paiement Wave soumis mais pas encore validé par l'admin
    // Ne bloquer que si c'est un PREMIER paiement (pas un upgrade — l'utilisateur garde ses accès)
    if (subStatus === 'PENDING_PAYMENT') {
      const [activeAboCheck] = await pool.query(
        "SELECT id FROM abonnements WHERE utilisateur_id = ? AND statut_v2 = 'ACTIVE' LIMIT 1",
        [user.id]
      );
      if (!activeAboCheck || !activeAboCheck.length) {
        return res.status(403).json({
          error: 'Votre paiement est en cours de validation. Vous recevrez un email avec votre lien de connexion dès confirmation.',
          code: 'PAYMENT_PENDING',
        });
      }
      // Upgrade en cours : abonnement actif existant → laisser passer
    }

    // Failsafe : abonnement PENDING_PAYMENT détecté sans que subscription_status soit à jour
    const [pendingAbo] = await pool.query(
      "SELECT id FROM abonnements WHERE utilisateur_id = ? AND statut_v2 = 'PENDING_PAYMENT' LIMIT 1",
      [user.id]
    );
    if (pendingAbo && pendingAbo.length) {
      const [activeAboFs] = await pool.query(
        "SELECT id FROM abonnements WHERE utilisateur_id = ? AND statut_v2 = 'ACTIVE' LIMIT 1",
        [user.id]
      );
      if (!activeAboFs || !activeAboFs.length) {
        // Premier paiement : bloquer et synchroniser subscription_status
        await pool.query("UPDATE utilisateurs SET subscription_status = 'PENDING_PAYMENT' WHERE id = ?", [user.id]);
        return res.status(403).json({
          error: 'Votre paiement est en cours de validation. Vous recevrez un email avec votre lien de connexion dès confirmation.',
          code: 'PAYMENT_PENDING',
        });
      }
      // Upgrade en cours → ne pas bloquer, ne pas modifier subscription_status
    }
  } catch (e) { console.warn('login: subscription status check failed', e?.message); }

  await userModel.setLastLogin(user.id);

  const accessToken = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await refreshTokenModel.createRefreshToken({ utilisateur_id: user.id, token: refreshToken, user_agent: req.headers['user-agent'] || null, ip: req.ip, expires_at: expiresAt });
  res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: (process.env.NODE_ENV === 'production'), sameSite: (process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')), maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000, path: '/' });
  return res.json({ accessToken });
}

async function verify(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ code: 'TOKEN_MISSING', error: 'Lien de vérification invalide.' });

  const user = await userModel.findByVerificationToken(token);
  if (!user) return res.status(400).json({ code: 'TOKEN_INVALID', error: 'Ce lien a expiré ou a déjà été utilisé.' });

  await userModel.verifyUser(user.id);

  // Plan gratuit (subscription_status ACTIVE) → émettre un JWT pour connecter directement
  const subStatus = user.subscription_status;
  const canLogin  = (subStatus === 'ACTIVE' || subStatus === 'GRACE_PERIOD') && user.is_active;

  if (canLogin) {
    const accessToken = jwt.sign(
      { sub: user.id, role: user.role || 'USER', email: user.email },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await refreshTokenModel.createRefreshToken({
      utilisateur_id: user.id, token: refreshToken,
      user_agent: req.headers['user-agent'] || null, ip: req.ip, expires_at: expiresAt,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
      maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      path: '/',
    });
    await userModel.setLastLogin(user.id);
    return res.json({
      ok: true,
      verified: true,
      accessToken,
      user: { prenom: user.prenom, nom: user.nom, email: user.email },
      message: 'Email vérifié. Bienvenue sur Portefolia !',
    });
  }

  // Plan payant ou compte inactif → vérification seule, pas de login
  return res.json({
    ok: true,
    verified: true,
    verified_only: true,
    message: 'Votre adresse email est confirmée. Vous recevrez un lien de connexion dès que votre paiement sera validé.',
  });
}

async function refresh(req, res) {
  const token = req.cookies && req.cookies.refresh_token;
  if (!token) return res.status(401).json({ error: 'Refresh token missing' });
  try {
    const dbToken = await refreshTokenModel.findByToken(token);
    if (!dbToken || dbToken.revoked) return res.status(401).json({ error: 'Invalid refresh token' });
    if (dbToken.expires_at && new Date(dbToken.expires_at) < new Date()) {
      await refreshTokenModel.revokeById(dbToken.id);
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    // issue new access token and rotate refresh token
    const user = await userModel.findById(dbToken.utilisateur_id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const accessToken = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
    // rotate refresh
    await refreshTokenModel.revokeById(dbToken.id);
    const newRefresh = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await refreshTokenModel.createRefreshToken({ utilisateur_id: user.id, token: newRefresh, user_agent: req.headers['user-agent'] || null, ip: req.ip, expires_at: expiresAt });
    res.cookie('refresh_token', newRefresh, { httpOnly: true, secure: (process.env.NODE_ENV === 'production'), sameSite: (process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')), maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000, path: '/' });
    return res.json({ accessToken });
  } catch (e) {
    console.warn('refresh error', e && e.message);
    return res.status(401).json({ error: 'Could not refresh token' });
  }
}

async function logout(req, res) {
  const token = req.cookies && req.cookies.refresh_token;
  if (token) {
    try { await refreshTokenModel.revokeByToken(token); } catch (e) { console.warn('logout revoke failed', e && e.message); }
  }
  res.clearCookie('refresh_token', { path: '/' });
  return res.json({ ok: true });
}

module.exports = { register, login, verify, refresh, logout, checkEmailAvailability };

// Dedicated admin login that authenticates against admin_users table
async function adminLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email et password requis' });
  try {
    const adminUserModel = require('../models/adminUserModel');
    const admin = await adminUserModel.findByEmail(email);
    if (!admin) return res.status(401).json({ error: 'Identifiants invalides' });
    // block login if admin account is inactive
    if (typeof admin.is_active !== 'undefined' && admin.is_active === 0) {
      return res.status(403).json({ error: 'Compte administrateur inactif. Contactez le super-admin.' });
    }
    const okAdmin = await bcrypt.compare(password, admin.password_hash);
    if (!okAdmin) return res.status(401).json({ error: 'Identifiants invalides' });
    let roleName = await adminUserModel.getRoleNameByAdminId(admin.id);
    roleName = roleName || 'ADMIN';
    await userModel.setLastLogin && typeof userModel.setLastLogin === 'function' && userModel.setLastLogin(admin.id).catch(()=>{});
    const accessToken = jwt.sign({ sub: admin.id, role: roleName, email: admin.email, token_type: 'admin' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await refreshTokenModel.createRefreshToken({ utilisateur_id: admin.id, token: refreshToken, user_agent: req.headers['user-agent'] || null, ip: req.ip, expires_at: expiresAt });
    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: (process.env.NODE_ENV === 'production'), sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000, path: '/' });
    return res.json({ accessToken });
  } catch (e) {
    console.warn('admin login error', e && e.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports.adminLogin = adminLogin;

// ── Token-based login (single-use magic link) ─────────────────────────────────
async function loginByToken(req, res) {
  const { token } = req.params;
  if (!token || typeof token !== 'string' || token.length < 16) {
    return res.status(400).json({ code: 'TOKEN_INVALID', message: 'Ce lien a expiré ou a déjà été utilisé.' });
  }
  try {
    const { pool } = require('../db');

    const [rows] = await pool.query(
      `SELECT a.id AS abonnement_id, a.utilisateur_id,
              u.id, u.nom, u.prenom, u.email, u.role, u.is_active
       FROM abonnements a
       JOIN utilisateurs u ON u.id = a.utilisateur_id
       WHERE a.token_acces = ?
         AND a.token_expiration IS NOT NULL
         AND a.token_expiration > NOW()
         AND (u.deleted_at IS NULL OR u.deleted_at = '0000-00-00 00:00:00')
       LIMIT 1`,
      [token]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({ code: 'TOKEN_INVALID', message: 'Ce lien a expiré ou a déjà été utilisé.' });
    }

    const row = rows[0];

    if (!row.is_active) {
      return res.status(403).json({ code: 'ACCOUNT_INACTIVE', message: 'Votre compte est inactif. Contactez le support.' });
    }

    // Invalidate token immediately (single-use)
    await pool.query(
      'UPDATE abonnements SET token_acces = NULL, token_expiration = NULL WHERE id = ?',
      [row.abonnement_id]
    );

    await userModel.setLastLogin(row.utilisateur_id);

    const accessToken = jwt.sign(
      { sub: row.utilisateur_id, role: row.role || 'USER', email: row.email },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await refreshTokenModel.createRefreshToken({
      utilisateur_id: row.utilisateur_id,
      token: refreshToken,
      user_agent: req.headers['user-agent'] || null,
      ip: req.ip,
      expires_at: expiresAt,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
      maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({
      accessToken,
      user: { prenom: row.prenom, nom: row.nom, email: row.email },
    });
  } catch (e) {
    console.error('[loginByToken] error:', e && e.message);
    return res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur. Veuillez réessayer.' });
  }
}

module.exports.loginByToken = loginByToken;

async function adminMe(req, res) {
  try {
    // authMiddleware ensures token valid and req.userId set
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const adminUserModel = require('../models/adminUserModel');
    const admin = await adminUserModel.findById(userId);
    if (!admin) return res.status(404).json({ error: 'Not found' });
    // include role name
    const roleName = await adminUserModel.getRoleNameByAdminId(admin.id).catch(() => null);
    return res.json({ admin: { id: admin.id, email: admin.email, name: admin.full_name || admin.name || null, role: roleName, is_active: admin.is_active } });
  } catch (e) {
    console.warn('adminMe error', e && e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports.adminMe = adminMe;

async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis.' });
    const validation = validateEmail(email);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const user = await userModel.findByEmail(validation.normalized);
    // Always return success to avoid user enumeration
    if (!user || user.verified) return res.json({ ok: true });

    const verifToken = crypto.randomBytes(32).toString('hex');
    const verifExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await userModel.setVerificationToken(user.id, verifToken, verifExpires);

    const FRONTEND_BASE = process.env.FRONTEND_BASE || 'https://portefolia.tech';
    const verify_url = `${FRONTEND_BASE}/verify-email?token=${verifToken}`;
    const isPaid = user.subscription_status === 'PENDING_PAYMENT' || (!user.is_active && user.subscription_status !== 'ACTIVE');
    const { subject, html } = emailBienvenueVerification({
      prenom: user.prenom || user.nom || 'Utilisateur',
      verify_url,
      plan_type: isPaid ? 'paid' : 'free',
    });
    sendEmail({ to: user.email, subject, html })
      .catch(err => console.error('resendVerification sendEmail error:', err.message));

    return res.json({ ok: true });
  } catch (err) {
    console.error('resendVerification error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

module.exports.resendVerification = resendVerification;

// ── Réinitialisation mot de passe ─────────────────────────────────────────────

async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    const validation = validateEmail(email);
    // Toujours répondre OK pour ne pas révéler l'existence du compte
    if (!validation.valid) return res.json({ ok: true });

    const user = await userModel.findByEmail(validation.normalized);
    if (!user) return res.json({ ok: true });

    const { pool } = require('../db');
    const token = crypto.randomBytes(32).toString('hex');

    // DATE_ADD(NOW(), INTERVAL 1 HOUR) — expiration calculée côté MySQL
    // pour éviter tout décalage de fuseau horaire entre Node.js et le serveur MySQL
    await pool.query(
      `UPDATE utilisateurs
         SET reset_password_token   = ?,
             reset_password_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR)
       WHERE id = ?`,
      [token, user.id]
    );

    const FRONTEND_BASE = process.env.FRONTEND_BASE || 'https://portefolia.tech';
    const reset_url     = `${FRONTEND_BASE}/reset-password?token=${token}`;

    const { subject, html } = emailResetMotDePasse({
      prenom:    user.prenom || user.nom || 'utilisateur',
      reset_url,
    });

    sendEmail(user.email, subject, html)
      .catch(err => console.error('forgotPassword mail error:', err.message));

    return res.json({ ok: true });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports.forgotPassword = forgotPassword;

async function confirmReset(req, res) {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string' || token.length < 16) {
      return res.status(400).json({ error: 'Lien invalide ou expiré.' });
    }

    const { pool } = require('../db');
    const [[user]] = await pool.query(
      `SELECT id, nom, prenom, email, role, is_active
       FROM utilisateurs
       WHERE reset_password_token = ?
         AND reset_password_expires > NOW()
         AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')
       LIMIT 1`,
      [token]
    );

    if (!user) {
      return res.status(400).json({ error: 'Ce lien a expiré ou a déjà été utilisé. Veuillez refaire une demande.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Votre compte est inactif. Contactez le support.' });
    }

    // Invalider le token immédiatement (usage unique)
    await pool.query(
      'UPDATE utilisateurs SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
      [user.id]
    );

    await userModel.setLastLogin(user.id);

    const accessToken = jwt.sign(
      { sub: user.id, role: user.role || 'USER', email: user.email, password_reset: true },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await refreshTokenModel.createRefreshToken({
      utilisateur_id: user.id,
      token:          refreshToken,
      user_agent:     req.headers['user-agent'] || null,
      ip:             req.ip,
      expires_at:     expiresAt,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
      maxAge:   REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    return res.json({
      accessToken,
      user: { id: user.id, prenom: user.prenom, nom: user.nom, email: user.email },
    });
  } catch (err) {
    console.error('confirmReset error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

module.exports.confirmReset = confirmReset;
