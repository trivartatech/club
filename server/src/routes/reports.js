const router = require('express').Router();
const { duesOutstanding, lifetimeEligible, memberSummary } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/dues-outstanding', authenticate, requireRole('admin', 'staff'), duesOutstanding);
router.get('/lifetime-eligible', authenticate, requireRole('admin', 'staff'), lifetimeEligible);
router.get('/summary', authenticate, requireRole('admin', 'staff'), memberSummary);

module.exports = router;
