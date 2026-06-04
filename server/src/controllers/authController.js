const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { ok, error } = require('../utils/apiResponse');

function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return error(res, 'Username and password are required', 400, 'VALIDATION_ERROR');
  }
  const db = getDb();
  const user = db.prepare(
    'SELECT * FROM users WHERE username = ? AND is_active = 1'
  ).get(username.trim());

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return error(res, 'Invalid username or password', 401, 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, member_id: user.member_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  return ok(res, {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      member_id: user.member_id,
      force_password_change: user.force_password_change === 1,
    },
  }, 'Login successful');
}

function me(req, res) {
  const db = getDb();
  const user = req.user;
  let member = null;
  if (user.member_id) {
    member = db.prepare('SELECT * FROM members WHERE id = ?').get(user.member_id);
  }
  return ok(res, {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      member_id: user.member_id,
      force_password_change: user.force_password_change === 1,
    },
    member,
  });
}

function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return error(res, 'current_password and new_password are required', 400, 'VALIDATION_ERROR');
  }
  if (new_password.length < 6) {
    return error(res, 'New password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return error(res, 'Current password is incorrect', 400, 'INVALID_PASSWORD');
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ?, force_password_change = 0, updated_at = datetime(\'now\') WHERE id = ?')
    .run(hash, req.user.id);
  return ok(res, null, 'Password changed successfully');
}

module.exports = { login, me, changePassword };
