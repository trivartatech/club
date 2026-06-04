const router = require('express').Router();
const { listPayments, getMemberPayments, recordPayment, getReceipt } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/', authenticate, requireRole('admin', 'staff'), listPayments);
router.post('/', authenticate, requireRole('admin', 'staff'), recordPayment);
router.get('/member/:member_id', authenticate, getMemberPayments);
router.get('/receipt/:id', authenticate, getReceipt);

module.exports = router;
