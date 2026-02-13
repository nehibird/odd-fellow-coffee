import { Router } from 'express';
import { getDb } from '../lib/db.js';
import { generatePirateshipCSV } from '../lib/csv.js';
import { sendOrderShipped, sendOrderDelivered } from '../lib/email.js';

const BASE = process.env.BASE_PATH?.replace(/\/+$/, '') || '';
const router = Router();

const VALID_STATUSES = new Set(['pending', 'confirmed', 'shipped', 'delivered']);

router.get('/', (req, res) => {
  const db = getDb();
  const filter = req.query.status || 'all';
  let query = 'SELECT * FROM orders';
  const params = [];
  if (filter !== 'all' && VALID_STATUSES.has(filter)) {
    query += ' WHERE status = ?';
    params.push(filter);
  }
  query += ' ORDER BY created_at DESC';
  const orders = db.prepare(query).all(...params);
  res.render('orders/index', { title: 'Orders', orders, filter });
});

router.post('/bulk-status', (req, res) => {
  let ids = req.body['ids[]'] || req.body.ids;
  const { status } = req.body;
  if (ids && !Array.isArray(ids)) ids = [ids];
  if (!ids || ids.length === 0) {
    res.flash('error', 'No orders selected.');
    return res.redirect(BASE + '/orders');
  }
  if (!VALID_STATUSES.has(status)) {
    res.flash('error', 'Invalid status.');
    return res.redirect(BASE + '/orders');
  }
  const db = getDb();
  const update = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  const bulkUpdate = db.transaction((orderIds) => {
    for (const id of orderIds) {
      update.run(status, id);
    }
  });
  bulkUpdate(ids);
  res.flash('success', `${ids.length} order(s) marked as ${status}.`);
  res.redirect(BASE + '/orders');
});

router.post('/:id/status', async (req, res) => {
  const { status, tracking_number } = req.body;
  if (!VALID_STATUSES.has(status)) {
    res.flash('error', 'Invalid status.');
    return res.redirect(BASE + '/orders');
  }
  const db = getDb();

  if (status === 'shipped' && tracking_number) {
    db.prepare('UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?').run(status, tracking_number.trim(), req.params.id);
  } else {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  }

  // Send notification emails
  try {
    const order = db.prepare('SELECT customer_email, customer_name FROM orders WHERE id = ?').get(req.params.id);
    if (order?.customer_email) {
      if (status === 'shipped') {
        await sendOrderShipped(order.customer_email, order.customer_name || 'Customer', req.params.id, tracking_number?.trim() || null);
      } else if (status === 'delivered') {
        await sendOrderDelivered(order.customer_email, order.customer_name || 'Customer', req.params.id);
      }
    }
  } catch (e) {
    console.error('Order email failed:', e);
  }

  res.flash('success', `Order #${req.params.id} marked as ${status}.`);
  res.redirect(BASE + '/orders');
});

router.get('/export-csv', (req, res) => {
  const db = getDb();
  let query = "SELECT * FROM orders WHERE shipping_address IS NOT NULL AND shipping_address != ''";
  const params = [];
  const statusFilter = req.query.status;
  if (statusFilter && VALID_STATUSES.has(statusFilter)) {
    query += ' AND status = ?';
    params.push(statusFilter);
  }
  query += ' ORDER BY created_at DESC';
  const orders = db.prepare(query).all(...params);

  const csv = generatePirateshipCSV(orders);
  const filename = `pirateship-export-${new Date().toISOString().split('T')[0]}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export default router;
