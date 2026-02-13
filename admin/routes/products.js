import { Router } from 'express';
import { getDb } from '../lib/db.js';
import { upload } from '../lib/upload.js';

const BASE = process.env.BASE_PATH?.replace(/\/+$/, '') || '';
const router = Router();
const VALID_CATEGORIES = new Set(['coffee', 'bakery', 'hotplate']);

router.get('/', (req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();
  res.render('products/index', { title: 'Products', products });
});

router.get('/new', (req, res) => {
  res.render('products/form', { title: 'New Product', product: null });
});

router.get('/:id/edit', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    res.flash('error', 'Product not found.');
    return res.redirect(BASE + '/products');
  }
  res.render('products/form', { title: 'Edit Product', product });
});

router.post('/', upload.single('imageFile'), (req, res) => {
  const { name, category, description, price, variants, image, subscribable, stock_quantity } = req.body;

  if (!name || !name.trim()) {
    res.flash('error', 'Name is required.');
    return res.redirect(BASE + '/products/new');
  }
  if (!VALID_CATEGORIES.has(category)) {
    res.flash('error', 'Invalid category.');
    return res.redirect(BASE + '/products/new');
  }
  const priceCents = Math.round(parseFloat(price) * 100);
  if (isNaN(priceCents) || priceCents < 0) {
    res.flash('error', 'Price must be a positive number.');
    return res.redirect(BASE + '/products/new');
  }

  if (variants && variants.trim()) {
    try { JSON.parse(variants); } catch {
      res.flash('error', 'Variants must be valid JSON.');
      return res.redirect(BASE + '/products/new');
    }
  }

  // Use uploaded file if present, otherwise fall back to text field
  const imageValue = req.file ? req.file.filename : (image?.trim() || null);
  const stockVal = stock_quantity !== undefined && stock_quantity !== '' ? parseInt(stock_quantity, 10) : null;

  const db = getDb();
  db.prepare(
    'INSERT INTO products (name, category, description, price_cents, variants, subscribable, image, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name.trim(), category, (description || '').trim(), priceCents, variants?.trim() || null, subscribable ? 1 : 0, imageValue, stockVal);

  res.flash('success', `Product "${name.trim()}" created.`);
  res.redirect(BASE + '/products');
});

router.post('/:id', upload.single('imageFile'), (req, res) => {
  const { name, category, description, price, variants, image, subscribable, stock_quantity } = req.body;

  if (!name || !name.trim()) {
    res.flash('error', 'Name is required.');
    return res.redirect(`${BASE}/products/${req.params.id}/edit`);
  }
  if (!VALID_CATEGORIES.has(category)) {
    res.flash('error', 'Invalid category.');
    return res.redirect(`${BASE}/products/${req.params.id}/edit`);
  }
  const priceCents = Math.round(parseFloat(price) * 100);
  if (isNaN(priceCents) || priceCents < 0) {
    res.flash('error', 'Price must be a positive number.');
    return res.redirect(`${BASE}/products/${req.params.id}/edit`);
  }

  if (variants && variants.trim()) {
    try { JSON.parse(variants); } catch {
      res.flash('error', 'Variants must be valid JSON.');
      return res.redirect(`${BASE}/products/${req.params.id}/edit`);
    }
  }

  // Use uploaded file if present, otherwise keep existing text value
  const imageValue = req.file ? req.file.filename : (image?.trim() || null);
  const stockVal = stock_quantity !== undefined && stock_quantity !== '' ? parseInt(stock_quantity, 10) : null;

  const db = getDb();
  db.prepare(
    'UPDATE products SET name=?, category=?, description=?, price_cents=?, variants=?, subscribable=?, image=?, stock_quantity=? WHERE id=?'
  ).run(name.trim(), category, (description || '').trim(), priceCents, variants?.trim() || null, subscribable ? 1 : 0, imageValue, stockVal, req.params.id);

  res.flash('success', `Product "${name.trim()}" updated.`);
  res.redirect(BASE + '/products');
});

router.post('/:id/deactivate', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  res.flash('success', `Product deactivated.`);
  res.redirect(BASE + '/products');
});

router.post('/:id/activate', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE products SET active = 1 WHERE id = ?').run(req.params.id);
  res.flash('success', `Product activated.`);
  res.redirect(BASE + '/products');
});

export default router;
