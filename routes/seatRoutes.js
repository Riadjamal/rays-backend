const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');
const auth = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/roleMiddleware');

// GET /api/seats/available - Get available seats (public)
router.get('/available', seatController.getAvailableSeats);

// All other routes require authentication
router.use(auth);

// POST /api/seats/book - Book a seat
router.post('/book', seatController.bookSeat);

// GET /api/seats/layout - Get full seat layout for a bus
router.get('/layout', seatController.getSeatLayout);

// GET /api/seats/:id - Get seat by ID
router.get('/:id', seatController.getSeatById);

// Staff/Admin routes
router.use(authorize('admin', 'sales', 'operations', 'finance'));

// POST /api/seats/toggle-block - Toggle block seat
router.post('/toggle-block', checkPermission('seats'), seatController.toggleBlockSeat);

// POST /api/seats/manual-assign - Manual assign seat to booking
router.post('/manual-assign', checkPermission('seats'), seatController.manualAssignSeat);

// Override/Release routes
router.put('/:id/override', checkPermission('seats'), seatController.overrideSeat);
router.put('/:id/release', checkPermission('seats'), seatController.releaseSeat);

module.exports = router;
