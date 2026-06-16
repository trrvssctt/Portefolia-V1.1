const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const waveCtrl = require('../controllers/wavePaymentController');

// POST /api/payment/wave/initiate
// Soumettre une référence Wave → crée un abonnement PENDING_PAYMENT
router.post('/wave/initiate', auth, waveCtrl.initiate);

// GET /api/payment/wave/options/:planId
// Options de prix pour un plan (public — pas d'auth requise)
router.get('/wave/options/:planId', waveCtrl.pricingOptions);

module.exports = router;
