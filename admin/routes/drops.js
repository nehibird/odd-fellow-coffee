import { Router } from 'express';
import { getDb } from '../lib/db.js';

const BASE = process.env.BASE_PATH?.replace(/\/+$/, '') || '';
const router = Router();

const VALID_DROP_STATUSES = new Set(['scheduled', 'live', 'sold_out', 'closed']);

router.get('/', (req, res) => {
  const db = getDb();
  const drops = db.prepare('SELECT * FROM drops ORDER BY drop_date DESC').all();
  for (const drop of drops) {
    drop.items = db.prepare(`
      SELECT di.*, p.name as product_name FROM drop_items di
      JOIN products p ON p.id = di.product_id
      WHERE di.drop_id = ?
    `).all(drop.id);
  }
  res.render('drops/index', { title: 'Drops', drops });
});

router.get('/new', (req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT id, name, price_cents FROM products WHERE active = 1 ORDER BY name').all();
  res.render('drops/new', { title: 'New Drop', products });
});

router.post('/', (req, res) => {
  const { title, drop_date, opens_at, closes_at, pickup_start, pickup_end } = req.body;

  if (!title || !title.trim()) {
    res.flash('error', 'Title is required.');
    return res.redirect(BASE + '/drops/new');
  }
  if (!drop_date || !opens_at) {
    res.flash('error', 'Drop date and opens_at time are required.');
    return res.redirect(BASE + '/drops/new');
  }

  // Parse items from form - items come as arrays: product_id[], quantity[], price_override[]
  let productIds = req.body['product_id[]'] || req.body.product_id || [];
  let quantities = req.body['quantity[]'] || req.body.quantity || [];
  let priceOverrides = req.body['price_override[]'] || req.body.price_override || [];

  if (!Array.isArray(productIds)) productIds = [productIds];
  if (!Array.isArray(quantities)) quantities = [quantities];
  if (!Array.isArray(priceOverrides)) priceOverrides = [priceOverrides];

  const items = [];
  for (let i = 0; i < productIds.length; i++) {
    const pid = parseInt(productIds[i]);
    const qty = parseInt(quantities[i]);
    if (isNaN(pid) || isNaN(qty) || qty < 1) continue;
    const override = priceOverrides[i] ? Math.round(parseFloat(priceOverrides[i]) * 100) : null;
    items.push({ product_id: pid, quantity_available: qty, price_cents_override: override && !isNaN(override) ? override : null });
  }

  if (items.length === 0) {
    res.flash('error', 'At least one item is required.');
    return res.redirect(BASE + '/drops/new');
  }

  const db = getDb();
  const insert = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO drops (title, drop_date, opens_at, closes_at, pickup_start, pickup_end) VALUES (?,?,?,?,?,?)'
    ).run(title.trim(), drop_date, opens_at, closes_at || null, pickup_start || null, pickup_end || null);
    const dropId = result.lastInsertRowid;
    const stmt = db.prepare(
      'INSERT INTO drop_items (drop_id, product_id, quantity_available, price_cents_override) VALUES (?,?,?,?)'
    );
    for (const item of items) {
      stmt.run(dropId, item.product_id, item.quantity_available, item.price_cents_override);
    }
    return dropId;
  });

  const dropId = insert();
  res.flash('success', `Drop "${title.trim()}" created (ID: ${dropId}).`);
  res.redirect(BASE + '/drops');
});

router.post('/:id/close', (req, res) => {
  const db = getDb();
  db.prepare("UPDATE drops SET status = 'closed' WHERE id = ?").run(req.params.id);
  res.flash('success', 'Drop closed.');
  res.redirect(BASE + '/drops');
});

router.post('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!VALID_DROP_STATUSES.has(status)) {
    res.flash('error', 'Invalid status.');
    return res.redirect(BASE + '/drops');
  }
  const db = getDb();
  db.prepare('UPDATE drops SET status = ? WHERE id = ?').run(status, req.params.id);
  res.flash('success', `Drop status updated to ${status}.`);
  res.redirect(BASE + '/drops');
});

export default router;
