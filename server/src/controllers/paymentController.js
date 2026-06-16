const { getDb } = require('../config/database');
const { ok, created, paginated, error } = require('../utils/apiResponse');
const { generateReceiptNumber } = require('../utils/generateReceiptNumber');
const { generateLifetimeNumber } = require('../utils/generateMemberNumber');

function canAccessPayment(req, memberId) {
  return ['admin', 'staff'].includes(req.user.role) || req.user.member_id === memberId;
}

function listPayments(req, res) {
  const db = getDb();
  const { page = 1, limit = 20, member_id, payment_type, month, year } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = '1=1';
  const params = [];

  if (member_id) { where += ' AND p.member_id = ?'; params.push(Number(member_id)); }
  if (payment_type) { where += ' AND p.payment_type = ?'; params.push(payment_type); }
  if (month) { where += ' AND p.payment_month = ?'; params.push(month); }
  if (year) { where += ` AND p.payment_month LIKE ?`; params.push(`${year}-%`); }

  const total = db.prepare(
    `SELECT COUNT(*) as cnt FROM payments p WHERE ${where}`
  ).get(...params).cnt;

  const rows = db.prepare(`
    SELECT p.*, m.full_name, m.member_number, m.photo_url
    FROM payments p
    LEFT JOIN members m ON p.member_id = m.id
    WHERE ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  return paginated(res, rows, {
    page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit))
  });
}

function getMemberPayments(req, res) {
  const memberId = Number(req.params.member_id);
  if (!canAccessPayment(req, memberId)) return error(res, 'Forbidden', 403, 'FORBIDDEN');

  const db = getDb();
  const rows = db.prepare(`
    SELECT p.*, m.full_name, m.member_number
    FROM payments p
    LEFT JOIN members m ON p.member_id = m.id
    WHERE p.member_id = ?
    ORDER BY p.created_at DESC
  `).all(memberId);

  return ok(res, rows);
}

function recordPayment(req, res) {
  const { member_id, payment_type, amount, payment_month, notes, payment_date } = req.body;

  if (!member_id || !payment_type || !amount) {
    return error(res, 'member_id, payment_type, and amount are required', 400, 'VALIDATION_ERROR');
  }

  const validTypes = ['joining', 'monthly', 'lifetime_transfer'];
  if (!validTypes.includes(payment_type)) {
    return error(res, `payment_type must be one of: ${validTypes.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  if (payment_type === 'monthly' && !payment_month) {
    return error(res, 'payment_month (YYYY-MM) is required for monthly payments', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(Number(member_id));
  if (!member) return error(res, 'Member not found', 404, 'NOT_FOUND');

  // Check duplicate monthly payment
  if (payment_type === 'monthly') {
    const dup = db.prepare(
      "SELECT id FROM payments WHERE member_id = ? AND payment_type = 'monthly' AND payment_month = ?"
    ).get(Number(member_id), payment_month);
    if (dup) return error(res, `Monthly payment for ${payment_month} already recorded`, 400, 'DUPLICATE');
  }

  const receipt_number = generateReceiptNumber();
  const today = new Date().toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO payments (receipt_number, member_id, payment_type, amount, payment_month, payment_date, notes, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    receipt_number,
    Number(member_id),
    payment_type,
    Number(amount),
    payment_month || null,
    payment_date || today,
    notes || null,
    req.user.id
  );

  // Auto-upgrade membership type if needed
  if (payment_type === 'joining' && member.membership_type === 'New') {
    const upgDate = payment_date || today;
    db.prepare(`
      UPDATE members SET membership_type = 'General', general_since = ?,
      updated_by = ?, updated_at = datetime('now') WHERE id = ?
    `).run(upgDate, req.user.id, Number(member_id));
  }

  if (payment_type === 'lifetime_transfer' && member.membership_type === 'General') {
    const upgDate = payment_date || today;
    // Issue a new lifetime member number, preserving the previous one.
    const lifetimeNumber = generateLifetimeNumber({ name: member.full_name });
    db.prepare(`
      UPDATE members SET membership_type = 'Lifetime', lifetime_since = ?,
      previous_member_number = member_number, member_number = ?,
      updated_by = ?, updated_at = datetime('now') WHERE id = ?
    `).run(upgDate, lifetimeNumber, req.user.id, Number(member_id));
  }

  const payment = db.prepare(`
    SELECT p.*, m.full_name, m.member_number
    FROM payments p LEFT JOIN members m ON p.member_id = m.id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  return created(res, payment, 'Payment recorded successfully');
}

function getReceipt(req, res) {
  const id = Number(req.params.id);
  const db = getDb();
  const payment = db.prepare(`
    SELECT p.*, m.full_name, m.member_number, m.phone, m.email,
           m.membership_type, m.city,
           u.username as recorded_by_name
    FROM payments p
    LEFT JOIN members m ON p.member_id = m.id
    LEFT JOIN users u ON p.recorded_by = u.id
    WHERE p.id = ?
  `).get(id);

  if (!payment) return error(res, 'Payment not found', 404, 'NOT_FOUND');
  if (!canAccessPayment(req, payment.member_id)) return error(res, 'Forbidden', 403, 'FORBIDDEN');

  return ok(res, payment);
}

module.exports = { listPayments, getMemberPayments, recordPayment, getReceipt };
