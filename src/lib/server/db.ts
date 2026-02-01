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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

const SEED = `
INSERT INTO products (name, category, description, price_cents, variants, subscribable, image) VALUES
('House Blend', 'coffee', 'Our signature smooth daily roast', 1400, '{"sizes":["8oz","16oz"],"grinds":["whole","medium","fine","espresso"]}', 1, 'coffee-bag.png'),
('Dark Roast', 'coffee', 'Bold and rich, full body', 1500, '{"sizes":["8oz","16oz"],"grinds":["whole","medium","fine","espresso"]}', 1, 'coffee-bag.png'),
('Decaf Blend', 'coffee', 'All the flavor, none of the buzz', 1400, '{"sizes":["8oz","16oz"],"grinds":["whole","medium","fine","espresso"]}', 1, 'coffee-bag.png');
INSERT INTO products (name, category, description, price_cents, image) VALUES
('Sourdough Loaf', 'bakery', 'Fresh-baked artisan sourdough', 800, 'bread.png'),
('Cinnamon Roll', 'bakery', 'Warm with cream cheese icing', 450, 'pastry.png'),
('Banana Bread', 'bakery', 'Homemade, moist and delicious', 700, 'bread.png'),
('Blueberry Muffin', 'bakery', 'Loaded with fresh blueberries', 400, 'pastry.png');
INSERT INTO products (name, category, description, price_cents, image) VALUES
('Biscuits & Gravy', 'hotplate', 'Classic Southern comfort breakfast', 900, 'hotplate.png'),
('Breakfast Burrito', 'hotplate', 'Eggs, cheese, sausage, peppers', 850, 'hotplate.png'),
('Quiche of the Day', 'hotplate', 'Ask about today''s variety', 750, 'hotplate.png');
INSERT INTO time_slots (day_of_week, start_time, end_time, capacity) VALUES
(1,'07:00','08:00',5),(1,'08:00','09:00',5),(1,'09:00','10:00',5),(1,'10:00','11:00',5),
(2,'07:00','08:00',5),(2,'08:00','09:00',5),(2,'09:00','10:00',5),(2,'10:00','11:00',5),
(3,'07:00','08:00',5),(3,'08:00','09:00',5),(3,'09:00','10:00',5),(3,'10:00','11:00',5),
(4,'07:00','08:00',5),(4,'08:00','09:00',5),(4,'09:00','10:00',5),(4,'10:00','11:00',5),
(5,'07:00','08:00',5),(5,'08:00','09:00',5),(5,'09:00','10:00',5),(5,'10:00','11:00',5),
(6,'07:00','08:00',5),(6,'08:00','09:00',5),(6,'09:00','10:00',5),(6,'10:00','11:00',5);`;
