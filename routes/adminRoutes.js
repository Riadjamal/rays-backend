const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/roleMiddleware');

// All routes require authentication and admin role (or staff roles)
router.use(auth);
router.use(authorize('admin', 'sales', 'operations', 'finance'));

// GET /api/admin/dashboard - Dashboard stats
router.get('/dashboard', checkPermission('dashboard'), adminController.getDashboard);

// GET /api/admin/users - Get all users
router.get('/users', checkPermission('users'), adminController.getUsers);

// PUT /api/admin/users/:id/block - Block/Unblock user
router.put('/users/:id/block', checkPermission('users'), adminController.blockUser);

// POST /api/admin/users - Create new internal user
router.post('/users', checkPermission('users'), adminController.createUser);

// PUT /api/admin/users/:id/permissions - Update user permissions
router.put('/users/:id/permissions', checkPermission('users'), adminController.updateUserPermissions);

// GET /api/admin/agents - Get all agents
router.get('/agents', checkPermission('agents'), adminController.getAgents);

// PUT /api/admin/agents/:id/approve - Approve agent
router.put('/agents/:id/approve', checkPermission('agents'), adminController.approveAgent);

// POST /api/admin/agents - Create new agent
router.post('/agents', checkPermission('agents'), adminController.createAgent);

// PUT /api/admin/agents/:id/reject - Reject agent
router.put('/agents/:id/reject', checkPermission('agents'), adminController.rejectAgent);

// DELETE /api/admin/agents/:id - Delete agent
router.delete('/agents/:id', checkPermission('agents'), adminController.deleteAgent);

// GET /api/admin/drivers - Get all drivers
router.get('/drivers', checkPermission('drivers'), adminController.getDrivers);

// POST /api/admin/drivers - Create new driver
router.post('/drivers', checkPermission('drivers'), adminController.createDriver);

// GET /api/admin/bookings - Get all bookings
router.get('/bookings', checkPermission('bookings'), adminController.getBookings);

// PUT /api/admin/bookings/:id/status - Update booking status
router.put('/bookings/:id/status', checkPermission('bookings'), adminController.updateBookingStatus);

// GET /api/admin/payments - Get all payments
router.get('/payments', checkPermission('payments'), adminController.getPayments);

// POST /api/admin/wallets/:id/add-balance - Add balance to agent wallet
router.post('/wallets/:id/add-balance', checkPermission('agents'), adminController.addWalletBalance);

// POST /api/admin/wallets/:id/deduct-balance - Deduct from agent wallet
router.post('/wallets/:id/deduct-balance', checkPermission('agents'), adminController.deductWalletBalance);

// GET /api/admin/refunds - Get all refund requests
router.get('/refunds', checkPermission('refunds'), adminController.getRefunds);

// PUT /api/admin/refunds/:id/process - Process refund (approve/reject)
router.put('/refunds/:id/process', checkPermission('refunds'), adminController.processRefund);

// Settings
router.get('/settings', authorize('admin'), adminController.getSettings);
router.put('/settings', authorize('admin'), adminController.updateSetting);

// Services
router.get('/services', checkPermission('dashboard'), adminController.getServices);
router.post('/services', authorize('admin'), adminController.createService);
router.put('/services/:id', authorize('admin'), adminController.updateService);
router.delete('/services/:id', authorize('admin'), adminController.deleteService);

module.exports = router;
