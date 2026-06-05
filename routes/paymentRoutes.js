const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/checkout/booking', paymentController.createBookingCheckoutSession);
router.post('/checkout/booking/verify', paymentController.verifyBookingCheckoutSession);
router.post('/checkout/agent-wallet', paymentController.createAgentWalletCheckoutSession);
router.post('/checkout/agent-wallet/verify', paymentController.verifyAgentWalletCheckoutSession);

router.post('/', paymentController.createPayment);
router.get('/my', paymentController.getMyPayments);
router.get('/:id', paymentController.getPaymentById);
router.post('/confirm', paymentController.confirmPayment);
router.post('/:id/refund', paymentController.refundPayment);

module.exports = router;
