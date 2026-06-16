const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middlewares/authMiddleware');
const checkSubscription = require('../middlewares/checkSubscription');

// Public event ingestion endpoint (called from portfolio pages)
router.post('/events', analyticsController.recordEvent);

// summary requires auth and ownership check is done in controller
router.get('/summary', auth, checkSubscription, analyticsController.summary);
router.get('/stream', auth, checkSubscription, analyticsController.streamVisits);
router.get('/', auth, checkSubscription, analyticsController.getAnalytics);
// Alias for advanced analytics used by frontend
router.get('/advanced', auth, checkSubscription, analyticsController.getAnalytics);

module.exports = router;
