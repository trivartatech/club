const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { error } = require('../utils/apiResponse');

function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return error(res, 'Authentication required', 401, 'UNAUTHORIZED');
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();
    const user = db.prepare(
      'SELECT id, username, role, member_id, is_active, force_password_change FROM users WHERE id = ?'
    ).get(payload.sub);
    if (!user || !user.is_active) {
      return error(res, 'Account inactive or not found', 401, 'UNAUTHORIZED');
    }
    req.user = user;

    // If a password change is required, block everything except viewing
    // your own account and performing the password change itself.
    if (user.force_password_change) {
      const allowed = [
        { method: 'GET', path: '/api/auth/me' },
        { method: 'POST', path: '/api/auth/change-password' },
      ];
      const isAllowed = allowed.some(
        (r) => r.method === req.method && req.originalUrl.split('?')[0] === r.path
      );
      if (!isAllowed) {
        return error(
          res,
          'Password change required before continuing',
          403,
          'PASSWORD_CHANGE_REQUIRED'
        );
      }
    }

    next();
  } catch (err) {
    return error(res, 'Invalid or expired token', 401, 'UNAUTHORIZED');
  }
}

module.exports = { authenticate };
