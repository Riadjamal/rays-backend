const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', inquiryController.submitInquiry);
router.get('/', auth, authorize('admin', 'sales'), inquiryController.getInquiries);

module.exports = router;
