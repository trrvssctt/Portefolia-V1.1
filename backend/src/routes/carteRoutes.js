const express = require('express');
const router = express.Router();
const carteController = require('../controllers/carteController');
const auth = require('../middlewares/authMiddleware');

router.put('/:id/activate', auth, carteController.activateCard);
router.put('/:id/deactivate', auth, carteController.deactivateCard);

module.exports = router;
