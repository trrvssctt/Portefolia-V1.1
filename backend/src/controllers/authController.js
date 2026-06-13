const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const adminUserModel = require('../models/adminUserModel');
const planModel = require('../models/planModel');
const sendEmail = require('../utils/sendEmail');
const commandeModel = require('../models/commandeModel');
const paiementModel = require('../models/paiementModel');
const checkoutModel = require('../models/checkoutModel');
const abonnementModel = require('../models/abonnementModel');
const refreshTokenModel = require('../models/refreshTokenModel');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
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

async function register(req, res) {
  const { nom, prenom, email, password, photo_profil, biographie, plan_id, plan_slug } = req.body;
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

  // Previously we sent verification emails and required email verification.
  // That concept has been removed: users are created verified and can log in immediately.
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
      try {
        await planModel.subscribeUser({ utilisateur_id: user.id, plan_id: plan.id, status: 'active' });
        // ensure user is active
        await userModel.setActive(user.id, true);
      } catch (e) { console.warn('subscribeUser failed at registration:', e.message || e); }
    } else if (plan && Number(plan.price_cents || 0) > 0) {
      // Paid plan : créer un vrai checkout dans la DB pour que le paiement Wave fonctionne
      try {
        const montant = Number(plan.price_cents || 0) / 100;
        const checkoutMeta = { purpose: 'signup', plan, duration_months: 1, discount_percent: 0 };
        const ab = await abonnementModel.createAbonnement({
          utilisateur_id: user.id, plan_id: plan.id, montant, currency: plan.currency || 'XOF', statut: 'pending', metadata: checkoutMeta,
        });
        const paiement = await paiementModel.createPaiement({
          abonnement_id: ab.id, montant, statut: 'pending',
          metadata: { plan_id: plan.id, purpose: 'signup', duration_months: 1, discount_percent: 0 },
        });
        const checkout = await checkoutModel.createCheckout({
          utilisateur_id: user.id, plan_id: plan.id, abonnement_id: ab.id,
          paiement_id: paiement.id, metadata: checkoutMeta,
        });
        // Désactiver le compte jusqu'à validation du paiement par l'admin
        try { await userModel.setActive(user.id, false); } catch (e) { console.warn('Could not set user inactive:', e.message || e); }
        const checkoutUrl = `${process.env.FRONTEND_BASE || 'http://localhost:5173'}/checkout?token=${checkout.token}`;
        return res.status(201).json({
          id: user.id, email: user.email,
          message: 'Compte créé. Effectuez le paiement Wave pour activer votre compte.',
          abonnement: { id: ab.id },
          checkout: { token: checkout.token, checkout_url: checkoutUrl },
        });
      } catch (e) {
        console.warn('Could not create checkout at registration:', e.message || e);
        try { await userModel.setActive(user.id, false); } catch (ee) {}
        return res.status(201).json({ id: user.id, email: user.email, message: 'Compte créé. Contactez le support pour finaliser votre abonnement.' });
      }
    }
  } catch (e) {
    console.warn('plan processing error at registration:', e.message || e);
  }

  // issue access + refresh tokens
  const accessToken = jwt.sign({ sub: user.id, role: 'USER', email: user.email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await refreshTokenModel.createRefreshToken({ utilisateur_id: user.id, token: refreshToken, user_agent: req.headers['user-agent'] || null, ip: req.ip, expires_at: expiresAt });
  res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: (process.env.NODE_ENV === 'production'), sameSite: (process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')), maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000, path: '/' });
  return res.status(201).json({ id: user.id, email: user.email, accessToken, message: 'Compte créé.' });
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

  // Si le compte est inactif, détecter la raison précise
  if (typeof user.is_active !== 'undefined' && user.is_active === 0) {
    try {
      const { pool } = require('../db');

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
          const montant = Number(plan?.price_cents || 0) / 100;
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
          checkoutUrl   = `${process.env.FRONTEND_BASE || 'http://localhost:8080'}/checkout?token=${checkout.token}`;
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
        const checkoutUrl = `${process.env.FRONTEND_BASE || 'http://localhost:8080'}/checkout?token=${checkoutToken}`;
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
  if (!token) return res.status(400).json({ error: 'token manquant' });

  const user = await userModel.findByVerificationToken(token);
  if (!user) return res.status(400).json({ error: 'token invalide' });

  await userModel.verifyUser(user.id);
  return res.json({ ok: true, message: 'Email vérifié' });
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
