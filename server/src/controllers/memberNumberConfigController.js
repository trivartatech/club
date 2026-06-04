const { getDb } = require('../config/database');
const { ok, error } = require('../utils/apiResponse');
const { peekMemberNumber, peekLifetimeNumber } = require('../utils/generateMemberNumber');

function withPreviews(config) {
  return { ...config, preview: peekMemberNumber(), lifetime_preview: peekLifetimeNumber() };
}

function getConfig(req, res) {
  const db = getDb();
  const config = db.prepare('SELECT * FROM member_number_config ORDER BY id DESC LIMIT 1').get();
  return ok(res, withPreviews(config));
}

function validateFormat(label, { prefix, suffix, separator, padding, next_seq }) {
  const pad = Number(padding);
  if (!Number.isInteger(pad) || pad < 1 || pad > 12) {
    return `${label}: sequence digits must be a whole number between 1 and 12`;
  }
  const seq = Number(next_seq);
  if (!Number.isInteger(seq) || seq < 1) {
    return `${label}: next sequence must be a whole number of at least 1`;
  }
  if ((prefix || '').length > 16 || (suffix || '').length > 16 || (separator || '').length > 4) {
    return `${label}: prefix/suffix must be ≤ 16 chars and separator ≤ 4 chars`;
  }
  return null;
}

function updateConfig(req, res) {
  const b = req.body;
  const general = {
    prefix: b.prefix, separator: b.separator, include_year: b.include_year,
    padding: b.padding, suffix: b.suffix, next_seq: b.next_seq,
  };
  const lifetime = {
    prefix: b.lt_prefix, separator: b.lt_separator, include_year: b.lt_include_year,
    padding: b.lt_padding, suffix: b.lt_suffix, next_seq: b.lt_next_seq,
  };

  const err = validateFormat('Standard format', general) || validateFormat('Lifetime format', lifetime);
  if (err) return error(res, err, 400, 'VALIDATION_ERROR');

  const db = getDb();
  const existing = db.prepare('SELECT id FROM member_number_config ORDER BY id DESC LIMIT 1').get();

  const params = [
    general.prefix || '', general.separator || '', general.include_year ? 1 : 0, Number(general.padding), general.suffix || '', Number(general.next_seq),
    lifetime.prefix || '', lifetime.separator || '', lifetime.include_year ? 1 : 0, Number(lifetime.padding), lifetime.suffix || '', Number(lifetime.next_seq),
  ];

  if (existing) {
    db.prepare(`
      UPDATE member_number_config SET
        prefix = ?, separator = ?, include_year = ?, padding = ?, suffix = ?, next_seq = ?,
        lt_prefix = ?, lt_separator = ?, lt_include_year = ?, lt_padding = ?, lt_suffix = ?, lt_next_seq = ?,
        updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(...params, req.user.id, existing.id);
  } else {
    db.prepare(`
      INSERT INTO member_number_config
        (prefix, separator, include_year, padding, suffix, next_seq,
         lt_prefix, lt_separator, lt_include_year, lt_padding, lt_suffix, lt_next_seq, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...params, req.user.id);
  }

  const updated = db.prepare('SELECT * FROM member_number_config ORDER BY id DESC LIMIT 1').get();
  return ok(res, withPreviews(updated), 'Member number format updated');
}

module.exports = { getConfig, updateConfig };
