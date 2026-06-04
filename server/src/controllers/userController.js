const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { ok, created, paginated, error } = require('../utils/apiResponse');

function listUsers(req, res) {
  const db = getDb();
  const { page = 1, limit = 20, role } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = '1=1';
  const params = [];
  if (role) { where += ' AND role = ?'; params.push(role); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE ${where}`).get(...params).cnt;
  const rows = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.member_id, u.is_active,
           u.force_password_change, u.created_at, m.full_name as member_name
    FROM users u
    LEFT JOIN members m ON u.member_id = m.id
    WHERE ${where}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  return paginated(res, rows, {
    page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit))
  });
}

function getUser(req, res) {
  const db = getDb();
  const user = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.member_id, u.is_active,
           u.force_password_change, u.created_at, m.full_name as member_name
    FROM users u LEFT JOIN members m ON u.member_id = m.id
    WHERE u.id = ?
  `).get(Number(req.params.id));
  if (!user) return error(res, 'User not found', 404, 'NOT_FOUND');
  return ok(res, user);
}

function createUser(req, res) {
  const { username, email, password, role, member_id } = req.body;
  if (!username || !password || !role) {
    return error(res, 'username, password, and role are required', 400, 'VALIDATION_ERROR');
  }
  if (!['admin', 'staff', 'member'].includes(role)) {
    return error(res, 'role must be admin, staff, or member', 400, 'VALIDATION_ERROR');
  }
  if (password.length < 6) {
    return error(res, 'Password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) return error(res, 'Username already taken', 400, 'DUPLICATE');

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, email, password, role, member_id, force_password_change)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(username.trim(), email || null, hash, role, member_id || null);

  const user = db.prepare('SELECT id, username, email, role, member_id, is_active, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
  return created(res, user, 'User account created');
}

function updateUser(req, res) {
  const id = Number(req.params.id);
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) return error(res, 'User not found', 404, 'NOT_FOUND');

  // Prevent demoting yourself
  if (id === req.user.id && req.body.role && req.body.role !== existing.role) {
    return error(res, 'Cannot change your own role', 400, 'FORBIDDEN');
  }

  const { email, role, member_id, is_active } = req.body;
  db.prepare(`
    UPDATE users SET
      email = ?, role = ?, member_id = ?, is_active = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    email ?? existing.email,
    role ?? existing.role,
    member_id ?? existing.member_id,
    is_active != null ? Number(is_active) : existing.is_active,
    id
  );

  const updated = db.prepare('SELECT id, username, email, role, member_id, is_active, created_at FROM users WHERE id = ?').get(id);
  return ok(res, updated, 'User updated');
}

function deactivateUser(req, res) {
  const id = Number(req.params.id);
  if (id === req.user.id) return error(res, 'Cannot deactivate your own account', 400, 'FORBIDDEN');
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) return error(res, 'User not found', 404, 'NOT_FOUND');
  db.prepare("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  return ok(res, null, 'User account deactivated');
}

function resetPassword(req, res) {
  const id = Number(req.params.id);
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return error(res, 'new_password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) return error(res, 'User not found', 404, 'NOT_FOUND');
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare("UPDATE users SET password = ?, force_password_change = 1, updated_at = datetime('now') WHERE id = ?")
    .run(hash, id);
  return ok(res, null, 'Password reset successfully');
}

module.exports = { listUsers, getUser, createUser, updateUser, deactivateUser, resetPassword };
