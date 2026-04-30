const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roleMiddleware');

// GET /api/buses - Get all buses (public)
router.get('/', busController.getAllBuses);

// GET /api/buses/:id - Get bus by ID (public)
router.get('/:id', busController.getBusById);

// Admin routes - require authentication and admin role
router.use(auth);
router.use(authorize('admin'));

// POST /api/buses - Create bus (admin only)
router.post('/', busController.createBus);

// PUT /api/buses/:id - Update bus (admin only)
router.put('/:id', busController.updateBus);

// DELETE /api/buses/:id - Delete bus (admin only)
router.delete('/:id', busController.deleteBus);

// PUT /api/buses/:id/assign-driver - Assign driver to bus (admin only)
router.put('/:id/assign-driver', busController.assignDriver);

module.exports = router;
