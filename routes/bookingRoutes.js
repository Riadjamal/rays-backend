const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');

// Public tracking route
router.get('/track/:pnr', bookingController.trackBooking);

// Protected routes
router.use(auth);

// POST /api/bookings - Create booking
router.post('/', bookingController.createBooking);

// GET /api/bookings - Get all bookings (admin only handled in controller)
router.get('/', bookingController.getAllBookings);

// GET /api/bookings/my-bookings - Get user's own bookings
router.get('/my-bookings', bookingController.getMyBookings);

// GET /api/bookings/unassigned-trip - Get bookings without seats for a trip
router.get('/unassigned-trip', bookingController.getUnassignedBookings);

// GET /api/bookings/:id - Get booking by ID
router.get('/:id', bookingController.getBookingById);

// PUT /api/bookings/:id/status - Update booking status
router.put('/:id/status', bookingController.updateBookingStatus);

// PUT /api/bookings/:id/cancel - Cancel booking
router.put('/:id/cancel', bookingController.cancelBooking);

module.exports = router;
