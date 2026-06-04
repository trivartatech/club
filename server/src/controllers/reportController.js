const { getDb } = require('../config/database');
const { ok } = require('../utils/apiResponse');

function duesOutstanding(req, res) {
  const db = getDb();
  const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

  const rows = db.prepare(`
    SELECT m.id, m.member_number, m.full_name, m.phone, m.email,
           m.membership_type, m.status
    FROM members m
    WHERE m.membership_type IN ('General', 'Lifetime')
      AND m.status = 'Active'
      AND NOT EXISTS (
        SELECT 1 FROM payments p
        WHERE p.member_id = m.id
          AND p.payment_type = 'monthly'
          AND p.payment_month = ?
      )
    ORDER BY m.full_name
  `).all(month);

  return ok(res, { month, members: rows, count: rows.length });
}

function lifetimeEligible(req, res) {
  const db = getDb();

  const rows = db.prepare(`
    SELECT m.id, m.member_number, m.full_name, m.phone, m.email,
           m.general_since, m.status,
           ROUND(julianday('now') - julianday(m.general_since)) as days_as_general
    FROM members m
    WHERE m.membership_type = 'General'
      AND m.status = 'Active'
      AND m.general_since IS NOT NULL
      AND julianday('now') - julianday(m.general_since) >= 365
    ORDER BY m.general_since ASC
  `).all();

  return ok(res, { members: rows, count: rows.length });
}

function memberSummary(req, res) {
  const db = getDb();

  const counts = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive,
      SUM(CASE WHEN status = 'Suspended' THEN 1 ELSE 0 END) as suspended,
      SUM(CASE WHEN membership_type = 'New' THEN 1 ELSE 0 END) as type_new,
      SUM(CASE WHEN membership_type = 'General' THEN 1 ELSE 0 END) as type_general,
      SUM(CASE WHEN membership_type = 'Lifetime' THEN 1 ELSE 0 END) as type_lifetime
    FROM members
  `).get();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyCollected = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE payment_month = ? AND payment_type = 'monthly'
  `).get(currentMonth);

  const outstandingCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM members m
    WHERE m.membership_type IN ('General', 'Lifetime')
      AND m.status = 'Active'
      AND NOT EXISTS (
        SELECT 1 FROM payments p
        WHERE p.member_id = m.id AND p.payment_type = 'monthly' AND p.payment_month = ?
      )
  `).get(currentMonth);

  const eligibleCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM members
    WHERE membership_type = 'General' AND status = 'Active'
      AND general_since IS NOT NULL
      AND julianday('now') - julianday(general_since) >= 365
  `).get();

  const recentMembers = db.prepare(`
    SELECT id, member_number, full_name, membership_type, join_date, status, photo_url
    FROM members ORDER BY created_at DESC LIMIT 10
  `).all();

  return ok(res, {
    counts,
    monthly_collected: monthlyCollected.total,
    outstanding_dues_count: outstandingCount.cnt,
    lifetime_eligible_count: eligibleCount.cnt,
    recent_members: recentMembers,
    current_month: currentMonth,
  });
}

module.exports = { duesOutstanding, lifetimeEligible, memberSummary };
