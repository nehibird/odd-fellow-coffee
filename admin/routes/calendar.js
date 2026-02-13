import { Router } from 'express';
import { getDb } from '../lib/db.js';

const router = Router();

router.get('/', (req, res) => {
  const now = new Date();
  const monthParam = req.query.month; // YYYY-MM
  let year, month;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split('-').map(Number);
  } else {
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  const db = getDb();

  // Orders by date
  const orders = db.prepare(
    "SELECT DATE(created_at) as d, COUNT(*) as c FROM orders WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY d"
  ).all(startDate, endDate);

  // Subscriptions by next_delivery_date
  const subscriptions = db.prepare(
    "SELECT next_delivery_date as d, COUNT(*) as c FROM subscriptions WHERE status IN ('active','paused') AND next_delivery_date BETWEEN ? AND ? GROUP BY d"
  ).all(startDate, endDate);

  // Reservations by reservation_date
  const reservations = db.prepare(
    "SELECT reservation_date as d, COUNT(*) as c FROM reservations WHERE reservation_date BETWEEN ? AND ? GROUP BY d"
  ).all(startDate, endDate);

  // Drops by drop_date
  const drops = db.prepare(
    "SELECT drop_date as d, COUNT(*) as c FROM drops WHERE drop_date BETWEEN ? AND ? GROUP BY d"
  ).all(startDate, endDate);

  // Build lookup maps
  const data = {};
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    data[key] = { orders: 0, subscriptions: 0, reservations: 0, drops: 0 };
  }
  orders.forEach(r => { if (data[r.d]) data[r.d].orders = r.c; });
  subscriptions.forEach(r => { if (data[r.d]) data[r.d].subscriptions = r.c; });
  reservations.forEach(r => { if (data[r.d]) data[r.d].reservations = r.c; });
  drops.forEach(r => { if (data[r.d]) data[r.d].drops = r.c; });

  // Prev/next month
  const prevDate = new Date(year, month - 2, 1);
  const nextDate = new Date(year, month, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

  const monthName = firstDay.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  res.render('calendar/index', {
    title: 'Calendar',
    year, month, monthName,
    firstDay, lastDay,
    data,
    prevMonth, nextMonth,
    today: now.toISOString().split('T')[0]
  });
});

router.get('/day/:date', (req, res) => {
  const date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.flash('error', 'Invalid date.');
    return res.redirect(req.baseUrl);
  }

  const db = getDb();

  const orders = db.prepare(
    "SELECT * FROM orders WHERE DATE(created_at) = ? ORDER BY created_at DESC"
  ).all(date);

  const subscriptions = db.prepare(
    `SELECT s.*, p.name as product_name FROM subscriptions s
     LEFT JOIN products p ON p.id = s.product_id
     WHERE s.next_delivery_date = ? AND s.status IN ('active','paused')
     ORDER BY s.customer_email`
  ).all(date);

  const reservations = db.prepare(
    "SELECT * FROM reservations WHERE reservation_date = ? ORDER BY time_slot"
  ).all(date);

  const drops = db.prepare(
    "SELECT * FROM drops WHERE drop_date = ? ORDER BY opens_at"
  ).all(date);

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  res.render('calendar/day', {
    title: dateLabel,
    date, dateLabel,
    orders, subscriptions, reservations, drops
  });
});

export default router;
