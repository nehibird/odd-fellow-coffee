import Database from 'better-sqlite3';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DB_PATH = process.env.DB_PATH || '../data/odd-fellow.db';
let db;

export function getDb() {
  if (!db) {
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initAdminTables();
  }
  return db;
}

function initAdminTables() {
  // Ensure all storefront tables exist (idempotent - matches storefront schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      variants TEXT,
      subscribable INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_session_id TEXT,
      customer_email TEXT,
      customer_name TEXT,
      items TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id),
      reservation_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      items TEXT,
      customer_name TEXT,
      customer_email TEXT,
      status TEXT DEFAULT 'confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      capacity INTEGER DEFAULT 5,
      active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_subscription_id TEXT,
      customer_email TEXT,
      product_id INTEGER,
      frequency TEXT,
      status TEXT,
      stripe_price_id TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS drops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      drop_date TEXT NOT NULL,
      opens_at TEXT NOT NULL,
      closes_at TEXT,
      pickup_start TEXT,
      pickup_end TEXT,
      status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS drop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drop_id INTEGER NOT NULL REFERENCES drops(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity_available INTEGER NOT NULL,
      quantity_sold INTEGER DEFAULT 0,
      price_cents_override INTEGER
    );
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expired ON admin_sessions(expired_at);
  `);

  // Ensure storefront migration columns exist (safe to re-run)
  const alters = [
    'ALTER TABLE orders ADD COLUMN stage TEXT DEFAULT NULL',
    'ALTER TABLE orders ADD COLUMN drop_id INTEGER DEFAULT NULL',
    'ALTER TABLE orders ADD COLUMN shipping_name TEXT',
    'ALTER TABLE orders ADD COLUMN shipping_address TEXT',
    'ALTER TABLE orders ADD COLUMN shipping_method TEXT',
    'ALTER TABLE orders ADD COLUMN shipping_cents INTEGER DEFAULT 0',
    'ALTER TABLE subscriptions ADD COLUMN variant TEXT',
    'ALTER TABLE subscriptions ADD COLUMN price_cents INTEGER',
    'ALTER TABLE subscriptions ADD COLUMN shipping_name TEXT',
    'ALTER TABLE subscriptions ADD COLUMN shipping_address TEXT',
    'ALTER TABLE subscriptions ADD COLUMN next_delivery_date TEXT',
    'ALTER TABLE subscriptions ADD COLUMN last_fulfilled_at TEXT',
    'ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT NULL',
    'ALTER TABLE subscriptions ADD COLUMN cancel_reason TEXT',
    'ALTER TABLE orders ADD COLUMN tracking_number TEXT'
  ];
  for (const stmt of alters) {
    try { db.exec(stmt); } catch { /* column already exists */ }
  }
}
