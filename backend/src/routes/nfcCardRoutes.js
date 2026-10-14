// Cartes NFC physiques : redirection publique, résolution (secours SPA) et back-office stock / codes.
const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const ctrl = require('../controllers/nfcCardController');
const auth = require('../middlewares/authMiddleware');
const adminAuth = require('../middlewares/adminAuth');
const { requirePermission } = require('../middlewares/rbac');

// Un tap = une requête : limite large, seulement contre l'énumération des codes
const tapLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || ''),
  validate: { xForwardedForHeader: false },
  message: { error: 'Trop de requêtes.' },
});

// GET /c/:code — monté à la racine (Nginx : location /c/ → backend)
const redirectRouter = express.Router();
redirectRouter.get('/:code', tapLimiter, ctrl.redirect);

// GET /api/nfc/cards/resolve/:code — secours si /c/ est servi par le frontend
const publicRouter = express.Router();
publicRouter.get('/resolve/:code', tapLimiter, ctrl.resolvePublic);

const read = requirePermission('nfc:read');
const write = requirePermission('nfc:write');

const adminRouter = express.Router();
adminRouter.use(auth, adminAuth);
adminRouter.get('/stock', read, ctrl.stock);
adminRouter.get('/batches', read, ctrl.listBatches);
adminRouter.post('/batches', write, ctrl.createBatch);
adminRouter.put('/batches/:id/receive', write, ctrl.receiveBatch);
adminRouter.get('/batches/:id/export.csv', read, ctrl.exportBatchCsv);
adminRouter.get('/by-code/:code', read, ctrl.byCode);
adminRouter.get('/', read, ctrl.list);
adminRouter.put('/:id/deactivate', write, ctrl.deactivate);
adminRouter.put('/:id/reactivate', write, ctrl.reactivate);
adminRouter.put('/:id/assign', write, ctrl.assign);
adminRouter.put('/:id/status', write, ctrl.setStatus);

module.exports = { redirectRouter, publicRouter, adminRouter };
