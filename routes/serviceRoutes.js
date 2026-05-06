const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

// Allow all authenticated users (Agents, Users, etc) to see active services
router.get('/', auth, adminController.getServices);

module.exports = router;
