const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '../../database/club.db');
let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_number TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
      date_of_birth TEXT,
      house_no TEXT,
      street TEXT,
      city TEXT DEFAULT 'Chitradurga',
      pin_code TEXT DEFAULT '577501',
      phone TEXT,
      phone_secondary TEXT,
      email TEXT,
      membership_type TEXT NOT NULL DEFAULT 'New'
        CHECK(membership_type IN ('New', 'General', 'Lifetime')),
      join_date TEXT NOT NULL DEFAULT (date('now')),
      general_since TEXT,
      lifetime_since TEXT,
      status TEXT NOT NULL DEFAULT 'Active'
        CHECK(status IN ('Active', 'Inactive', 'Suspended')),
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      photo_url TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member'
        CHECK(role IN ('admin', 'staff', 'member')),
      member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      force_password_change INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fee_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      joining_fee REAL NOT NULL DEFAULT 1000,
      monthly_due_general REAL NOT NULL DEFAULT 200,
      monthly_due_lifetime REAL NOT NULL DEFAULT 150,
      lifetime_transfer_fee REAL NOT NULL DEFAULT 5000,
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS member_number_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prefix TEXT NOT NULL DEFAULT 'CCM',
      separator TEXT NOT NULL DEFAULT '-',
      include_year INTEGER NOT NULL DEFAULT 1,
      padding INTEGER NOT NULL DEFAULT 4,
      suffix TEXT NOT NULL DEFAULT '',
      next_seq INTEGER NOT NULL DEFAULT 1,
      lt_prefix TEXT NOT NULL DEFAULT 'CCL',
      lt_separator TEXT NOT NULL DEFAULT '-',
      lt_include_year INTEGER NOT NULL DEFAULT 1,
      lt_padding INTEGER NOT NULL DEFAULT 4,
      lt_suffix TEXT NOT NULL DEFAULT '',
      lt_next_seq INTEGER NOT NULL DEFAULT 1,
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT NOT NULL UNIQUE,
      member_id INTEGER NOT NULL REFERENCES members(id),
      payment_type TEXT NOT NULL
        CHECK(payment_type IN ('joining', 'monthly', 'lifetime_transfer')),
      amount REAL NOT NULL,
      payment_month TEXT,
      payment_date TEXT NOT NULL DEFAULT (date('now')),
      notes TEXT,
      recorded_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_members_member_number ON members(member_number);
    CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
    CREATE INDEX IF NOT EXISTS idx_members_type ON members(membership_type);
    CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
    CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(payment_month);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

  // Migrations: add columns to existing tables (CREATE TABLE IF NOT EXISTS
  // won't alter a table that already exists).
  const memberCols = database.prepare('PRAGMA table_info(members)').all().map(c => c.name);
  if (!memberCols.includes('phone_secondary')) {
    database.exec('ALTER TABLE members ADD COLUMN phone_secondary TEXT');
    console.log('Migration: added members.phone_secondary');
  }
  if (!memberCols.includes('previous_member_number')) {
    database.exec('ALTER TABLE members ADD COLUMN previous_member_number TEXT');
    console.log('Migration: added members.previous_member_number');
  }

  // Lifetime member-number format columns (added after the initial config table).
  const mncCols = database.prepare('PRAGMA table_info(member_number_config)').all().map(c => c.name);
  const ltColumns = [
    ['lt_prefix', "TEXT NOT NULL DEFAULT 'CCL'"],
    ['lt_separator', "TEXT NOT NULL DEFAULT '-'"],
    ['lt_include_year', 'INTEGER NOT NULL DEFAULT 1'],
    ['lt_padding', 'INTEGER NOT NULL DEFAULT 4'],
    ['lt_suffix', "TEXT NOT NULL DEFAULT ''"],
    ['lt_next_seq', 'INTEGER NOT NULL DEFAULT 1'],
  ];
  for (const [name, def] of ltColumns) {
    if (!mncCols.includes(name)) {
      database.exec(`ALTER TABLE member_number_config ADD COLUMN ${name} ${def}`);
      console.log(`Migration: added member_number_config.${name}`);
    }
  }

  // Seed member_number_config if empty
  const mncRow = database.prepare('SELECT id FROM member_number_config LIMIT 1').get();
  if (!mncRow) {
    database.prepare(`
      INSERT INTO member_number_config (prefix, separator, include_year, padding, suffix, next_seq)
      VALUES ('CCM', '-', 1, 4, '', 1)
    `).run();
  }

  // Seed fee_config if empty
  const feeRow = database.prepare('SELECT id FROM fee_config LIMIT 1').get();
  if (!feeRow) {
    database.prepare(`
      INSERT INTO fee_config (joining_fee, monthly_due_general, monthly_due_lifetime, lifetime_transfer_fee)
      VALUES (1000, 200, 150, 5000)
    `).run();
  }

  // Seed default admin if no admin exists
  const adminRow = database.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminRow) {
    const hash = bcrypt.hashSync('Admin@1234', 10);
    database.prepare(`
      INSERT INTO users (username, email, password, role, force_password_change)
      VALUES ('admin', 'admin@cityclub.com', ?, 'admin', 1)
    `).run(hash);
    console.log('Default admin created: username=admin, password=Admin@1234');
  }

  console.log('Database initialized');
}

module.exports = { getDb, initDb };
