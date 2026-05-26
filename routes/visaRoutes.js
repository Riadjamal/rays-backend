const express = require('express');
const router = express.Router();
const visaController = require('../controllers/visaController');
const auth = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/roleMiddleware');


router.use(auth);
router.get('/pending', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.getPendingVisas);
router.get('/', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.getAllVisas);
router.post('/apply', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.applyVisa);
router.put('/:id/approve', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.approveVisa);


router.put('/:id/reject', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.rejectVisa);


router.get('/stats', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.getVisaStats);


router.put('/:id/status', authorize('admin', 'sales', 'operations', 'finance'), checkPermission('visa'), visaController.updateVisaStatus);


router.get('/booking/:bookingId', visaController.getVisaByBooking);


router.get('/my-visas', visaController.getMyVisas);


router.get('/agent', authorize('agent'), visaController.getAgentVisas);


router.put('/:id/agent-update', authorize('agent'), visaController.agentUpdateVisa);

module.exports = router;
