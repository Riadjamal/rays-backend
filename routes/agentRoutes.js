const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roleMiddleware');


router.use(auth);



router.use(authorize('agent'));



router.get('/dashboard', agentController.getDashboard);



router.get('/profile', agentController.getProfile);



router.put('/profile', agentController.updateProfile);



router.get('/wallet', agentController.getWallet);


router.post('/wallet/recharge', agentController.rechargeWallet);


router.get('/wallet/transactions', agentController.getWalletTransactions);


router.post('/bookings', agentController.createBooking);


router.get('/bookings', agentController.getBookings);


router.get('/bookings/:id', agentController.getBookingById);


router.put('/bookings/:id/cancel', agentController.cancelBooking);


router.put('/bookings/:id/update', agentController.updateBooking);


router.post('/refund-request', agentController.requestRefund);


router.get('/services', agentController.getServices);

module.exports = router;
