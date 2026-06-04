const router = require('express').Router();
const { getConfig, updateConfig } = require('../controllers/memberNumberConfigController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/', authenticate, requireRole('admin', 'staff'), getConfig);
router.put('/', authenticate, requireRole('admin'), updateConfig);

module.exports = router;
