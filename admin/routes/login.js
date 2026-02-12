import { Router } from 'express';
import { verifyPassword } from '../lib/auth.js';
import { getDb } from '../lib/db.js';

const BASE = process.env.BASE_PATH?.replace(/\/+$/, '') || '';
const router = Router();

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect(BASE + '/');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { error: 'Username and password are required.' });
  }
  const db = getDb();
  const user = await verifyPassword(db, username, password);
  if (!user) {
    return res.render('login', { error: 'Invalid username or password.' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  const returnTo = req.session.returnTo || (BASE + '/');
  delete req.session.returnTo;
  res.redirect(returnTo);
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect(BASE + '/login');
  });
});

export default router;
