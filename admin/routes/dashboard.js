import { Router } from 'express';
import { getDb } from '../lib/db.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const counts = {
    pendingOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c,
    confirmedOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'confirmed'").get().c,
    totalOrders: db.prepare("SELECT COUNT(*) as c FROM orders").get().c,
    activeProducts: db.prepare("SELECT COUNT(*) as c FROM products WHERE active = 1").get().c,
    activeSubscriptions: db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active'").get().c,
    overdueSubscriptions: db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active' AND next_delivery_date < date('now')").get().c,
    upcomingReservations: db.prepare("SELECT COUNT(*) as c FROM reservations WHERE reservation_date >= date('now')").get().c,
    activeDrops: db.prepare("SELECT COUNT(*) as c FROM drops WHERE status IN ('scheduled', 'live')").get().c
  };
  res.render('dashboard', { title: 'Dashboard', counts });
});

export default router;
