import { Router } from 'express';
import { getDb } from '../lib/db.js';
import { sendSubscriptionFulfilled } from '../lib/email.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const subs = db.prepare(`
    SELECT s.*, p.name as product_name FROM subscriptions s
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
    return res.redirect('/subscriptions');
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

  res.redirect('/subscriptions');
});

export default router;
