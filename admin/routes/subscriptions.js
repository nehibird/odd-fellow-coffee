import { Router } from 'express';
import Stripe from 'stripe';
import { getDb } from '../lib/db.js';
import { sendSubscriptionFulfilled } from '../lib/email.js';

const BASE = process.env.BASE_PATH?.replace(/\/+$/, '') || '';
const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.get('/', (req, res) => {
  const db = getDb();
  const subs = db.prepare(`
    SELECT s.*, p.name as product_name, p.variants as product_variants FROM subscriptions s
    LEFT JOIN products p ON p.id = s.product_id
    ORDER BY s.next_delivery_date ASC, s.created_at DESC
  `).all();
  res.render('subscriptions/index', { title: 'Subscriptions', subs });
});

router.post('/:id/fulfill', async (req, res) => {
  const db = getDb();
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub) {
    res.flash('error', 'Subscription not found.');
    return res.redirect(BASE + '/subscriptions');
  }

  const now = new Date();
  let nextDelivery = new Date(now);
  if (sub.frequency === 'weekly') {
    nextDelivery.setDate(nextDelivery.getDate() + 7);
  } else if (sub.frequency === 'biweekly') {
    nextDelivery.setDate(nextDelivery.getDate() + 14);
  } else {
    nextDelivery.setMonth(nextDelivery.getMonth() + 1);
  }

  const nextDeliveryStr = nextDelivery.toISOString().split('T')[0];
  db.prepare('UPDATE subscriptions SET last_fulfilled_at = ?, next_delivery_date = ? WHERE id = ?')
    .run(now.toISOString(), nextDeliveryStr, sub.id);

  const product = db.prepare('SELECT name FROM products WHERE id = ?').get(sub.product_id);
  const productName = product?.name || 'Subscription Item';
  const formattedDate = nextDelivery.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  try {
    await sendSubscriptionFulfilled(sub.customer_email, productName, sub.variant, formattedDate);
    res.flash('success', `Fulfilled! Email sent to ${sub.customer_email}. Next delivery: ${formattedDate}.`);
  } catch (e) {
    res.flash('warning', `Fulfilled, but email failed: ${e.message}`);
  }

  res.redirect(BASE + '/subscriptions');
});

router.post('/:id/pause', async (req, res) => {
  const db = getDb();
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub?.stripe_subscription_id) {
    res.flash('error', 'Subscription not found.');
    return res.redirect(BASE + '/subscriptions');
  }
  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      pause_collection: { behavior: 'void' }
    });
    db.prepare("UPDATE subscriptions SET status = 'paused' WHERE id = ?").run(req.params.id);
    res.flash('success', `Subscription paused for ${sub.customer_email}.`);
  } catch (e) {
    res.flash('error', `Failed to pause: ${e.message}`);
  }
  res.redirect(BASE + '/subscriptions');
});

router.post('/:id/resume', async (req, res) => {
  const db = getDb();
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub?.stripe_subscription_id) {
    res.flash('error', 'Subscription not found.');
    return res.redirect(BASE + '/subscriptions');
  }
  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      pause_collection: ''
    });
    db.prepare("UPDATE subscriptions SET status = 'active' WHERE id = ?").run(req.params.id);
    res.flash('success', `Subscription resumed for ${sub.customer_email}.`);
  } catch (e) {
    res.flash('error', `Failed to resume: ${e.message}`);
  }
  res.redirect(BASE + '/subscriptions');
});

router.post('/:id/variant', async (req, res) => {
  const { variant, price_override } = req.body;
  const db = getDb();
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub?.stripe_subscription_id) {
    res.flash('error', 'Subscription not found.');
    return res.redirect(BASE + '/subscriptions');
  }

  try {
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const item = stripeSub.items.data[0];
    if (!item) throw new Error('No subscription item found in Stripe');

    const newPriceCents = price_override ? Math.round(parseFloat(price_override) * 100) : sub.price_cents;

    // Update the Stripe subscription item with new price
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{
        id: item.id,
        price_data: {
          currency: 'usd',
          product: item.price.product,
          recurring: { interval: item.price.recurring.interval },
          unit_amount: newPriceCents
        }
      }],
      proration_behavior: 'create_prorations'
    });

    db.prepare('UPDATE subscriptions SET variant = ?, price_cents = ? WHERE id = ?')
      .run(variant || sub.variant, newPriceCents, req.params.id);

    res.flash('success', `Variant updated to "${variant}" for ${sub.customer_email}.`);
  } catch (e) {
    res.flash('error', `Failed to update variant: ${e.message}`);
  }
  res.redirect(BASE + '/subscriptions');
});

export default router;
