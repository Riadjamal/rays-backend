const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roleMiddleware');

// All routes require authentication and admin role
router.use(auth);
router.use(authorize('admin'));

// GET /api/admin/dashboard - Dashboard stats
router.get('/dashboard', adminController.getDashboard);

// GET /api/admin/users - Get all users
router.get('/users', adminController.getUsers);

// PUT /api/admin/users/:id/block - Block/Unblock user
router.put('/users/:id/block', adminController.blockUser);

// GET /api/admin/agents - Get all agents
router.get('/agents', adminController.getAgents);

// PUT /api/admin/agents/:id/approve - Approve agent
router.put('/agents/:id/approve', adminController.approveAgent);

// PUT /api/admin/agents/:id/reject - Reject agent
router.put('/agents/:id/reject', adminController.rejectAgent);

// GET /api/admin/drivers - Get all drivers
router.get('/drivers', adminController.getDrivers);

// POST /api/admin/drivers - Create new driver
router.post('/drivers', adminController.createDriver);

// GET /api/admin/bookings - Get all bookings
router.get('/bookings', adminController.getBookings);

// PUT /api/admin/bookings/:id/status - Update booking status
router.put('/bookings/:id/status', adminController.updateBookingStatus);

// GET /api/admin/payments - Get all payments
router.get('/payments', adminController.getPayments);

// POST /api/admin/wallets/:id/add-balance - Add balance to agent wallet
router.post('/wallets/:id/add-balance', adminController.addWalletBalance);

// POST /api/admin/wallets/:id/deduct-balance - Deduct from agent wallet
router.post('/wallets/:id/deduct-balance', adminController.deductWalletBalance);

module.exports = router;
