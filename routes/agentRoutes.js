const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roleMiddleware');

// All routes require authentication and agent role
router.use(auth);
router.use(authorize('agent'));

// GET /api/agent/dashboard - Get agent dashboard stats
router.get('/dashboard', agentController.getDashboard);

// GET /api/agent/profile - Get agent profile
router.get('/profile', agentController.getProfile);

// PUT /api/agent/profile - Update agent profile
router.put('/profile', agentController.updateProfile);

// GET /api/agent/wallet - Get wallet balance
router.get('/wallet', agentController.getWallet);

// POST /api/agent/wallet/recharge - Recharge wallet
router.post('/wallet/recharge', agentController.rechargeWallet);

// GET /api/agent/wallet/transactions - Get wallet transactions
router.get('/wallet/transactions', agentController.getWalletTransactions);

// POST /api/agent/bookings - Create booking
router.post('/bookings', agentController.createBooking);

// GET /api/agent/bookings - Get agent bookings
router.get('/bookings', agentController.getBookings);

// GET /api/agent/bookings/:id - Get booking details
router.get('/bookings/:id', agentController.getBookingById);

// PUT /api/agent/bookings/:id/cancel - Cancel booking
router.put('/bookings/:id/cancel', agentController.cancelBooking);

module.exports = router;
