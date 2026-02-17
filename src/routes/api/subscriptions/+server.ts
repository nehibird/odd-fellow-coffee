import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { stripe } from '$lib/server/stripe';
import { isValidEmail } from '$lib/server/validation';
import { sendCancellationConfirmation } from '$lib/server/email';

export async function GET({ url }) {
	const email = url.searchParams.get('email');
	if (!email) throw error(400, 'email required');
	if (!isValidEmail(email)) throw error(400, 'Invalid email format');

	const db = getDb();
	const subs = db.prepare(
		`SELECT s.id, s.frequency, s.status, s.current_period_end, s.cancel_at_period_end,
		        s.variant, s.price_cents, s.shipping_name, s.shipping_address,
		        p.name as product_name
		 FROM subscriptions s
		 LEFT JOIN products p ON p.id = s.product_id
		 WHERE s.customer_email = ? AND s.status != 'canceled'
		 ORDER BY s.created_at DESC`
	).all(email);
	return json(subs);
}

export async function PATCH({ request }) {
	const { subscriptionId, email, action } = await request.json();
	if (!subscriptionId || !email || !action) throw error(400, 'subscriptionId, email, and action required');
	if (action !== 'pause' && action !== 'resume') throw error(400, 'action must be pause or resume');

	const db = getDb();
	const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ? AND customer_email = ?').get(subscriptionId, email) as any;
	if (!sub?.stripe_subscription_id) throw error(404, 'Subscription not found');

	if (action === 'pause') {
		await stripe.subscriptions.update(sub.stripe_subscription_id, {
			pause_collection: { behavior: 'void' }
		});
		db.prepare("UPDATE subscriptions SET status = 'paused' WHERE id = ?").run(subscriptionId);
	} else {
		await stripe.subscriptions.update(sub.stripe_subscription_id, {
			pause_collection: ''
		});
		db.prepare("UPDATE subscriptions SET status = 'active' WHERE id = ?").run(subscriptionId);
	}

	return json({ ok: true });
}

export async function DELETE({ request }) {
	const { subscriptionId, email, reason } = await request.json();
	if (!subscriptionId || !email) throw error(400, 'subscriptionId and email required');

	const db = getDb();
	const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ? AND customer_email = ?').get(subscriptionId, email) as any;
	if (!sub?.stripe_subscription_id) throw error(404, 'Subscription not found');

	await stripe.subscriptions.update(sub.stripe_subscription_id, {
		cancel_at_period_end: true
	});
	db.prepare('UPDATE subscriptions SET cancel_at_period_end = 1, cancel_reason = ? WHERE id = ?').run(reason || null, subscriptionId);

	// Send cancellation confirmation
	try {
		const product = db.prepare('SELECT p.name FROM subscriptions s LEFT JOIN products p ON p.id = s.product_id WHERE s.id = ?').get(subscriptionId) as any;
		await sendCancellationConfirmation(email, product?.name || 'your subscription');
	} catch (e) {
		console.error('Cancellation email failed:', e);
	}

	return json({ ok: true });
}
