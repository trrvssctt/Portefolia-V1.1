const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const stripeController = require('../controllers/stripeController');
const authMiddleware = require('../middlewares/authMiddleware');

// create checkout (authenticated)
router.post('/', authMiddleware, checkoutController.createCheckout);

// get checkout details by token (public)
router.get('/:token', checkoutController.getCheckout);

// lightweight status polling endpoint — returns only status + plan name (public)
router.get('/:token/status', checkoutController.getCheckoutStatus);

// confirm checkout via Wave/Mobile Money (user clicks "J'ai payé")
router.post('/:token/confirm', checkoutController.confirmCheckout);

// create Stripe PaymentIntent for a checkout token (public — token is the auth)
router.post('/:token/stripe-intent', stripeController.createPaymentIntent);

module.exports = router;
