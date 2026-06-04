const router = require('express').Router();
const {
  listMembers, getMember, createMember, updateMember, deleteMember,
  upgradeToGeneral, upgradeToLifetime, uploadPhoto, nextMemberNumber, bulkImport, checkPhone,
} = require('../controllers/memberController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { upload } = require('../middleware/upload');

router.get('/', authenticate, requireRole('admin', 'staff'), listMembers);
router.get('/next-number', authenticate, requireRole('admin', 'staff'), nextMemberNumber);
router.get('/check-phone', authenticate, requireRole('admin', 'staff'), checkPhone);
router.post('/bulk', authenticate, requireRole('admin'), bulkImport);
router.post('/', authenticate, requireRole('admin', 'staff'), createMember);
router.get('/:id', authenticate, getMember);
router.put('/:id', authenticate, updateMember);
router.delete('/:id', authenticate, requireRole('admin'), deleteMember);
router.post('/:id/upgrade-general', authenticate, requireRole('admin'), upgradeToGeneral);
router.post('/:id/upgrade-lifetime', authenticate, requireRole('admin'), upgradeToLifetime);
router.post('/:id/photo', authenticate, upload.single('photo'), uploadPhoto);

module.exports = router;
