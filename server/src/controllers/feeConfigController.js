const { getDb } = require('../config/database');
const { ok, error } = require('../utils/apiResponse');

function getFeeConfig(req, res) {
  const db = getDb();
  const config = db.prepare('SELECT * FROM fee_config ORDER BY id DESC LIMIT 1').get();
  return ok(res, config);
}

function updateFeeConfig(req, res) {
  const { joining_fee, monthly_due_general, monthly_due_lifetime, lifetime_transfer_fee } = req.body;
  if (
    joining_fee == null || monthly_due_general == null ||
    monthly_due_lifetime == null || lifetime_transfer_fee == null
  ) {
    return error(res, 'All fee fields are required', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM fee_config ORDER BY id DESC LIMIT 1').get();

  if (existing) {
    db.prepare(`
      UPDATE fee_config SET
        joining_fee = ?, monthly_due_general = ?,
        monthly_due_lifetime = ?, lifetime_transfer_fee = ?,
        updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      Number(joining_fee), Number(monthly_due_general),
      Number(monthly_due_lifetime), Number(lifetime_transfer_fee),
      req.user.id, existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO fee_config (joining_fee, monthly_due_general, monthly_due_lifetime, lifetime_transfer_fee, updated_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      Number(joining_fee), Number(monthly_due_general),
      Number(monthly_due_lifetime), Number(lifetime_transfer_fee),
      req.user.id
    );
  }

  const updated = db.prepare('SELECT * FROM fee_config ORDER BY id DESC LIMIT 1').get();
  return ok(res, updated, 'Fee configuration updated');
}

module.exports = { getFeeConfig, updateFeeConfig };
