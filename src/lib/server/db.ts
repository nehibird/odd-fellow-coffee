import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const DB_PATH = process.env.DB_PATH || 'data/odd-fellow.db';

let db: Database.Database;

export function getDb(): Database.Database {
	if (!db) {
		const dir = dirname(DB_PATH);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		db = new Database(DB_PATH);
		db.pragma('journal_mode = WAL');
		db.pragma('foreign_keys = ON');
		initSchema();
	}
	return db;
}

function initSchema() {
	const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');
	if (existsSync(schemaPath)) {
		db.exec(readFileSync(schemaPath, 'utf-8'));
	} else {
		// Inline schema fallback
		db.exec(SCHEMA);
	}

	// Add columns to existing tables (safe to re-run)
	const alterStatements = [
		'ALTER TABLE orders ADD COLUMN stage TEXT DEFAULT NULL',
		'ALTER TABLE orders ADD COLUMN drop_id INTEGER DEFAULT NULL',
		'ALTER TABLE orders ADD COLUMN shipping_name TEXT',
		'ALTER TABLE orders ADD COLUMN shipping_address TEXT',
		'ALTER TABLE orders ADD COLUMN shipping_method TEXT',
		'ALTER TABLE orders ADD COLUMN shipping_cents INTEGER DEFAULT 0',
		// Subscription fulfillment fields
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
	for (const stmt of alterStatements) {
		try { db.exec(stmt); } catch { /* column already exists */ }
	}

	// Seed if products table empty
	const count = db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number };
	if (count.c === 0) {
		const seedPath = join(dirname(fileURLToPath(import.meta.url)), 'seed.sql');
		if (existsSync(seedPath)) {
			db.exec(readFileSync(seedPath, 'utf-8'));
		} else {
			db.exec(SEED);
		}
	}

	// Seed default site settings (INSERT OR IGNORE = safe to re-run)
	db.exec(SETTINGS_SEED);

	// Update bakery product descriptions with ordering info
	db.prepare(`UPDATE products SET description = ? WHERE name = 'Sourdough Loaf' AND description = 'Fresh-baked artisan sourdough'`)
		.run('Fresh-baked artisan sourdough, made to order. Local delivery (Mon & Fri, 5:30 PM) or pickup (Mon & Fri, 4:00 PM). Tonkawa area only. Order at least 2 days in advance.');
	db.prepare(`UPDATE products SET description = ? WHERE name = 'Banana Bread' AND description = 'Homemade, moist and delicious'`)
		.run('Homemade, moist and delicious. Local delivery (Mon & Fri, 5:30 PM) or pickup (Mon & Fri, 4:00 PM). Tonkawa area only. Order at least 2 days in advance.');
	db.prepare(`UPDATE products SET description = ? WHERE name = 'Cinnamon Roll' AND description = 'Warm with cream cheese icing'`)
		.run('Warm with cream cheese icing. Local delivery (Mon & Fri, 5:30 PM) or pickup (Mon & Fri, 4:00 PM). Tonkawa area only. Order at least 2 days in advance.');
	db.prepare(`UPDATE products SET description = ? WHERE name = 'Blueberry Muffin' AND description = 'Loaded with fresh blueberries'`)
		.run('Loaded with fresh blueberries. Local delivery (Mon & Fri, 5:30 PM) or pickup (Mon & Fri, 4:00 PM). Tonkawa area only. Order at least 2 days in advance.');
}

export function getSetting(key: string): string | null {
	const db = getDb();
	const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(key) as { value: string } | undefined;
	return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
	const db = getDb();
	db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getAllSettings(): Record<string, string> {
	const db = getDb();
	const rows = db.prepare('SELECT key, value FROM site_settings').all() as { key: string; value: string }[];
	const result: Record<string, string> = {};
	for (const row of rows) result[row.key] = row.value;
	return result;
}

const SCHEMA = `
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
  variant TEXT,
  price_cents INTEGER,
  shipping_name TEXT,
  shipping_address TEXT,
  next_delivery_date TEXT,
  last_fulfilled_at TEXT,
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
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;

const SEED = `
INSERT INTO products (name, category, description, price_cents, variants, subscribable, image) VALUES
('House Blend', 'coffee', 'Our signature smooth daily roast', 1400, '{"sizes":["8oz","16oz"],"grinds":["whole","medium","fine","espresso"]}', 1, 'coffee-bag.svg'),
('Dark Roast', 'coffee', 'Bold and rich, full body', 1500, '{"sizes":["8oz","16oz"],"grinds":["whole","medium","fine","espresso"]}', 1, 'coffee-bag.svg'),
('Decaf Blend', 'coffee', 'All the flavor, none of the buzz', 1400, '{"sizes":["8oz","16oz"],"grinds":["whole","medium","fine","espresso"]}', 1, 'coffee-bag.svg');
INSERT INTO products (name, category, description, price_cents, image) VALUES
('Sourdough Loaf', 'bakery', 'Fresh-baked artisan sourdough', 800, 'bread.svg'),
('Cinnamon Roll', 'bakery', 'Warm with cream cheese icing', 450, 'pastry.svg'),
('Banana Bread', 'bakery', 'Homemade, moist and delicious', 700, 'bread.svg'),
('Blueberry Muffin', 'bakery', 'Loaded with fresh blueberries', 400, 'pastry.svg');
INSERT INTO products (name, category, description, price_cents, image) VALUES
('Biscuits & Gravy', 'hotplate', 'Classic Southern comfort breakfast', 900, 'hotplate.svg'),
('Breakfast Burrito', 'hotplate', 'Eggs, cheese, sausage, peppers', 850, 'hotplate.svg'),
('Quiche of the Day', 'hotplate', 'Ask about today''s variety', 750, 'hotplate.svg');
INSERT INTO time_slots (day_of_week, start_time, end_time, capacity) VALUES
(1,'07:00','08:00',5),(1,'08:00','09:00',5),(1,'09:00','10:00',5),(1,'10:00','11:00',5),
(2,'07:00','08:00',5),(2,'08:00','09:00',5),(2,'09:00','10:00',5),(2,'10:00','11:00',5),
(3,'07:00','08:00',5),(3,'08:00','09:00',5),(3,'09:00','10:00',5),(3,'10:00','11:00',5),
(4,'07:00','08:00',5),(4,'08:00','09:00',5),(4,'09:00','10:00',5),(4,'10:00','11:00',5),
(5,'07:00','08:00',5),(5,'08:00','09:00',5),(5,'09:00','10:00',5),(5,'10:00','11:00',5),
(6,'07:00','08:00',5),(6,'08:00','09:00',5),(6,'09:00','10:00',5),(6,'10:00','11:00',5);`;

const SETTINGS_SEED = `
INSERT OR IGNORE INTO site_settings (key, value) VALUES
('owner_notification_email', 'deborahmeansreese@gmail.com'),
('pickup_address', '123 Main St, Tonkawa, OK 74653'),
('pickup_times', 'Monday 4:00 PM, Friday 4:00 PM'),
('delivery_times', 'Monday 5:30 PM, Friday 5:30 PM'),
('bread_lead_days', '2'),
('bread_delivery_days', 'monday,friday');`;
