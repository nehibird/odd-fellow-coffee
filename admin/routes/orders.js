import { Router } from 'express';
import { getDb } from '../lib/db.js';
import { generatePirateshipCSV } from '../lib/csv.js';

const router = Router();

const VALID_STATUSES = new Set(['pending', 'confirmed', 'fulfilled']);
const VALID_STAGES = new Set(['ordered', 'baking', 'ready', 'picked_up', 'shipped', 'delivered']);

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

router.post('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.has(status)) {
    res.flash('error', 'Invalid status.');
    return res.redirect('/orders');
  }
  const db = getDb();
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.flash('success', `Order #${req.params.id} marked as ${status}.`);
  res.redirect('/orders');
});

router.post('/:id/stage', (req, res) => {
  const { stage } = req.body;
  if (!VALID_STAGES.has(stage)) {
    res.flash('error', 'Invalid stage.');
    return res.redirect('/orders');
  }
  const db = getDb();
  db.prepare('UPDATE orders SET stage = ? WHERE id = ?').run(stage, req.params.id);
  res.flash('success', `Order #${req.params.id} moved to ${stage.replace(/_/g, ' ')}.`);
  res.redirect('/orders');
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
