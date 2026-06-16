const { getDb } = require('../config/database');
const { ok, error } = require('../utils/apiResponse');
const { peekMemberNumber, peekLifetimeNumber, fieldsFor, alphaSequences } = require('../utils/generateMemberNumber');

function withPreviews(config) {
  const db = getDb();
  const general = fieldsFor(config, 'general');
  const lifetime = fieldsFor(config, 'lifetime');
  return {
    ...config,
    preview: peekMemberNumber(),
    lifetime_preview: peekLifetimeNumber(),
    alpha_sequences: general.mode === 'alpha' ? alphaSequences(db, general) : null,
    lt_alpha_sequences: lifetime.mode === 'alpha' ? alphaSequences(db, lifetime) : null,
  };
}

function getConfig(req, res) {
  const db = getDb();
  const config = db.prepare('SELECT * FROM member_number_config ORDER BY id DESC LIMIT 1').get();
  return ok(res, withPreviews(config));
}

function validateFormat(label, f) {
  const pad = Number(f.padding);
  if (!Number.isInteger(pad) || pad < 1 || pad > 12) {
    return `${label}: sequence digits must be a whole number between 1 and 12`;
  }
  if (f.mode !== 'alpha') {
    const seq = Number(f.next_seq);
    if (!Number.isInteger(seq) || seq < 1) {
      return `${label}: next sequence must be a whole number of at least 1`;
    }
  }
  if ((f.prefix || '').length > 16 || (f.suffix || '').length > 16 || (f.code || '').length > 16 || (f.separator || '').length > 4) {
    return `${label}: prefix/suffix/code must be ≤ 16 chars and separator ≤ 4 chars`;
  }
  return null;
}

const norm = (b, p) => ({
  prefix: b[`${p}prefix`], code: b[`${p}code`], separator: b[`${p}separator`],
  include_year: b[`${p}include_year`], padding: b[`${p}padding`], suffix: b[`${p}suffix`],
  next_seq: b[`${p}next_seq`], mode: b[`${p}mode`] === 'alpha' ? 'alpha' : 'yearly',
});

function updateConfig(req, res) {
  const general = norm(req.body, '');
  const lifetime = norm(req.body, 'lt_');

  const err = validateFormat('Standard format', general) || validateFormat('Lifetime format', lifetime);
  if (err) return error(res, err, 400, 'VALIDATION_ERROR');

  const db = getDb();
  const existing = db.prepare('SELECT id FROM member_number_config ORDER BY id DESC LIMIT 1').get();

  const cols = (f) => [
    f.prefix || '', f.separator || '', f.include_year ? 1 : 0, Number(f.padding),
    f.suffix || '', Number(f.next_seq) || 1, f.mode, f.code || '',
  ];
  const params = [...cols(general), ...cols(lifetime)];

  if (existing) {
    db.prepare(`
      UPDATE member_number_config SET
        prefix = ?, separator = ?, include_year = ?, padding = ?, suffix = ?, next_seq = ?, mode = ?, code = ?,
        lt_prefix = ?, lt_separator = ?, lt_include_year = ?, lt_padding = ?, lt_suffix = ?, lt_next_seq = ?, lt_mode = ?, lt_code = ?,
        updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(...params, req.user.id, existing.id);
  } else {
    db.prepare(`
      INSERT INTO member_number_config
        (prefix, separator, include_year, padding, suffix, next_seq, mode, code,
         lt_prefix, lt_separator, lt_include_year, lt_padding, lt_suffix, lt_next_seq, lt_mode, lt_code, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...params, req.user.id);
  }

  const updated = db.prepare('SELECT * FROM member_number_config ORDER BY id DESC LIMIT 1').get();
  return ok(res, withPreviews(updated), 'Member number format updated');
}

module.exports = { getConfig, updateConfig };
