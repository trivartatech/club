const { getDb } = require('../config/database');

function generateReceiptNumber(year) {
  const db = getDb();
  const y = year || new Date().getFullYear();
  // Derive the next sequence from the highest existing number for the year
  // rather than COUNT(*), so a deleted row can never cause a collision.
  const row = db.prepare(
    `SELECT MAX(CAST(substr(receipt_number, length('RCP-${y}-') + 1) AS INTEGER)) AS max_seq
     FROM payments WHERE receipt_number LIKE ?`
  ).get(`RCP-${y}-%`);
  const next = (row.max_seq || 0) + 1;
  return `RCP-${y}-${String(next).padStart(4, '0')}`;
}

module.exports = { generateReceiptNumber };
