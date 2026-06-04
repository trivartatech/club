const { error } = require('../utils/apiResponse');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return error(res, 'Forbidden: insufficient permissions', 403, 'FORBIDDEN');
    }
    next();
  };
}

module.exports = { requireRole };
