// Devis Entreprise : routes publiques (/api/nfc/quotes) et admin (/api/admin/nfc-quotes).
const express = require('express');
const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const svc = require('../services/nfcQuoteService');
const auth = require('../middlewares/authMiddleware');
const adminAuth = require('../middlewares/adminAuth');
const { requirePermission } = require('../middlewares/rbac');

function handleError(res, err, label) {
  if (err.status) return res.status(err.status).json({ error: err.message, ...(err.extra || {}) });
  console.error(`nfcQuote.${label} error:`, err);
  return res.status(500).json({ error: 'Erreur serveur, veuillez réessayer.' });
}

function adminCtx(req) {
  return { adminId: req.userId || null, ip: req.headers['x-forwarded-for'] || req.ip || '', userAgent: req.headers['user-agent'] || '' };
}

// Rattache la demande au compte connecté (et à son compte Business) si un jeton client valide est fourni
function attachUser(req, res, next) {
  const parts = (req.headers.authorization || '').split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const payload = jwt.verify(parts[1], process.env.JWT_SECRET || 'secret');
      if (payload.token_type !== 'admin') req.userId = payload.sub;
    } catch { /* anonyme */ }
  }
  next();
}

const limiter = (max) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || ''),
  validate: { xForwardedForHeader: false },
  message: { error: 'Trop de demandes. Réessayez dans 15 minutes.' },
});

const publicRouter = express.Router();
publicRouter.post('/', limiter(5), attachUser, async (req, res) => {
  try { return res.status(201).json(await svc.requestQuote(req.body || {}, { userId: req.userId || null })); }
  catch (err) { return handleError(res, err, 'request'); }
});
publicRouter.get('/:reference', limiter(60), async (req, res) => {
  try { return res.json(await svc.getPublicQuote(req.params.reference, req.query.t)); }
  catch (err) { return handleError(res, err, 'getPublic'); }
});
publicRouter.post('/:reference/accept', limiter(10), async (req, res) => {
  try { return res.json(await svc.acceptQuote(req.params.reference, (req.body || {}).token)); }
  catch (err) { return handleError(res, err, 'accept'); }
});
publicRouter.post('/:reference/decline', limiter(10), async (req, res) => {
  try { return res.json(await svc.declineQuote(req.params.reference, (req.body || {}).token, (req.body || {}).reason)); }
  catch (err) { return handleError(res, err, 'decline'); }
});

const adminRouter = express.Router();
adminRouter.use(auth, adminAuth);
adminRouter.get('/', requirePermission('nfc:read'), async (req, res) => {
  try { return res.json(await svc.listQuotes(req.query)); } catch (err) { return handleError(res, err, 'list'); }
});
adminRouter.put('/:id/send', requirePermission('nfc:write'), async (req, res) => {
  try { return res.json({ quote: await svc.sendQuote(Number(req.params.id), req.body || {}, adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'send'); }
});
adminRouter.put('/:id/cancel', requirePermission('nfc:write'), async (req, res) => {
  try { return res.json(await svc.cancelQuote(Number(req.params.id), adminCtx(req))); }
  catch (err) { return handleError(res, err, 'cancel'); }
});

module.exports = { publicRouter, adminRouter };
