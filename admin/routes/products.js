import { Router } from 'express';
import { getDb } from '../lib/db.js';
import { upload } from '../lib/upload.js';

const BASE = process.env.BASE_PATH?.replace(/\/+$/, '') || '';
const router = Router();
// 'drinks' is listed so that EDITING a drink round-trips its category instead of
// silently rewriting it — the form select had no drinks option, so for a drink row
// no option was marked selected, the browser pre-selected "Coffee", and Save wrote
// category='coffee'. That turned the drink into a shippable bean product AND made
// it vanish from /reservations, which selects WHERE category='drinks'.
// Keep in sync with src/routes/api/admin/products/+server.ts and
// src/lib/server/db.ts (DRINK_CATEGORY).
const DRINK_CATEGORY = 'drinks';
const VALID_CATEGORIES = new Set(['coffee', 'bakery', 'hotplate', DRINK_CATEGORY]);

/**
 * Whether a product is a made-to-order drink is not an editable field: the
 * reservation system selects on category='drinks' and the storefront excludes it,
 * so moving a product across that line in either direction silently breaks one of
 * the two. Creating a drink is likewise not something this form should do — drinks
 * are seeded by DRINKS_SEED in src/lib/server/db.ts.
 */
function drinkCategoryChanged(existingCategory, submittedCategory) {
  return (existingCategory === DRINK_CATEGORY) !== (submittedCategory === DRINK_CATEGORY);
}

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
  if (category === DRINK_CATEGORY) {
    res.flash('error', 'Drinks cannot be created here — they are seeded by the app and sold through reservations.');
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
  const existingProduct = getDb()
    .prepare('SELECT category FROM products WHERE id = ?')
    .get(req.params.id);
  if (!existingProduct) {
    res.flash('error', 'Product not found.');
    return res.redirect(BASE + '/products');
  }
  if (drinkCategoryChanged(existingProduct.category, category)) {
    res.flash('error', 'A product cannot be moved into or out of the Drinks category.');
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
