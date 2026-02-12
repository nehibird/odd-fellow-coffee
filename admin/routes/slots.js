import { Router } from 'express';
import { getDb } from '../lib/db.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const slots = db.prepare('SELECT * FROM time_slots ORDER BY day_of_week, start_time').all();
  res.render('slots/index', { title: 'Time Slots', slots });
});

router.post('/', (req, res) => {
  const { day_of_week, start_time, end_time, capacity } = req.body;

  const day = parseInt(day_of_week);
  const cap = parseInt(capacity);

  if (isNaN(day) || day < 0 || day > 6) {
    res.flash('error', 'Invalid day of week.');
    return res.redirect('/slots');
  }
  if (!start_time || !end_time) {
    res.flash('error', 'Start and end times are required.');
    return res.redirect('/slots');
  }
  if (start_time >= end_time) {
    res.flash('error', 'Start time must be before end time.');
    return res.redirect('/slots');
  }
  if (isNaN(cap) || cap < 1) {
    res.flash('error', 'Capacity must be at least 1.');
    return res.redirect('/slots');
  }

  const db = getDb();
  db.prepare('INSERT INTO time_slots (day_of_week, start_time, end_time, capacity) VALUES (?, ?, ?, ?)')
    .run(day, start_time, end_time, cap);

  res.flash('success', 'Time slot added.');
  res.redirect('/slots');
});

router.post('/:id/delete', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM time_slots WHERE id = ?').run(req.params.id);
  res.flash('success', 'Time slot removed.');
  res.redirect('/slots');
});

export default router;
