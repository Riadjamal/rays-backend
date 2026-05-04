const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const auth = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/roleMiddleware');

// GET /api/buses - Get all buses (public)
router.get('/', busController.getAllBuses);

// GET /api/buses/:id - Get bus by ID (public)
router.get('/:id', busController.getBusById);

// Staff/Admin routes - require authentication and appropriate roles/permissions
router.use(auth);
router.use(authorize('admin', 'sales', 'operations', 'finance'));

// POST /api/buses - Create bus
router.post('/', checkPermission('buses'), busController.createBus);

// PUT /api/buses/:id - Update bus
router.put('/:id', checkPermission('buses'), busController.updateBus);

// DELETE /api/buses/:id - Delete bus
router.delete('/:id', checkPermission('buses'), busController.deleteBus);

// PUT /api/buses/:id/assign-driver - Assign driver to bus
router.put('/:id/assign-driver', checkPermission('buses'), busController.assignDriver);

module.exports = router;
