const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// POST /api/payments - Create payment
router.post('/', paymentController.createPayment);

// GET /api/payments/my - Get user/agent payments
router.get('/my', paymentController.getMyPayments);

// GET /api/payments/:id - Get payment by ID
router.get('/:id', paymentController.getPaymentById);

// POST /api/payments/confirm - Confirm payment (webhook)
router.post('/confirm', paymentController.confirmPayment);

// POST /api/payments/:id/refund - Refund payment
router.post('/:id/refund', paymentController.refundPayment);

module.exports = router;
