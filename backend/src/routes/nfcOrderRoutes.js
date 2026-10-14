// Offres de cartes NFC et commandes par offre (client connecté) + gestion des offres (admin).
const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const ctrl = require('../controllers/nfcOrderController');
const auth = require('../middlewares/authMiddleware');
const adminAuth = require('../middlewares/adminAuth');
const { requirePermission } = require('../middlewares/rbac');
const { receiveAsset, receiveOrderVisuals } = require('../utils/nfcAssets');

function limiter(max, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || ''),
    validate: { xForwardedForHeader: false },
    message: { error: message },
  });
}
const orderLimiter = limiter(5, 'Trop de commandes depuis cette connexion. Réessayez dans 15 minutes.');
const assetLimiter = limiter(30, 'Trop d\'envois. Réessayez dans 15 minutes.');

// Monté sur /api/nfc
const router = express.Router();
router.get('/offers', ctrl.offers);
router.post('/orders/assets', auth, assetLimiter, receiveAsset, ctrl.uploadOrderAsset);
router.post('/orders', auth, orderLimiter, receiveOrderVisuals, ctrl.create);
router.get('/orders/mine', auth, ctrl.myOrders);
router.get('/cards/mine', auth, ctrl.myCards);
router.put('/cards/mine/:id', auth, ctrl.setMyCardPortfolio);
router.post('/cards/mine/:id/lost', auth, ctrl.declareLost);

// Monté sur /api/admin/nfc-offers
const adminRouter = express.Router();
adminRouter.use(auth, adminAuth);
adminRouter.get('/', requirePermission('nfc:read'), ctrl.adminOffers);
adminRouter.put('/:id', requirePermission('nfc:pricing'), ctrl.adminUpdateOffer);

module.exports = { router, adminRouter };
