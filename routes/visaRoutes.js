const express = require('express');
const router = express.Router();
const visaController = require('../controllers/visaController');
const auth = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(auth);

// GET /api/visas/pending - Get pending visas
router.get('/pending', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.getPendingVisas);

// GET /api/visas - Get all visas
router.get('/', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.getAllVisas);

// POST /api/visas/apply - Apply for visa
router.post('/apply', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.applyVisa);

// PUT /api/visas/:id/approve - Approve visa
router.put('/:id/approve', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.approveVisa);

// PUT /api/visas/:id/reject - Reject visa
router.put('/:id/reject', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.rejectVisa);

// GET /api/visas/stats - Get visa statistics
router.get('/stats', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.getVisaStats);

// PUT /api/visas/:id/status - Update visa status
router.put('/:id/status', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.updateVisaStatus);

// GET /api/visas/booking/:bookingId - Get visa by booking
router.get('/booking/:bookingId', visaController.getVisaByBooking);

// GET /api/visas/my-visas - Get current user's visas
router.get('/my-visas', visaController.getMyVisas);

module.exports = router;
