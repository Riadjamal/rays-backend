const express = require('express');
const router = express.Router();
const { getSetting, updateSetting } = require('../controllers/settingController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roleMiddleware');

// Publicly readable (for agents to see bank details)
router.get('/:key', getSetting);

// Only Admin can update
router.put('/', auth, authorize('admin'), updateSetting);

module.exports = router;
