const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const auth = require('../middlewares/authMiddleware');
const requireActive = require('../middlewares/requireActive');
const checkSubscription = require('../middlewares/checkSubscription');
const { portfolioRules, validate } = require('../validators/portfolioValidator');

router.post('/', auth, checkSubscription, requireActive, portfolioRules(), validate, portfolioController.create);
router.put('/:id', auth, checkSubscription, requireActive, portfolioRules(), validate, portfolioController.update);
router.delete('/:id', auth, checkSubscription, portfolioController.remove);
// GET single portfolio (auth required)
router.get('/:id', auth, checkSubscription, portfolioController.getById);
// Note: GET /api/portfolios/ (no id) returns listByUser
router.get('/', auth, checkSubscription, portfolioController.listByUser);
module.exports = router;
