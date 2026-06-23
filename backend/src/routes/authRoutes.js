const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { subscriptionStatus } = require('../controllers/wavePaymentController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
});

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives administrateur. Réessayez dans 15 minutes.' }
});

router.post('/register', authLimiter, auth.register);
router.post('/check-email', authLimiter, auth.checkEmailAvailability);
router.post('/login', authLimiter, auth.login);
// Admin login (separate endpoint so client login uses `utilisateurs` table only)
router.post('/admin/sama_connection_page', adminAuthLimiter, auth.adminLogin);
router.get('/admin/me', require('../middlewares/authMiddleware'), auth.adminMe);
router.get('/verify', auth.verify);
router.post('/resend-verification', authLimiter, auth.resendVerification);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);

// GET /api/auth/token/:token — magic-link single-use login
router.get('/token/:token', authLimiter, auth.loginByToken);

// Reset mot de passe
router.post('/forgot-password', authLimiter, auth.forgotPassword);
router.post('/confirm-reset',   authLimiter, auth.confirmReset);

// GET /api/auth/subscription-status
router.get('/subscription-status', authMiddleware, subscriptionStatus);

module.exports = router;
