// Précommandes NFC : routes publiques (/api/nfc/preorders), admin (/api/admin/nfc-preorders)
// et internes appelées par n8n (/api/internal/nfc).
const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const ctrl = require('../controllers/nfcPreorderController');
const auth = require('../middlewares/authMiddleware');
const adminAuth = require('../middlewares/adminAuth');
const optionalAuth = require('../middlewares/optionalAuth');
const internalAuth = require('../middlewares/internalAuth');

// Le backend tourne derrière un proxy : on limite par IP réelle du client
function clientKey(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return ipKeyGenerator(fwd || req.ip || '');
}

function limiter(max, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientKey,
    validate: { xForwardedForHeader: false },
    message: { error: message },
  });
}

const createLimiter = limiter(5, 'Trop de précommandes depuis cette connexion. Réessayez dans 15 minutes.');
const paymentLimiter = limiter(10, 'Trop de tentatives. Réessayez dans 15 minutes.');

// ── Public ────────────────────────────────────────────────────────────────────
const publicRouter = express.Router();
publicRouter.get('/config', ctrl.getPublicConfig);
publicRouter.post('/', createLimiter, optionalAuth, ctrl.create);
publicRouter.get('/:reference', ctrl.getPublic);
publicRouter.post('/:reference/payment', paymentLimiter, ctrl.submitPayment);

// ── Admin ─────────────────────────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(auth, adminAuth);
adminRouter.get('/', ctrl.adminList);
adminRouter.get('/stats', ctrl.adminStats);
adminRouter.get('/export.csv', ctrl.adminExport);
adminRouter.get('/settings', ctrl.adminGetSettings);
adminRouter.put('/settings', ctrl.adminUpdateSettings);
adminRouter.get('/:id', ctrl.adminDetail);
adminRouter.put('/:id/validate', ctrl.adminValidate);
adminRouter.put('/:id/reject', ctrl.adminReject);
adminRouter.put('/:id/cancel', ctrl.adminCancel);
adminRouter.post('/:id/convert', ctrl.adminConvert);
adminRouter.post('/:id/resend', ctrl.adminResend);

// ── Interne (n8n) ─────────────────────────────────────────────────────────────
const internalRouter = express.Router();
internalRouter.use(internalAuth);
internalRouter.post('/preorders/expire-stale', ctrl.internalExpireStale);
internalRouter.post('/preorders/reminders-due', ctrl.internalRemindersDue);
internalRouter.post('/notifications', ctrl.internalNotification);

module.exports = { publicRouter, adminRouter, internalRouter };
