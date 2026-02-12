import session from 'express-session';
import bcrypt from 'bcrypt';

export function createSessionStore(db) {
  class SQLiteStore extends session.Store {
    constructor() {
      super();
      setInterval(() => {
        db.prepare('DELETE FROM admin_sessions WHERE expired_at < ?').run(Date.now());
      }, 15 * 60 * 1000);
    }

    get(sid, cb) {
      try {
        const row = db.prepare('SELECT sess FROM admin_sessions WHERE sid = ? AND expired_at > ?').get(sid, Date.now());
        cb(null, row ? JSON.parse(row.sess) : null);
      } catch (e) { cb(e); }
    }

    set(sid, sess, cb) {
      try {
        const maxAge = sess.cookie?.maxAge || 8 * 60 * 60 * 1000;
        const expiredAt = Date.now() + maxAge;
        db.prepare('INSERT OR REPLACE INTO admin_sessions (sid, sess, expired_at) VALUES (?, ?, ?)')
          .run(sid, JSON.stringify(sess), expiredAt);
        cb(null);
      } catch (e) { cb(e); }
    }

    destroy(sid, cb) {
      try {
        db.prepare('DELETE FROM admin_sessions WHERE sid = ?').run(sid);
        cb(null);
      } catch (e) { cb(e); }
    }

    touch(sid, sess, cb) {
      try {
        const maxAge = sess.cookie?.maxAge || 8 * 60 * 60 * 1000;
        const expiredAt = Date.now() + maxAge;
        db.prepare('UPDATE admin_sessions SET expired_at = ? WHERE sid = ?').run(expiredAt, sid);
        cb(null);
      } catch (e) { cb(e); }
    }
  }

  return new SQLiteStore();
}

export async function verifyPassword(db, username, password) {
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  return match ? user : null;
}
