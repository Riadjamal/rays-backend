const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roleMiddleware');

// GET /api/seats/available - Get available seats (public)
router.get('/available', seatController.getAvailableSeats);

// All other routes require authentication
router.use(auth);

// POST /api/seats/book - Book a seat
router.post('/book', seatController.bookSeat);

// GET /api/seats/layout - Get full seat layout for a bus (admin)
router.get('/layout', seatController.getSeatLayout);

// GET /api/seats/:id - Get seat by ID
router.get('/:id', seatController.getSeatById);

// POST /api/seats/toggle-block - Toggle block seat (admin)
router.post('/toggle-block', authorize('admin'), seatController.toggleBlockSeat);

// POST /api/seats/manual-assign - Manual assign seat to booking (admin)
router.post('/manual-assign', authorize('admin'), seatController.manualAssignSeat);

// Admin routes
router.put('/:id/override', authorize('admin'), seatController.overrideSeat);
router.put('/:id/release', authorize('admin'), seatController.releaseSeat);

module.exports = router;
