// routes/assistantRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assistantController');
const { protect } = require('../middleware/authMiddleware');

router.post('/ask', protect, ctrl.ask);

module.exports = router;
