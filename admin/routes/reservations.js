import { Router } from 'express';
import { getDb } from '../lib/db.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const reservations = db.prepare(
    'SELECT * FROM reservations ORDER BY reservation_date DESC, time_slot'
  ).all();
  res.render('reservations/index', { title: 'Reservations', reservations });
});

export default router;
