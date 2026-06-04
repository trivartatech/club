const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { ok, created, paginated, error } = require('../utils/apiResponse');
const { generateMemberNumber, peekMemberNumber, generateLifetimeNumber } = require('../utils/generateMemberNumber');

// Default member login password ("password"), hashed once and reused.
const DEFAULT_MEMBER_PASSWORD_HASH = bcrypt.hashSync('password', 10);

// Auto-create a member login: username = phone number (falling back to the
// member number if the phone is missing or already taken), password = "password".
// Skips silently if no unique username is available. Returns true if created.
function ensureMemberAccount(db, member) {
  if (!member) return false;
  const taken = (u) => !!db.prepare('SELECT id FROM users WHERE username = ?').get(u);
  const phone = (member.phone || '').trim();
  let username = phone && !taken(phone) ? phone : member.member_number;
  if (!username || taken(username)) return false;
  db.prepare(`
    INSERT INTO users (username, password, role, member_id, force_password_change)
    VALUES (?, ?, 'member', ?, 1)
  `).run(username, DEFAULT_MEMBER_PASSWORD_HASH, member.id);
  return true;
}

function canAccess(req, memberId) {
  return ['admin', 'staff'].includes(req.user.role) || req.user.member_id === memberId;
}

function auditLog(db, userId, action, targetId, details) {
  db.prepare(
    'INSERT INTO audit_log (user_id, action, target_type, target_id, details) VALUES (?, ?, \'member\', ?, ?)'
  ).run(userId, action, targetId, JSON.stringify(details));
}

function nextMemberNumber(_req, res) {
  return ok(res, { member_number: peekMemberNumber() });
}

// SQL expression that strips common separators from a stored phone for comparison.
const PHONE_NORM_SQL = "REPLACE(REPLACE(REPLACE(IFNULL(phone,''),'-',''),' ',''),'+','')";
const normalizePhone = (p) => String(p || '').replace(/\D/g, '');

// Returns the member already using `phone` (excluding `excludeId`), or null.
function findPhoneOwner(db, phone, excludeId = 0) {
  const norm = normalizePhone(phone);
  if (!norm) return null;
  return db.prepare(
    `SELECT id, full_name, member_number FROM members WHERE ${PHONE_NORM_SQL} = ? AND id != ? LIMIT 1`
  ).get(norm, excludeId) || null;
}

function checkPhone(req, res) {
  const owner = findPhoneOwner(getDb(), req.query.phone, Number(req.query.exclude) || 0);
  return ok(res, { available: !owner, member: owner });
}

const GENDERS = ['Male', 'Female', 'Other'];
const STATUSES = ['Active', 'Inactive', 'Suspended'];
const TYPES = ['New', 'General', 'Lifetime'];

function bulkImport(req, res) {
  const rows = Array.isArray(req.body?.members) ? req.body.members : null;
  if (!rows || rows.length === 0) {
    return error(res, 'Provide a non-empty "members" list', 400, 'VALIDATION_ERROR');
  }
  if (rows.length > 2000) {
    return error(res, 'Too many rows in one import (max 2000)', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  const insertStmt = db.prepare(`
    INSERT INTO members (
      member_number, full_name, gender, date_of_birth,
      house_no, street, city, pin_code, phone, phone_secondary, email,
      membership_type, join_date, general_since, lifetime_since, status,
      emergency_contact_name, emergency_contact_phone, notes,
      created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const results = [];
  let created = 0;
  const clean = (v) => (v == null ? '' : String(v).trim());

  rows.forEach((row, i) => {
    const rowNum = i + 1;
    try {
      const full_name = clean(row.full_name);
      if (!full_name) throw new Error('full_name is required');

      const raw = clean(row.membership_type) || 'General';
      const type = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      if (!TYPES.includes(type)) throw new Error(`invalid membership_type "${row.membership_type}"`);

      const status = STATUSES.includes(clean(row.status)) ? clean(row.status) : 'Active';
      const gender = GENDERS.includes(clean(row.gender)) ? clean(row.gender) : null;

      let member_number = clean(row.member_number);
      if (member_number) {
        const clash = db.prepare('SELECT id FROM members WHERE member_number = ?').get(member_number);
        if (clash) throw new Error(`member_number "${member_number}" already exists`);
      } else {
        member_number = type === 'Lifetime' ? generateLifetimeNumber() : generateMemberNumber();
      }

      const join_date = clean(row.join_date) || new Date().toISOString().split('T')[0];
      let general_since = clean(row.general_since) || null;
      let lifetime_since = clean(row.lifetime_since) || null;
      if (type === 'General' && !general_since) general_since = join_date;
      if (type === 'Lifetime') {
        if (!general_since) general_since = join_date;
        if (!lifetime_since) lifetime_since = join_date;
      }

      const result = insertStmt.run(
        member_number, full_name, gender, clean(row.date_of_birth) || null,
        clean(row.house_no) || null, clean(row.street) || null, clean(row.city) || 'Chitradurga', clean(row.pin_code) || '577501',
        clean(row.phone) || null, clean(row.phone_secondary) || null, clean(row.email) || null,
        type, join_date, general_since, lifetime_since, status,
        clean(row.emergency_contact_name) || null, clean(row.emergency_contact_phone) || null, clean(row.notes) || null,
        req.user.id, req.user.id
      );
      ensureMemberAccount(db, { id: result.lastInsertRowid, member_number, phone: clean(row.phone) });
      auditLog(db, req.user.id, 'IMPORT_MEMBER', result.lastInsertRowid, { member_number, type });
      created += 1;
      results.push({ row: rowNum, status: 'created', member_number, full_name });
    } catch (e) {
      results.push({ row: rowNum, status: 'error', full_name: clean(row.full_name), message: e.message });
    }
  });

  return ok(res, { total: rows.length, created, failed: rows.length - created, results },
    `Imported ${created} of ${rows.length} members`);
}

function listMembers(req, res) {
  const db = getDb();
  const {
    page = 1, limit = 20, search = '', status = '', membership_type = '',
    sort = 'full_name', order = 'asc'
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  const allowed_sorts = ['full_name', 'member_number', 'join_date', 'membership_type', 'status', 'created_at'];
  const sortCol = allowed_sorts.includes(sort) ? sort : 'full_name';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  let where = '1=1';
  const params = [];

  if (search) {
    where += ' AND (full_name LIKE ? OR member_number LIKE ? OR phone LIKE ? OR phone_secondary LIKE ? OR email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (membership_type) { where += ' AND membership_type = ?'; params.push(membership_type); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM members WHERE ${where}`).get(...params).cnt;
  const rows = db.prepare(
    `SELECT * FROM members WHERE ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`
  ).all(...params, Number(limit), offset);

  return paginated(res, rows, {
    page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit))
  });
}

function getMember(req, res) {
  const id = Number(req.params.id);
  if (!canAccess(req, id)) return error(res, 'Forbidden', 403, 'FORBIDDEN');
  const db = getDb();
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!member) return error(res, 'Member not found', 404, 'NOT_FOUND');
  // Surface the member's login account (username + whether the default password is still in effect).
  const account = db.prepare(
    "SELECT username, force_password_change FROM users WHERE member_id = ? AND role = 'member' ORDER BY id LIMIT 1"
  ).get(id);
  member.login_username = account ? account.username : null;
  member.login_password_pending = account ? account.force_password_change === 1 : false;
  return ok(res, member);
}

function createMember(req, res) {
  const {
    full_name, gender, date_of_birth, house_no, street, city, pin_code,
    phone, phone_secondary, email, join_date, emergency_contact_name, emergency_contact_phone, notes,
  } = req.body;

  if (!full_name || !full_name.trim()) {
    return error(res, 'full_name is required', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();

  // Phone must be unique across members.
  if (phone && phone.trim()) {
    const owner = findPhoneOwner(db, phone);
    if (owner) {
      return error(res, `Phone ${phone} is already used by ${owner.full_name} (${owner.member_number})`, 400, 'DUPLICATE_PHONE');
    }
  }

  // Member number: use the (optional) provided value, else auto-generate.
  let member_number = (req.body.member_number || '').trim();
  if (member_number) {
    const clash = db.prepare('SELECT id FROM members WHERE member_number = ?').get(member_number);
    if (clash) return error(res, `Member number "${member_number}" is already in use`, 400, 'DUPLICATE');
  } else {
    member_number = generateMemberNumber();
  }

  const stmt = db.prepare(`
    INSERT INTO members (
      member_number, full_name, gender, date_of_birth,
      house_no, street, city, pin_code, phone, phone_secondary, email,
      membership_type, join_date, status,
      emergency_contact_name, emergency_contact_phone, notes,
      created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, 'Active', ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    member_number, full_name.trim(), gender || null, date_of_birth || null,
    house_no || null, street || null, city || 'Chitradurga', pin_code || '577501',
    phone || null, phone_secondary || null, email || null,
    join_date || new Date().toISOString().split('T')[0],
    emergency_contact_name || null, emergency_contact_phone || null,
    notes || null, req.user.id, req.user.id
  );

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
  ensureMemberAccount(db, member);
  auditLog(db, req.user.id, 'CREATE_MEMBER', member.id, { member_number });
  return created(res, member, 'Member created successfully');
}

function updateMember(req, res) {
  const id = Number(req.params.id);
  if (!canAccess(req, id)) return error(res, 'Forbidden', 403, 'FORBIDDEN');

  const db = getDb();
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!existing) return error(res, 'Member not found', 404, 'NOT_FOUND');

  const {
    full_name, gender, date_of_birth, house_no, street, city, pin_code,
    phone, phone_secondary, email, emergency_contact_name, emergency_contact_phone, notes, status,
  } = req.body;

  // Phone must stay unique — but only enforce when it actually changes, so
  // legacy members that share a number can still be saved unchanged.
  if (phone != null && normalizePhone(phone) && normalizePhone(phone) !== normalizePhone(existing.phone)) {
    const owner = findPhoneOwner(db, phone, id);
    if (owner) {
      return error(res, `Phone ${phone} is already used by ${owner.full_name} (${owner.member_number})`, 400, 'DUPLICATE_PHONE');
    }
  }

  // Members can only update their own contact/profile fields, not status
  const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);

  db.prepare(`
    UPDATE members SET
      full_name = ?, gender = ?, date_of_birth = ?,
      house_no = ?, street = ?, city = ?, pin_code = ?,
      phone = ?, phone_secondary = ?, email = ?,
      emergency_contact_name = ?, emergency_contact_phone = ?,
      notes = ?,
      status = ?,
      updated_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    full_name ?? existing.full_name,
    gender ?? existing.gender,
    date_of_birth ?? existing.date_of_birth,
    house_no ?? existing.house_no,
    street ?? existing.street,
    city ?? existing.city,
    pin_code ?? existing.pin_code,
    phone ?? existing.phone,
    phone_secondary ?? existing.phone_secondary,
    email ?? existing.email,
    emergency_contact_name ?? existing.emergency_contact_name,
    emergency_contact_phone ?? existing.emergency_contact_phone,
    notes ?? existing.notes,
    (isAdminOrStaff && status) ? status : existing.status,
    req.user.id, id
  );

  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  auditLog(db, req.user.id, 'UPDATE_MEMBER', id, req.body);
  return ok(res, updated, 'Member updated successfully');
}

function deleteMember(req, res) {
  const id = Number(req.params.id);
  const db = getDb();
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!existing) return error(res, 'Member not found', 404, 'NOT_FOUND');
  db.prepare("UPDATE members SET status = 'Inactive', updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(req.user.id, id);
  auditLog(db, req.user.id, 'DELETE_MEMBER', id, { previous_status: existing.status });
  return ok(res, null, 'Member deactivated successfully');
}

function upgradeToGeneral(req, res) {
  const id = Number(req.params.id);
  const db = getDb();
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!member) return error(res, 'Member not found', 404, 'NOT_FOUND');
  if (member.membership_type !== 'New') {
    return error(res, 'Member is not in New status', 400, 'INVALID_STATE');
  }
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    UPDATE members SET membership_type = 'General', general_since = ?,
    updated_by = ?, updated_at = datetime('now') WHERE id = ?
  `).run(today, req.user.id, id);
  auditLog(db, req.user.id, 'UPGRADE_GENERAL', id, { general_since: today });
  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  return ok(res, updated, 'Member upgraded to General');
}

function upgradeToLifetime(req, res) {
  const id = Number(req.params.id);
  const db = getDb();
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!member) return error(res, 'Member not found', 404, 'NOT_FOUND');
  if (member.membership_type !== 'General') {
    return error(res, 'Member must be General before upgrading to Lifetime', 400, 'INVALID_STATE');
  }
  const today = new Date().toISOString().split('T')[0];
  // Issue a new lifetime member number, preserving the previous one for records.
  const lifetimeNumber = generateLifetimeNumber();
  db.prepare(`
    UPDATE members SET membership_type = 'Lifetime', lifetime_since = ?,
    previous_member_number = member_number, member_number = ?,
    updated_by = ?, updated_at = datetime('now') WHERE id = ?
  `).run(today, lifetimeNumber, req.user.id, id);
  auditLog(db, req.user.id, 'UPGRADE_LIFETIME', id, {
    lifetime_since: today, previous_member_number: member.member_number, member_number: lifetimeNumber,
  });
  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  return ok(res, updated, `Member upgraded to Lifetime — new number ${lifetimeNumber}`);
}

function uploadPhoto(req, res) {
  const id = Number(req.params.id);
  if (!canAccess(req, id)) return error(res, 'Forbidden', 403, 'FORBIDDEN');
  if (!req.file) return error(res, 'No file uploaded', 400, 'VALIDATION_ERROR');

  const db = getDb();
  const existing = db.prepare('SELECT photo_url FROM members WHERE id = ?').get(id);
  if (!existing) return error(res, 'Member not found', 404, 'NOT_FOUND');

  // Delete old photo
  if (existing.photo_url) {
    const oldPath = path.resolve(__dirname, '../..', '.' + existing.photo_url);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const photo_url = `/uploads/photos/${req.file.filename}`;
  db.prepare("UPDATE members SET photo_url = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
    .run(photo_url, req.user.id, id);

  return ok(res, { photo_url }, 'Photo uploaded successfully');
}

module.exports = {
  listMembers, getMember, createMember, updateMember, deleteMember,
  upgradeToGeneral, upgradeToLifetime, uploadPhoto, nextMemberNumber, bulkImport, checkPhone,
};
