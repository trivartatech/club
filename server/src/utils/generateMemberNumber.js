const { getDb } = require('../config/database');

// Maps a "scope" to the config columns that define its format.
const SCOPES = {
  general: { prefix: 'prefix', code: 'code', separator: 'separator', include_year: 'include_year', padding: 'padding', suffix: 'suffix', seq: 'next_seq', mode: 'mode' },
  lifetime: { prefix: 'lt_prefix', code: 'lt_code', separator: 'lt_separator', include_year: 'lt_include_year', padding: 'lt_padding', suffix: 'lt_suffix', seq: 'lt_next_seq', mode: 'lt_mode' },
};

function getConfigRow(db) {
  return db.prepare('SELECT * FROM member_number_config ORDER BY id DESC LIMIT 1').get();
}

// Pull the normalized format fields for a scope out of a raw config row.
function fieldsFor(cfg, scope) {
  const m = SCOPES[scope] || SCOPES.general;
  return {
    prefix: cfg[m.prefix],
    code: cfg[m.code],
    separator: cfg[m.separator],
    include_year: cfg[m.include_year],
    padding: cfg[m.padding],
    suffix: cfg[m.suffix],
    next_seq: cfg[m.seq],
    mode: cfg[m.mode] || 'yearly',
    seqColumn: m.seq,
    id: cfg.id,
  };
}

function numberExists(db, num) {
  return !!db.prepare('SELECT 1 FROM members WHERE member_number = ?').get(num);
}

// Normalize an options arg that may be a year (legacy) or an object.
function opts(o) {
  if (o == null) return {};
  if (typeof o === 'object') return o;
  return { year: o };
}

// ---------- yearly mode: prefix [- year] - seq [- suffix] ----------
function buildYearly(f, seq, year) {
  const parts = [];
  if (f.prefix) parts.push(f.prefix);
  if (f.include_year) parts.push(String(year));
  parts.push(String(seq).padStart(Math.max(1, f.padding || 1), '0'));
  if (f.suffix) parts.push(f.suffix);
  return parts.join(f.separator || '');
}

// ---------- alpha mode: prefix [- code] - INITIAL - perLetterSeq ----------
function nameInitial(name) {
  const m = String(name || '').toUpperCase().match(/[A-Z]/);
  return m ? m[0] : 'X';
}

function alphaBase(f, initial) {
  const parts = [];
  if (f.prefix) parts.push(f.prefix);
  if (f.code) parts.push(f.code);
  parts.push(initial);
  return parts.join(f.separator || '') + (f.separator || '');
}

function buildAlpha(f, initial, seq) {
  const base = alphaBase(f, initial) + String(seq).padStart(Math.max(1, f.padding || 1), '0');
  return f.suffix ? base + (f.separator || '') + f.suffix : base;
}

// Highest existing sequence for this prefix/code/initial, so numbering continues
// per letter (e.g. LM-CIC-S-60 exists -> next is 61).
function nextAlphaSeq(db, f, initial) {
  const base = alphaBase(f, initial);
  const rows = db.prepare('SELECT member_number FROM members WHERE member_number LIKE ?').all(`${base}%`);
  let max = 0;
  for (const r of rows) {
    const n = parseInt(String(r.member_number).slice(base.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

// Next sequence for every letter A–Z (1 = no members yet for that letter).
function alphaSequences(db, f) {
  const out = {};
  for (let i = 0; i < 26; i++) {
    const L = String.fromCharCode(65 + i);
    out[L] = nextAlphaSeq(db, f, L);
  }
  return out;
}

function resolveAlpha(db, f, name) {
  const initial = nameInitial(name);
  let seq = nextAlphaSeq(db, f, initial);
  let num = buildAlpha(f, initial, seq);
  while (numberExists(db, num)) { seq += 1; num = buildAlpha(f, initial, seq); }
  return num;
}

function resolveYearly(db, f, year) {
  const y = year || new Date().getFullYear();
  let seq = f.next_seq || 1;
  let num = buildYearly(f, seq, y);
  while (numberExists(db, num)) { seq += 1; num = buildYearly(f, seq, y); }
  return { seq, num };
}

/** Next auto number for a scope, WITHOUT consuming the sequence. */
function peekNumber(scope, o) {
  const { name, year } = opts(o);
  const db = getDb();
  const f = fieldsFor(getConfigRow(db), scope);
  if (f.mode === 'alpha') return resolveAlpha(db, f, name || 'A');
  return resolveYearly(db, f, year).num;
}

/** Assign the next number for a scope (advances the counter only in yearly mode). */
function generateNumber(scope, o) {
  const { name, year } = opts(o);
  const db = getDb();
  const f = fieldsFor(getConfigRow(db), scope);
  if (f.mode === 'alpha') return resolveAlpha(db, f, name);
  const { seq, num } = resolveYearly(db, f, year);
  db.prepare(`UPDATE member_number_config SET ${f.seqColumn} = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(seq + 1, f.id);
  return num;
}

// Scoped helpers — accept { name, year } (or a bare year for legacy callers).
const generateMemberNumber = (o) => generateNumber('general', o);
const peekMemberNumber = (o) => peekNumber('general', o);
const generateLifetimeNumber = (o) => generateNumber('lifetime', o);
const peekLifetimeNumber = (o) => peekNumber('lifetime', o);

module.exports = {
  generateMemberNumber, peekMemberNumber,
  generateLifetimeNumber, peekLifetimeNumber,
  generateNumber, peekNumber, fieldsFor, nameInitial, alphaSequences,
};
