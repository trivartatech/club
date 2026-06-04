const router = require('express').Router();
const { getFeeConfig, updateFeeConfig } = require('../controllers/feeConfigController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/', authenticate, requireRole('admin', 'staff'), getFeeConfig);
router.put('/', authenticate, requireRole('admin'), updateFeeConfig);

module.exports = router;
