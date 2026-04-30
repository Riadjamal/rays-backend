const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roleMiddleware');

// All routes require authentication and driver role
router.use(auth);
router.use(authorize('driver'));

// GET /api/driver/profile - Get driver profile
router.get('/profile', driverController.getProfile);

// GET /api/driver/trips - Get assigned trips
router.get('/trips', driverController.getTrips);

// GET /api/driver/trips/:id - Get trip details
router.get('/trips/:id', driverController.getTripById);

// GET /api/driver/trips/:busId/passengers/:travelDate - Get passenger list
router.get('/trips/:busId/passengers/:travelDate', driverController.getPassengerList);

// GET /api/driver/route - Get route details
router.get('/route', driverController.getRouteDetails);

// POST /api/driver/check-in - Mark passenger as boarded
router.post('/check-in', driverController.checkInPassenger);

// GET /api/driver/notifications - Get driver notifications
router.get('/notifications', driverController.getNotifications);

module.exports = router;
