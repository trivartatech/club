const router = require('express').Router();
const { listUsers, getUser, createUser, updateUser, deactivateUser, resetPassword } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/', authenticate, requireRole('admin'), listUsers);
router.post('/', authenticate, requireRole('admin'), createUser);
router.get('/:id', authenticate, requireRole('admin'), getUser);
router.put('/:id', authenticate, requireRole('admin'), updateUser);
router.delete('/:id', authenticate, requireRole('admin'), deactivateUser);
router.post('/:id/reset-password', authenticate, requireRole('admin'), resetPassword);

module.exports = router;
