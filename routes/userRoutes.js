const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET /api/user/profile - Get user profile
router.get('/profile', userController.getProfile);

// PUT /api/user/profile - Update user profile
router.put('/profile', userController.updateProfile);

// GET /api/user/bookings - Get user bookings
router.get('/bookings', userController.getBookings);

// GET /api/user/dashboard - Get user dashboard data
router.get('/dashboard', userController.getDashboard);

// GET /api/user/wallet - Get user wallet data
router.get('/wallet', userController.getWallet);

// POST /api/user/recharge - Recharge wallet
router.post('/recharge', userController.rechargeWallet);

module.exports = router;
