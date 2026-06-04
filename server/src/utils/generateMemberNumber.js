const { getDb } = require('../config/database');

// Maps a "scope" to the config columns that define its format.
const SCOPES = {
  general: { prefix: 'prefix', separator: 'separator', include_year: 'include_year', padding: 'padding', suffix: 'suffix', seq: 'next_seq' },
  lifetime: { prefix: 'lt_prefix', separator: 'lt_separator', include_year: 'lt_include_year', padding: 'lt_padding', suffix: 'lt_suffix', seq: 'lt_next_seq' },
};

function getConfigRow(db) {
  return db.prepare('SELECT * FROM member_number_config ORDER BY id DESC LIMIT 1').get();
}

// Pull the normalized format fields for a scope out of a raw config row.
function fieldsFor(cfg, scope) {
  const m = SCOPES[scope] || SCOPES.general;
  return {
    prefix: cfg[m.prefix],
    separator: cfg[m.separator],
    include_year: cfg[m.include_year],
    padding: cfg[m.padding],
    suffix: cfg[m.suffix],
    next_seq: cfg[m.seq],
    seqColumn: m.seq,
    id: cfg.id,
  };
}

/**
 * Build a member number string. Empty parts (prefix/suffix) are skipped and the
 * separator only joins the parts that are actually present.
 */
function buildMemberNumber(f, seq, year) {
  const parts = [];
  if (f.prefix) parts.push(f.prefix);
  if (f.include_year) parts.push(String(year));
  parts.push(String(seq).padStart(Math.max(1, f.padding || 1), '0'));
  if (f.suffix) parts.push(f.suffix);
  return parts.join(f.separator || '');
}

function numberExists(db, num) {
  return !!db.prepare('SELECT 1 FROM members WHERE member_number = ?').get(num);
}

// Find the first free sequence/number for a scope, starting at its next_seq.
function resolve(db, scope, year) {
  const cfg = getConfigRow(db);
  const f = fieldsFor(cfg, scope);
  const y = year || new Date().getFullYear();
  let seq = f.next_seq || 1;
  let num = buildMemberNumber(f, seq, y);
  while (numberExists(db, num)) { seq += 1; num = buildMemberNumber(f, seq, y); }
  return { f, seq, num };
}

/** Next auto number for a scope, WITHOUT consuming the sequence. */
function peekNumber(scope, year) {
  return resolve(getDb(), scope, year).num;
}

/** Assign the next number for a scope AND advance its stored counter. */
function generateNumber(scope, year) {
  const db = getDb();
  const { f, seq, num } = resolve(db, scope, year);
  db.prepare(`UPDATE member_number_config SET ${f.seqColumn} = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(seq + 1, f.id);
  return num;
}

// Backwards-compatible helpers (general scope) + scoped variants.
const generateMemberNumber = (year) => generateNumber('general', year);
const peekMemberNumber = (year) => peekNumber('general', year);
const generateLifetimeNumber = (year) => generateNumber('lifetime', year);
const peekLifetimeNumber = (year) => peekNumber('lifetime', year);

module.exports = {
  generateMemberNumber, peekMemberNumber,
  generateLifetimeNumber, peekLifetimeNumber,
  generateNumber, peekNumber, buildMemberNumber, fieldsFor,
};
