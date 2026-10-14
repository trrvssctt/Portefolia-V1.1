// Précommandes NFC : routes publiques (/api/nfc/preorders), admin (/api/admin/nfc-preorders)
// et internes appelées par n8n (/api/internal/nfc).
const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const ctrl = require('../controllers/nfcPreorderController');
const auth = require('../middlewares/authMiddleware');
const adminAuth = require('../middlewares/adminAuth');
const internalAuth = require('../middlewares/internalAuth');
const { receiveProof } = require('../utils/paymentProof');
const { requirePermission } = require('../middlewares/rbac');

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
const checkLimiter = limiter(40, 'Trop de vérifications. Réessayez dans 15 minutes.');
const resendLimiter = limiter(3, 'Lien déjà renvoyé plusieurs fois. Vérifiez vos e-mails (et les spams) ou réessayez dans 15 minutes.');

// ── Public ────────────────────────────────────────────────────────────────────
const publicRouter = express.Router();
publicRouter.get('/config', ctrl.getPublicConfig);
// Création : compte obligatoire, commande par offre (même traitement que POST /api/nfc/orders)
publicRouter.post('/', createLimiter, auth, require('../utils/nfcAssets').receiveOrderVisuals, require('../controllers/nfcOrderController').create);
publicRouter.post('/check', checkLimiter, ctrl.checkContact);
publicRouter.post('/resend-link', resendLimiter, ctrl.resendLink);
publicRouter.get('/:reference', ctrl.getPublic);
publicRouter.post('/:reference/proof', paymentLimiter, receiveProof, ctrl.submitProof);
publicRouter.post('/:reference/payment', paymentLimiter, ctrl.submitPayment);
publicRouter.post('/:reference/bat/approve', paymentLimiter, ctrl.approveBat);
publicRouter.post('/:reference/bat/changes', paymentLimiter, ctrl.requestBatChanges);

// ── Admin ─────────────────────────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(auth, adminAuth);
// Lecture et production : nfc:read / nfc:write ; validation des paiements : payments:write ; prix : nfc:pricing
const nfcRead = requirePermission('nfc:read');
const nfcWrite = requirePermission('nfc:write');
const payWrite = requirePermission('payments:write');
adminRouter.get('/', nfcRead, ctrl.adminList);
adminRouter.get('/stats', nfcRead, ctrl.adminStats);
adminRouter.get('/export.csv', nfcRead, ctrl.adminExport);
adminRouter.get('/settings', nfcRead, ctrl.adminGetSettings);
// File et lot d'impression (avant /:id)
adminRouter.get('/print-batch', nfcRead, ctrl.adminPrintQueue);
adminRouter.get('/print-batch/sheet', nfcRead, ctrl.adminPrintSheet);
adminRouter.post('/print-batch/start', nfcWrite, ctrl.adminStartPrintBatch);
adminRouter.put('/settings', requirePermission('nfc:pricing'), ctrl.adminUpdateSettings);
adminRouter.get('/:id', nfcRead, ctrl.adminDetail);
adminRouter.put('/:id/validate', payWrite, ctrl.adminValidate);
adminRouter.put('/:id/reject', payWrite, ctrl.adminReject);
adminRouter.put('/:id/cancel', nfcWrite, ctrl.adminCancel);
adminRouter.post('/:id/resend', nfcWrite, ctrl.adminResend);
// Production : design, BAT, impression, livraison
adminRouter.put('/:id/design', nfcWrite, ctrl.adminStartDesign);
adminRouter.post('/:id/bat', nfcWrite, require('../utils/nfcAssets').receiveBatFiles, ctrl.adminUploadBat);
adminRouter.put('/:id/bat/send', nfcWrite, ctrl.adminSendBat);
adminRouter.put('/:id/bat/approve', nfcWrite, ctrl.adminApproveBat);
adminRouter.put('/:id/production', nfcWrite, ctrl.adminAdvance);

// ── Interne (n8n) ─────────────────────────────────────────────────────────────
const internalRouter = express.Router();
internalRouter.use(internalAuth);
internalRouter.post('/preorders/expire-stale', ctrl.internalExpireStale);
internalRouter.post('/preorders/reminders-due', ctrl.internalRemindersDue);
internalRouter.post('/notifications', ctrl.internalNotification);

module.exports = { publicRouter, adminRouter, internalRouter };
