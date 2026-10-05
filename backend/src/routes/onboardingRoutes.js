const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const onboardingController = require('../controllers/onboardingController');

router.get('/', auth, onboardingController.getMine);
router.put('/:tourKey', auth, onboardingController.save);
router.delete('/:tourKey', auth, onboardingController.reset);

module.exports = router;
