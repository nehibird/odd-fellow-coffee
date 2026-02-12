import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { createInterface } from 'readline';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DB_PATH = process.env.DB_PATH || '../data/odd-fellow.db';
const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

async function main() {
  // Support CLI args: node seed-admin.js <username> <password>
  let username, password;
  if (process.argv[2] && process.argv[3]) {
    username = process.argv[2];
    password = process.argv[3];
    rl.close();
  } else {
    username = await ask('Username: ');
    password = await ask('Password: ');
    rl.close();
  }

  if (!username.trim() || !password.trim()) {
    console.error('Username and password are required.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password.trim(), 12);

  try {
    db.prepare('INSERT OR REPLACE INTO admin_users (username, password_hash) VALUES (?, ?)')
      .run(username.trim(), hash);
    console.log(`Admin user "${username.trim()}" created successfully.`);
  } catch (e) {
    console.error('Error creating admin user:', e.message);
  }

  db.close();
}

main();
