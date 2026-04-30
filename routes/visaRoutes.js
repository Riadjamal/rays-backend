const express = require('express');
const router = express.Router();
const visaController = require('../controllers/visaController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(auth);

// GET /api/visas/pending - Get pending visas (admin only)
router.get('/pending', auth, authorize('admin'), visaController.getPendingVisas);

// GET /api/visas - Get all visas
router.get('/', visaController.getAllVisas);

// POST /api/visas/apply - Apply for visa (admin only)
router.post('/apply', auth, authorize('admin'), visaController.applyVisa);

// PUT /api/visas/:id/approve - Approve visa (admin only)
router.put('/:id/approve', auth, authorize('admin'), visaController.approveVisa);

// PUT /api/visas/:id/reject - Reject visa (admin only)
router.put('/:id/reject', auth, authorize('admin'), visaController.rejectVisa);

// GET /api/visas/stats - Get visa statistics
router.get('/stats', auth, authorize('admin'), visaController.getVisaStats);

// PUT /api/visas/:id/status - Update visa status (generic)
router.put('/:id/status', auth, authorize('admin'), visaController.updateVisaStatus);

// GET /api/visas/booking/:bookingId - Get visa by booking
router.get('/booking/:bookingId', visaController.getVisaByBooking);

// GET /api/visas/my-visas - Get current user's visas
router.get('/my-visas', visaController.getMyVisas);

module.exports = router;
