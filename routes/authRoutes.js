const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/register/user - User registration
router.post('/register/user', authController.registerUser);

// POST /api/auth/register/agent - Agent registration
router.post('/register/agent', authController.registerAgent);

// POST /api/auth/login - Login
router.post('/login', authController.login);

// POST /api/auth/forgot-password - Forgot password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password - Reset password
router.post('/reset-password', authController.resetPassword);

// POST /api/auth/setup-password - Setup password for invited agents
router.post('/setup-password', authController.setupPassword);

// GET /api/auth/me - Get current user profile
router.get('/me', auth, authController.getMe);

module.exports = router;
